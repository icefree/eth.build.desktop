use std::process::{Child, Command, Stdio};
use std::collections::HashMap;
use std::io::Read;
use std::thread;
use std::time::Duration;

#[derive(Debug, Clone)]
pub struct ProcessInfo {
    pub name: String,
    pub running: bool,
    pub pid: Option<u32>,
    pub port: Option<u16>,
}

pub struct ProcessManager {
    processes: HashMap<String, ManagedProcess>,
}

struct ManagedProcess {
    child: Child,
    name: String,
    port: Option<u16>,
}

impl ProcessManager {
    pub fn new() -> Self {
        Self {
            processes: HashMap::new(),
        }
    }

    pub fn start_process(&mut self, name: String, command: &str, args: &[&str], port: Option<u16>) -> Result<(), String> {
        if self.processes.contains_key(&name) {
            return Err(format!("Process {} already running", name));
        }

        println!("Starting process '{}' with command: {} {:?}", name, command, args);

        let child = Command::new(command)
            .args(args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn {}: {}", name, e))?;

        self.processes.insert(name.clone(), ManagedProcess {
            child,
            name: name.clone(),
            port,
        });

        println!("Process '{}' started successfully", name);
        Ok(())
    }

    pub fn stop_process(&mut self, name: &str) -> Result<(), String> {
        if let Some(mut managed) = self.processes.remove(name) {
            println!("Stopping process '{}'...", name);

            managed.child.kill()
                .map_err(|e| format!("Failed to kill process {}: {}", name, e))?;

            // 尝试等待进程结束
            let _ = managed.child.wait();

            println!("Process '{}' stopped", name);
            Ok(())
        } else {
            Err(format!("Process {} not found", name))
        }
    }

    pub fn is_running(&self, name: &str) -> bool {
        self.processes.contains_key(name)
    }

    pub fn get_process_info(&self, name: &str) -> Option<ProcessInfo> {
        self.processes.get(name).map(|p| ProcessInfo {
            name: p.name.clone(),
            running: true,
            pid: p.child.id(),
            port: p.port,
        })
    }

    pub fn list_processes(&self) -> Vec<ProcessInfo> {
        self.processes.values()
            .map(|p| ProcessInfo {
                name: p.name.clone(),
                running: true,
                pid: p.child.id(),
                port: p.port,
            })
            .collect()
    }

    pub fn stop_all(&mut self) {
        println!("Stopping all processes...");
        let names: Vec<String> = self.processes.keys().cloned().collect();
        for name in names {
            let _ = self.stop_process(&name);
        }
    }
}

impl Default for ProcessManager {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for ProcessManager {
    fn drop(&mut self) {
        self.stop_all();
    }
}
