use crate::ethereum::types::AccountInfo;

pub struct Faucet {
    accounts: Vec<AccountInfo>,
}

impl Faucet {
    pub fn new(accounts: Vec<AccountInfo>) -> Self {
        Self { accounts }
    }

    pub async fn send(&self, _to: &str, _amount: &str) -> Result<String, String> {
        // TODO: 实现实际的 faucet 转账功能
        Ok("0x0000000000000000000000000000000000000000000000000000000000000000".to_string())
    }
}
