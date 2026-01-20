import React, { useState } from 'react';
import './ServicesPanel.css';

const ServicesPanel = ({ services, onToggleService, onStartAll, onStopAll, loading }) => {
  const [copySuccess, setCopySuccess] = useState(null);

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const getServiceIcon = (serviceName) => {
    switch (serviceName) {
      case 'socket':
        return '🔌';
      default:
        return '⚙️';
    }
  };

  const getServiceDisplayName = (serviceName) => {
    switch (serviceName) {
      case 'socket':
        return 'Socket 服务器';
      default:
        return serviceName;
    }
  };

  const getServiceDefaultPort = (serviceName) => {
    switch (serviceName) {
      case 'socket':
        return 44386;
      default:
        return 0;
    }
  };

  const getServiceUrl = (service) => {
    const port = service.port || getServiceDefaultPort(service.name);
    return `http://localhost:${port}`;
  };

  const runningCount = services.filter(s => s.running).length;
  const totalCount = services.length;

  return (
    <div className="services-panel">
      <div className="services-header">
        <h4>🖥️ 后端服务</h4>
        <div className="services-status">
          <span className="status-count">
            {runningCount}/{totalCount} 运行中
          </span>
        </div>
      </div>

      <div className="services-controls">
        <button
          className="control-btn start-all-btn"
          onClick={onStartAll}
          disabled={loading || runningCount === totalCount}
        >
          ▶️ 全部启动
        </button>
        <button
          className="control-btn stop-all-btn"
          onClick={onStopAll}
          disabled={loading || runningCount === 0}
        >
          ⏹️ 全部停止
        </button>
      </div>

      <div className="services-list">
        {services.map((service) => (
          <div
            key={service.name}
            className={`service-item ${service.running ? 'running' : 'stopped'}`}
          >
            <div className="service-info">
              <span className="service-icon">{getServiceIcon(service.name)}</span>
              <div className="service-details">
                <div className="service-name">{getServiceDisplayName(service.name)}</div>
                <div className="service-meta">
                  <>
                    <span className="service-port">
                      端口: {service.port || getServiceDefaultPort(service.name)}
                    </span>
                    {service.running && (
                      <span 
                        className="service-url copyable"
                        onClick={() => copyToClipboard(getServiceUrl(service), '访问地址')}
                        title="点击复制访问地址"
                      >
                        {getServiceUrl(service)}
                        <span className="copy-icon">📋</span>
                      </span>
                    )}
                  </>
                </div>
              </div>
            </div>

            <div className="service-status">
              <span className={`service-status-indicator ${service.running ? 'online' : 'offline'}`}>
                {service.running ? '● 运行中' : '○ 已停止'}
              </span>

              <button
                className={`toggle-btn ${service.running ? 'stop' : 'start'}`}
                onClick={() => onToggleService(service.name)}
                disabled={loading}
              >
                {service.running ? '⏹️ 停止' : '▶️ 启动'}
              </button>
            </div>
          </div>
        ))}

        {services.length === 0 && (
          <div className="no-services">
            <p>暂无服务配置</p>
          </div>
        )}
      </div>

      <div className="services-footer">
        <p className="footer-hint">
          💡 提示: 服务启动后可点击地址复制。
        </p>
      </div>

      {copySuccess && (
        <div className="copy-toast">
          ✅ {copySuccess} 已复制
        </div>
      )}
    </div>
  );
};

export default ServicesPanel;
