use crate::ethereum::types::BlockInfo;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn mine_block(state: State<'_, AppState>) -> Result<BlockInfo, String> {
    let mut local_network = state.local_network.lock().unwrap();

    match local_network.as_mut() {
        Some(network) => {
            let block = network.mine_block()
                .map_err(|e| format!("Failed to mine block: {}", e))?;
            Ok(block)
        }
        None => Err("Network is not running".to_string()),
    }
}

#[tauri::command]
pub async fn set_auto_mine(
    enabled: bool,
    interval_ms: Option<u64>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut local_network = state.local_network.lock().unwrap();

    match local_network.as_mut() {
        Some(network) => {
            network.set_auto_mine(enabled, interval_ms)
                .map_err(|e| format!("Failed to set auto mine: {}", e))?;
            Ok(())
        }
        None => Err("Network is not running".to_string()),
    }
}
