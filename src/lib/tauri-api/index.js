// 临时的 Tauri API polyfill
// 正式版本应该从 npm 安装 @tauri-apps/api

export const invoke = async (cmd, args = {}) => {
  if (window.__TAURI__) {
    return window.__TAURI__.core.invoke(cmd, args);
  }
  // 开发环境下的 mock 返回
  console.log(`[Tauri Mock] invoke: ${cmd}`, args);
  return Promise.resolve({});
};

export const listen = (event, handler) => {
  if (window.__TAURI__) {
    return window.__TAURI__.event.listen(event, handler);
  }
  // 开发环境下的 mock
  console.log(`[Tauri Mock] listen: ${event}`);
  return Promise.resolve(() => {});
};

export const emit = (event, payload) => {
  if (window.__TAURI__) {
    return window.__TAURI__.event.emit(event, payload);
  }
  console.log(`[Tauri Mock] emit: ${event}`, payload);
  return Promise.resolve();
};
