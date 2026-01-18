import React, { useState } from 'react';
import { setAutoMine } from '../../hooks/useTauri';
import './MiningControl.css';

const MiningControl = ({ onQuickMine }) => {
  const [autoMine, setAutoMine] = useState(false);
  const [interval, setInterval] = useState(5000);
  const [loading, setLoading] = useState(false);

  const handleToggleAutoMine = async () => {
    setLoading(true);
    try {
      await setAutoMine(!autoMine, interval);
      setAutoMine(!autoMine);
    } catch (err) {
      console.error('Failed to toggle auto mine:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mining-control">
      <h4>⛏️ 挖矿控制</h4>

      <div className="mining-buttons">
        <button
          className="quick-mine-btn"
          onClick={onQuickMine}
          disabled={autoMine}
        >
          ⚡ 快速挖矿
        </button>

        <button
          className={`auto-mine-btn ${autoMine ? 'active' : ''}`}
          onClick={handleToggleAutoMine}
          disabled={loading}
        >
          {autoMine ? '⏸️ 停止自动挖矿' : '▶️ 开启自动挖矿'}
        </button>
      </div>

      <div className="mining-settings">
        <div className="setting-row">
          <label>自动挖矿间隔 (毫秒):</label>
          <select
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            disabled={autoMine}
          >
            <option value={1000}>1 秒</option>
            <option value={5000}>5 秒</option>
            <option value={10000}>10 秒</option>
            <option value={30000}>30 秒</option>
            <option value={60000}>60 秒</option>
          </select>
        </div>
      </div>

      {autoMine && (
        <div className="mining-status">
          <span className="status-indicator"></span>
          <span>自动挖矿运行中 (间隔: {interval / 1000}秒)</span>
        </div>
      )}
    </div>
  );
};

export default MiningControl;
