import React, { useState } from 'react';
import { faucet } from '../../hooks/useTauri';
import './FaucetPanel.css';

const FaucetPanel = ({ onSuccess }) => {
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('10');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

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

  const handleFaucet = async () => {
    // 验证地址
    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('请输入有效的以太坊地址');
      return;
    }

    // 验证金额
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('请输入有效的金额（大于 0）');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const faucetResult = await faucet(address, amount);
      setResult(faucetResult);
      if (onSuccess) {
        onSuccess(faucetResult);
      }
      // 清空地址输入框，保留金额
      setAddress('');
    } catch (err) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const formatHash = (hash) => {
    if (!hash) return 'N/A';
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  return (
    <div className="faucet-panel">
      <div className="faucet-header">
        <h3>💧 测试币水龙头</h3>
        <p className="faucet-description">
          向指定地址发送测试 ETH（仅限本地测试网络）
        </p>
      </div>

      <div className="faucet-form">
        <div className="form-group">
          <label htmlFor="faucet-address">接收地址:</label>
          <input
            id="faucet-address"
            type="text"
            placeholder="0x..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="faucet-amount">金额 (ETH):</label>
          <input
            id="faucet-amount"
            type="number"
            step="0.1"
            min="0.1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={loading}
          />
        </div>

        <button
          className="faucet-btn"
          onClick={handleFaucet}
          disabled={loading || !address}
        >
          {loading ? '发送中...' : '💰 领取测试币'}
        </button>
      </div>

      {error && (
        <div className="faucet-error">
          ❌ {error}
        </div>
      )}

      {result && (
        <div className="faucet-success">
          <div className="success-header">
            <span role="img" aria-label="success">✅</span> 发送成功！
          </div>
          <div className="success-details">
            <div className="detail-item">
              <span className="detail-label">交易哈希:</span>
              <div className="copyable-value">
                <span className="detail-value hash" title={result.tx_hash}>
                  {formatHash(result.tx_hash)}
                </span>
                <button 
                  className="copy-button" 
                  onClick={() => copyToClipboard(result.tx_hash, '交易哈希')}
                  title="复制完整哈希"
                >
                  📋
                </button>
              </div>
            </div>
            <div className="detail-item">
              <span className="detail-label">接收地址:</span>
              <div className="copyable-value">
                <span className="detail-value hash" title={result.to}>
                  {formatHash(result.to)}
                </span>
                <button 
                  className="copy-button" 
                  onClick={() => copyToClipboard(result.to, '接收地址')}
                  title="复制完整地址"
                >
                  📋
                </button>
              </div>
            </div>
            <div className="detail-item">
              <span className="detail-label">金额:</span>
              <span className="detail-value">{result.amount} ETH</span>
            </div>
            {result.block_number !== undefined && (
              <div className="detail-item">
                <span className="detail-label">区块号:</span>
                <span className="detail-value">#{result.block_number}</span>
              </div>
            )}
          </div>
          <div className="success-footer">
            <small>💡 提示: 可以在区块浏览器中查看此交易</small>
          </div>
        </div>
      )}

      {copySuccess && (
        <div className="copy-toast">
          ✅ {copySuccess} 已复制
        </div>
      )}
    </div>
  );
};

export default FaucetPanel;
