export function registerPwa(status: (message: string) => void, update: (worker: ServiceWorker) => void) {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    status('Mode offline tersedia pada build production di HTTPS atau localhost.')
    return
  }
  let existing = Boolean(navigator.serviceWorker.controller)
  let active = true
  const controllerChanged = () => {
    if (existing) location.reload()
    existing = true
  }
  navigator.serviceWorker.addEventListener('controllerchange', controllerChanged)
  void navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js', { scope: import.meta.env.BASE_URL }).then(registration => {
    if (!active) return
    if (registration.waiting) update(registration.waiting)
    const watch = (worker: ServiceWorker) => {
      worker.addEventListener('statechange', () => {
        if (!active) return
        if (worker.state === 'installed' && navigator.serviceWorker.controller) update(worker)
        if (worker.state === 'redundant' && !registration.active) status('Cache offline gagal disiapkan. Coba muat ulang saat online.')
      })
    }
    if (registration.installing) watch(registration.installing)
    registration.addEventListener('updatefound', () => { if (registration.installing) watch(registration.installing) })
    void navigator.serviceWorker.ready.then(() => { if (active) status('Siap digunakan offline.') })
  }).catch(() => { if (active) status('Cache offline gagal disiapkan. Coba muat ulang saat online.') })
  return () => {
    active = false
    navigator.serviceWorker.removeEventListener('controllerchange', controllerChanged)
  }
}
