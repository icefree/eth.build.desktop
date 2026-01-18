import React, { useState, useEffect } from 'react';
import { getConfig, updateConfig, autoStartServices } from '../../hooks/useTauri';
import './ConfigPanel.css';

const ConfigPanel = ({ onConfigUpdate }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoStarting, setAutoStarting] = useState(false);
  const [message, setMessage] = useState(null);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const cfg = await getConfig();
      setConfig(cfg);
    } catch (err) {
      console.error('Failed to load config:', err);
      setMessage({ type: 'error', text: '加载配置失败: ' + err.toString() });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleServiceChange = (serviceName, field, value) => {
    if (!config) return;

    const newConfig = { ...config };
    newConfig.services[serviceName][field] = value;
    setConfig(newConfig);
  };

  const handleNetworkChange = (field, value) => {
    if (!config) return;

    const newConfig = { ...config };
    newConfig.network[field] = value;
    setConfig(newConfig);
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    setMessage(null);

    try {
      await updateConfig(config);
      setMessage({ type: 'success', text: '配置已保存,重启应用后生效' });

      if (onConfigUpdate) {
        onConfigUpdate(config);
      }
    } catch (err) {
      setMessage({ type: 'error', text: '保存失败: ' + err.toString() });
    } finally {
      setSaving(false);
    }
  };

  const handleAutoStart = async () => {
    setAutoStarting(true);
    setMessage(null);

    try {
      const started = await autoStartServices();
      setMessage({
        type: 'success',
        text: `已启动服务: ${started.join(', ')}`
      });
    } catch (err) {
      setMessage({ type: 'error', text: '自动启动失败: ' + err.toString() });
    } finally {
      setAutoStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="config-panel">
        <div className="config-loading">加载配置中...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="config-panel">
        <div className="config-error">无法加载配置</div>
      </div>
    );
  }

  return (
    <div className="config-panel">
      <div className="config-header">
        <h4>🔧 系统配置</h4>
        <div className="config-actions">
          <button
            className="config-btn auto-start-btn"
            onClick={handleAutoStart}
            disabled={autoStarting}
          >
            {autoStarting ? '启动中...' : '▶️ 自动启动服务'}
          </button>
          <button
            className="config-btn save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '保存中...' : '💾 保存配置'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`config-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="config-content">
        {/* 网络配置 */}
        <div className="config-section">
          <h5>🌐 网络配置</h5>
          <div className="config-field">
            <label>Chain ID:</label>
            <input
              type="number"
              value={config.network.chain_id}
              onChange={(e) => handleNetworkChange('chain_id', parseInt(e.target.value))}
            />
          </div>
          <div className="config-field">
            <label>账户数量:</label>
            <input
              type="number"
              value={config.network.accounts}
              onChange={(e) => handleNetworkChange('accounts', parseInt(e.target.value))}
            />
          </div>
          <div className="config-field">
            <label>初始余额 (ETH):</label>
            <input
              type="text"
              value={config.network.balance}
              onChange={(e) => handleNetworkChange('balance', e.target.value)}
            />
          </div>
        </div>

        {/* 服务配置 */}
        <div className="config-section">
          <h5>⚙️ 服务配置</h5>
          {Object.entries(config.services).map(([name, serviceConfig]) => (
            <div key={name} className="service-config">
              <div className="service-config-header">
                <span className="service-name">
                  {name === 'geth' && '🔗 Geth 节点'}
                  {name === 'socket' && '🔌 Socket 服务器'}
                  {name === 'proxy' && '🔄 代理服务器'}
                </span>
              </div>

              <div className="config-field">
                <label>端口:</label>
                <input
                  type="number"
                  value={serviceConfig.port}
                  onChange={(e) => handleServiceChange(name, 'port', parseInt(e.target.value))}
                />
              </div>

              <div className="config-field-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={serviceConfig.enabled}
                    onChange={(e) => handleServiceChange(name, 'enabled', e.target.checked)}
                  />
                  启用服务
                </label>
              </div>

              <div className="config-field-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={serviceConfig.auto_start}
                    onChange={(e) => handleServiceChange(name, 'auto_start', e.target.checked)}
                  />
                  自动启动
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="config-footer">
        <p className="footer-hint">
          💡 提示: 修改端口后需要重启服务才能生效
        </p>
      </div>
    </div>
  );
};

export default ConfigPanel;
