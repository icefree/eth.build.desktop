import React, { useState } from 'react';
import { faucet } from '../../hooks/useTauri';
import './FaucetPanel.css';

const PRESET_AMOUNTS = ['1', '10', '100', '1000'];

const FaucetPanel = ({ onSuccess }) => {
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('10');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFaucet = async () => {
    // 验证地址
    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('Please enter a valid Ethereum address');
      return;
    }

    // 验证金额
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
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
      setAddress('');
    } catch (err) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const formatHash = (hash) => {
    if (!hash) return 'N/A';
    return `${hash.slice(0, 14)}...${hash.slice(-10)}`;
  };

  return (
    <div className="faucet-panel">
      <div className="faucet-header">
        <h4>Faucet</h4>
      </div>

      <div className="faucet-form">
        <div className="form-group">
          <label>Receiver Address</label>
          <input
            type="text"
            placeholder="0x..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Amount (ETH)</label>
          <div className="amount-presets">
            {PRESET_AMOUNTS.map((preset) => (
              <button
                key={preset}
                className={`preset-btn ${amount === preset ? 'active' : ''}`}
                onClick={() => setAmount(preset)}
                disabled={loading}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <button
          className="faucet-btn"
          onClick={handleFaucet}
          disabled={loading || !address}
        >
          {loading ? (
            <>
              <span className="loading-spinner"></span>
              Sending...
            </>
          ) : (
            '💰 Get Test ETH'
          )}
        </button>
      </div>

      {error && (
        <div className="faucet-result error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="faucet-result success">
          <span>✅</span>
          <div>
            <div>Successfully sent <strong>{result.amount} ETH</strong></div>
            <div className="tx-hash" title={result.tx_hash}>
              {formatHash(result.tx_hash)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FaucetPanel;
