// Temporary Tauri API polyfill
// Production version should be installed from npm as @tauri-apps/api

const getTauriInvoke = () => {
  if (typeof window === 'undefined') return null;
  if (window.__TAURI__?.core?.invoke) return window.__TAURI__.core.invoke;
  if (window.__TAURI__?.invoke) return window.__TAURI__.invoke;
  if (window.__TAURI_INTERNALS__?.invoke) return window.__TAURI_INTERNALS__.invoke;
  return null;
};

export const invoke = async (cmd, args = {}) => {
  const tauriInvoke = getTauriInvoke();
  if (tauriInvoke) {
    return tauriInvoke(cmd, args);
  }
  // 开发环境下的 mock 返回
  console.log(`[Tauri Mock] invoke: ${cmd}`, args);
  return Promise.resolve({});
};

export const listen = (event, handler) => {
  if (typeof window !== 'undefined') {
    if (window.__TAURI__?.event?.listen) return window.__TAURI__.event.listen(event, handler);
    if (window.__TAURI_INTERNALS__?.event?.listen) {
      return window.__TAURI_INTERNALS__.event.listen(event, handler);
    }
  }
  // 开发环境下的 mock
  console.log(`[Tauri Mock] listen: ${event}`);
  return Promise.resolve(() => {});
};

export const emit = (event, payload) => {
  if (typeof window !== 'undefined') {
    if (window.__TAURI__?.event?.emit) return window.__TAURI__.event.emit(event, payload);
    if (window.__TAURI_INTERNALS__?.event?.emit) {
      return window.__TAURI_INTERNALS__.event.emit(event, payload);
    }
  }
  console.log(`[Tauri Mock] emit: ${event}`, payload);
  return Promise.resolve();
};

export const openExternal = async (url) => {
  if (typeof window !== 'undefined') {
    if (window.__TAURI__?.shell?.open) return window.__TAURI__.shell.open(url);
    if (window.__TAURI_INTERNALS__?.shell?.open) {
      return window.__TAURI_INTERNALS__.shell.open(url);
    }
    if (window.__TAURI__?.core?.invoke) {
      try {
        return await window.__TAURI__.core.invoke('plugin:shell|open', { url });
      } catch (err) {
        // fall through
      }
    }
    if (window.__TAURI__?.invoke) {
      try {
        return await window.__TAURI__.invoke('plugin:shell|open', { url });
      } catch (err) {
        // fall through
      }
      try {
        return await window.__TAURI__.invoke('open', { path: url });
      } catch (err) {
        // fall through
      }
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
  return Promise.resolve();
};
