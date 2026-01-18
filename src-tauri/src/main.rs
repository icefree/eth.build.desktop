// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod config;
mod ethereum;
mod services;

use commands::{network, accounts, mining, transactions, services, config};
use config::AppConfig;
use ethereum::local_network::LocalNetwork;
use services::ServiceManager;

struct AppState {
    local_network: tokio::sync::Mutex<Option<LocalNetwork>>,
    service_manager: ServiceManager,
    config: AppConfig,
}

#[tokio::main]
async fn main() {
    // 加载配置
    let config = AppConfig::load().unwrap_or_else(|e| {
        eprintln!("Failed to load config, using defaults: {}", e);
        AppConfig::default()
    });

    // 检查是否有需要自动启动的服务
    let auto_start_services: Vec<String> = config.services
        .iter()
        .filter(|(_, cfg)| cfg.auto_start && cfg.enabled)
        .map(|(name, _)| name.clone())
        .collect();

    if !auto_start_services.is_empty() {
        println!("Configured services to auto-start: {:?}", auto_start_services);
    }

    tauri::Builder::default()
        .manage(AppState {
            local_network: tokio::sync::Mutex::new(None),
            service_manager: ServiceManager::new(),
            config,
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
            // Config commands
            config::get_config,
            config::update_config,
            config::reload_config,
            config::get_auto_start_services,
            config::auto_start_services,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
