use std::path::Path;
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

    pub fn start_process(
        &mut self,
        name: String,
        command: &str,
        args: &[&str],
        port: Option<u16>,
        working_dir: Option<&Path>,
        envs: Option<Vec<(String, String)>>,
    ) -> Result<(), String> {
        if let Some(existing) = self.processes.get_mut(&name) {
            if let Ok(Some(_)) = existing.child.try_wait() {
                self.processes.remove(&name);
            } else {
                return Err(format!("Process {} already running", name));
            }
        }

        println!("Starting process '{}' with command: {} {:?}", name, command, args);

        let mut cmd = Command::new(command);
        if let Some(dir) = working_dir {
            cmd.current_dir(dir);
        }
        if let Some(envs) = envs {
            for (key, value) in envs {
                cmd.env(key, value);
            }
        }

        let mut child = cmd
            .args(args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn {}: {}", name, e))?;

        thread::sleep(Duration::from_millis(200));
        if let Ok(Some(status)) = child.try_wait() {
            let mut stderr = String::new();
            if let Some(mut stderr_pipe) = child.stderr.take() {
                let _ = stderr_pipe.read_to_string(&mut stderr);
            }
            let mut stdout = String::new();
            if let Some(mut stdout_pipe) = child.stdout.take() {
                let _ = stdout_pipe.read_to_string(&mut stdout);
            }
            let stderr = stderr.trim();
            let stdout = stdout.trim();
            let mut details = String::new();
            if !stderr.is_empty() {
                details.push_str(stderr);
            } else if !stdout.is_empty() {
                details.push_str(stdout);
            }
            let suffix = if details.is_empty() { "".to_string() } else { format!(": {}", details) };
            return Err(format!("Process {} exited early ({}){}", name, status, suffix));
        }

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
            pid: Some(p.child.id()),
            port: p.port,
        })
    }

    pub fn list_processes(&self) -> Vec<ProcessInfo> {
        self.processes.values()
            .map(|p| ProcessInfo {
                name: p.name.clone(),
                running: true,
                pid: Some(p.child.id()),
                port: p.port,
            })
            .collect()
    }

    pub fn reap_exited(&mut self) {
        let names: Vec<String> = self.processes.keys().cloned().collect();
        for name in names {
            let remove = self.processes.get_mut(&name)
                .and_then(|proc| proc.child.try_wait().ok().flatten())
                .is_some();
            if remove {
                self.processes.remove(&name);
            }
        }
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
