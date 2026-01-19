import React, { useState, useEffect } from 'react';
import { getAccounts } from '../../hooks/useTauri';
import './AccountsPanel.css';

const AccountsPanel = () => {
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
  }, []);

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('复制失败:', err);
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

  return (
    <div className="accounts-panel">
      <div className="accounts-header">
        <h4>👤 账户列表</h4>
        <button
          className="refresh-btn"
          onClick={loadAccounts}
          disabled={loading}
        >
          🔄
        </button>
      </div>

      <div className="accounts-list">
        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          accounts.map((account, index) => (
            <div key={index} className="account-item">
              <div className="account-header">
                <span className="account-index">Account #{index}</span>
                <span className="account-balance">
                  {formatBalance(account.balance)}
                </span>
              </div>
              <div className="account-address">
                <span className="address-label">地址:</span>
                <code className="address-value">{account.address}</code>
                <button
                  className="copy-btn"
                  onClick={() => copyToClipboard(account.address, '地址')}
                  title="复制地址"
                >
                  📋
                </button>
              </div>
              {showPrivateKeys && (
                <div className="account-private-key">
                  <span className="key-label">私钥:</span>
                  <code className="key-value">{account.private_key}</code>
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(account.private_key, '私钥')}
                    title="复制私钥"
                  >
                    📋
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="accounts-footer">
        <button
          className="toggle-keys-btn"
          onClick={() => setShowPrivateKeys(!showPrivateKeys)}
        >
          {showPrivateKeys ? '🙈 隐藏私钥' : '👁️ 显示私钥'}
        </button>
      </div>

      {copySuccess && (
        <div className="copy-toast">
          ✅ {copySuccess} 已复制
        </div>
      )}
    </div>
  );
};

export default AccountsPanel;
