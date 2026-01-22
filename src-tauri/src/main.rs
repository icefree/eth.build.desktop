// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod ethereum;
mod services;

use commands::{network, accounts, mining, transactions, blocks, solc};
use commands::services as service_commands;
use ethereum::local_network::LocalNetwork;
use services::ServiceManager;
use tauri::Manager;

struct AppState {
    local_network: tokio::sync::Mutex<Option<LocalNetwork>>,
    service_manager: std::sync::Mutex<ServiceManager>,
}

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            local_network: tokio::sync::Mutex::new(None),
            service_manager: std::sync::Mutex::new(ServiceManager::new()),
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let state = app.handle().state::<AppState>();
            let mut manager = state.service_manager.lock()
                .map_err(|e| format!("Failed to acquire lock: {}", e))?;
            if let Err(err) = manager.start_socket_server() {
                eprintln!("Failed to auto-start socket: {}", err);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Network commands
            network::start_local_network,
            network::stop_local_network,
            network::get_network_status,
            network::reset_network,
            // Account commands
            accounts::get_accounts,
            accounts::faucet,
            // Mining commands
            mining::mine_block,
            mining::set_auto_mine,
            // Transaction commands
            transactions::get_transactions,
            transactions::get_transaction_by_hash,
            // Block explorer commands
            blocks::get_blocks,
            blocks::get_block_by_number,
            blocks::get_latest_block_number,
            blocks::search_blockchain,
            // Solidity compiler command
            solc::compile_solidity,
            // Service commands
            service_commands::start_service,
            service_commands::stop_service,
            service_commands::start_all_services,
            service_commands::stop_all_services,
            service_commands::get_services_status,
            service_commands::get_service_status,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                println!("Window close requested, cleaning up services...");
                
                let app = window.app_handle();
                
                // Emit event to frontend to cleanup IPFS and other frontend services
                use tauri::Emitter;
                let _ = app.emit("app-closing", ());
                
                // Give frontend a tiny bit of time
                std::thread::sleep(std::time::Duration::from_millis(150));
                
                let state = app.state::<AppState>();
                
                // Stop socket server (std::sync::Mutex is safe to lock here)
                if let Ok(mut manager) = state.service_manager.lock() {
                    println!("Stopping all background services...");
                    let _ = manager.stop_all();
                }
                
                // Stop local Ethereum network (Anvil)
                // Use blocking_lock as we are now in a standard thread context (no tokio::main)
                println!("Stopping local Ethereum network (Anvil)...");
                let mut local_network = state.local_network.blocking_lock();
                if let Some(mut network) = local_network.take() {
                    if let Err(e) = network.stop() {
                        eprintln!("Error stopping Ethereum network: {}", e);
                    } else {
                        println!("Ethereum network stopped successfully");
                    }
                }
                
                println!("Cleanup complete, window will close now.");
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
