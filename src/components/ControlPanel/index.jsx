import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getNetworkStatus, startLocalNetwork, stopLocalNetwork, mineBlock } from '../../hooks/useTauri';
import { getServicesStatus, startService, stopService, startAllServices, stopAllServices } from '../../hooks/useTauri';
import NetworkStatus from './NetworkStatus';
import AccountsPanel from './AccountsPanel';
import ServicesPanel from './ServicesPanel';
import BlockExplorer from './BlockExplorer';
import FaucetPanel from './FaucetPanel';
import './index.css';

const ControlPanel = ({ open, onClose }) => {
  const [networkStatus, setNetworkStatus] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [blockRefreshKey, setBlockRefreshKey] = useState(0);
  const [accountsRefreshKey, setAccountsRefreshKey] = useState(0);
  const [blockResetKey, setBlockResetKey] = useState(0);
  const [activeTab, setActiveTab] = useState('accounts');
  const servicesRef = useRef([]);

  const loadStatus = async () => {
    try {
      const [netStatus, svcStatus] = await Promise.all([
        getNetworkStatus(),
        getServicesStatus()
      ]);
      setNetworkStatus(netStatus);
      const nextServices = Array.isArray(svcStatus) ? svcStatus : [];
      servicesRef.current = nextServices;
      setServices(nextServices);
    } catch (err) {
      console.error('Failed to get status:', err);
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    let active = true;

    const refresh = async () => {
      if (!active) return;
      await loadStatus();
    };

    refresh();

    return () => {
      active = false;
    };
  }, [open]);

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
      // 先停止网络
      await stopLocalNetwork();
      // 等待一小段时间确保网络完全停止
      await new Promise(resolve => setTimeout(resolve, 500));
      // 使用相同配置重新启动网络
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

  const handleStartAllServices = async () => {
    setLoading(true);
    setError(null);
    try {
      await startAllServices();
      await loadStatus();
    } catch (err) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleStopAllServices = async () => {
    setLoading(true);
    setError(null);
    try {
      await stopAllServices();
      await loadStatus();
    } catch (err) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="control-panel-overlay">
      <div className="control-panel" onClick={(e) => e.stopPropagation()}>
        <div className="control-panel-header">
          <h2>⚙️ 控制面板</h2>
          <div className="header-controls">
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        <div className="control-panel-content">
          <div className="network-controls">
            {!networkStatus?.is_running ? (
              <button
                className="start-btn"
                onClick={handleStartNetwork}
                disabled={loading}
              >
                {loading ? '启动中...' : '▶️ 启动网络'}
              </button>
            ) : (
              <div className="network-action-buttons">
                <button
                  className="stop-btn"
                  onClick={handleStopNetwork}
                  disabled={loading}
                >
                  {loading ? '停止中...' : '⏹️ 停止网络'}
                </button>
                <button
                  className="reset-btn"
                  onClick={handleResetNetwork}
                  disabled={loading}
                >
                  {loading ? '重置中...' : '🔄 重置网络'}
                </button>
                <button
                  className="mine-btn"
                  onClick={handleQuickMine}
                  disabled={loading}
                >
                  ⚡ 手动挖矿
                </button>
              </div>
            )}
          </div>

          <NetworkStatus status={networkStatus} />

          {/* 服务管理面板 */}
          <ServicesPanel
            services={services}
            onToggleService={handleToggleService}
            onStartAll={handleStartAllServices}
            onStopAll={handleStopAllServices}
            loading={loading}
          />

          {networkStatus?.is_running && (
            <>
              <div className="control-tabs">
                <button
                  className={`control-tab ${activeTab === 'accounts' ? 'active' : ''}`}
                  onClick={() => setActiveTab('accounts')}
                >
                  账户与水龙头
                </button>
                <button
                  className={`control-tab ${activeTab === 'blocks' ? 'active' : ''}`}
                  onClick={() => setActiveTab('blocks')}
                >
                  区块列表
                </button>
              </div>

              {activeTab === 'accounts' && (
                <>
                  <AccountsPanel refreshToken={accountsRefreshKey} />
                  <FaucetPanel
                    onSuccess={() => {
                      setBlockRefreshKey((prev) => prev + 1);
                      setAccountsRefreshKey((prev) => prev + 1);
                    }}
                  />
                </>
              )}

              {activeTab === 'blocks' && (
                <>
                  <BlockExplorer refreshToken={blockRefreshKey} resetToken={blockResetKey} />
                </>
              )}
            </>
          )}

          {!networkStatus?.is_running && (
            <div className="network-offline">
              <p>🔌 网络未启动</p>
              <p className="hint">点击"启动网络"按钮开始使用本地以太坊测试网络</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
