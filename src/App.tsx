import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { LoginRegisterPage } from './pages/LoginRegisterPage'
import { EnrollChild } from './pages/parent/EnrollChild'
import { InstructorHomePage } from './pages/InstructorHomePage'
import { ParentHomePage } from './pages/ParentHomePage'

type ParentScreen = 'home' | 'enroll'

export default function App() {
  const { loading, signedIn, isInstructor, signOut } = useAuth()
  const [parentScreen, setParentScreen] = useState<ParentScreen>('home')
  const [homeRefreshKey, setHomeRefreshKey] = useState(0)

  async function handleSignOut() {
    await signOut()
    setParentScreen('home')
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-surface px-margin-screen text-body-md text-on-surface-variant">
        Loading…
      </div>
    )
  }

  if (!signedIn) {
    return <LoginRegisterPage />
  }

  if (isInstructor) {
    return <InstructorHomePage onSignOut={handleSignOut} />
  }

  if (parentScreen === 'enroll') {
    return (
      <EnrollChild
        onSignOut={handleSignOut}
        onFinished={() => {
          setHomeRefreshKey((key) => key + 1)
          setParentScreen('home')
        }}
      />
    )
  }

  return (
    <ParentHomePage
      key={homeRefreshKey}
      onSignOut={handleSignOut}
      onEnroll={() => setParentScreen('enroll')}
    />
  )
}
