import { useCallback, useSyncExternalStore } from 'react'

function subscribe(callback: () => void) {
  window.addEventListener('popstate', callback)
  return () => window.removeEventListener('popstate', callback)
}

function getPath() {
  return window.location.pathname
}

export function useAppPath() {
  const pathname = useSyncExternalStore(subscribe, getPath, getPath)
  const navigate = useCallback((path: string) => {
    const current = `${window.location.pathname}${window.location.search}`
    if (path === current) return
    window.history.pushState(null, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, [])
  return { pathname, navigate }
}
