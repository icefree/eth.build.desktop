// 临时的 Tauri API polyfill
// 正式版本应该从 npm 安装 @tauri-apps/api

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
  }
  window.open(url, '_blank', 'noopener,noreferrer');
  return Promise.resolve();
};
