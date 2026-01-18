use crate::ethereum::types::AccountInfo;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_accounts(state: State<'_, AppState>) -> Result<Vec<AccountInfo>, String> {
    let local_network = state.local_network.lock().unwrap();

    match local_network.as_ref() {
        Some(network) => {
            let accounts = network.get_accounts()
                .map_err(|e| format!("Failed to get accounts: {}", e))?;
            Ok(accounts)
        }
        None => Err("Network is not running".to_string()),
    }
}

#[tauri::command]
pub async fn faucet(
    address: String,
    amount: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let local_network = state.local_network.lock().unwrap();

    match local_network.as_ref() {
        Some(network) => {
            let tx_hash = network.faucet(&address, &amount)
                .map_err(|e| format!("Faucet failed: {}", e))?;
            Ok(tx_hash)
        }
        None => Err("Network is not running".to_string()),
    }
}
