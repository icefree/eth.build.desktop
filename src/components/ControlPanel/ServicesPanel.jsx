import React, { useState } from 'react';
import { updateServicePort } from '../../hooks/useTauri';
import './ServicesPanel.css';

const ServicesPanel = ({ services, onToggleService, onStartAll, onStopAll, loading }) => {
  const [editingPort, setEditingPort] = useState(null);
  const [portValue, setPortValue] = useState('');
  const [saveStatus, setSaveStatus] = useState(null);

  const getServiceIcon = (serviceName) => {
    switch (serviceName) {
      case 'geth':
        return '🔗';
      case 'socket':
        return '🔌';
      case 'solc':
        return '📜';
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
      case 'solc':
        return 'Solidity 编译器';
      case 'proxy':
        return '代理服务器';
      default:
        return serviceName;
    }
  };

  const handleEditPort = (service) => {
    const currentPort = service.port || getServiceDefaultPort(service.name);
    setEditingPort(service.name);
    setPortValue(currentPort.toString());
    setSaveStatus(null);
  };

  const handleCancelEdit = () => {
    setEditingPort(null);
    setPortValue('');
    setSaveStatus(null);
  };

  const handleSavePort = async (serviceName) => {
    const newPort = parseInt(portValue, 10);

    if (isNaN(newPort) || newPort < 1 || newPort > 65535) {
      setSaveStatus({ type: 'error', message: '端口号必须在 1-65535 之间' });
      return;
    }

    try {
      await updateServicePort(serviceName, newPort);
      setSaveStatus({ type: 'success', message: `端口已更新为 ${newPort}` });

      // 2秒后关闭编辑模式
      setTimeout(() => {
        setEditingPort(null);
        setPortValue('');
        setSaveStatus(null);
      }, 2000);

      // 触发状态刷新
      window.location.reload();
    } catch (error) {
      setSaveStatus({ type: 'error', message: `更新失败: ${error}` });
    }
  };

  const getServiceDefaultPort = (serviceName) => {
    switch (serviceName) {
      case 'geth':
        return 8545;
      case 'socket':
        return 44387;
      case 'solc':
        return 48452;
      case 'proxy':
        return 48451;
      default:
        return 0;
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

      {saveStatus && (
        <div className={`port-save-status ${saveStatus.type}`}>
          {saveStatus.type === 'success' ? '✅' : '❌'} {saveStatus.message}
        </div>
      )}

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
                  {editingPort === service.name ? (
                    <div className="port-edit-container">
                      <span className="port-label">端口:</span>
                      <input
                        type="number"
                        min="1"
                        max="65535"
                        value={portValue}
                        onChange={(e) => setPortValue(e.target.value)}
                        className="port-input"
                        disabled={loading}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSavePort(service.name);
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                      />
                      <button
                        className="port-save-btn"
                        onClick={() => handleSavePort(service.name)}
                        disabled={loading}
                      >
                        ✓
                      </button>
                      <button
                        className="port-cancel-btn"
                        onClick={handleCancelEdit}
                        disabled={loading}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span className="service-port">
                      端口: {service.port || getServiceDefaultPort(service.name)}
                      <button
                        className="port-edit-btn"
                        onClick={() => handleEditPort(service)}
                        disabled={loading || service.running}
                        title="修改端口（服务停止后才能修改）"
                      >
                        ✏️
                      </button>
                    </span>
                  )}
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
          💡 提示: Geth 节点需要先启动,然后才能启动代理服务器。服务运行时无法修改端口。
        </p>
      </div>
    </div>
  );
};

export default ServicesPanel;
