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
