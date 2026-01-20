use crate::config::AppConfig;
use crate::services::ServiceManager;
use serde::Deserialize;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

#[derive(Deserialize)]
pub struct UpdateConfigArgs {
    #[serde(alias = "newConfig", alias = "new_config")]
    new_config: serde_json::Value,
}

fn resolve_base_dir() -> PathBuf {
    let mut dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    for _ in 0..4 {
        if dir.join("package.json").exists() && dir.join("geth").exists() {
            return dir;
        }
        if !dir.pop() {
            break;
        }
    }
    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
}

fn persist_coinmarketcap_key(config: &AppConfig) -> Result<(), String> {
    let base_dir = resolve_base_dir();
    let key_path = base_dir.join("coinmarketcap.key");
    let key = config.api_keys.coinmarketcap.trim();
    if key.is_empty() {
        if key_path.exists() {
            fs::remove_file(&key_path)
                .map_err(|e| format!("Failed to remove coinmarketcap.key: {}", e))?;
        }
        return Ok(());
    }

    fs::write(&key_path, key)
        .map_err(|e| format!("Failed to write coinmarketcap.key: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_config(state: State<'_, crate::AppState>) -> Result<serde_json::Value, String> {
    let config = &state.config;
    Ok(serde_json::to_value(&*config.lock().unwrap())
        .map_err(|e| format!("Failed to serialize config: {}", e))?)
}

#[tauri::command]
pub async fn update_config(
    state: State<'_, crate::AppState>,
    args: UpdateConfigArgs,
) -> Result<String, String> {
    let config: AppConfig = serde_json::from_value(args.new_config)
        .map_err(|e| format!("Failed to parse config: {}", e))?;

    // 保存到文件
    config.save()?;
    persist_coinmarketcap_key(&config)?;

    // 更新全局配置
    *state.config.lock().unwrap() = config;

    Ok("Configuration updated successfully".to_string())
}

#[tauri::command]
pub async fn reload_config(
    state: State<'_, crate::AppState>,
) -> Result<String, String> {
    // 重新加载配置
    let new_config = AppConfig::load()?;

    // 保存新配置
    new_config.save()?;
    persist_coinmarketcap_key(&new_config)?;

    // 更新全局配置
    *state.config.lock().unwrap() = new_config;

    Ok("Configuration reloaded successfully".to_string())
}

#[tauri::command]
pub async fn update_service_port(
    state: State<'_, crate::AppState>,
    service: String,
    port: u16,
) -> Result<String, String> {
    let mut config = state.config.lock().unwrap();

    // 更新服务端口
    if let Some(service_config) = config.services.get_mut(&service) {
        service_config.port = port;

        // 保存到文件
        config.save()?;

        Ok(format!("Service {} port updated to {}", service, port))
    } else {
        Err(format!("Service {} not found", service))
    }
}

#[tauri::command]
pub async fn get_auto_start_services(
    state: State<'_, crate::AppState>,
) -> Result<Vec<String>, String> {
    let config = state.config.lock().unwrap();
    let services: Vec<String> = config.services
        .iter()
        .filter(|(_, cfg)| cfg.auto_start && cfg.enabled)
        .map(|(name, _)| name.clone())
        .collect();

    Ok(services)
}

#[tauri::command]
pub async fn auto_start_services(
    state: State<'_, crate::AppState>,
) -> Result<Vec<String>, String> {
    let config = state.config.lock().unwrap();
    let mut service_manager = state.service_manager.lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;

    let mut started = Vec::new();

    // 按顺序启动自动启动的服务
    for (name, service_config) in config.services.iter() {
        if service_config.auto_start && service_config.enabled {
            match name.as_str() {
                "geth" => {
                    if let Ok(()) = service_manager.start_geth() {
                        started.push(name.clone());
                        std::thread::sleep(std::time::Duration::from_secs(2));
                    }
                }
                "socket" => {
                    if let Ok(()) = service_manager.start_socket_server() {
                        started.push(name.clone());
                    }
                }
                "solc" => {
                    if let Ok(()) = service_manager.start_solc() {
                        started.push(name.clone());
                    }
                }
                "proxy" => {
                    if let Ok(()) = service_manager.start_proxy() {
                        started.push(name.clone());
                    }
                }
                _ => {}
            }
        }
    }

    Ok(started)
}
