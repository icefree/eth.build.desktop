/* global BigInt */
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
      return `${eth.toFixed(6)} ETH`;
    } catch {
      return value;
    }
  };

  const formatGasFee = (gasUsed, gasPrice) => {
    try {
      const used = BigInt(gasUsed);
      const price = BigInt(gasPrice);
      const fee = used * price;
      const eth = Number(fee) / 1e18;
      return `${eth.toFixed(6)} ETH`;
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="tx-explorer">
      <div className="tx-explorer-header">
        <h3>📋 Transaction Explorer</h3>
        <button
          className="refresh-btn"
          onClick={loadTransactions}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : '🔄 Refresh'}
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
            No transactions
          </div>
        ) : (
          <table className="tx-table">
            <thead>
              <tr>
                <th>Transaction Hash</th>
                <th>Block</th>
                <th>From</th>
                <th>To</th>
                <th>Value</th>
                <th>Status</th>
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
              <h4>Transaction Detail</h4>
              <button
                className="close-btn"
                onClick={() => setSelectedTx(null)}
              >
                ✕
              </button>
            </div>
            <div className="tx-detail-body">
              <div className="detail-row">
                <span className="detail-label">Transaction Hash:</span>
                <span className="detail-value">{selectedTx.hash}</span>
              </div>
              {selectedTx.block_number !== undefined && (
                <div className="detail-row">
                  <span className="detail-label">Block Number:</span>
                  <span className="detail-value">#{selectedTx.block_number}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">From:</span>
                <span className="detail-value">{selectedTx.from}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">To:</span>
                <span className="detail-value">{selectedTx.to}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Value:</span>
                <span className="detail-value">{formatValue(selectedTx.value)}</span>
              </div>
              {selectedTx.gas_price && (
                <div className="detail-row">
                  <span className="detail-label">Gas Price:</span>
                  <span className="detail-value">{selectedTx.gas_price}</span>
                </div>
              )}
              {selectedTx.gas_used && (
                <div className="detail-row">
                  <span className="detail-label">Gas Used:</span>
                  <span className="detail-value">{selectedTx.gas_used}</span>
                </div>
              )}
              {(selectedTx.gas_used && selectedTx.gas_price) && (
                <div className="detail-row">
                  <span className="detail-label">Gas Fee:</span>
                  <span className="detail-value">{formatGasFee(selectedTx.gas_used, selectedTx.gas_price)}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span className={`detail-value tx-status-${selectedTx.status}`}>
                  {selectedTx.status}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Timestamp:</span>
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
