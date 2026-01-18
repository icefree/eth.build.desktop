use std::collections::HashMap;
use std::process::Command;

pub struct PortManager {
    allocated_ports: HashMap<String, u16>,
}

impl PortManager {
    pub fn new() -> Self {
        let mut manager = Self {
            allocated_ports: HashMap::new(),
        };

        // 默认端口分配
        manager.allocated_ports.insert("ethereum_rpc".to_string(), 8545);
        manager.allocated_ports.insert("ethereum_ws".to_string(), 8546);

        manager
    }

    pub fn allocate_port(&mut self, service: &str, preferred: u16) -> Result<u16, String> {
        if self.check_port_available(preferred) {
            self.allocated_ports.insert(service.to_string(), preferred);
            Ok(preferred)
        } else {
            Err(format!("Port {} is not available", preferred))
        }
    }

    pub fn release_port(&mut self, service: &str) {
        self.allocated_ports.remove(service);
    }

    pub fn check_port_available(&self, port: u16) -> bool {
        match Command::new("lsof")
            .args(["-i", &format!(":{}", port)])
            .output()
        {
            Ok(output) => !output.status.success(),
            Err(_) => true,
        }
    }

    pub fn get_service_port(&self, service: &str) -> Option<u16> {
        self.allocated_ports.get(service).copied()
    }
}

impl Default for PortManager {
    fn default() -> Self {
        Self::new()
    }
}
