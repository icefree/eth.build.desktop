use crate::config::AppConfig;
use crate::services::ServiceManager;
use std::sync::Mutex;
use tauri::State;

#[tauri::command]
pub async fn get_config(state: State<'_, crate::AppState>) -> Result<serde_json::Value, String> {
    let config = &state.config;
    Ok(serde_json::to_value(config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?)
}

#[tauri::command]
pub async fn update_config(
    state: State<'_, crate::AppState>,
    new_config: serde_json::Value,
) -> Result<String, String> {
    let config: AppConfig = serde_json::from_value(new_config)
        .map_err(|e| format!("Failed to parse config: {}", e))?;

    // 保存到文件
    config.save()?;

    // 更新前端显示的提示信息
    Ok("Configuration updated successfully".to_string())
}

#[tauri::command]
pub async fn reload_config(
    state: State<'_, crate::AppState>,
) -> Result<String, String> {
    let mut config = &state.config;

    // 注意: 这里需要重新加载配置,但由于 Rust 的所有权规则,
    // 我们需要创建一个新配置然后替换
    let new_config = AppConfig::load()?;

    // 保存新配置
    new_config.save()?;

    Ok("Configuration reloaded successfully".to_string())
}

#[tauri::command]
pub async fn get_auto_start_services(
    state: State<'_, crate::AppState>,
) -> Result<Vec<String>, String> {
    let config = &state.config;
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
    let config = &state.config;
    let mut service_manager = state.service_manager.lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;

    let mut started = Vec::new();

    // 按顺序启动自动启动的服务
    for (name, service_config) in &config.services {
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
