import React, { useState, useEffect } from 'react';
import { getAccounts } from '../../hooks/useTauri';
import './AccountsPanel.css';

const AccountsPanel = ({ refreshToken }) => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPrivateKeys, setShowPrivateKeys] = useState(false);
  const [copySuccess, setCopySuccess] = useState(null);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const accs = await getAccounts();
      setAccounts(accs);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [refreshToken]);

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const formatBalance = (balanceWei) => {
    try {
      const wei = window.BigInt(balanceWei);
      const eth = Number(wei) / 1e18;
      return `${eth.toFixed(2)} ETH`;
    } catch {
      return balanceWei;
    }
  };

  const formatAddress = (addr) => {
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  return (
    <div className="accounts-panel">
      <div className="accounts-header">
        <h4>Accounts List</h4>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="accounts-count">{accounts.length} accounts</span>
          <button
            className="copy-btn"
            onClick={() => setShowPrivateKeys(!showPrivateKeys)}
            title={showPrivateKeys ? 'Hide private key' : 'Show private key'}
          >
            {showPrivateKeys ? '🙈' : '👁️'}
          </button>
        </div>
      </div>

      <div className="accounts-list">
        {loading ? (
          <div className="accounts-loading">Loading...</div>
        ) : accounts.length === 0 ? (
          <div className="accounts-empty">No accounts</div>
        ) : (
          accounts.map((account, index) => (
            <div key={index} className="account-item">
              <div className="account-info">
                <span 
                  className="account-address"
                  onClick={() => copyToClipboard(account.address, 'Address')}
                  title={account.address}
                >
                  #{index} {formatAddress(account.address)}
                </span>
                {showPrivateKeys && (
                  <span 
                    className="account-address"
                    onClick={() => copyToClipboard(account.private_key, 'Private Key')}
                    title={account.private_key}
                    style={{ color: 'rgba(245, 158, 11, 0.8)', fontSize: '11px' }}
                  >
                    🔑 {formatAddress(account.private_key)}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="account-balance">{formatBalance(account.balance)}</span>
                <button
                  className="copy-btn"
                  onClick={() => copyToClipboard(account.address, '地址')}
                  title="Copy Address"
                >
                  📋
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {copySuccess && (
        <div className="copy-toast">
          ✅ {copySuccess} Copied
        </div>
      )}
    </div>
  );
};

export default AccountsPanel;
