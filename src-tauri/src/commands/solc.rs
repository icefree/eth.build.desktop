use serde_json::Value;
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};

fn resolve_base_dir() -> PathBuf {
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

#[tauri::command]
pub async fn compile_solidity(input: Value) -> Result<Value, String> {
    let base_dir = resolve_base_dir();
    let script_path = base_dir.join("solc").join("compile.js");

    if !script_path.exists() {
        return Err("solc/compile.js not found".to_string());
    }

    let mut child = Command::new("node")
        .arg(script_path)
        .current_dir(&base_dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start solc compiler: {}", e))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(input.to_string().as_bytes())
            .map_err(|e| format!("Failed to send input to solc compiler: {}", e))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("Failed to read solc output: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let message = stderr.trim();
        return Err(if message.is_empty() {
            "solc compilation failed".to_string()
        } else {
            format!("solc compilation failed: {}", message)
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str(stdout.trim())
        .map_err(|e| format!("Invalid solc output: {}", e))
}
