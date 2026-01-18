// 临时的 Tauri API polyfill
// 在生产环境中应该使用 @tauri-apps/api
const invoke = async (cmd, args = {}) => {
  if (window.__TAURI__) {
    return window.__TAURI__.core.invoke(cmd, args);
  }
  // 开发环境下的 mock 返回
  console.log(`[Tauri Mock] invoke: ${cmd}`, args);
  return Promise.resolve({});
};

// 网络控制相关命令
export const startLocalNetwork = async (config) => {
  return invoke('start_local_network', { config });
};

export const stopLocalNetwork = async () => {
  return invoke('stop_local_network');
};

export const getNetworkStatus = async () => {
  return invoke('get_network_status');
};

// 账户相关命令
export const getAccounts = async () => {
  return invoke('get_accounts');
};

export const faucet = async (address, amount) => {
  return invoke('faucet', { address, amount });
};

// 挖矿相关命令
export const mineBlock = async () => {
  return invoke('mine_block');
};

export const setAutoMine = async (enabled, intervalMs) => {
  return invoke('set_auto_mine', { enabled, intervalMs });
};

// 交易相关命令
export const getTransactions = async (limit = 100) => {
  return invoke('get_transactions', { limit });
};

export const getTransactionByHash = async (hash) => {
  return invoke('get_transaction_by_hash', { hash });
};
