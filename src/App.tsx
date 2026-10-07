import { useState } from 'react'
import { Button, Card } from './components/ui'
import { AppLayout } from './components/layout'
import { useAuth } from './hooks/useAuth'
import { LoginRegisterPage } from './pages/LoginRegisterPage'
import { ParentEnrollmentPage } from './pages/ParentEnrollmentPage'
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
    return (
      <AppLayout title="Parent enrollment only" variant="flow">
        <Card className="text-center">
          <p className="text-body-md text-on-surface-variant">
            This flow is for parents enrolling a swimmer. Sign out and use a parent account to
            continue.
          </p>
          <Button className="mt-4" onClick={handleSignOut}>
            Sign out
          </Button>
        </Card>
      </AppLayout>
    )
  }

  if (parentScreen === 'enroll') {
    return (
      <ParentEnrollmentPage
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
