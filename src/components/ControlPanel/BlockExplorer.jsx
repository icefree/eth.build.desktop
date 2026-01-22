/* global BigInt */
import React, { useState, useEffect, useCallback } from 'react';
import { getBlocks, getBlockByNumber, getTransactionByHash, searchBlockchain } from '../../hooks/useTauri';
import './BlockExplorer.css';

const BlockExplorer = ({ refreshToken, resetToken }) => {
  const [blocks, setBlocks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedTx, setSelectedTx] = useState(null);
  const [copySuccess, setCopySuccess] = useState(null);

  const loadBlocks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getBlocks(currentPage, pageSize);
      const blockList = Array.isArray(result) ? result : (result?.blocks || []);
      setBlocks(blockList);
    } catch (err) {
      setError(err.toString());
      console.error('Failed to load blocks:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    loadBlocks();
  }, [loadBlocks, refreshToken]);

  useEffect(() => {
    if (resetToken === undefined) return;
    setSelectedBlock(null);
    setSelectedTx(null);
    setBlocks([]);
    setSearchQuery('');
    setError(null);
    setCurrentPage(1);
  }, [resetToken]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setCurrentPage(1);
      setSearchQuery('');
      setSelectedBlock(null);
      setSelectedTx(null);
      loadBlocks();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await searchBlockchain(searchQuery.trim());
      if (result?.type === 'block' && result.data) {
        setSelectedTx(null);
        setSelectedBlock(result.data);
      } else if (result?.type === 'transaction' && result.data) {
        setSelectedBlock(null);
        setSelectedTx(result.data);
      } else {
        setError('No matching block or transaction found');
      }
    } catch (err) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleViewBlock = async (blockNumber) => {
    setLoading(true);
    setError(null);
    try {
      const blockDetail = await getBlockByNumber(blockNumber);
      setSelectedBlock(blockDetail);
    } catch (err) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleViewTransaction = async (txHash) => {
    setLoading(true);
    setError(null);
    try {
      const txDetail = await getTransactionByHash(txHash);
      setSelectedTx(txDetail);
    } catch (err) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatValue = (value) => {
    try {
      const wei = BigInt(value);
      const eth = Number(wei) / 1e18;
      if (eth === 0) return '0 ETH';
      return `${eth.toFixed(6)} ETH`;
    } catch {
      return value || 'N/A';
    }
  };

  const formatGwei = (value) => {
    try {
      const wei = BigInt(value);
      const gwei = Number(wei) / 1e9;
      return `${gwei.toFixed(2)} Gwei`;
    } catch {
      return value || '0 Gwei';
    }
  };

  const calculateFee = (gasUsed, gasPrice) => {
    try {
      const used = BigInt(gasUsed);
      const price = BigInt(gasPrice);
      const feeWei = used * price;
      return formatValue(feeWei.toString());
    } catch {
      return 'N/A';
    }
  };

  const formatHash = (hash) => {
    if (!hash) return 'N/A';
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  };

  const copyToClipboard = async (text, label = 'Content') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div className="block-explorer">
      <div className="block-explorer-header">
        <h4>Blocks List</h4>
      </div>

      {/* 搜索框 */}
      <div className="search-container">
        <div className="search-input-wrapper">
          <input
            className="search-input"
            type="text"
            placeholder="Search by block number or transaction hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="search-btn" onClick={handleSearch} disabled={loading}>
            🔍
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', color: '#f87171', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* 区块列表 */}
      {!selectedBlock && !selectedTx && (
        <>
          <div className="blocks-list">
            {loading ? (
              <div className="blocks-loading">Loading...</div>
            ) : blocks.length === 0 ? (
              <div className="blocks-empty">No block data</div>
            ) : (
              blocks.map((block) => (
                <div 
                  key={block.number} 
                  className="block-item"
                  onClick={() => handleViewBlock(block.number)}
                >
                  <div className="block-info">
                    <span className="block-number">#{block.number}</span>
                    <span className="block-hash" title={block.hash}>
                      {formatHash(block.hash)}
                    </span>
                  </div>
                  <div className="block-meta">
                    <span className="block-time">{formatTimestamp(block.timestamp)}</span>
                    <span className="block-txs">{block.transaction_count} txs</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 分页 */}
          {blocks.length > 0 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || loading}
              >
                ◀
              </button>
              <span className="pagination-info">Page {currentPage}</span>
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={blocks.length < pageSize || loading}
              >
                ▶
              </button>
            </div>
          )}
        </>
      )}

      {/* 区块详情弹窗 */}
      {selectedBlock && (
        <div className="block-modal-overlay" onClick={() => setSelectedBlock(null)}>
          <div className="block-modal" onClick={(e) => e.stopPropagation()}>
            <div className="block-modal-header">
              <h3>Block #{selectedBlock.number}</h3>
              <button className="modal-close-btn" onClick={() => setSelectedBlock(null)}>✕</button>
            </div>
            <div className="block-modal-content">
              <div className="detail-row">
                <span className="detail-label">Hash</span>
                <span 
                  className="detail-value" 
                  onClick={() => copyToClipboard(selectedBlock.hash, 'Block Hash')}
                  title={selectedBlock.hash}
                >
                  {formatHash(selectedBlock.hash)}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Time</span>
                <span className="detail-value">
                  {new Date(selectedBlock.timestamp * 1000).toLocaleString('en-US')}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Transactions</span>
                <span className="detail-value">{selectedBlock.transaction_count}</span>
              </div>
              {selectedBlock.gas_used && (
                <div className="detail-row">
                  <span className="detail-label">Gas Used</span>
                  <span className="detail-value">
                    {Number(selectedBlock.gas_used).toLocaleString()}
                  </span>
                </div>
              )}
              {selectedBlock.gas_limit && (
                <div className="detail-row">
                  <span className="detail-label">Gas Limit</span>
                  <span className="detail-value">
                    {Number(selectedBlock.gas_limit).toLocaleString()}
                  </span>
                </div>
              )}

              {selectedBlock.tx_hashes && selectedBlock.tx_hashes.length > 0 && (
                <div className="transactions-section">
                  <div className="transactions-header">Transactions List</div>
                  {selectedBlock.tx_hashes.map((txHash, idx) => (
                    <div 
                      key={idx} 
                      className="transaction-item"
                      onClick={() => {
                        setSelectedBlock(null);
                        handleViewTransaction(txHash);
                      }}
                    >
                      <span className="tx-hash-row" title={txHash}>
                        {formatHash(txHash)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 交易详情弹窗 */}
      {selectedTx && (
        <div className="block-modal-overlay" onClick={() => setSelectedTx(null)}>
          <div className="block-modal" onClick={(e) => e.stopPropagation()}>
            <div className="block-modal-header">
              <h3>Transaction Detail</h3>
              <button className="modal-close-btn" onClick={() => setSelectedTx(null)}>✕</button>
            </div>
            <div className="block-modal-content">
              <div className="detail-row">
                <span className="detail-label">Hash</span>
                <span 
                  className="detail-value"
                  onClick={() => copyToClipboard(selectedTx.hash, 'Transaction Hash')}
                  title={selectedTx.hash}
                >
                  {formatHash(selectedTx.hash)}
                </span>
              </div>
              {selectedTx.from && (
                <div className="detail-row">
                  <span className="detail-label">From</span>
                  <span 
                    className="detail-value"
                    onClick={() => copyToClipboard(selectedTx.from, 'From Address')}
                    title={selectedTx.from}
                  >
                    {formatHash(selectedTx.from)}
                  </span>
                </div>
              )}
              {selectedTx.to && (
                <div className="detail-row">
                  <span className="detail-label">To</span>
                  <span 
                    className="detail-value"
                    onClick={() => copyToClipboard(selectedTx.to, 'To Address')}
                    title={selectedTx.to}
                  >
                    {formatHash(selectedTx.to)}
                  </span>
                </div>
              )}
              {selectedTx.value && (
                <div className="detail-row">
                  <span className="detail-label">Value</span>
                  <span className="detail-value">{formatValue(selectedTx.value)}</span>
                </div>
              )}
              {selectedTx.block_number !== undefined && (
                <div className="detail-row">
                  <span className="detail-label">Block</span>
                  <span className="detail-value">#{selectedTx.block_number}</span>
                </div>
              )}
              {selectedTx.gas_used && (
                <div className="detail-row">
                  <span className="detail-label">Gas Used</span>
                  <span className="detail-value">
                    {Number(selectedTx.gas_used).toLocaleString()}
                  </span>
                </div>
              )}
              {selectedTx.gas_price && (
                <div className="detail-row">
                  <span className="detail-label">Gas Price</span>
                  <span className="detail-value">
                    {formatGwei(selectedTx.gas_price)}
                  </span>
                </div>
              )}
              {selectedTx.gas_used && selectedTx.gas_price && (
                <div className="detail-row">
                  <span className="detail-label">Tx Fee</span>
                  <span className="detail-value" style={{ color: '#f59e0b' }}>
                    {calculateFee(selectedTx.gas_used, selectedTx.gas_price)}
                  </span>
                </div>
              )}
              {selectedTx.status && (
                <div className="detail-row">
                  <span className="detail-label">Status</span>
                  <span 
                    className="detail-value" 
                    style={{ color: selectedTx.status === 'success' ? '#10b981' : '#f87171' }}
                  >
                    {selectedTx.status}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 复制成功提示 */}
      {copySuccess && (
        <div className="copy-toast">
          ✅ {copySuccess} Copied
        </div>
      )}
    </div>
  );
};

export default BlockExplorer;
