// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod ethereum;
mod services;

use commands::{network, accounts, mining, transactions};
use ethereum::local_network::LocalNetwork;

struct AppState {
    local_network: tokio::sync::Mutex<Option<LocalNetwork>>,
}

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .manage(AppState {
            local_network: tokio::sync::Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            network::start_local_network,
            network::stop_local_network,
            network::get_network_status,
            accounts::get_accounts,
            accounts::faucet,
            mining::mine_block,
            mining::set_auto_mine,
            transactions::get_transactions,
            transactions::get_transaction_by_hash,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
