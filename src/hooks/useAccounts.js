import { useState, useEffect } from 'react';
import * as Tauri from '../hooks/useTauri';

export const useAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await Tauri.getAccounts();
      setAccounts(result);
    } catch (err) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const requestFaucet = async (address, amount) => {
    setLoading(true);
    setError(null);
    try {
      const txHash = await Tauri.faucet(address, amount);
      return txHash;
    } catch (err) {
      setError(err.toString());
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    accounts,
    loading,
    error,
    fetchAccounts,
    requestFaucet,
  };
};
