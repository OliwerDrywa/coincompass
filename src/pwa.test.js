import { describe, expect, it } from 'vitest'
import { serviceWorkerUrl, shouldRegisterServiceWorker } from './pwa.js'

describe('PWA service-worker registration', () => {
  it('registers the root service worker only in supported production browsers', () => {
    expect(shouldRegisterServiceWorker({ serviceWorker: {} }, { MODE: 'production' })).toBe(true)
    expect(shouldRegisterServiceWorker({}, { MODE: 'production' })).toBe(false)
    expect(shouldRegisterServiceWorker({ serviceWorker: {} }, { MODE: 'development' })).toBe(false)
  })

  it('uses the app base path for the service worker URL', () => {
    expect(serviceWorkerUrl('/')).toBe('/sw.js')
    expect(serviceWorkerUrl('/coincompass/')).toBe('/coincompass/sw.js')
  })
})
