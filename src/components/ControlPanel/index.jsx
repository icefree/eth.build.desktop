import React, { useState, useEffect } from 'react';
import { getNetworkStatus, startLocalNetwork, stopLocalNetwork, mineBlock } from '../../hooks/useTauri';
import { getServicesStatus, startService, stopService, startAllServices, stopAllServices, getAutoStartServices, autoStartServices } from '../../hooks/useTauri';
import NetworkStatus from './NetworkStatus';
import AccountsPanel from './AccountsPanel';
import MiningControl from './MiningControl';
import ServicesPanel from './ServicesPanel';
import ConfigPanel from './ConfigPanel';
import './index.css';

const ControlPanel = ({ open, onClose }) => {
  const [networkStatus, setNetworkStatus] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [autoStartPrompt, setAutoStartPrompt] = useState(null);

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

  const checkAutoStart = async () => {
    try {
      const autoServices = await getAutoStartServices();
      const runningServices = services.filter(s => s.running).map(s => s.name);

      // 找出需要自动启动但还没运行的服务
      const needStart = autoServices.filter(name => !runningServices.includes(name));

      if (needStart.length > 0) {
        setAutoStartPrompt({
          services: needStart,
          message: `检测到 ${needStart.length} 个服务配置为自动启动但尚未运行`
        });
      }
    } catch (err) {
      console.error('Failed to check auto-start:', err);
    }
  };

  useEffect(() => {
    if (open) {
      loadStatus();
    }
    const interval = setInterval(loadStatus, 5000);

    // 延迟检查自动启动,避免启动时立即弹出
    const timer = setTimeout(() => {
      if (open) {
        checkAutoStart();
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
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

  const handleAutoStartServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const started = await autoStartServices();
      await loadStatus();

      // 显示成功消息
      setError(`✅ 已启动服务: ${started.join(', ')}`);

      // 3秒后清除消息
      setTimeout(() => setError(null), 3000);

      setAutoStartPrompt(null);
    } catch (err) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const dismissAutoStartPrompt = () => {
    setAutoStartPrompt(null);
  };

  if (!open) return null;

  return (
    <div className="control-panel-overlay" onClick={onClose}>
      <div className="control-panel" onClick={(e) => e.stopPropagation()}>
        <div className="control-panel-header">
          <h2>⚙️ 控制面板</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
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
    </div>
  );
};

export default ControlPanel;
