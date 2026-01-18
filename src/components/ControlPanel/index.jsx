import React, { useState, useEffect } from 'react';
import { getNetworkStatus, startLocalNetwork, stopLocalNetwork, mineBlock } from '../../hooks/useTauri';
import NetworkStatus from './NetworkStatus';
import AccountsPanel from './AccountsPanel';
import MiningControl from './MiningControl';
import './index.css';

const ControlPanel = () => {
  const [networkStatus, setNetworkStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadStatus = async () => {
    try {
      const status = await getNetworkStatus();
      setNetworkStatus(status);
    } catch (err) {
      console.error('Failed to get network status:', err);
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

        {networkStatus?.is_running && (
          <>
            <AccountsPanel />
            <MiningControl onQuickMine={handleQuickMine} />
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
  );
};

export default ControlPanel;
