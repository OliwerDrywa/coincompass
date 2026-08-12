export const serviceWorkerUrl = (baseUrl = '/') => `${baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`}sw.js`

export const shouldRegisterServiceWorker = (navigatorLike, env) => Boolean(
  navigatorLike?.serviceWorker && env?.MODE === 'production',
)

export function registerServiceWorker(navigatorLike = navigator, env = import.meta.env) {
  if (!shouldRegisterServiceWorker(navigatorLike, env)) return Promise.resolve(null)

  return navigatorLike.serviceWorker.register(serviceWorkerUrl(env.BASE_URL))
}
