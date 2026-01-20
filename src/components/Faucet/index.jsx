import React, { useState } from 'react';
import { faucet } from '../../hooks/useTauri';
import './index.css';

const Faucet = () => {
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('10');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);

  // Convert ETH to Wei
  const ethToWei = (eth) => {
    return (parseFloat(eth) * 1e18).toString();
  };

  const handleFaucet = async () => {
    if (!address) {
      setError('Please enter address');
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
      <h3>💰 Faucet</h3>

      <div className="faucet-form">
        <div className="form-group">
          <label>Receiver Address:</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x..."
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label>Amount (ETH):</label>
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
          {loading ? 'Getting...' : 'Get ETH'}
        </button>

        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        {txHash && (
          <div className="success-message">
            ✅ Transaction sent!
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
