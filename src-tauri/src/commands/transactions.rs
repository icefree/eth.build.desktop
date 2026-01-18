use crate::ethereum::types::TransactionInfo;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_transactions(
    limit: Option<usize>,
    state: State<'_, AppState>,
) -> Result<Vec<TransactionInfo>, String> {
    let local_network = state.local_network.lock().unwrap();

    match local_network.as_ref() {
        Some(network) => {
            let txs = network.get_transactions(limit.unwrap_or(100))
                .map_err(|e| format!("Failed to get transactions: {}", e))?;
            Ok(txs)
        }
        None => Err("Network is not running".to_string()),
    }
}

#[tauri::command]
pub async fn get_transaction_by_hash(
    hash: String,
    state: State<'_, AppState>,
) -> Result<Option<TransactionInfo>, String> {
    let local_network = state.local_network.lock().unwrap();

    match local_network.as_ref() {
        Some(network) => {
            let tx = network.get_transaction_by_hash(&hash)
                .map_err(|e| format!("Failed to get transaction: {}", e))?;
            Ok(tx)
        }
        None => Err("Network is not running".to_string()),
    }
}
