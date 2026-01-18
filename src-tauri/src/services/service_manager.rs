use serde::{Deserialize, Serialize};
use crate::services::process_manager::{ProcessManager, ProcessInfo};
use crate::config::AppConfig;
use std::sync::{Arc, Mutex};

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
    config: Arc<Mutex<AppConfig>>,
}

impl ServiceManager {
    pub fn new(config: Arc<Mutex<AppConfig>>) -> Self {
        Self {
            process_manager: ProcessManager::new(),
            services: vec![
                "geth".to_string(),
                "socket".to_string(),
                "solc".to_string(),
                "proxy".to_string(),
            ],
            config,
        }
    }

    fn get_service_port(&self, service_name: &str) -> u16 {
        let config = self.config.lock().unwrap();
        config.get_service_config(service_name)
            .map(|cfg| cfg.port)
            .unwrap_or_else(|| {
                // 默认端口
                match service_name {
                    "geth" => 8545,
                    "socket" => 44387,
                    "solc" => 48452,
                    "proxy" => 48451,
                    _ => 0,
                }
            })
    }

    fn get_service_command_args(&self, service_name: &str) -> (String, Vec<String>) {
        let config = self.config.lock().unwrap();
        config.get_service_config(service_name)
            .map(|cfg| (cfg.command.clone(), cfg.args.clone()))
            .unwrap_or_else(|| {
                // 默认命令和参数
                match service_name {
                    "geth" => ("./geth/self.sh".to_string(), vec![]),
                    "socket" => ("node".to_string(), vec!["socket/index.js".to_string()]),
                    "solc" => ("node".to_string(), vec!["solc/index.js".to_string()]),
                    "proxy" => ("node".to_string(), vec!["proxy/local.js".to_string()]),
                    _ => ("".to_string(), vec![]),
                }
            })
    }

    pub fn start_geth(&mut self) -> Result<(), String> {
        // 检查 geth 目录
        let geth_dir = std::path::PathBuf::from("geth");
        if !geth_dir.exists() {
            return Err("Geth directory not found".to_string());
        }

        let port = self.get_service_port("geth");
        let (command, args) = self.get_service_command_args("geth");

        // 启动 geth 节点
        self.process_manager.start_process(
            "geth".to_string(),
            &command,
            &args.iter().map(|s| s.as_str()).collect::<Vec<_>>(),
            Some(port),
        )
    }

    pub fn start_socket_server(&mut self) -> Result<(), String> {
        let socket_dir = std::path::PathBuf::from("socket");
        if !socket_dir.exists() {
            return Err("Socket directory not found".to_string());
        }

        let port = self.get_service_port("socket");
        let (command, args) = self.get_service_command_args("socket");

        self.process_manager.start_process(
            "socket".to_string(),
            &command,
            &args.iter().map(|s| s.as_str()).collect::<Vec<_>>(),
            Some(port),
        )
    }

    pub fn start_proxy(&mut self) -> Result<(), String> {
        let proxy_dir = std::path::PathBuf::from("proxy");
        if !proxy_dir.exists() {
            return Err("Proxy directory not found".to_string());
        }

        let port = self.get_service_port("proxy");
        let (command, args) = self.get_service_command_args("proxy");

        // 代理使用 HTTP,不需要 HTTPS
        self.process_manager.start_process(
            "proxy".to_string(),
            &command,
            &args.iter().map(|s| s.as_str()).collect::<Vec<_>>(),
            Some(port),
        )
    }

    pub fn start_solc(&mut self) -> Result<(), String> {
        let solc_dir = std::path::PathBuf::from("solc");
        if !solc_dir.exists() {
            return Err("Solc directory not found".to_string());
        }

        let port = self.get_service_port("solc");
        let (command, args) = self.get_service_command_args("solc");

        self.process_manager.start_process(
            "solc".to_string(),
            &command,
            &args.iter().map(|s| s.as_str()).collect::<Vec<_>>(),
            Some(port),
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

    pub fn stop_solc(&mut self) -> Result<(), String> {
        self.process_manager.stop_process("solc")
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

        if let Err(e) = self.start_solc() {
            errors.push(format!("Failed to start solc: {}", e));
        } else {
            started.push("solc".to_string());
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
        let _ = self.stop_solc();
        let _ = self.stop_socket_server();
        let _ = self.stop_geth();
        Ok(())
    }

    pub fn get_all_status(&self) -> Vec<ServiceStatus> {
        self.services.iter().map(|name| {
            let info = self.process_manager.get_process_info(name);
            let config_port = self.get_service_port(name);

            ServiceStatus {
                name: name.clone(),
                running: info.is_some(),
                pid: info.as_ref().and_then(|i| i.pid),
                port: Some(config_port), // 使用配置的端口
                enabled: true,
                auto_start: false,
            }
        }).collect()
    }

    pub fn get_service_status(&self, name: &str) -> Option<ServiceStatus> {
        let info = self.process_manager.get_process_info(name)?;
        let config_port = self.get_service_port(name);

        Some(ServiceStatus {
            name: name.to_string(),
            running: true,
            pid: info.pid,
            port: Some(config_port), // 使用配置的端口
            enabled: true,
            auto_start: false,
        })
    }
}

impl Default for ServiceManager {
    fn default() -> Self {
        // 注意: 这个 default 实现不应该被使用,因为需要 config
        // 但为了编译通过,我们创建一个默认的空配置
        use std::sync::{Arc, Mutex};
        let config = AppConfig::default();
        Self::new(Arc::new(Mutex::new(config)))
    }
}
