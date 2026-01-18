use serde::{Deserialize, Serialize};
use crate::services::process_manager::{ProcessManager, ProcessInfo};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceConfig {
    pub enabled: bool,
    pub auto_start: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceStatus {
    pub name: String,
    pub running: bool,
    pub pid: Option<u32>,
    pub port: Option<u16>,
    pub enabled: bool,
    pub auto_start: bool,
}

pub struct ServiceManager {
    process_manager: ProcessManager,
    services: Vec<String>,
}

impl ServiceManager {
    pub fn new() -> Self {
        Self {
            process_manager: ProcessManager::new(),
            services: vec![
                "geth".to_string(),
                "socket".to_string(),
                "proxy".to_string(),
            ],
        }
    }

    pub fn start_geth(&mut self) -> Result<(), String> {
        // 检查 geth 目录
        let geth_dir = std::path::PathBuf::from("geth");
        if !geth_dir.exists() {
            return Err("Geth directory not found".to_string());
        }

        // 启动 geth 节点
        self.process_manager.start_process(
            "geth".to_string(),
            "./geth/self.sh",
            &[],
            Some(8545),
        )
    }

    pub fn start_socket_server(&mut self) -> Result<(), String> {
        let socket_dir = std::path::PathBuf::from("socket");
        if !socket_dir.exists() {
            return Err("Socket directory not found".to_string());
        }

        self.process_manager.start_process(
            "socket".to_string(),
            "node",
            &["socket/index.js"],
            Some(44387),
        )
    }

    pub fn start_proxy(&mut self) -> Result<(), String> {
        let proxy_dir = std::path::PathBuf::from("proxy");
        if !proxy_dir.exists() {
            return Err("Proxy directory not found".to_string());
        }

        // 代理使用 HTTP,不需要 HTTPS
        self.process_manager.start_process(
            "proxy".to_string(),
            "node",
            &["proxy/local.js"],  // 使用 local.js 而不是 index.js (HTTP版本)
            Some(48451),
        )
    }

    pub fn stop_geth(&mut self) -> Result<(), String> {
        self.process_manager.stop_process("geth")
    }

    pub fn stop_socket_server(&mut self) -> Result<(), String> {
        self.process_manager.stop_process("socket")
    }

    pub fn stop_proxy(&mut self) -> Result<(), String> {
        self.process_manager.stop_process("proxy")
    }

    pub fn start_all(&mut self) -> Result<Vec<String>, String> {
        let mut started = Vec::new();
        let mut errors = Vec::new();

        // 按顺序启动服务
        if let Err(e) = self.start_geth() {
            errors.push(format!("Failed to start geth: {}", e));
        } else {
            started.push("geth".to_string());
            std::thread::sleep(std::time::Duration::from_secs(2)); // 等待 geth 启动
        }

        if let Err(e) = self.start_socket_server() {
            errors.push(format!("Failed to start socket: {}", e));
        } else {
            started.push("socket".to_string());
        }

        if let Err(e) = self.start_proxy() {
            errors.push(format!("Failed to start proxy: {}", e));
        } else {
            started.push("proxy".to_string());
        }

        if errors.is_empty() {
            Ok(started)
        } else {
            Err(errors.join("; "))
        }
    }

    pub fn stop_all(&mut self) -> Result<(), String> {
        // 按相反顺序停止服务
        let _ = self.stop_proxy();
        let _ = self.stop_socket_server();
        let _ = self.stop_geth();
        Ok(())
    }

    pub fn get_all_status(&self) -> Vec<ServiceStatus> {
        self.services.iter().map(|name| {
            let info = self.process_manager.get_process_info(name);
            ServiceStatus {
                name: name.clone(),
                running: info.is_some(),
                pid: info.as_ref().and_then(|i| i.pid),
                port: info.as_ref().and_then(|i| i.port),
                enabled: true,
                auto_start: false,
            }
        }).collect()
    }

    pub fn get_service_status(&self, name: &str) -> Option<ServiceStatus> {
        let info = self.process_manager.get_process_info(name)?;
        Some(ServiceStatus {
            name: name.to_string(),
            running: true,
            pid: info.pid,
            port: info.port,
            enabled: true,
            auto_start: false,
        })
    }
}

impl Default for ServiceManager {
    fn default() -> Self {
        Self::new()
    }
}
