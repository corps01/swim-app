import { useEffect, useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useAppPath } from './hooks/useAppPath'
import {
  INSTRUCTOR_ACCOUNT_PATH,
  INSTRUCTOR_CREATE_CLASS_PATH,
  INSTRUCTOR_CLASSES_PATH,
  INSTRUCTOR_HOME_PATH,
  INSTRUCTOR_PROGRESS_LOG_PATH,
  INSTRUCTOR_SWIMMERS_PATH,
  LEGACY_INSTRUCTOR_ROSTER_PATH,
  instructorShareClassPath,
  isKnownInstructorPath,
  isKnownParentPath,
  PARENT_HOME_PATH,
  parentEditSwimmerPath,
  parseParentRoute,
} from './lib/appNavigation'
import { LoginRegisterPage } from './pages/LoginRegisterPage'
import { EnrollChild } from './pages/parent/EnrollChild'
import { EditSwimmerPage } from './pages/parent/EditSwimmerPage'
import { ParentSwimmerActivityPage } from './pages/parent/ParentSwimmerActivityPage'
import { ParentAccountPage } from './pages/parent/ParentAccountPage'
import { InstructorAccountPage } from './pages/instructor/InstructorAccountPage'
import { InstructorCreateClassPage } from './pages/InstructorCreateClassPage'
import { InstructorShareInvitePage } from './pages/InstructorShareInvitePage'
import { InstructorAgendaPage } from './pages/instructor/InstructorAgendaPage'
import { InstructorClassesPage } from './pages/instructor/InstructorClassesPage'
import { InstructorEditClassPage } from './pages/instructor/InstructorEditClassPage'
import { InstructorSwimmersPage } from './pages/instructor/InstructorSwimmersPage'
import { InstructorSessionPage } from './pages/instructor/InstructorSessionPage'
import { InstructorProgressLogPage } from './pages/instructor/InstructorProgressLogPage'
import { ParentHomePage } from './pages/ParentHomePage'
import { useAuthNavigationGate, useRoleHomeRedirect } from './hooks/useRoleHomeRedirect'
import { clearStoredPendingInviteCode } from './lib/pendingInvite'

function RouteResolvingScreen() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-surface px-margin-screen text-body-md text-on-surface-variant">
      Loading…
    </div>
  )
}

export default function App() {
  const { loading, signedIn, isInstructor, user, signOut } = useAuth()
  const { pathname, search, navigate, replace, goBack } = useAppPath()
  const [homeRefreshKey, setHomeRefreshKey] = useState(0)

  const authReady = !loading
  useRoleHomeRedirect({ authReady, user, pathname, navigate })
  const { blocking: navigationGate } = useAuthNavigationGate(authReady, user)

  useEffect(() => {
    if (!authReady || !signedIn) return
    if (isInstructor) {
      if (pathname === LEGACY_INSTRUCTOR_ROSTER_PATH) {
        replace(INSTRUCTOR_SWIMMERS_PATH + search)
        return
      }
      if (!isKnownInstructorPath(pathname)) {
        replace(INSTRUCTOR_HOME_PATH)
      }
      return
    }
    if (!isKnownParentPath(pathname)) {
      replace(PARENT_HOME_PATH)
    }
  }, [authReady, signedIn, isInstructor, pathname, search, replace])

  async function handleSignOut() {
    await signOut()
    navigate(PARENT_HOME_PATH)
  }

  if (!authReady || navigationGate) {
    return <RouteResolvingScreen />
  }

  if (!signedIn) {
    return <LoginRegisterPage />
  }

  if (isInstructor) {
    if (pathname === INSTRUCTOR_CREATE_CLASS_PATH) {
      return (
        <InstructorCreateClassPage
          onBack={() => goBack(INSTRUCTOR_CLASSES_PATH)}
          onCreated={(created) => replace(instructorShareClassPath(created.id))}
        />
      )
    }

    const shareClassMatch = pathname.match(/^\/instructor\/classes\/([^/]+)\/share\/?$/)
    if (shareClassMatch?.[1]) {
      return (
        <InstructorShareInvitePage
          classId={shareClassMatch[1]}
          onBack={() => goBack(INSTRUCTOR_CLASSES_PATH)}
        />
      )
    }

    const editClassMatch = pathname.match(/^\/instructor\/classes\/([^/]+)\/edit\/?$/)
    if (editClassMatch?.[1]) {
      return (
        <InstructorEditClassPage
          classId={editClassMatch[1]}
          onBack={() => goBack(INSTRUCTOR_CLASSES_PATH)}
          onSaved={() => goBack(INSTRUCTOR_CLASSES_PATH)}
        />
      )
    }

    const sessionClassMatch = pathname.match(/^\/instructor\/classes\/([^/]+)\/?$/)
    if (sessionClassMatch?.[1]) {
      return (
        <InstructorSessionPage classId={sessionClassMatch[1]} onNavigate={navigate} />
      )
    }

    if (pathname === INSTRUCTOR_PROGRESS_LOG_PATH) {
      return <InstructorProgressLogPage />
    }

    if (pathname === INSTRUCTOR_CLASSES_PATH) {
      return (
        <InstructorClassesPage
          onNavigate={navigate}
          onNewClass={() => navigate(INSTRUCTOR_CREATE_CLASS_PATH)}
        />
      )
    }

    if (pathname === LEGACY_INSTRUCTOR_ROSTER_PATH) {
      return <RouteResolvingScreen />
    }

    if (pathname === INSTRUCTOR_SWIMMERS_PATH) {
      return <InstructorSwimmersPage onNavigate={navigate} />
    }

    if (pathname === INSTRUCTOR_ACCOUNT_PATH) {
      return <InstructorAccountPage onNavigate={navigate} onSignOut={handleSignOut} />
    }

    return (
      <InstructorAgendaPage
        onNavigate={navigate}
        onNewClass={() => navigate(INSTRUCTOR_CREATE_CLASS_PATH)}
      />
    )
  }

  const parentRoute = parseParentRoute(pathname)

  if (parentRoute.kind === 'enroll') {
    return (
      <EnrollChild
        onSignOut={handleSignOut}
        onBack={() => goBack(PARENT_HOME_PATH)}
        onFinished={() => {
          clearStoredPendingInviteCode()
          setHomeRefreshKey((key) => key + 1)
          goBack(PARENT_HOME_PATH)
        }}
      />
    )
  }

  if (parentRoute.kind === 'edit') {
    return (
      <EditSwimmerPage
        key={parentRoute.childId}
        childId={parentRoute.childId}
        onSignOut={handleSignOut}
        onBack={() => goBack(PARENT_HOME_PATH)}
        onSaved={() => {
          setHomeRefreshKey((key) => key + 1)
          goBack(PARENT_HOME_PATH)
        }}
      />
    )
  }

  if (parentRoute.kind === 'activity') {
    return (
      <ParentSwimmerActivityPage
        key={parentRoute.childId}
        childId={parentRoute.childId}
      />
    )
  }

  if (parentRoute.kind === 'account') {
    return <ParentAccountPage onNavigate={navigate} onSignOut={handleSignOut} />
  }

  return (
    <ParentHomePage
      key={homeRefreshKey}
      onNavigate={navigate}
      onEditSwimmer={(childId) => navigate(parentEditSwimmerPath(childId))}
    />
  )
}
