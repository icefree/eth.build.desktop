import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getNetworkStatus, startLocalNetwork, stopLocalNetwork, mineBlock } from '../../hooks/useTauri';
import { getServicesStatus, startService, stopService } from '../../hooks/useTauri';
import { getLocalIpfsStatus, startLocalIpfs, stopLocalIpfs } from '../../lib/ipfs/localNode';
import AccountsPanel from './AccountsPanel';
import BlockExplorer from './BlockExplorer';
import FaucetPanel from './FaucetPanel';
import './index.css';

const ControlPanel = ({ open, onClose }) => {
  const [networkStatus, setNetworkStatus] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(null);
  const [blockRefreshKey, setBlockRefreshKey] = useState(0);
  const [accountsRefreshKey, setAccountsRefreshKey] = useState(0);
  const [blockResetKey, setBlockResetKey] = useState(0);
  const [activeTab, setActiveTab] = useState('control');
  const [ipfsStatus, setIpfsStatus] = useState(() => getLocalIpfsStatus());
  const [ipfsLoading, setIpfsLoading] = useState(false);
  const autoStartSocketRef = useRef(false);
  const [socketPort, setSocketPort] = useState('44386');
  const [rpcPort, setRpcPort] = useState('8545');
  const [wsPort, setWsPort] = useState('8546');
  const socketPortDirty = useRef(false);
  const testnetPortsDirty = useRef(false);

  const loadStatus = async () => {
    try {
      const [netStatus, svcStatus] = await Promise.all([
        getNetworkStatus(),
        getServicesStatus()
      ]);
      setNetworkStatus(netStatus);
      setServices(Array.isArray(svcStatus) ? svcStatus : []);
      setIpfsStatus(getLocalIpfsStatus());
    } catch (err) {
      console.error('Failed to get status:', err);
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    loadStatus();
  }, [open]);

  useEffect(() => {
    if (!socketService?.port || socketPortDirty.current) return;
    setSocketPort(String(socketService.port));
  }, [socketService?.port]);

  useEffect(() => {
    if (!networkStatus || testnetPortsDirty.current) return;
    try {
      const rpc = new URL(networkStatus.rpc_url).port;
      const ws = new URL(networkStatus.ws_url).port;
      if (rpc) setRpcPort(rpc);
      if (ws) setWsPort(ws);
    } catch (err) {
      // ignore malformed urls
    }
  }, [networkStatus]);

  useEffect(() => {
    if (!open) {
      autoStartSocketRef.current = false;
      return;
    }
    const socket = services.find(s => s.name === 'socket');
    if (!socket || socket.running || autoStartSocketRef.current) return;
    autoStartSocketRef.current = true;
    setLoading(true);
    setError(null);
    startService('socket', { port: Number(socketPort) || 44386 })
      .then(loadStatus)
      .catch((err) => setError(err.toString()))
      .finally(() => setLoading(false));
  }, [open, services, socketPort]);

  const handleStartNetwork = async () => {
    setLoading(true);
    setError(null);
    try {
      const rpcPortValue = Number(rpcPort) || 8545;
      const wsPortValue = Number(wsPort) || (rpcPortValue + 1);
      await startLocalNetwork({
        chain_id: 31337,
        accounts: 10,
        balance: '10000',
        block_time: null,
        rpc_port: rpcPortValue,
        ws_port: wsPortValue
      });
      await loadStatus();
    } catch (err) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleStopNetwork = async () => {
    setLoading(true);
    setError(null);
    try {
      await stopLocalNetwork();
      await loadStatus();
    } catch (err) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleResetNetwork = async () => {
    setLoading(true);
    setError(null);
    try {
      await stopLocalNetwork();
      await new Promise(resolve => setTimeout(resolve, 500));
      const rpcPortValue = Number(rpcPort) || 8545;
      const wsPortValue = Number(wsPort) || (rpcPortValue + 1);
      await startLocalNetwork({
        chain_id: 31337,
        accounts: 10,
        balance: '10000',
        block_time: null,
        rpc_port: rpcPortValue,
        ws_port: wsPortValue
      });
      await loadStatus();
      setBlockResetKey((prev) => prev + 1);
      setBlockRefreshKey((prev) => prev + 1);
      setAccountsRefreshKey((prev) => prev + 1);
    } catch (err) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleQuickMine = useCallback(async () => {
    try {
      await mineBlock();
      await loadStatus();
      setBlockRefreshKey((prev) => prev + 1);
      setAccountsRefreshKey((prev) => prev + 1);
    } catch (err) {
      setError(err.toString());
    }
  }, []);

  const handleToggleService = async (serviceName, options = {}) => {
    const service = services.find(s => s.name === serviceName);
    if (!service) return;

    setLoading(true);
    setError(null);
    try {
      if (service.running) {
        await stopService(serviceName);
      } else {
        await startService(serviceName, options);
      }
      await loadStatus();
    } catch (err) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleStartIpfs = async () => {
    setIpfsLoading(true);
    setError(null);
    try {
      await startLocalIpfs();
    } catch (err) {
      setError(err.toString());
    } finally {
      setIpfsStatus(getLocalIpfsStatus());
      setIpfsLoading(false);
    }
  };

  const handleStopIpfs = async () => {
    setIpfsLoading(true);
    setError(null);
    try {
      await stopLocalIpfs();
    } catch (err) {
      setError(err.toString());
    } finally {
      setIpfsStatus(getLocalIpfsStatus());
      setIpfsLoading(false);
    }
  };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const isOnline = networkStatus?.is_running;
  const isIpfsRunning = ipfsStatus?.running;
  const isIpfsStarting = ipfsStatus?.starting;
  const socketService = services.find(s => s.name === 'socket');
  const socketPortValue = Number(socketPort) || socketService?.port || 44386;

  return (
    <div className="control-panel-overlay" onClick={onClose}>
      <div className="control-panel" onClick={(e) => e.stopPropagation()}>
        <div className="control-panel-header">
          <h2>⚡ 控制面板</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {error && (
          <div className="error-message" style={{ margin: '0 20px' }}>
            ⚠️ {error}
          </div>
        )}

        <div className="control-panel-content">
          <div className="tabs-container">
            <button
              className={`tab-btn ${activeTab === 'control' ? 'active' : ''}`}
              onClick={() => setActiveTab('control')}
            >
              ⚡ 控制面板
            </button>
            <button
              className={`tab-btn ${activeTab === 'accounts' ? 'active' : ''}`}
              onClick={() => setActiveTab('accounts')}
            >
              👤 账户
            </button>
            <button
              className={`tab-btn ${activeTab === 'blocks' ? 'active' : ''}`}
              onClick={() => setActiveTab('blocks')}
            >
              📦 区块
            </button>
          </div>

          <div className="tab-body">
            {activeTab === 'control' && (
              <>
              {/* Socket 服务 */}
              {socketService && (
                <div className={`status-card ${socketService.running ? 'online' : 'offline'}`}>
                  <div className="status-header">
                    <div className="status-indicator">
                      <span className={`status-dot ${socketService.running ? 'online' : ''}`}></span>
                      <span className="status-label">
                        Socket 服务
                      </span>
                    </div>
                    <span className={`status-badge ${socketService.running ? '' : 'offline'}`}>
                      {socketService.running ? '运行中' : '离线'}
                    </span>
                  </div>

                  <div className="network-info">
                    <div className="info-row">
                      <span className="info-label">URL</span>
                      <span
                        className="info-value"
                        onClick={() => socketService.running && copyToClipboard(`http://localhost:${socketPortValue}`, 'Socket URL')}
                      >
                        {socketService.running 
                          ? `localhost:${socketPortValue}` 
                          : '未运行'}
                        <span className="copy-icon">📋</span>
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Port</span>
                      <input
                        className="control-input"
                        type="number"
                        min="1"
                        max="65535"
                        value={socketPort}
                        onChange={(event) => {
                          socketPortDirty.current = true;
                          setSocketPort(event.target.value);
                        }}
                      />
                    </div>
                  </div>

                  <div className="action-buttons action-spaced">
                    {!socketService.running ? (
                      <button
                        className="action-btn primary full-width"
                        onClick={() => handleToggleService('socket', { port: Number(socketPort) || 44386 })}
                        disabled={loading}
                      >
                        {loading ? <span className="loading-spinner"></span> : '▶️'} 启动 Socket
                      </button>
                    ) : (
                      <button
                        className="action-btn danger full-width"
                        onClick={() => handleToggleService('socket')}
                        disabled={loading}
                      >
                        {loading ? <span className="loading-spinner"></span> : '⏹️'} 停止 Socket
                      </button>
                    )}
                  </div>
                </div>
              )}

              {services.length === 0 && (
                <div className="offline-hint" style={{ padding: '20px' }}>
                  <span className="hint-text">暂无服务配置</span>
                </div>
              )}

              {/* IPFS 本地节点 */}
              <div className={`status-card ${isIpfsRunning ? 'online' : 'offline'}`}>
                <div className="status-header">
                  <div className="status-indicator">
                    <span className={`status-dot ${isIpfsRunning ? 'online' : ''}`}></span>
                    <span className="status-label">
                      IPFS 本地节点
                    </span>
                  </div>
                  <span className={`status-badge ${isIpfsRunning ? '' : 'offline'}`}>
                    {isIpfsRunning ? '运行中' : (isIpfsStarting ? '启动中' : '离线')}
                  </span>
                </div>

                <div className="network-info">
                  <div className="info-row">
                    <span className="info-label">Mode</span>
                    <span className="info-value">local-only (no p2p)</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Node ID</span>
                    <span className="info-value">
                      {isIpfsRunning ? (ipfsStatus.nodeId || 'unknown') : '未启动'}
                    </span>
                  </div>
                </div>

                <div className="action-buttons action-spaced">
                  {!isIpfsRunning ? (
                    <button
                      className="action-btn primary full-width"
                      onClick={handleStartIpfs}
                      disabled={ipfsLoading}
                    >
                      {ipfsLoading ? <span className="loading-spinner"></span> : '▶️'} 启动 IPFS
                    </button>
                  ) : (
                    <button
                      className="action-btn danger full-width"
                      onClick={handleStopIpfs}
                      disabled={ipfsLoading}
                    >
                      {ipfsLoading ? <span className="loading-spinner"></span> : '⏹️'} 停止 IPFS
                    </button>
                  )}
                </div>
              </div>

              {/* 网络状态卡片 */}
              <div className={`status-card ${isOnline ? 'online' : 'offline'}`}>
                <div className="status-header">
                  <div className="status-indicator">
                    <span className={`status-dot ${isOnline ? 'online' : ''}`}></span>
                    <span className="status-label">
                      {isOnline ? 'Anvil 本地网络' : '测试网未启动'}
                    </span>
                  </div>
                  <span className={`status-badge ${isOnline ? '' : 'offline'}`}>
                    {isOnline ? '运行中' : '离线'}
                  </span>
                </div>

                {isOnline && networkStatus && (
                  <div className="network-info">
                    <div className="info-row">
                      <span className="info-label">RPC</span>
                      <span 
                        className="info-value"
                        onClick={() => copyToClipboard(networkStatus.rpc_url, 'RPC URL')}
                      >
                        {networkStatus.rpc_url}
                        <span className="copy-icon">📋</span>
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Chain ID</span>
                      <span 
                        className="info-value"
                        onClick={() => copyToClipboard(String(networkStatus.chain_id), 'Chain ID')}
                      >
                        {networkStatus.chain_id}
                        <span className="copy-icon">📋</span>
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">WebSocket</span>
                      <span 
                        className="info-value"
                        onClick={() => copyToClipboard(networkStatus.ws_url, 'WS URL')}
                      >
                        {networkStatus.ws_url}
                        <span className="copy-icon">📋</span>
                      </span>
                    </div>
                  </div>
                )}
                <div className="network-info">
                  <div className="info-row">
                    <span className="info-label">RPC Port</span>
                    <input
                      className="control-input"
                      type="number"
                      min="1"
                      max="65535"
                      value={rpcPort}
                      onChange={(event) => {
                        testnetPortsDirty.current = true;
                        setRpcPort(event.target.value);
                      }}
                    />
                  </div>
                  <div className="info-row">
                    <span className="info-label">WS Port</span>
                    <input
                      className="control-input"
                      type="number"
                      min="1"
                      max="65535"
                      value={wsPort}
                      onChange={(event) => {
                        testnetPortsDirty.current = true;
                        setWsPort(event.target.value);
                      }}
                    />
                  </div>
                </div>

                <div className="action-buttons action-spaced">
                  {!isOnline ? (
                    <button
                      className="action-btn primary full-width"
                      onClick={handleStartNetwork}
                      disabled={loading}
                    >
                      {loading ? <span className="loading-spinner"></span> : '▶️'} 启动测试网
                    </button>
                  ) : (
                    <>
                      <button
                        className="action-btn secondary"
                        onClick={handleQuickMine}
                        disabled={loading}
                      >
                        ⛏️ 挖矿
                      </button>
                      <button
                        className="action-btn warning"
                        onClick={handleResetNetwork}
                        disabled={loading}
                      >
                        🔄 重置
                      </button>
                      <button
                        className="action-btn danger full-width"
                        onClick={handleStopNetwork}
                        disabled={loading}
                      >
                        {loading ? <span className="loading-spinner"></span> : '⏹️'} 停止网络
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isOnline && (
                <FaucetPanel
                  onSuccess={() => {
                    setBlockRefreshKey((prev) => prev + 1);
                    setAccountsRefreshKey((prev) => prev + 1);
                  }}
                />
              )}

              </>
            )}

            {activeTab === 'accounts' && (
              <div className="tab-fill">
                <AccountsPanel refreshToken={accountsRefreshKey} />
              </div>
            )}

            {activeTab === 'blocks' && (
              <div className="tab-fill">
                <BlockExplorer refreshToken={blockRefreshKey} resetToken={blockResetKey} />
              </div>
            )}
          </div>
        </div>

        {/* 复制成功提示 */}
        {copySuccess && (
          <div className="copy-toast">
            ✅ {copySuccess} 已复制
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;
