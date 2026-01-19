use crate::ethereum::types::{BlockSummary, BlockDetail, PaginatedBlocks, TransactionInfo};
use crate::AppState;
use tauri::State;

/// Get paginated list of blocks (newest first)
#[tauri::command]
pub async fn get_blocks(
    page: Option<u64>,
    page_size: Option<u64>,
    state: tauri::State<'_, AppState>,
) -> Result<PaginatedBlocks, String> {
    let local_network = state.local_network.lock().await;

    match local_network.as_ref() {
        Some(network) => {
            let blocks = network.get_blocks(page, page_size).await
                .map_err(|e| format!("Failed to get blocks: {}", e))?;
            Ok(blocks)
        }
        None => Err("Network is not running".to_string()),
    }
}

/// Get block details by block number
#[tauri::command]
pub async fn get_block_by_number(
    number: u64,
    state: tauri::State<'_, AppState>,
) -> Result<Option<BlockDetail>, String> {
    let local_network = state.local_network.lock().await;

    match local_network.as_ref() {
        Some(network) => {
            let block = network.get_block_by_number(number).await
                .map_err(|e| format!("Failed to get block: {}", e))?;
            Ok(block)
        }
        None => Err("Network is not running".to_string()),
    }
}

/// Get the latest block number
#[tauri::command]
pub async fn get_latest_block_number(
    state: tauri::State<'_, AppState>,
) -> Result<u64, String> {
    let local_network = state.local_network.lock().await;

    match local_network.as_ref() {
        Some(network) => {
            let block_number = network.get_latest_block_number().await
                .map_err(|e| format!("Failed to get latest block number: {}", e))?;
            Ok(block_number)
        }
        None => Err("Network is not running".to_string()),
    }
}

/// Search for block by number or transaction by hash
#[tauri::command]
pub async fn search_blockchain(
    query: String,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let local_network = state.local_network.lock().await;

    match local_network.as_ref() {
        Some(network) => {
            // Check if query is a block number (decimal integer)
            if let Ok(block_number) = query.parse::<u64>() {
                let block = network.get_block_by_number(block_number).await
                    .map_err(|e| format!("Failed to search: {}", e))?;
                
                if let Some(block) = block {
                    return Ok(serde_json::json!({
                        "type": "block",
                        "data": block
                    }));
                }
            }
            
            // Check if query is a transaction hash (0x + 64 hex chars)
            if query.starts_with("0x") && query.len() == 66 {
                let tx = network.get_transaction_by_hash(&query).await
                    .map_err(|e| format!("Failed to search: {}", e))?;
                
                if let Some(tx) = tx {
                    return Ok(serde_json::json!({
                        "type": "transaction",
                        "data": tx
                    }));
                }
            }
            
            // Nothing found
            Ok(serde_json::json!({
                "type": "not_found",
                "data": null
            }))
        }
        None => Err("Network is not running".to_string()),
    }
}
