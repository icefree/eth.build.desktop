import React, { useState } from 'react';
import { faucet } from '../../hooks/useTauri';
import './index.css';

const Faucet = () => {
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('10');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);

  // ETH 转换为 Wei
  const ethToWei = (eth) => {
    return (parseFloat(eth) * 1e18).toString();
  };

  const handleFaucet = async () => {
    if (!address) {
      setError('请输入地址');
      return;
    }

    setLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const amountWei = ethToWei(amount);
      const hash = await faucet(address, amountWei);
      setTxHash(hash);
    } catch (err) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="faucet-container">
      <h3>💰 水龙头 (Faucet)</h3>

      <div className="faucet-form">
        <div className="form-group">
          <label>接收地址:</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x..."
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label>金额 (ETH):</label>
          <div className="amount-buttons">
            {['1', '5', '10', '100'].map((val) => (
              <button
                key={val}
                className={`amount-btn ${amount === val ? 'active' : ''}`}
                onClick={() => setAmount(val)}
              >
                {val} ETH
              </button>
            ))}
          </div>
        </div>

        <button
          className="faucet-btn"
          onClick={handleFaucet}
          disabled={loading || !address}
        >
          {loading ? '领取中...' : '领取 ETH'}
        </button>

        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        {txHash && (
          <div className="success-message">
            ✅ 交易已发送!
            <div className="tx-hash">
              Hash: {txHash}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Faucet;
