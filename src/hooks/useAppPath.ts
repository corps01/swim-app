import { useCallback, useSyncExternalStore } from 'react'

function subscribe(callback: () => void) {
  window.addEventListener('popstate', callback)
  return () => window.removeEventListener('popstate', callback)
}

function getPathname() {
  return window.location.pathname
}

function getSearch() {
  return window.location.search
}

function currentPath() {
  return `${window.location.pathname}${window.location.search}`
}

function isInAppHistory(): boolean {
  const state: unknown = window.history.state
  if (!state || typeof state !== 'object') return false
  return 'splashpass' in state && (state as { splashpass?: unknown }).splashpass === true
}

function commitHistory(path: string, mode: 'push' | 'replace') {
  if (path === currentPath()) return
  const state = { splashpass: true }
  if (mode === 'push') {
    window.history.pushState(state, '', path)
  } else {
    window.history.replaceState(state, '', path)
  }
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function useAppPath() {
  const pathname = useSyncExternalStore(subscribe, getPathname, getPathname)
  const search = useSyncExternalStore(subscribe, getSearch, getSearch)
  const navigate = useCallback((path: string) => {
    commitHistory(path, 'push')
  }, [])
  const replace = useCallback((path: string) => {
    commitHistory(path, 'replace')
  }, [])
  /** Pop history for back/cancel. Falls back when there is no prior entry. */
  const goBack = useCallback((fallbackPath: string) => {
    if (!isInAppHistory() || window.history.length <= 1) {
      commitHistory(fallbackPath, 'replace')
      return
    }
    window.history.back()
  }, [])
  return { pathname, search, navigate, replace, goBack }
}
