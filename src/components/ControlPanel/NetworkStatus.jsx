import React from 'react';
import './NetworkStatus.css';

const NetworkStatus = ({ status }) => {
  if (!status) {
    return (
      <div className="network-status">
        <h4>网络状态</h4>
        <div className="status-loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="network-status">
      <h4>网络状态</h4>
      <div className="status-content">
        <div className="network-status-indicator">
          <span className={`status-dot ${status.is_running ? 'online' : 'offline'}`}></span>
          <span className="status-text">
            {status.is_running ? '在线' : '离线'}
          </span>
        </div>

        {status.is_running && (
          <div className="status-details">
            <div className="status-row">
              <span className="label">RPC URL:</span>
              <span className="value">{status.rpc_url}</span>
            </div>
            <div className="status-row">
              <span className="label">Chain ID:</span>
              <span className="value">{status.chain_id}</span>
            </div>
            <div className="status-row">
              <span className="label">WS URL:</span>
              <span className="value">{status.ws_url}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkStatus;
