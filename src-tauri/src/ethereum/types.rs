use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConfig {
    pub chain_id: u64,
    pub accounts: u64,
    pub balance: String,
    pub block_time: Option<u64>,
    pub gas_price: Option<u64>,
    pub fork_url: Option<String>,
}

impl Default for NetworkConfig {
    fn default() -> Self {
        Self {
            chain_id: 31337,
            accounts: 10,
            balance: "10000".to_string(),
            block_time: None,
            gas_price: None,
            fork_url: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkInfo {
    pub rpc_url: String,
    pub ws_url: String,
    pub chain_id: u64,
    pub is_running: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountInfo {
    pub address: String,
    pub private_key: String,
    pub balance: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockInfo {
    pub number: u64,
    pub hash: String,
    pub timestamp: u64,
    pub transaction_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionInfo {
    pub hash: String,
    pub from: String,
    pub to: String,
    pub value: String,
    pub block_number: u64,
    pub gas_used: String,
    pub gas_price: String,
    pub status: String,
    pub timestamp: u64,
}

/// Block summary for block list display
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockSummary {
    pub number: u64,
    pub hash: String,
    pub timestamp: u64,
    pub transaction_count: u64,
    /// First transaction hash for quick preview (if any)
    pub first_tx_hash: Option<String>,
}

/// Block detail including full transaction hash list
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockDetail {
    pub number: u64,
    pub hash: String,
    pub timestamp: u64,
    pub transaction_count: u64,
    pub parent_hash: String,
    pub gas_used: String,
    pub gas_limit: String,
    pub miner: String,
    pub tx_hashes: Vec<String>,
}

/// Paginated block list response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedBlocks {
    pub blocks: Vec<BlockSummary>,
    pub total: u64,
    pub page: u64,
    pub page_size: u64,
    pub total_pages: u64,
}

/// Faucet transaction result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FaucetResult {
    pub tx_hash: String,
    pub from: String,
    pub to: String,
    pub amount: String,
}
