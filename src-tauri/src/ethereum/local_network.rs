use crate::ethereum::types::{NetworkConfig, NetworkInfo, AccountInfo, BlockInfo, TransactionInfo, BlockSummary, BlockDetail, PaginatedBlocks, FaucetResult};
use std::process::{Command, Child, Stdio};
use std::path::PathBuf;
use std::env;
use std::time::Duration;
use ethers::providers::{Http, Provider, Middleware};
use ethers::core::types::{Address, TxHash, TransactionRequest};
use ethers::middleware::SignerMiddleware;
use ethers::signers::{LocalWallet, Signer};
use ethers::utils::parse_ether;

pub struct LocalNetwork {
    process: Option<Child>,
    config: NetworkConfig,
    rpc_url: String,
    ws_url: String,
    provider: Option<Provider<Http>>,
}

impl LocalNetwork {
    pub fn new(config: NetworkConfig) -> Result<Self, String> {
        let rpc_port = config.rpc_port.unwrap_or(8545);
        let ws_port = config.ws_port.unwrap_or(8546);
        Ok(Self {
            process: None,
            config,
            rpc_url: format!("http://localhost:{}", rpc_port),
            ws_url: format!("ws://localhost:{}", ws_port),
            provider: None,
        })
    }

    pub fn start(&mut self) -> Result<(), String> {
        // 使用项目内置的 Anvil
        let anvil_path = Self::bundled_anvil_path()?;

        println!("Starting Anvil at: {}", anvil_path.display());

        // 启动 anvil 进程
        let mut cmd = Command::new(&anvil_path);
        let rpc_port = self.config.rpc_port.unwrap_or(8545);
        cmd.args([
            "--host", "0.0.0.0",
            "--port", &rpc_port.to_string(),
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

    pub async fn get_accounts(&self) -> Result<Vec<AccountInfo>, String> {
        let provider = self.provider.as_ref()
            .ok_or("Network is not running")?;

        // 读取节点账户并过滤余额>0
        let addresses: Vec<Address> = provider.request("eth_accounts", ())
            .await
            .map_err(|e| format!("Failed to get accounts: {}", e))?;

        let default_keys = [
            ("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266", "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"),
            ("0x70997970c51812dc3a010c7d01b50e0d17dc79c8", "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"),
            ("0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc", "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"),
            ("0x90f79bf6eb2c4f870365e785982e1f101e93b906", "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"),
            ("0x15d34aaf54267db7d7c367839aaf71a00a2c6a65", "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a"),
            ("0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc", "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba"),
            ("0x976ea74026e726554db657fa54763abd0c3a0aa9", "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e"),
            ("0x14dc79964da2c08b23698b3d3cc7ca32193d9955", "0x4b20993bc481177ec7e8f571cecae8a9e22c02dbb4b59b9b2e8f1f2a5b2b4f0f"),
            ("0x23618e81e3f5cdf7f54c3d65f7fbc0abf5b21e8f", "0x5cfd8e1cf88f9dc1c4d6f2b1c5a87c0c8b5c6a1b96f2ef749acd972d4b8b0b3e"),
            ("0xa0ee7a142d267c1f36714e4a8f75612f20a79720", "0x2191ef87e392377ec08e7c08eb105ef5448eced5b2c88b2d1d1c4e4b8f7f1adf"),
        ];

        let mut accounts = Vec::new();
        for address in addresses {
            let balance = provider.get_balance(address, None).await
                .map_err(|e| format!("Failed to get balance for {:?}: {}", address, e))?;
            if balance.is_zero() {
                continue;
            }

            let address_str = format!("{:?}", address);
            let address_lc = address_str.to_lowercase();
            let private_key = default_keys.iter()
                .find(|(addr, _)| *addr == address_lc)
                .map(|(_, key)| (*key).to_string())
                .unwrap_or_default();

            accounts.push(AccountInfo {
                address: address_str,
                private_key,
                balance: balance.to_string(),
            });
        }

        Ok(accounts)
    }

    pub async fn faucet(&mut self, address: &str, amount_eth: &str) -> Result<FaucetResult, String> {
        if self.provider.is_none() {
            return Err("Network is not running".to_string());
        }

        let provider = self.provider.as_ref()
            .ok_or("Provider not initialized")?;

        // Validate address format
        let target_address: ethers::types::Address = address.parse()
            .map_err(|_| "Invalid address format")?;

        let amount_wei = parse_ether(amount_eth)
            .map_err(|_| "Invalid amount format")?;

        if amount_wei.is_zero() {
            return Err("Amount must be positive".to_string());
        }

        let faucet_private_key = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
        let wallet: LocalWallet = faucet_private_key.parse()
            .map_err(|_| "Invalid faucet private key")?;
        let wallet = wallet.with_chain_id(self.config.chain_id);
        let client = SignerMiddleware::new(provider.clone(), wallet);

        let tx = TransactionRequest::new()
            .to(target_address)
            .value(amount_wei);
        let pending_tx = client.send_transaction(tx, None)
            .await
            .map_err(|e| format!("Failed to send faucet tx: {}", e))?;

        Ok(FaucetResult {
            tx_hash: format!("{:?}", pending_tx.tx_hash()),
            from: "Anvil Faucet".to_string(),
            to: format!("{:?}", target_address),
            amount: amount_eth.to_string(),
        })
    }

    pub async fn mine_block(&mut self) -> Result<BlockInfo, String> {
        if self.provider.is_none() {
            return Err("Network is not running".to_string());
        }

        let provider = self.provider.as_ref()
            .ok_or("Provider not initialized")?;

        // 使用 Anvil 的 evm_mine RPC 方法
        // Anvil returns a hex string like "0x0"; accept any JSON value to avoid deserialization errors.
        let _: serde_json::Value = provider.request("evm_mine", ())
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

    pub async fn set_auto_mine(&mut self, enabled: bool, interval_ms: Option<u64>) -> Result<(), String> {
        if self.provider.is_none() {
            return Err("Network is not running".to_string());
        }

        let provider = self.provider.as_ref()
            .ok_or("Provider not initialized")?;

        if enabled {
            if let Some(interval_ms) = interval_ms {
                // Use interval mining for periodic blocks.
                let interval_secs = std::cmp::max(1, interval_ms / 1000);
                let _ = provider.request::<_, ()>("anvil_setIntervalMining", vec![interval_secs])
                    .await
                    .map_err(|e| format!("Failed to set interval mining: {}", e))?;
                let _ = provider.request::<_, ()>("evm_setAutomine", vec![false])
                    .await
                    .map_err(|e| format!("Failed to disable automine: {}", e))?;
            } else {
                let _ = provider.request::<_, ()>("anvil_setIntervalMining", vec![0u64])
                    .await
                    .map_err(|e| format!("Failed to clear interval mining: {}", e))?;
                let _ = provider.request::<_, ()>("evm_setAutomine", vec![true])
                    .await
                    .map_err(|e| format!("Failed to set auto mine: {}", e))?;
            }
        } else {
            let _ = provider.request::<_, ()>("anvil_setIntervalMining", vec![0u64])
                .await
                .map_err(|e| format!("Failed to clear interval mining: {}", e))?;
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
                        let receipt = provider.get_transaction_receipt(tx_hash).await.ok().flatten();
                        let gas_used = receipt.as_ref()
                            .and_then(|r| r.gas_used)
                            .map(|v| format!("{:?}", v))
                            .unwrap_or_else(|| "0x0".to_string());
                        let gas_price = receipt.as_ref()
                            .and_then(|r| r.effective_gas_price)
                            .or(tx.gas_price)
                            .map(|v| format!("{:?}", v))
                            .unwrap_or_else(|| "0x0".to_string());
                        let status = receipt.as_ref()
                            .and_then(|r| r.status)
                            .map(|v| if v.as_u64() == 1 { "success" } else { "failed" })
                            .unwrap_or("success");
                        all_txs.push(TransactionInfo {
                            hash: format!("{:?}", tx.hash),
                            from: format!("{:?}", tx.from),
                            to: tx.to.map(|a| format!("{:?}", a)).unwrap_or_else(|| "Contract Creation".to_string()),
                            value: format!("{:?}", tx.value),
                            block_number: tx.block_number.unwrap_or_default().as_u64(),
                            gas_used,
                            gas_price,
                            status: status.to_string(),
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
            let receipt = provider.get_transaction_receipt(transaction.hash).await.ok().flatten();
            let gas_used = receipt.as_ref()
                .and_then(|r| r.gas_used)
                .map(|v| format!("{:?}", v))
                .unwrap_or_else(|| "0x0".to_string());
            let gas_price = receipt.as_ref()
                .and_then(|r| r.effective_gas_price)
                .or(transaction.gas_price)
                .map(|v| format!("{:?}", v))
                .unwrap_or_else(|| "0x0".to_string());
            let status = receipt.as_ref()
                .and_then(|r| r.status)
                .map(|v| if v.as_u64() == 1 { "success" } else { "failed" })
                .unwrap_or("success");

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
                gas_price,
                status: status.to_string(),
                timestamp: block.map(|b| b.timestamp.as_u64()).unwrap_or(0),
            }))
        } else {
            Ok(None)
        }
    }

    /// Get paginated list of blocks (newest first)
    pub async fn get_blocks(&self, page: Option<u64>, page_size: Option<u64>) -> Result<PaginatedBlocks, String> {
        if self.provider.is_none() {
            return Err("Network is not running".to_string());
        }

        let provider = self.provider.as_ref()
            .ok_or("Provider not initialized")?;

        let page = page.unwrap_or(1).max(1);
        let page_size = page_size.unwrap_or(20).min(100).max(1);

        // Get latest block number
        let latest_block = provider.get_block(ethers::types::BlockNumber::Latest)
            .await
            .map_err(|e| format!("Failed to get latest block: {}", e))?
            .ok_or("Latest block not found")?;

        let total = latest_block.number.unwrap_or_default().as_u64() + 1; // Include block 0
        let total_pages = (total + page_size - 1) / page_size;

        // Calculate block range for this page (newest first)
        let skip = (page - 1) * page_size;
        let start_block = if total > skip { total - skip - 1 } else { 0 };
        let end_block = if start_block >= page_size { start_block - page_size + 1 } else { 0 };

        let mut blocks = Vec::new();

        // Fetch blocks from newest to oldest
        let mut current = start_block as i64;
        while current >= end_block as i64 && blocks.len() < page_size as usize {
            if let Ok(Some(block)) = provider.get_block(ethers::types::BlockId::Number((current as u64).into())).await {
                let first_tx_hash = block.transactions.first().map(|h| format!("{:?}", h));
                
                blocks.push(BlockSummary {
                    number: block.number.unwrap_or_default().as_u64(),
                    hash: format!("{:?}", block.hash.unwrap_or_default()),
                    timestamp: block.timestamp.as_u64(),
                    transaction_count: block.transactions.len() as u64,
                    first_tx_hash,
                });
            }
            current -= 1;
        }

        Ok(PaginatedBlocks {
            blocks,
            total,
            page,
            page_size,
            total_pages,
        })
    }

    /// Get block details by block number
    pub async fn get_block_by_number(&self, number: u64) -> Result<Option<BlockDetail>, String> {
        if self.provider.is_none() {
            return Err("Network is not running".to_string());
        }

        let provider = self.provider.as_ref()
            .ok_or("Provider not initialized")?;

        let block = provider.get_block(ethers::types::BlockId::Number(number.into()))
            .await
            .map_err(|e| format!("Failed to get block: {}", e))?;

        if let Some(block) = block {
            let tx_hashes: Vec<String> = block.transactions.iter()
                .map(|h| format!("{:?}", h))
                .collect();

            Ok(Some(BlockDetail {
                number: block.number.unwrap_or_default().as_u64(),
                hash: format!("{:?}", block.hash.unwrap_or_default()),
                timestamp: block.timestamp.as_u64(),
                transaction_count: block.transactions.len() as u64,
                parent_hash: format!("{:?}", block.parent_hash),
                gas_used: format!("{:?}", block.gas_used),
                gas_limit: format!("{:?}", block.gas_limit),
                miner: format!("{:?}", block.author.unwrap_or_default()),
                tx_hashes,
            }))
        } else {
            Ok(None)
        }
    }

    /// Get the latest block number
    pub async fn get_latest_block_number(&self) -> Result<u64, String> {
        if self.provider.is_none() {
            return Err("Network is not running".to_string());
        }

        let provider = self.provider.as_ref()
            .ok_or("Provider not initialized")?;

        let block = provider.get_block(ethers::types::BlockNumber::Latest)
            .await
            .map_err(|e| format!("Failed to get latest block: {}", e))?
            .ok_or("Latest block not found")?;

        Ok(block.number.unwrap_or_default().as_u64())
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
                candidates.push(dir.join("../Resources/bin/anvil"));
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
