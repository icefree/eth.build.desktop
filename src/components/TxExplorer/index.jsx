import React, { useState, useEffect } from 'react';
import { getTransactions, getTransactionByHash } from '../../hooks/useTauri';
import './index.css';

const TxExplorer = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [error, setError] = useState(null);

  const loadTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const txs = await getTransactions(50);
      setTransactions(txs);
    } catch (err) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
    // 每10秒刷新一次
    const interval = setInterval(loadTransactions, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleTxClick = async (hash) => {
    try {
      const tx = await getTransactionByHash(hash);
      setSelectedTx(tx);
    } catch (err) {
      console.error('Failed to load transaction details:', err);
    }
  };

  const formatAddress = (addr) => {
    if (!addr || addr === 'Contract Creation') return addr;
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  const formatValue = (value) => {
    try {
      const wei = BigInt(value);
      const eth = Number(wei) / 1e18;
      return `${eth.toFixed(4)} ETH`;
    } catch {
      return value;
    }
  };

  return (
    <div className="tx-explorer">
      <div className="tx-explorer-header">
        <h3>📋 交易浏览器</h3>
        <button
          className="refresh-btn"
          onClick={loadTransactions}
          disabled={loading}
        >
          {loading ? '刷新中...' : '🔄 刷新'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      <div className="tx-list">
        {transactions.length === 0 ? (
          <div className="empty-state">
            暂无交易
          </div>
        ) : (
          <table className="tx-table">
            <thead>
              <tr>
                <th>交易哈希</th>
                <th>区块</th>
                <th>从</th>
                <th>到</th>
                <th>价值</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr
                  key={tx.hash}
                  className="tx-row"
                  onClick={() => handleTxClick(tx.hash)}
                >
                  <td className="tx-hash">{formatAddress(tx.hash)}</td>
                  <td className="tx-block">#{tx.block_number}</td>
                  <td className="tx-address">{formatAddress(tx.from)}</td>
                  <td className="tx-address">{formatAddress(tx.to)}</td>
                  <td className="tx-value">{formatValue(tx.value)}</td>
                  <td className={`tx-status tx-status-${tx.status}`}>
                    {tx.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedTx && (
        <div className="tx-detail-modal" onClick={() => setSelectedTx(null)}>
          <div className="tx-detail-content" onClick={(e) => e.stopPropagation()}>
            <div className="tx-detail-header">
              <h4>交易详情</h4>
              <button
                className="close-btn"
                onClick={() => setSelectedTx(null)}
              >
                ✕
              </button>
            </div>
            <div className="tx-detail-body">
              <div className="detail-row">
                <span className="detail-label">交易哈希:</span>
                <span className="detail-value">{selectedTx.hash}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">区块:</span>
                <span className="detail-value">#{selectedTx.block_number}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">从:</span>
                <span className="detail-value">{selectedTx.from}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">到:</span>
                <span className="detail-value">{selectedTx.to}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">价值:</span>
                <span className="detail-value">{formatValue(selectedTx.value)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Gas Price:</span>
                <span className="detail-value">{selectedTx.gas_price}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Gas Used:</span>
                <span className="detail-value">{selectedTx.gas_used}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">状态:</span>
                <span className={`detail-value tx-status-${selectedTx.status}`}>
                  {selectedTx.status}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">时间戳:</span>
                <span className="detail-value">
                  {new Date(selectedTx.timestamp * 1000).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TxExplorer;
