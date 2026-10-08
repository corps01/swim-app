import { useAuth } from './hooks/useAuth'
import { useAppPath } from './hooks/useAppPath'
import {
  INSTRUCTOR_ACCOUNT_PATH,
  INSTRUCTOR_CREATE_CLASS_PATH,
  INSTRUCTOR_HOME_PATH,
  INSTRUCTOR_ROSTER_PATH,
  PARENT_HOME_PATH,
  parentEditSwimmerPath,
  parseParentRoute,
} from './lib/appNavigation'
import { LoginRegisterPage } from './pages/LoginRegisterPage'
import { EnrollChild } from './pages/parent/EnrollChild'
import { EditSwimmerPage } from './pages/parent/EditSwimmerPage'
import { ParentAccountPage } from './pages/parent/ParentAccountPage'
import { InstructorAccountPage } from './pages/instructor/InstructorAccountPage'
import { InstructorCreateClassPage } from './pages/InstructorCreateClassPage'
import { InstructorHomePage } from './pages/InstructorHomePage'
import { InstructorRosterPage } from './pages/instructor/InstructorRosterPage'
import { ParentHomePage } from './pages/ParentHomePage'
import { useState } from 'react'
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
  const { pathname, navigate } = useAppPath()
  const [homeRefreshKey, setHomeRefreshKey] = useState(0)

  const authReady = !loading
  useRoleHomeRedirect({ authReady, user, pathname, navigate })
  const { blocking: navigationGate } = useAuthNavigationGate(authReady, user)

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
          onBack={() => navigate(INSTRUCTOR_HOME_PATH)}
          onCreated={() => navigate(INSTRUCTOR_HOME_PATH)}
        />
      )
    }

    if (pathname === INSTRUCTOR_ROSTER_PATH) {
      return <InstructorRosterPage onNavigate={navigate} />
    }

    if (pathname === INSTRUCTOR_ACCOUNT_PATH) {
      return <InstructorAccountPage onNavigate={navigate} onSignOut={handleSignOut} />
    }

    return (
      <InstructorHomePage
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
        onBack={() => navigate(PARENT_HOME_PATH)}
        onFinished={() => {
          clearStoredPendingInviteCode()
          setHomeRefreshKey((key) => key + 1)
          navigate(PARENT_HOME_PATH)
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
        onBack={() => navigate(PARENT_HOME_PATH)}
        onSaved={() => {
          setHomeRefreshKey((key) => key + 1)
          navigate(PARENT_HOME_PATH)
        }}
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
