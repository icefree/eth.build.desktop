use crate::ethereum::types::AccountInfo;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_accounts(state: tauri::State<'_, AppState>) -> Result<Vec<AccountInfo>, String> {
    let local_network = state.local_network.lock().await;

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
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let mut local_network = state.local_network.lock().await;

    match local_network.as_mut() {
        Some(network) => {
            let tx_hash = network.faucet(&address, &amount).await
                .map_err(|e| format!("Faucet failed: {}", e))?;
            Ok(tx_hash)
        }
        None => Err("Network is not running".to_string()),
    }
}
