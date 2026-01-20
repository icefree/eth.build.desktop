use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceConfig {
    pub enabled: bool,
    pub auto_start: bool,
    pub port: u16,
    pub command: String,
    pub args: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConfig {
    pub chain_id: u64,
    pub accounts: u64,
    pub balance: String,
    pub block_time: Option<u64>,
    pub gas_price: Option<u64>,
    pub fork_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub network: NetworkConfig,
    pub services: std::collections::HashMap<String, ServiceConfig>,
}

impl Default for AppConfig {
    fn default() -> Self {
        let mut services = std::collections::HashMap::new();

        services.insert("socket".to_string(), ServiceConfig {
            enabled: true,
            auto_start: true,
            port: 44386,
            command: "node".to_string(),
            args: vec!["socket/index.js".to_string()],
        });

        services.insert("solc".to_string(), ServiceConfig {
            enabled: true,
            auto_start: false,
            port: 48452,
            command: "node".to_string(),
            args: vec!["solc/index.js".to_string()],
        });

        services.insert("proxy".to_string(), ServiceConfig {
            enabled: true,
            auto_start: false, // 依赖 geth,手动启动
            port: 48451,
            command: "node".to_string(),
            args: vec!["proxy/local.js".to_string()],
        });

        Self {
            network: NetworkConfig {
                chain_id: 31337,
                accounts: 10,
                balance: "10000".to_string(),
                block_time: None,
                gas_price: None,
                fork_url: None,
            },
            services,
        }
    }
}

impl AppConfig {
    pub fn load() -> Result<Self, String> {
        let config_path = Self::config_path();

        if config_path.exists() {
            let content = fs::read_to_string(&config_path)
                .map_err(|e| format!("Failed to read config file: {}", e))?;

            let mut config: AppConfig = serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse config file: {}", e))?;

            // 移除已禁用的 geth 服务配置
            config.services.remove("geth");

            Ok(config)
        } else {
            // 创建默认配置
            let default_config = AppConfig::default();
            default_config.save()?;
            Ok(default_config)
        }
    }

    pub fn save(&self) -> Result<(), String> {
        let config_path = Self::config_path();

        // 确保目录存在
        if let Some(parent) = config_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create config directory: {}", e))?;
        }

        let content = serde_json::to_string_pretty(self)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;

        fs::write(&config_path, content)
            .map_err(|e| format!("Failed to write config file: {}", e))?;

        Ok(())
    }

    pub fn get_service_config(&self, name: &str) -> Option<&ServiceConfig> {
        self.services.get(name)
    }

    fn config_path() -> PathBuf {
        // 使用项目根目录的 config.json
        let mut path = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        path.push("config.json");
        path
    }

    pub fn reload(&mut self) -> Result<(), String> {
        let new_config = Self::load()?;
        *self = new_config;
        Ok(())
    }
}
