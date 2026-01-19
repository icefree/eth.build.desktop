use crate::ethereum::types::{NetworkConfig, NetworkInfo};
use crate::ethereum::local_network::LocalNetwork;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn start_local_network(
    config: Option<NetworkConfig>,
    state: tauri::State<'_, AppState>,
) -> Result<NetworkInfo, String> {
    let config = config.unwrap_or_default();
    let mut local_network = state.local_network.lock().await;

    if local_network.is_some() {
        return Err("Network is already running".to_string());
    }

    let mut network = LocalNetwork::new(config)
        .map_err(|e| format!("Failed to create network: {}", e))?;

    network.start()
        .map_err(|e| format!("Failed to start network: {}", e))?;

    let info = network.get_info();
    *local_network = Some(network);

    Ok(info)
}

#[tauri::command]
pub async fn stop_local_network(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut local_network = state.local_network.lock().await;

    match local_network.as_mut() {
        Some(network) => {
            network.stop()
                .map_err(|e| format!("Failed to stop network: {}", e))?;
            *local_network = None;
            Ok(())
        }
        None => Err("Network is not running".to_string()),
    }
}

#[tauri::command]
pub async fn get_network_status(state: tauri::State<'_, AppState>) -> Result<NetworkInfo, String> {
    let local_network = state.local_network.lock().await;

    match local_network.as_ref() {
        Some(network) => Ok(network.get_info()),
        None => Ok(NetworkInfo {
            rpc_url: String::new(),
            ws_url: String::new(),
            chain_id: 0,
            is_running: false,
        }),
    }
}

/// Reset the local network (stop + start with existing config)
#[tauri::command]
pub async fn reset_network(
    state: tauri::State<'_, AppState>,
) -> Result<NetworkInfo, String> {
    let mut local_network = state.local_network.lock().await;

    // Get the current config before stopping
    let config = match local_network.as_ref() {
        Some(network) => {
            // We need to reconstruct config from NetworkInfo
            // For now, use default config
            NetworkConfig::default()
        }
        None => return Err("Network is not running".to_string()),
    };

    // Stop current network
    if let Some(network) = local_network.as_mut() {
        network.stop()
            .map_err(|e| format!("Failed to stop network: {}", e))?;
    }
    *local_network = None;

    // Small delay to ensure ports are released
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    // Start new network with same config
    let mut network = LocalNetwork::new(config)
        .map_err(|e| format!("Failed to create network: {}", e))?;

    network.start()
        .map_err(|e| format!("Failed to start network: {}", e))?;

    let info = network.get_info();
    *local_network = Some(network);

    Ok(info)
}

