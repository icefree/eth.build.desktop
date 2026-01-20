import React, { useState, useEffect } from 'react';
import { getConfig, updateConfig, autoStartServices } from '../../hooks/useTauri';
import './ConfigPanel.css';
const { emitSocketConfigChange } = require('../../utils/socketConfig')

const ConfigPanel = ({ onConfigUpdate }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoStarting, setAutoStarting] = useState(false);
  const [message, setMessage] = useState(null);
  const [priceTestStatus, setPriceTestStatus] = useState(null);
  const [priceTesting, setPriceTesting] = useState(false);

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

  const handleApiKeyChange = (field, value) => {
    if (!config) return;

    const newConfig = { ...config };
    newConfig.api_keys = { ...(newConfig.api_keys || {}) };
    newConfig.api_keys[field] = value;
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

      const socketPort = config?.services?.socket?.port;
      if (socketPort) {
        emitSocketConfigChange(socketPort);
      }

      if (onConfigUpdate) {
        onConfigUpdate(config);
      }
    } catch (err) {
      setMessage({ type: 'error', text: '保存失败: ' + err.toString() });
    } finally {
      setSaving(false);
    }
  };

  const handleTestPrice = async () => {
    if (!config) return;

    setPriceTesting(true);
    setPriceTestStatus(null);

    try {
      const apiKey = config.api_keys?.coinmarketcap?.trim();
      if (!apiKey) {
        setPriceTestStatus({ type: 'error', text: '请先填写 CoinMarketCap Key' });
        return;
      }

      await updateConfig(config);
      const response = await fetch(
        'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=ETH',
        {
          headers: {
            'X-CMC_PRO_API_KEY': apiKey
          }
        }
      );
      const raw = await response.text();
      let data = null;
      try {
        data = JSON.parse(raw);
      } catch (e) {
        data = raw;
      }

      if (!response.ok) {
        setPriceTestStatus({
          type: 'error',
          text: typeof data === 'string' ? data : '获取价格失败'
        });
        return;
      }

      const price = data?.data?.ETH?.quote?.USD?.price ?? null;

      if (price == null) {
        setPriceTestStatus({
          type: 'error',
          text: '返回数据中未找到价格'
        });
        return;
      }

      setPriceTestStatus({
        type: 'success',
        text: `当前 ETH 价格: ${price} USD`
      });
    } catch (err) {
      setPriceTestStatus({ type: 'error', text: `请求失败: ${err.toString()}` });
    } finally {
      setPriceTesting(false);
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

        {/* API Keys */}
        <div className="config-section">
          <h5>🔑 API Keys</h5>
          <div className="config-field">
            <label>CoinMarketCap Key:</label>
            <div className="api-key-input">
              <input
                type="password"
                value={config.api_keys?.coinmarketcap || ''}
                onChange={(e) => handleApiKeyChange('coinmarketcap', e.target.value)}
                placeholder="coinmarketcap.key"
              />
              <button
                className="config-btn test-btn"
                onClick={handleTestPrice}
                disabled={priceTesting}
              >
                {priceTesting ? '测试中...' : '测试价格'}
              </button>
            </div>
          </div>
          {priceTestStatus && (
            <div className={`config-message ${priceTestStatus.type}`}>
              {priceTestStatus.text}
            </div>
          )}
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
