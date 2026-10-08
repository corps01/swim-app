import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'

function markFontsReady() {
  document.documentElement.classList.add('fonts-ready')
}

if (typeof document !== 'undefined') {
  if (document.fonts?.status === 'loaded') {
    markFontsReady()
  } else {
    void document.fonts?.ready.then(markFontsReady)
    window.setTimeout(markFontsReady, 4_000)
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
