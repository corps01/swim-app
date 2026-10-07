import { AuthForm } from '../components/AuthForm'
import { AppLayout } from '../components/layout'

export function LoginRegisterPage() {
  return (
    <AppLayout variant="auth">
      <AuthForm />
    </AppLayout>
  )
}
