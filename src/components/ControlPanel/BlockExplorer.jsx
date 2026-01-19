import React, { useState, useEffect } from 'react';
import { getBlocks, getBlockByNumber, searchBlockchain } from '../../hooks/useTauri';
import './BlockExplorer.css';

const BlockExplorer = ({ refreshToken }) => {
  const [blocks, setBlocks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedTx, setSelectedTx] = useState(null);

  useEffect(() => {
    // 加载区块列表
    const loadBlocks = async () => {
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
    };

    loadBlocks();
  }, [currentPage, pageSize, refreshToken]);

  // 搜索功能
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      // 清空搜索时重置到第一页
      setCurrentPage(1);
      setSearchQuery('');
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
        setError('未找到匹配的区块或交易');
      }
    } catch (err) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  // 查看区块详情
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

  // 格式化时间戳
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('zh-CN');
  };

  // 格式化哈希（缩短显示）
  const formatHash = (hash) => {
    if (!hash) return 'N/A';
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  return (
    <div className="block-explorer">
      <div className="block-explorer-header">
        <h3>🔍 区块浏览器</h3>
        <div className="search-box">
          <input
            type="text"
            placeholder="搜索区块号或交易哈希..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} disabled={loading}>
            搜索
          </button>
        </div>
      </div>

      {error && (
        <div className="explorer-error">
          ❌ {error}
        </div>
      )}

      {/* 区块列表 */}
      {!selectedBlock && !selectedTx && (
        <div className="blocks-table-container">
          <table className="blocks-table">
            <thead>
              <tr>
                <th>区块号</th>
                <th>区块哈希</th>
                <th>时间戳</th>
                <th>交易数</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((block) => (
                <tr key={block.number}>
                  <td>#{block.number}</td>
                  <td title={block.hash}>{formatHash(block.hash)}</td>
                  <td>{formatTimestamp(block.timestamp)}</td>
                  <td>{block.transaction_count}</td>
                  <td>
                    <button
                      className="view-btn"
                      onClick={() => handleViewBlock(block.number)}
                    >
                      查看详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {blocks.length === 0 && !loading && (
            <div className="no-blocks">
              <p>暂无区块数据</p>
            </div>
          )}

          {/* 分页控制 */}
          <div className="pagination">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || loading}
            >
              上一页
            </button>
            <span>第 {currentPage} 页</span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={blocks.length < pageSize || loading}
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* 区块详情模态框 */}
      {selectedBlock && (
        <div className="block-detail-modal">
          <div className="modal-header">
            <h4>区块详情 #{selectedBlock.number}</h4>
            <button onClick={() => setSelectedBlock(null)}>✕</button>
          </div>
          <div className="modal-content">
            <div className="detail-row">
              <span className="label">区块号:</span>
              <span className="value">{selectedBlock.number}</span>
            </div>
            <div className="detail-row">
              <span className="label">区块哈希:</span>
              <div className="copyable-value">
                <span className="value hash">{selectedBlock.hash}</span>
                <button 
                  className="copy-button"
                  onClick={() => navigator.clipboard.writeText(selectedBlock.hash)}
                  title="复制区块哈希"
                >
                  📋
                </button>
              </div>
            </div>
            <div className="detail-row">
              <span className="label">时间戳:</span>
              <span className="value">{formatTimestamp(selectedBlock.timestamp)}</span>
            </div>
            <div className="detail-row">
              <span className="label">交易数量:</span>
              <span className="value">{selectedBlock.transaction_count}</span>
            </div>

            {selectedBlock.tx_hashes && selectedBlock.tx_hashes.length > 0 && (
              <div className="tx-list">
                <h5>交易列表:</h5>
                <ul>
                  {selectedBlock.tx_hashes.map((txHash, idx) => (
                    <li key={idx}>
                      <span className="tx-hash" title={txHash}>
                        {formatHash(txHash)}
                      </span>
                      <button
                        className="view-tx-btn"
                        onClick={() => {
                          setSelectedTx({ hash: txHash });
                          setSelectedBlock(null);
                        }}
                      >
                        查看交易
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button onClick={() => setSelectedBlock(null)}>关闭</button>
          </div>
        </div>
      )}

      {/* 交易详情模态框 */}
      {selectedTx && (
        <div className="tx-detail-modal">
          <div className="modal-header">
            <h4>交易详情</h4>
            <button onClick={() => setSelectedTx(null)}>✕</button>
          </div>
          <div className="modal-content">
            <div className="detail-row">
              <span className="label">交易哈希:</span>
              <div className="copyable-value">
                <span className="value hash">{selectedTx.hash}</span>
                <button 
                  className="copy-button"
                  onClick={() => navigator.clipboard.writeText(selectedTx.hash)}
                  title="复制哈希"
                >
                  📋
                </button>
              </div>
            </div>
            {selectedTx.from && (
              <div className="detail-row">
                <span className="label">发送方:</span>
                <div className="copyable-value">
                  <span className="value hash">{selectedTx.from}</span>
                  <button 
                    className="copy-button"
                    onClick={() => navigator.clipboard.writeText(selectedTx.from)}
                    title="复制地址"
                  >
                    📋
                  </button>
                </div>
              </div>
            )}
            {selectedTx.to && (
              <div className="detail-row">
                <span className="label">接收方:</span>
                <div className="copyable-value">
                  <span className="value hash">{selectedTx.to}</span>
                  <button 
                    className="copy-button"
                    onClick={() => navigator.clipboard.writeText(selectedTx.to)}
                    title="复制地址"
                  >
                    📋
                  </button>
                </div>
              </div>
            )}
            {selectedTx.value && (
              <div className="detail-row">
                <span className="label">金额:</span>
                <span className="value">{selectedTx.value} ETH</span>
              </div>
            )}
            {selectedTx.block_number !== undefined && (
              <div className="detail-row">
                <span className="label">区块号:</span>
                <span className="value">#{selectedTx.block_number}</span>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button onClick={() => setSelectedTx(null)}>关闭</button>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="spinner">加载中...</div>
        </div>
      )}
    </div>
  );
};

export default BlockExplorer;
