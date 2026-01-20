const DEFAULT_SOCKET_HOST = 'http://localhost'
const DEFAULT_SOCKET_PORT = 44386
const SOCKET_CONFIG_EVENT = 'socket-config-changed'

const getSocketBaseUrlSync = () => `${DEFAULT_SOCKET_HOST}:${DEFAULT_SOCKET_PORT}/`

const getSocketBaseUrl = async () => getSocketBaseUrlSync()

const buildSocketUrl = (path = '', baseUrl) => {
  const base = baseUrl || getSocketBaseUrlSync()
  const cleanPath = path.replace(/^\//, '')
  return new URL(cleanPath, base).toString()
}

const onSocketConfigChange = (handler) => {
  if (typeof window === 'undefined') return () => {}
  const listener = (event) => {
    if (!event?.detail?.baseUrl) return
    handler(event.detail)
  }
  window.addEventListener(SOCKET_CONFIG_EVENT, listener)
  return () => window.removeEventListener(SOCKET_CONFIG_EVENT, listener)
}

module.exports = {
  DEFAULT_SOCKET_HOST,
  DEFAULT_SOCKET_PORT,
  getSocketBaseUrlSync,
  getSocketBaseUrl,
  buildSocketUrl,
  onSocketConfigChange,
}
