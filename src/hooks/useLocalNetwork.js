import { useState, useEffect } from 'react';
import * as Tauri from '../hooks/useTauri';

export const useLocalNetwork = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [networkStatus, setNetworkStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const status = await Tauri.getNetworkStatus();
      setNetworkStatus(status);
      setIsRunning(status.isRunning);
    } catch (err) {
      console.error('Failed to get network status:', err);
    }
  };

  const startNetwork = async (config) => {
    setLoading(true);
    setError(null);
    try {
      const result = await Tauri.startLocalNetwork(config);
      setIsRunning(true);
      await checkStatus();
      return result;
    } catch (err) {
      setError(err.toString());
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const stopNetwork = async () => {
    setLoading(true);
    setError(null);
    try {
      await Tauri.stopLocalNetwork();
      setIsRunning(false);
      await checkStatus();
    } catch (err) {
      setError(err.toString());
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    isRunning,
    networkStatus,
    loading,
    error,
    startNetwork,
    stopNetwork,
    checkStatus,
  };
};
