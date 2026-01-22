use serde::{Deserialize, Serialize};
use crate::services::process_manager::ProcessManager;
use std::net::TcpListener;
use std::path::PathBuf;
use std::process::Command;

/// 查找 node 可执行文件的路径
/// macOS GUI 应用启动时不会继承终端的 PATH，需要手动查找常见安装路径
fn find_node_path() -> Option<String> {
    // 常见的 node 安装路径
    let common_paths = [
        "/opt/homebrew/bin/node",      // Apple Silicon Homebrew
        "/usr/local/bin/node",          // Intel Homebrew / 官方安装
        "/usr/bin/node",                // 系统安装
        "/opt/local/bin/node",          // MacPorts
    ];

    // 首先检查常见路径
    for path in &common_paths {
        if std::path::Path::new(path).exists() {
            return Some(path.to_string());
        }
    }

    // 尝试通过 shell 查找（作为后备方案）
    if let Ok(output) = Command::new("/bin/sh")
        .args(["-l", "-c", "which node"])
        .output()
    {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() && std::path::Path::new(&path).exists() {
                return Some(path);
            }
        }
    }

    None
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
    socket_port: u16,
}

impl ServiceManager {
    pub fn new() -> Self {
        Self {
            process_manager: ProcessManager::new(),
            services: vec![
                "socket".to_string(),
            ],
            socket_port: 44386,
        }
    }

    fn resolve_base_dir(&self) -> PathBuf {
        if let Ok(exe) = std::env::current_exe() {
            if let Some(dir) = exe.parent() {
                let resource_dir = dir.join("../Resources");
                if resource_dir.join("socket").exists() {
                    return resource_dir;
                }
            }
        }

        let mut dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        for _ in 0..4 {
            if dir.join("package.json").exists() {
                return dir;
            }
            if !dir.pop() {
                break;
            }
        }
        std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
    }

    fn service_dir_exists(&self, base_dir: &PathBuf, service_name: &str) -> bool {
        base_dir.join(service_name).exists()
    }

    fn get_service_port(&self, service_name: &str) -> u16 {
        match service_name {
            "socket" => self.socket_port,
            _ => 0,
        }
    }

    fn is_port_available(port: u16) -> bool {
        TcpListener::bind(("127.0.0.1", port)).is_ok()
    }

    pub fn start_socket_server(&mut self) -> Result<(), String> {
        self.start_socket_server_with_port(None)
    }

    pub fn start_socket_server_with_port(&mut self, port: Option<u16>) -> Result<(), String> {
        let base_dir = self.resolve_base_dir();
        if !self.service_dir_exists(&base_dir, "socket") {
            return Err("Socket directory not found".to_string());
        }

        // 查找 node 可执行文件路径
        let node_path = find_node_path()
            .ok_or_else(|| "Node.js not found. Please install Node.js first.".to_string())?;

        let base_port = port.unwrap_or(self.socket_port);
        let max_port = base_port.saturating_add(20);
        let mut last_error: Option<String> = None;

        for candidate in base_port..=max_port {
            if candidate == 0 || candidate > 65535 {
                continue;
            }
            if !Self::is_port_available(candidate) {
                continue;
            }

        let entrypoint = if base_dir.join("socket/dist/index.js").exists() {
            "socket/dist/index.js"
        } else {
            "socket/index.js"
        };
        let args = vec![entrypoint];
            let envs = Some(vec![("SOCKET_PORT".to_string(), candidate.to_string())]);

            match self.process_manager.start_process(
                "socket".to_string(),
                &node_path,
                args.as_slice(),
                Some(candidate),
                Some(&base_dir),
                envs,
            ) {
                Ok(()) => {
                    self.socket_port = candidate;
                    return Ok(());
                }
                Err(err) => {
                    if err.contains("EADDRINUSE") {
                        last_error = Some(err);
                        continue;
                    }
                    return Err(err);
                }
            }
        }

        Err(last_error.unwrap_or_else(|| "No available port for socket service".to_string()))
    }

    pub fn stop_socket_server(&mut self) -> Result<(), String> {
        self.process_manager.stop_process("socket")
    }

    pub fn start_all(&mut self) -> Result<Vec<String>, String> {
        let mut started = Vec::new();
        let mut errors = Vec::new();

        // 按顺序启动服务
        if let Err(e) = self.start_socket_server() {
            errors.push(format!("Failed to start socket: {}", e));
        } else {
            started.push("socket".to_string());
        }

        if errors.is_empty() {
            Ok(started)
        } else {
            Err(errors.join("; "))
        }
    }

    pub fn stop_all(&mut self) -> Result<(), String> {
        // 按相反顺序停止服务
        let _ = self.stop_socket_server();
        Ok(())
    }

    pub fn get_all_status(&mut self) -> Vec<ServiceStatus> {
        self.process_manager.reap_exited();
        self.services.iter().map(|name| {
            let info = self.process_manager.get_process_info(name);
            let config_port = self.get_service_port(name);

            ServiceStatus {
                name: name.clone(),
                running: info.is_some(),
                pid: info.as_ref().and_then(|i| i.pid),
                port: Some(config_port), // 使用默认端口
                enabled: true,
                auto_start: true,
            }
        }).collect()
    }

    pub fn get_service_status(&mut self, name: &str) -> Option<ServiceStatus> {
        self.process_manager.reap_exited();
        let info = self.process_manager.get_process_info(name)?;
        let config_port = self.get_service_port(name);

        Some(ServiceStatus {
            name: name.to_string(),
            running: true,
            pid: info.pid,
            port: Some(config_port), // 使用默认端口
            enabled: true,
            auto_start: true,
        })
    }
}

impl Default for ServiceManager {
    fn default() -> Self {
        Self::new()
    }
}
