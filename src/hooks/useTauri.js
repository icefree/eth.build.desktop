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

// ===== 新增: 服务管理命令 =====

// 启动单个服务
export const startService = async (service) => {
  return invoke('start_service', { service });
};

// 停止单个服务
export const stopService = async (service) => {
  return invoke('stop_service', { service });
};

// 启动所有服务
export const startAllServices = async () => {
  return invoke('start_all_services');
};

// 停止所有服务
export const stopAllServices = async () => {
  return invoke('stop_all_services');
};

// 获取所有服务状态
export const getServicesStatus = async () => {
  return invoke('get_services_status');
};

// 获取单个服务状态
export const getServiceStatus = async (service) => {
  return invoke('get_service_status', { service });
};

// ===== 配置管理命令 =====

// 获取配置
export const getConfig = async () => {
  return invoke('get_config');
};

// 更新配置
export const updateConfig = async (config) => {
  return invoke('update_config', { config });
};

// 重新加载配置
export const reloadConfig = async () => {
  return invoke('reload_config');
};

// 获取自动启动服务列表
export const getAutoStartServices = async () => {
  return invoke('get_auto_start_services');
};

// 自动启动所有配置的服务
export const autoStartServices = async () => {
  return invoke('auto_start_services');
};
