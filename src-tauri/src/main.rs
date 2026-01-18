// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod ethereum;
mod services;

use commands::{network, accounts, mining, transactions, services};
use ethereum::local_network::LocalNetwork;
use services::ServiceManager;

struct AppState {
    local_network: tokio::sync::Mutex<Option<LocalNetwork>>,
    service_manager: ServiceManager,
}

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .manage(AppState {
            local_network: tokio::sync::Mutex::new(None),
            service_manager: ServiceManager::new(),
        })
        .invoke_handler(tauri::generate_handler![
            // Network commands
            network::start_local_network,
            network::stop_local_network,
            network::get_network_status,
            // Account commands
            accounts::get_accounts,
            accounts::faucet,
            // Mining commands
            mining::mine_block,
            mining::set_auto_mine,
            // Transaction commands
            transactions::get_transactions,
            transactions::get_transaction_by_hash,
            // Service commands
            services::start_service,
            services::stop_service,
            services::start_all_services,
            services::stop_all_services,
            services::get_services_status,
            services::get_service_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
