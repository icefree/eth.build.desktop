use crate::ethereum::types::{NetworkConfig, NetworkInfo, AccountInfo, BlockInfo, TransactionInfo};
use std::process::{Command, Child};
use std::path::PathBuf;

pub struct LocalNetwork {
    process: Option<Child>,
    config: NetworkConfig,
    rpc_url: String,
    ws_url: String,
    accounts: Vec<AccountInfo>,
    transactions: Vec<TransactionInfo>,
    current_block: u64,
}

impl LocalNetwork {
    pub fn new(config: NetworkConfig) -> Result<Self, String> {
        Ok(Self {
            process: None,
            config,
            rpc_url: "http://localhost:8545".to_string(),
            ws_url: "ws://localhost:8546".to_string(),
            accounts: Vec::new(),
            transactions: Vec::new(),
            current_block: 0,
        })
    }

    pub fn start(&mut self) -> Result<(), String> {
        // 检查是否已安装 anvil
        let anvil_path = Self::find_anvil()
            .ok_or("Anvil not found. Please install Foundry: https://getfoundry.sh/")?;

        println!("Starting Anvil at: {}", anvil_path.display());

        // 启动 anvil 进程
        let mut cmd = Command::new(&anvil_path);
        cmd.args([
            "--host", "0.0.0.0",
            "--port", "8545",
            "--chain-id", &self.config.chain_id.to_string(),
            "--accounts", &self.config.accounts.to_string(),
            "--balance", &self.config.balance,
        ]);

        if let Some(block_time) = self.config.block_time {
            cmd.args(["--block-time", &block_time.to_string()]);
        }

        if let Some(gas_price) = self.config.gas_price {
            cmd.args(["--gas-price", &gas_price.to_string()]);
        }

        if let Some(fork_url) = &self.config.fork_url {
            cmd.args(["--fork", fork_url]);
        }

        // 启动进程
        match cmd.spawn() {
            Ok(child) => {
                self.process = Some(child);
                println!("Anvil started successfully");
                Ok(())
            }
            Err(e) => Err(format!("Failed to start Anvil: {}", e))
        }
    }

    pub fn stop(&mut self) -> Result<(), String> {
        if let Some(mut child) = self.process.take() {
            child.kill()
                .map_err(|e| format!("Failed to kill process: {}", e))?;
            println!("Anvil stopped");
            Ok(())
        } else {
            Err("No process running".to_string())
        }
    }

    pub fn get_info(&self) -> NetworkInfo {
        NetworkInfo {
            rpc_url: self.rpc_url.clone(),
            ws_url: self.ws_url.clone(),
            chain_id: self.config.chain_id,
            is_running: self.process.is_some(),
        }
    }

    pub fn get_accounts(&self) -> Result<Vec<AccountInfo>, String> {
        if !self.process.is_some() {
            return Err("Network is not running".to_string());
        }
        Ok(self.accounts.clone())
    }

    pub fn faucet(&self, _address: &str, _amount: &str) -> Result<String, String> {
        if !self.process.is_some() {
            return Err("Network is not running".to_string());
        }
        // TODO: 实现实际的 faucet 功能
        Ok("0x0000000000000000000000000000000000000000000000000000000000000000".to_string())
    }

    pub fn mine_block(&mut self) -> Result<BlockInfo, String> {
        if !self.process.is_some() {
            return Err("Network is not running".to_string());
        }

        self.current_block += 1;

        Ok(BlockInfo {
            number: self.current_block,
            hash: format!("0x{:064x}", self.current_block),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            transaction_count: 0,
        })
    }

    pub fn set_auto_mine(&mut self, enabled: bool, _interval_ms: Option<u64>) -> Result<(), String> {
        if !self.process.is_some() {
            return Err("Network is not running".to_string());
        }
        // TODO: 实现自动挖矿逻辑
        println!("Auto mine set to: {}", enabled);
        Ok(())
    }

    pub fn get_transactions(&self, limit: usize) -> Result<Vec<TransactionInfo>, String> {
        if !self.process.is_some() {
            return Err("Network is not running".to_string());
        }
        Ok(self.transactions.iter()
            .rev()
            .take(limit)
            .cloned()
            .collect())
    }

    pub fn get_transaction_by_hash(&self, hash: &str) -> Result<Option<TransactionInfo>, String> {
        if !self.process.is_some() {
            return Err("Network is not running".to_string());
        }
        Ok(self.transactions.iter()
            .find(|tx| tx.hash == hash)
            .cloned())
    }

    fn find_anvil() -> Option<PathBuf> {
        // 尝试查找 anvil 的常见路径
        let common_paths = vec![
            "/usr/local/bin/anvil",
            "/opt/homebrew/bin/anvil",
            "~/.foundry/bin/anvil",
        ];

        for path in common_paths {
            let path_buf = PathBuf::from(path);
            if path_buf.exists() {
                return Some(path_buf);
            }
        }

        // 尝试通过 which 命令查找
        if let Ok(output) = Command::new("which").arg("anvil").output() {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path.is_empty() {
                    return Some(PathBuf::from(path));
                }
            }
        }

        None
    }
}

impl Drop for LocalNetwork {
    fn drop(&mut self) {
        let _ = self.stop();
    }
}
