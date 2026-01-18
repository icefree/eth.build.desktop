import React from 'react';
import './ServicesPanel.css';

const ServicesPanel = ({ services, onToggleService, onStartAll, onStopAll, loading }) => {
  const getServiceIcon = (serviceName) => {
    switch (serviceName) {
      case 'geth':
        return '🔗';
      case 'socket':
        return '🔌';
      case 'proxy':
        return '🔄';
      default:
        return '⚙️';
    }
  };

  const getServiceDisplayName = (serviceName) => {
    switch (serviceName) {
      case 'geth':
        return 'Geth 节点';
      case 'socket':
        return 'Socket 服务器';
      case 'proxy':
        return '代理服务器';
      default:
        return serviceName;
    }
  };

  const getServicePort = (serviceName) => {
    switch (serviceName) {
      case 'geth':
        return '8545';
      case 'socket':
        return '44387';
      case 'proxy':
        return '48451';
      default:
        return '-';
    }
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
                  <span className="service-port">端口: {service.port || getServicePort(service.name)}</span>
                  {service.pid && (
                    <span className="service-pid">PID: {service.pid}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="service-status">
              <span className={`status-indicator ${service.running ? 'online' : 'offline'}`}>
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
          💡 提示: Geth 节点需要先启动,然后才能启动代理服务器
        </p>
      </div>
    </div>
  );
};

export default ServicesPanel;
