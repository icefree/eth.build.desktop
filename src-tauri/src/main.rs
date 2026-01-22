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

#[tokio::main]
async fn main() {
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
                if let Err(e) = app.emit("app-closing", ()) {
                    eprintln!("Failed to emit app-closing event: {}", e);
                } else {
                    println!("Sent app-closing event to frontend");
                }

                tauri::async_runtime::spawn(async move {
                    // Give frontend a moment to handle the event without blocking the runtime thread
                    tokio::time::sleep(std::time::Duration::from_millis(200)).await;

                    let state = app.state::<AppState>();

                    // Stop socket server
                    let service_result = tauri::async_runtime::spawn_blocking(move || {
                        if let Ok(mut manager) = state.service_manager.lock() {
                            println!("Stopping socket server...");
                            manager.stop_all()
                        } else {
                            Err("Failed to acquire service_manager lock".into())
                        }
                    })
                    .await;

                    match service_result {
                        Ok(Ok(())) => println!("Socket server stopped successfully"),
                        Ok(Err(e)) => eprintln!("Error stopping services: {}", e),
                        Err(e) => eprintln!("Failed to join service stop task: {}", e),
                    }

                    // Stop local Ethereum network (Anvil)
                    println!("Stopping local Ethereum network (Anvil)...");
                    let network_to_stop = {
                        let mut local_network = state.local_network.lock().await;
                        local_network.take()
                    };

                    if let Some(network) = network_to_stop {
                        let stop_result = tauri::async_runtime::spawn_blocking(move || network.stop()).await;
                        match stop_result {
                            Ok(Ok(())) => println!("Ethereum network stopped successfully"),
                            Ok(Err(e)) => eprintln!("Error stopping Ethereum network: {}", e),
                            Err(e) => eprintln!("Failed to join Ethereum stop task: {}", e),
                        }
                    }

                    println!("All services stopped, proceeding with window close");
                });
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
