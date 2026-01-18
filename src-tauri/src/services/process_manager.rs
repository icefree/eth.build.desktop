use std::process::{Child, Command};
use std::collections::HashMap;

pub struct ProcessManager {
    processes: HashMap<String, Child>,
}

impl ProcessManager {
    pub fn new() -> Self {
        Self {
            processes: HashMap::new(),
        }
    }

    pub fn start_process(&mut self, name: String, command: &str, args: &[&str]) -> Result<(), String> {
        if self.processes.contains_key(&name) {
            return Err(format!("Process {} already running", name));
        }

        let child = Command::new(command)
            .args(args)
            .spawn()
            .map_err(|e| format!("Failed to spawn {}: {}", name, e))?;

        self.processes.insert(name, child);
        Ok(())
    }

    pub fn stop_process(&mut self, name: &str) -> Result<(), String> {
        if let Some(mut child) = self.processes.remove(name) {
            child.kill()
                .map_err(|e| format!("Failed to kill process {}: {}", name, e))?;
            Ok(())
        } else {
            Err(format!("Process {} not found", name))
        }
    }

    pub fn is_running(&self, name: &str) -> bool {
        self.processes.contains_key(name)
    }
}

impl Default for ProcessManager {
    fn default() -> Self {
        Self::new()
    }
}
