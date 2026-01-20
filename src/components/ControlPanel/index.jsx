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
    if (!open) {
      autoStartSocketRef.current = false;
      return;
    }
    const socket = services.find(s => s.name === 'socket');
    if (!socket || socket.running || autoStartSocketRef.current) return;
    autoStartSocketRef.current = true;
    setLoading(true);
    setError(null);
    startService('socket')
      .then(loadStatus)
      .catch((err) => setError(err.toString()))
      .finally(() => setLoading(false));
  }, [open, services]);

  const handleStartNetwork = async () => {
    setLoading(true);
    setError(null);
    try {
      await startLocalNetwork({
        chain_id: 31337,
        accounts: 10,
        balance: '10000',
        block_time: null
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
      await startLocalNetwork({
        chain_id: 31337,
        accounts: 10,
        balance: '10000',
        block_time: null
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

  const handleToggleService = async (serviceName) => {
    const service = services.find(s => s.name === serviceName);
    if (!service) return;

    setLoading(true);
    setError(null);
    try {
      if (service.running) {
        await stopService(serviceName);
      } else {
        await startService(serviceName);
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
              <div className="socket-panel">
                <div className="service-card-header socket-bar">
                  <span>🔌</span>
                  <span>Socket 服务</span>
                </div>

                {socketService && (
                  <div className="service-item">
                    <div className="service-left">
                      <span className="service-icon">🔌</span>
                      <div className="service-info">
                        <span className="service-name">Socket 服务</span>
                        <span 
                          className="service-url"
                          onClick={() => socketService.running && copyToClipboard(`http://localhost:${socketService.port || 44386}`, 'Socket URL')}
                        >
                          {socketService.running 
                            ? `localhost:${socketService.port || 44386}` 
                            : '未运行'}
                        </span>
                      </div>
                    </div>
                    <div className="service-right">
                      <div 
                        className={`toggle-switch ${socketService.running ? 'active' : ''}`}
                        onClick={() => !loading && handleToggleService('socket')}
                      ></div>
                    </div>
                  </div>
                )}

                {services.length === 0 && (
                  <div className="offline-hint" style={{ padding: '20px' }}>
                    <span className="hint-text">暂无服务配置</span>
                  </div>
                )}
              </div>

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

                <div className="action-buttons">
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
                      {isOnline ? 'Anvil 本地网络' : '网络未启动'}
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
              </div>

              {/* 操作按钮 */}
              <div className="action-buttons">
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

              {isOnline && (
                <FaucetPanel
                  onSuccess={() => {
                    setBlockRefreshKey((prev) => prev + 1);
                    setAccountsRefreshKey((prev) => prev + 1);
                  }}
                />
              )}

              {/* 离线提示 */}
              {!isOnline && (
                <div className="offline-hint">
                  <span className="hint-icon">🔌</span>
                  <span className="hint-text">
                    点击「启动测试网」开始使用<br />
                    本地以太坊测试环境
                  </span>
                </div>
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
