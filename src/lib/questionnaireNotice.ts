const SIGNED_KEY = 'splashpass:questionnaire-signed'

export function markQuestionnaireSigned() {
  try {
    sessionStorage.setItem(SIGNED_KEY, '1')
  } catch {
    /* Private mode can block storage; the home query param still shows the toast. */
  }
}

export function consumeQuestionnaireSigned(): boolean {
  try {
    if (sessionStorage.getItem(SIGNED_KEY) !== '1') return false
    sessionStorage.removeItem(SIGNED_KEY)
    return true
  } catch {
    return false
  }
}
