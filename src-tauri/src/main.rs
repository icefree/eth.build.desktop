// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod config;
mod ethereum;
mod services;

use commands::{network, accounts, mining, transactions, blocks, solc, price};
use commands::services as service_commands;
use commands::config as config_commands;
use config::AppConfig;
use ethereum::local_network::LocalNetwork;
use services::ServiceManager;
use std::sync::{Arc, Mutex};

struct AppState {
    local_network: tokio::sync::Mutex<Option<LocalNetwork>>,
    service_manager: std::sync::Mutex<ServiceManager>,
    config: Arc<Mutex<AppConfig>>,
}

#[tokio::main]
async fn main() {
    // 加载配置
    let config = AppConfig::load().unwrap_or_else(|e| {
        eprintln!("Failed to load config, using defaults: {}", e);
        AppConfig::default()
    });

    let config = Arc::new(Mutex::new(config));

    // 检查是否有需要自动启动的服务
    let auto_start_services: Vec<String> = {
        let cfg = config.lock().unwrap();
        cfg.services
            .iter()
            .filter(|(_, cfg)| cfg.auto_start && cfg.enabled)
            .map(|(name, _)| name.clone())
            .collect()
    };

    if !auto_start_services.is_empty() {
        println!("Configured services to auto-start: {:?}", auto_start_services);
    }

    tauri::Builder::default()
        .manage(AppState {
            local_network: tokio::sync::Mutex::new(None),
            service_manager: std::sync::Mutex::new(ServiceManager::new(config.clone())),
            config: config.clone(),
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
            // Config commands
            config_commands::get_config,
            config_commands::update_config,
            config_commands::reload_config,
            config_commands::update_service_port,
            config_commands::get_auto_start_services,
            config_commands::auto_start_services,
            // Price test command
            price::test_coinmarketcap,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
