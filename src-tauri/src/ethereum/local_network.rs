use crate::ethereum::types::{NetworkConfig, NetworkInfo, AccountInfo, BlockInfo, TransactionInfo};
use std::process::{Command, Child, Stdio};
use std::path::PathBuf;
use std::env;
use std::time::Duration;
use ethers::providers::{Http, Provider, Middleware};
use ethers::core::types::TxHash;

pub struct LocalNetwork {
    process: Option<Child>,
    config: NetworkConfig,
    rpc_url: String,
    ws_url: String,
    provider: Option<Provider<Http>>,
}

impl LocalNetwork {
    pub fn new(config: NetworkConfig) -> Result<Self, String> {
        Ok(Self {
            process: None,
            config,
            rpc_url: "http://localhost:8545".to_string(),
            ws_url: "ws://localhost:8546".to_string(),
            provider: None,
        })
    }

    pub fn start(&mut self) -> Result<(), String> {
        // 使用项目内置的 Anvil
        let anvil_path = Self::bundled_anvil_path()?;

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

        // 重定向输出以避免日志干扰
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        // 启动进程
        match cmd.spawn() {
            Ok(child) => {
                self.process = Some(child);
                println!("Anvil started successfully");

                // 等待 RPC 服务启动
                std::thread::sleep(Duration::from_secs(2));

                // 初始化 Provider
                match Provider::<Http>::try_from(self.rpc_url.as_str()) {
                    Ok(provider) => {
                        self.provider = Some(provider);
                        println!("Provider initialized");
                        Ok(())
                    }
                    Err(e) => {
                        // 如果 Provider 初始化失败，停止进程
                        let _ = self.stop();
                        Err(format!("Failed to initialize provider: {}", e))
                    }
                }
            }
            Err(e) => Err(format!("Failed to start Anvil: {}", e))
        }
    }

    pub fn stop(&mut self) -> Result<(), String> {
        if let Some(mut child) = self.process.take() {
            child.kill()
                .map_err(|e| format!("Failed to kill process: {}", e))?;
            println!("Anvil stopped");
        }
        self.provider = None;
        Ok(())
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
        if self.provider.is_none() {
            return Err("Network is not running".to_string());
        }

        // 返回 Anvil 默认账户（硬编码）
        let accounts = vec![
            AccountInfo {
                address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266".to_string(),
                private_key: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80".to_string(),
                balance: "10000000000000000000000".to_string(),
            },
            AccountInfo {
                address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".to_string(),
                private_key: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d".to_string(),
                balance: "10000000000000000000000".to_string(),
            },
        ];

        Ok(accounts)
    }

    pub async fn faucet(&mut self, _address: &str, _amount_wei: &str) -> Result<String, String> {
        if self.provider.is_none() {
            return Err("Network is not running".to_string());
        }

        // TODO: 实现实际的 faucet 功能
        // 需要签名并发送交易
        Ok("0x0000000000000000000000000000000000000000000000000000000000000000".to_string())
    }

    pub async fn mine_block(&mut self) -> Result<BlockInfo, String> {
        if self.provider.is_none() {
            return Err("Network is not running".to_string());
        }

        let provider = self.provider.as_ref()
            .ok_or("Provider not initialized")?;

        // 使用 Anvil 的 evm_mine RPC 方法
        let _: () = provider.request("evm_mine", ())
            .await
            .map_err(|e| format!("Failed to mine block: {}", e))?;

        // 获取最新区块信息
        let latest_block = provider.get_block(ethers::types::BlockNumber::Latest)
            .await
            .map_err(|e| format!("Failed to get block: {}", e))?
            .ok_or("Block not found")?;

        Ok(BlockInfo {
            number: latest_block.number.unwrap_or_default().as_u64(),
            hash: format!("{:?}", latest_block.hash.unwrap_or_default()),
            timestamp: latest_block.timestamp.as_u64(),
            transaction_count: latest_block.transactions.len() as u64,
        })
    }

    pub async fn set_auto_mine(&mut self, enabled: bool, _interval_ms: Option<u64>) -> Result<(), String> {
        if self.provider.is_none() {
            return Err("Network is not running".to_string());
        }

        let provider = self.provider.as_ref()
            .ok_or("Provider not initialized")?;

        if enabled {
            let _ = provider.request::<_, ()>("evm_setAutomine", vec![true])
                .await
                .map_err(|e| format!("Failed to set auto mine: {}", e))?;
        } else {
            let _ = provider.request::<_, ()>("evm_setAutomine", vec![false])
                .await
                .map_err(|e| format!("Failed to disable auto mine: {}", e))?;
        }

        println!("Auto mine set to: {}", enabled);
        Ok(())
    }

    pub async fn get_transactions(&self, limit: usize) -> Result<Vec<TransactionInfo>, String> {
        if self.provider.is_none() {
            return Err("Network is not running".to_string());
        }

        let provider = self.provider.as_ref()
            .ok_or("Provider not initialized")?;

        use ethers::types::BlockNumber;
        let latest_block = provider.get_block(BlockNumber::Latest)
            .await
            .map_err(|e| format!("Failed to get block: {}", e))?
            .ok_or("Block not found")?;

        let mut all_txs = Vec::new();

        // 收集最近区块的交易
        let block_number = latest_block.number.unwrap_or_default().as_u64();
        let start_block = if block_number > 100 { block_number - 100 } else { 0 };

        for b in start_block..=block_number {
            if let Ok(Some(block)) = provider.get_block(ethers::types::BlockId::Number(b.into())).await {
                for tx_hash in block.transactions {
                    if let Ok(Some(tx)) = provider.get_transaction(tx_hash).await {
                        all_txs.push(TransactionInfo {
                            hash: format!("{:?}", tx.hash),
                            from: format!("{:?}", tx.from),
                            to: tx.to.map(|a| format!("{:?}", a)).unwrap_or_else(|| "Contract Creation".to_string()),
                            value: format!("{:?}", tx.value),
                            block_number: tx.block_number.unwrap_or_default().as_u64(),
                            gas_used: "0".to_string(),
                            gas_price: format!("{:?}", tx.gas_price.unwrap_or_default()),
                            status: "success".to_string(),
                            timestamp: block.timestamp.as_u64(),
                        });
                    }
                }
            }
        }

        Ok(all_txs.into_iter().rev().take(limit).collect())
    }

    pub async fn get_transaction_by_hash(&self, hash: &str) -> Result<Option<TransactionInfo>, String> {
        if self.provider.is_none() {
            return Err("Network is not running".to_string());
        }

        let provider = self.provider.as_ref()
            .ok_or("Provider not initialized")?;

        let tx_hash: TxHash = hash.parse()
            .map_err(|_| "Invalid transaction hash format")?;

        let tx = provider.get_transaction(tx_hash).await
            .map_err(|e| format!("Failed to get transaction: {}", e))?;

        if let Some(transaction) = tx {
            // 简化实现 - 暂时返回默认值
            let status = "success";
            let gas_used = "21000".to_string();

            let block = if let Some(block_num) = transaction.block_number {
                provider.get_block(ethers::types::BlockId::Number(block_num.into())).await.ok().flatten()
            } else {
                None
            };

            Ok(Some(TransactionInfo {
                hash: format!("{:?}", transaction.hash),
                from: format!("{:?}", transaction.from),
                to: transaction.to.map(|a| format!("{:?}", a)).unwrap_or_else(|| "Contract Creation".to_string()),
                value: format!("{:?}", transaction.value),
                block_number: transaction.block_number.unwrap_or_default().as_u64(),
                gas_used,
                gas_price: format!("{:?}", transaction.gas_price.unwrap_or_default()),
                status: status.to_string(),
                timestamp: block.map(|b| b.timestamp.as_u64()).unwrap_or(0),
            }))
        } else {
            Ok(None)
        }
    }

    fn bundled_anvil_path() -> Result<PathBuf, String> {
        let mut candidates: Vec<PathBuf> = Vec::new();

        if let Ok(cwd) = env::current_dir() {
            candidates.push(cwd.join("src-tauri/bin/anvil"));
            candidates.push(cwd.join("bin/anvil"));
        }

        if let Ok(exe) = env::current_exe() {
            if let Some(dir) = exe.parent() {
                candidates.push(dir.join("anvil"));
                candidates.push(dir.join("../Resources/anvil"));
            }
        }

        for path in candidates {
            if path.exists() {
                #[cfg(unix)]
                {
                    use std::os::unix::fs::PermissionsExt;
                    if let Ok(meta) = std::fs::metadata(&path) {
                        if meta.permissions().mode() & 0o111 == 0 {
                            return Err(format!(
                                "Bundled Anvil is not executable: {}",
                                path.display()
                            ));
                        }
                    }
                }
                return Ok(path);
            }
        }

        Err("Bundled Anvil not found. Place it at src-tauri/bin/anvil before running.".to_string())
    }
}

impl Drop for LocalNetwork {
    fn drop(&mut self) {
        let _ = self.stop();
    }
}
