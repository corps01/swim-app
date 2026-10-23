import { useEffect, useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useAppPath } from './hooks/useAppPath'
import {
  INSTRUCTOR_ACCOUNT_PATH,
  INSTRUCTOR_CREATE_CLASS_PATH,
  INSTRUCTOR_CLASSES_PATH,
  INSTRUCTOR_FORM_NEW_PATH,
  INSTRUCTOR_FORMS_PATH,
  INSTRUCTOR_HOME_PATH,
  INSTRUCTOR_PROGRESS_LOG_PATH,
  INSTRUCTOR_SWIMMERS_PATH,
  LEGACY_INSTRUCTOR_ROSTER_PATH,
  instructorShareClassPath,
  isKnownInstructorPath,
  isKnownParentPath,
  classDetailBackPath,
  instructorBackTarget,
  instructorClassDetailPath,
  matchInstructorClassDetailPath,
  matchInstructorDeckPath,
  matchInstructorSwimmerPath,
  matchLegacyClassDetailPath,
  PARENT_ACCOUNT_PATH,
  PARENT_CLASSES_PATH,
  PARENT_HOME_PATH,
  parentBackTarget,
  parentSwimmerClassPath,
  PARENT_SWIMMERS_PATH,
  SETTINGS_PATH,
  parentSwimmerPath,
  parseParentRoute,
  submissionBackPath,
} from './lib/appNavigation'
import { markQuestionnaireSigned } from './lib/questionnaireNotice'
import { LoginRegisterPage } from './pages/LoginRegisterPage'
import { EnrollChild } from './pages/parent/EnrollChild'
import { EditSwimmerPage } from './pages/parent/EditSwimmerPage'
import { SwimmerDetail } from './pages/parent/SwimmerDetail'
import { ParentQuestionnairePage } from './pages/parent/ParentQuestionnairePage'
import { ParentAccountPage } from './pages/parent/ParentAccountPage'
import { ParentSwimmersPage } from './pages/parent/ParentSwimmersPage'
import { ParentClassesPage } from './pages/parent/ParentClassesPage'
import { ClassDetail as ParentClassDetail } from './pages/parent/ClassDetail'
import { InstructorAccountPage } from './pages/instructor/InstructorAccountPage'
import { InstructorCreateClassPage } from './pages/InstructorCreateClassPage'
import { InstructorShareInvitePage } from './pages/InstructorShareInvitePage'
import { InstructorAgendaPage } from './pages/instructor/InstructorAgendaPage'
import { InstructorClassesPage } from './pages/instructor/InstructorClassesPage'
import { InstructorEditClassPage } from './pages/instructor/InstructorEditClassPage'
import { InstructorSwimmersPage } from './pages/instructor/InstructorSwimmersPage'
import { InstructorSwimmerDetail } from './pages/instructor/SwimmerDetail'
import { InstructorSessionPage } from './pages/instructor/InstructorSessionPage'
import { InstructorProgressLogPage } from './pages/instructor/InstructorProgressLogPage'
import { InstructorFormsPage } from './pages/instructor/InstructorFormsPage'
import { InstructorFormBuilderPage } from './pages/instructor/InstructorFormBuilderPage'
import { InstructorSubmissionPage } from './pages/instructor/InstructorSubmissionPage'
import { ClassDetail } from './pages/instructor/ClassDetail'
import { TodayHome } from './pages/parent/TodayHome'
import { Settings } from './pages/Settings'
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
      const legacyClassId = matchLegacyClassDetailPath(pathname)
      if (legacyClassId) {
        replace(`${instructorClassDetailPath(legacyClassId)}${search}`)
        return
      }
      if (!isKnownInstructorPath(pathname)) {
        replace(INSTRUCTOR_HOME_PATH)
      }
      return
    }
    const activityChildId = pathname.match(/^\/swimmers\/([^/]+)\/activity\/?$/)?.[1]
    if (activityChildId) {
      replace(`${parentSwimmerPath(activityChildId)}${search}`)
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

  if (pathname === SETTINGS_PATH) {
    return (
      <Settings
        onBack={() => goBack(isInstructor ? INSTRUCTOR_ACCOUNT_PATH : PARENT_ACCOUNT_PATH)}
      />
    )
  }

  if (isInstructor) {
    if (pathname === INSTRUCTOR_CREATE_CLASS_PATH) {
      return (
        <InstructorCreateClassPage
          onBack={() => goBack(instructorBackTarget(search, INSTRUCTOR_CLASSES_PATH))}
          onCreated={(created) => replace(instructorShareClassPath(created.id))}
        />
      )
    }

    const deckClassId = matchInstructorDeckPath(pathname)
    if (deckClassId) {
      return <InstructorSessionPage classId={deckClassId} onNavigate={navigate} />
    }

    const classDetailId = matchInstructorClassDetailPath(pathname)
    if (classDetailId) {
      return (
        <ClassDetail
          key={classDetailId}
          classId={classDetailId}
          onBack={() => goBack(classDetailBackPath(search))}
          onNavigate={navigate}
        />
      )
    }

    const shareClassMatch = pathname.match(/^\/instructor\/classes\/([^/]+)\/share\/?$/)
    if (shareClassMatch?.[1]) {
      return (
        <InstructorShareInvitePage
          classId={shareClassMatch[1]}
          onNavigate={navigate}
          onBack={() => goBack(instructorBackTarget(search, instructorClassDetailPath(shareClassMatch[1], { from: 'classes' })))}
        />
      )
    }

    const editClassMatch = pathname.match(/^\/instructor\/classes\/([^/]+)\/edit\/?$/)
    if (editClassMatch?.[1]) {
      return (
        <InstructorEditClassPage
          classId={editClassMatch[1]}
          onBack={() => goBack(instructorClassDetailPath(editClassMatch[1], { from: 'classes' }))}
          onSaved={() => goBack(instructorClassDetailPath(editClassMatch[1], { from: 'classes' }))}
        />
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

    const instructorSwimmerId = matchInstructorSwimmerPath(pathname)
    if (instructorSwimmerId) {
      return <InstructorSwimmerDetail childId={instructorSwimmerId} onNavigate={navigate} />
    }

    if (pathname === INSTRUCTOR_SWIMMERS_PATH) {
      return <InstructorSwimmersPage onNavigate={navigate} />
    }

    if (pathname === INSTRUCTOR_ACCOUNT_PATH) {
      return <InstructorAccountPage onNavigate={navigate} onSignOut={handleSignOut} />
    }

    if (pathname === INSTRUCTOR_FORMS_PATH) {
      return (
        <InstructorFormsPage
          onBack={() => goBack(instructorBackTarget(search, INSTRUCTOR_ACCOUNT_PATH))}
          onNavigate={navigate}
        />
      )
    }

    if (pathname === INSTRUCTOR_FORM_NEW_PATH) {
      return (
        <InstructorFormBuilderPage
          templateId={null}
          onBack={() => goBack(INSTRUCTOR_FORMS_PATH)}
          onSaved={() => goBack(INSTRUCTOR_FORMS_PATH)}
        />
      )
    }

    const submissionMatch = pathname.match(/^\/instructor\/forms\/submissions\/([^/]+)\/?$/)
    if (submissionMatch?.[1]) {
      return (
        <InstructorSubmissionPage
          key={submissionMatch[1]}
          submissionId={submissionMatch[1]}
          onBack={() => goBack(submissionBackPath(search))}
        />
      )
    }

    const editFormMatch = pathname.match(/^\/instructor\/forms\/([^/]+)\/edit\/?$/)
    if (editFormMatch?.[1]) {
      return (
        <InstructorFormBuilderPage
          key={editFormMatch[1]}
          templateId={editFormMatch[1]}
          onBack={() => goBack(INSTRUCTOR_FORMS_PATH)}
          onSaved={() => goBack(INSTRUCTOR_FORMS_PATH)}
        />
      )
    }

    return (
      <InstructorAgendaPage
        onNavigate={navigate}
        onNewClass={() => navigate(`${INSTRUCTOR_CREATE_CLASS_PATH}?from=${encodeURIComponent(INSTRUCTOR_HOME_PATH)}`)}
      />
    )
  }

  const parentRoute = parseParentRoute(pathname)

  if (parentRoute.kind === 'enroll') {
    const returnPath = parentBackTarget(search, PARENT_SWIMMERS_PATH)
    return (
      <EnrollChild
        onSignOut={handleSignOut}
        onBack={() => goBack(returnPath)}
        onFinished={() => {
          clearStoredPendingInviteCode()
          setHomeRefreshKey((key) => key + 1)
          goBack(returnPath)
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
        onBack={() => goBack(parentSwimmerPath(parentRoute.childId))}
        onSaved={() => {
          setHomeRefreshKey((key) => key + 1)
          goBack(parentSwimmerPath(parentRoute.childId))
        }}
      />
    )
  }

  if (parentRoute.kind === 'swimmer' || parentRoute.kind === 'activity') {
    return (
      <SwimmerDetail
        key={parentRoute.childId}
        childId={parentRoute.childId}
        onNavigate={navigate}
      />
    )
  }

  if (parentRoute.kind === 'questionnaire' || parentRoute.kind === 'buds' || parentRoute.kind === 'waiver') {
    const classId = new URLSearchParams(search).get('classId')
    const returnPath =
      parentRoute.kind === 'buds'
        ? PARENT_HOME_PATH
        : parentRoute.kind === 'waiver' && classId
          ? parentSwimmerClassPath(parentRoute.childId, classId)
          : parentSwimmerPath(parentRoute.childId)
    return (
      <ParentQuestionnairePage
        key={`${parentRoute.kind}-${parentRoute.childId}`}
        childId={parentRoute.childId}
        onBack={() => goBack(returnPath)}
        onFinished={() => {
          markQuestionnaireSigned()
          setHomeRefreshKey((key) => key + 1)
          goBack(returnPath)
        }}
      />
    )
  }

  if (parentRoute.kind === 'account') {
    return <ParentAccountPage onNavigate={navigate} onSignOut={handleSignOut} />
  }

  if (parentRoute.kind === 'swimmerClass') {
    return (
      <ParentClassDetail
        key={parentRoute.classId}
        classId={parentRoute.classId}
        onBack={() => goBack(parentBackTarget(search, PARENT_CLASSES_PATH))}
        onNavigate={navigate}
      />
    )
  }

  if (parentRoute.kind === 'classes') {
    return <ParentClassesPage key={homeRefreshKey} onNavigate={navigate} />
  }

  if (parentRoute.kind === 'swimmers') {
    return (
      <ParentSwimmersPage
        key={homeRefreshKey}
        onNavigate={navigate}
      />
    )
  }

  return (
    <TodayHome key={homeRefreshKey} onNavigate={navigate} />
  )
}
