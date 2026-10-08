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

function commitHistory(path: string, mode: 'push' | 'replace') {
  if (path === currentPath()) return
  if (mode === 'push') {
    window.history.pushState(null, '', path)
  } else {
    window.history.replaceState(null, '', path)
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
    if (window.history.length <= 1) {
      commitHistory(fallbackPath, 'replace')
      return
    }
    window.history.back()
  }, [])
  return { pathname, search, navigate, replace, goBack }
}
