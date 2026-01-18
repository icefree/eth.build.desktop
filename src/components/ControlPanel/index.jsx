import React, { useState, useEffect } from 'react';
import { getNetworkStatus, startLocalNetwork, stopLocalNetwork, mineBlock } from '../../hooks/useTauri';
import { getServicesStatus, startService, stopService, startAllServices, stopAllServices } from '../../hooks/useTauri';
import NetworkStatus from './NetworkStatus';
import AccountsPanel from './AccountsPanel';
import MiningControl from './MiningControl';
import ServicesPanel from './ServicesPanel';
import './index.css';

const ControlPanel = () => {
  const [networkStatus, setNetworkStatus] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadStatus = async () => {
    try {
      const [netStatus, svcStatus] = await Promise.all([
        getNetworkStatus(),
        getServicesStatus()
      ]);
      setNetworkStatus(netStatus);
      setServices(svcStatus || []);
    } catch (err) {
      console.error('Failed to get status:', err);
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, []);

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

  const handleQuickMine = async () => {
    try {
      await mineBlock();
      await loadStatus();
    } catch (err) {
      setError(err.toString());
    }
  };

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

  return (
    <div className="control-panel">
      <div className="control-panel-header">
        <h2>⚙️ 控制面板</h2>
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
            <button
              className="stop-btn"
              onClick={handleStopNetwork}
              disabled={loading}
            >
              {loading ? '停止中...' : '⏹️ 停止网络'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      <div className="control-panel-content">
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
            <AccountsPanel />
            <MiningControl onQuickMine={handleQuickMine} />
          </>
        )}

        {!networkStatus?.is_running && (
          <div className="network-offline">
            <p>🔌 网络未启动</p>
            <p className="hint">点击"启动网络"���钮开始使用本地以太坊测试网络</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;
