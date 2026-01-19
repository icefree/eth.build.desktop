import React, { useState } from 'react';
import './NetworkStatus.css';

const NetworkStatus = ({ status }) => {
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
              <span className="value copyable" onClick={() => copyToClipboard(status.rpc_url, 'RPC URL')}>
                {status.rpc_url}
                <span className="copy-icon">📋</span>
              </span>
            </div>
            <div className="status-row">
              <span className="label">Chain ID:</span>
              <span className="value copyable" onClick={() => copyToClipboard(String(status.chain_id), 'Chain ID')}>
                {status.chain_id}
                <span className="copy-icon">📋</span>
              </span>
            </div>
            <div className="status-row">
              <span className="label">WS URL:</span>
              <span className="value copyable" onClick={() => copyToClipboard(status.ws_url, 'WS URL')}>
                {status.ws_url}
                <span className="copy-icon">📋</span>
              </span>
            </div>
          </div>
        )}

        {copySuccess && (
          <div className="copy-toast">
            ✅ {copySuccess} 已复制
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkStatus;
