use tauri::State;

#[tauri::command]
pub async fn start_service(state: State<'_, crate::AppState>, service: String, port: Option<u16>) -> Result<String, String> {
    let mut manager = state.service_manager.lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;

    match service.as_str() {
        "geth" => {
            Err("Geth is disabled. Use Anvil for the local network.".to_string())
        },
        "socket" => {
            manager.start_socket_server_with_port(port).map(|_| "Socket server started successfully".to_string())
        },
        _ => Err(format!("Unknown service: {}", service)),
    }
}

#[tauri::command]
pub async fn stop_service(state: State<'_, crate::AppState>, service: String) -> Result<String, String> {
    let mut manager = state.service_manager.lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;

    match service.as_str() {
        "geth" => {
            Err("Geth is disabled. Use Anvil for the local network.".to_string())
        },
        "socket" => {
            manager.stop_socket_server().map(|_| "Socket server stopped successfully".to_string())
        },
        _ => Err(format!("Unknown service: {}", service)),
    }
}

#[tauri::command]
pub async fn start_all_services(state: State<'_, crate::AppState>) -> Result<Vec<String>, String> {
    let mut manager = state.service_manager.lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;

    manager.start_all()
}

#[tauri::command]
pub async fn stop_all_services(state: State<'_, crate::AppState>) -> Result<String, String> {
    let mut manager = state.service_manager.lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;

    manager.stop_all().map(|_| "All services stopped successfully".to_string())
}

#[tauri::command]
pub async fn get_services_status(state: State<'_, crate::AppState>) -> Result<Vec<serde_json::Value>, String> {
    let mut manager = state.service_manager.lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;

    let statuses = manager.get_all_status();
    let json_statuses: Vec<serde_json::Value> = statuses.into_iter()
        .map(|s| serde_json::json!({
            "name": s.name,
            "running": s.running,
            "pid": s.pid,
            "port": s.port,
            "enabled": s.enabled,
            "auto_start": s.auto_start,
        }))
        .collect();

    Ok(json_statuses)
}

#[tauri::command]
pub async fn get_service_status(state: State<'_, crate::AppState>, service: String) -> Result<Option<serde_json::Value>, String> {
    let mut manager = state.service_manager.lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;

    match manager.get_service_status(&service) {
        Some(status) => Ok(Some(serde_json::json!({
            "name": status.name,
            "running": status.running,
            "pid": status.pid,
            "port": status.port,
            "enabled": status.enabled,
            "auto_start": status.auto_start,
        }))),
        None => Ok(None),
    }
}
