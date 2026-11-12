//! XRAR Desktop Application Launcher
//! Native Windows WinRAR-style Graphical Archive Manager

use std::fs;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, ExitCode};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

const ASSET_HTML: &[u8] = include_bytes!("../../../frontend/dist/index.html");
const ASSET_ICON_PNG: &[u8] = include_bytes!("../../../frontend/dist/icon.png");
const ASSET_ICON_ICO: &[u8] = include_bytes!("../../../frontend/dist/icon.ico");
const ASSET_JS: &[u8] = include_bytes!("../../../frontend/dist/assets/index-DwW66Z_N.js");
const ASSET_CSS: &[u8] = include_bytes!("../../../frontend/dist/assets/index-DJvC3-Je.css");

fn find_browser_executable() -> Option<PathBuf> {
    // 1. Try Microsoft Edge
    let edge_paths = [
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ];
    for p in &edge_paths {
        let path = PathBuf::from(p);
        if path.exists() {
            return Some(path);
        }
    }

    // 2. Try Google Chrome
    let chrome_paths = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ];
    for p in &chrome_paths {
        let path = PathBuf::from(p);
        if path.exists() {
            return Some(path);
        }
    }

    None
}

fn handle_connection(mut stream: TcpStream) {
    let mut buffer = [0u8; 4096];
    let bytes_read = match stream.read(&mut buffer) {
        Ok(n) if n > 0 => n,
        _ => return,
    };

    let req_str = String::from_utf8_lossy(&buffer[..bytes_read]);
    let first_line = req_str.lines().next().unwrap_or("");
    let parts: Vec<&str> = first_line.split_whitespace().collect();

    if parts.len() < 2 {
        return;
    }

    let method = parts[0];
    let uri = parts[1];

    if method != "GET" && method != "HEAD" {
        let resp = "HTTP/1.1 405 Method Not Allowed\r\nContent-Length: 0\r\n\r\n";
        let _ = stream.write_all(resp.as_bytes());
        return;
    }

    // Routing
    let (status, content_type, body): (&str, &str, &[u8]) = if uri == "/" || uri == "/index.html" || uri.starts_with("/?") {
        ("200 OK", "text/html; charset=utf-8", ASSET_HTML)
    } else if uri == "/icon.png" || uri == "/favicon.ico" {
        ("200 OK", "image/png", ASSET_ICON_PNG)
    } else if uri == "/icon.ico" {
        ("200 OK", "image/x-icon", ASSET_ICON_ICO)
    } else if uri.ends_with(".js") || uri.contains("/assets/index-") && uri.contains(".js") {
        ("200 OK", "application/javascript; charset=utf-8", ASSET_JS)
    } else if uri.ends_with(".css") || uri.contains("/assets/index-") && uri.contains(".css") {
        ("200 OK", "text/css; charset=utf-8", ASSET_CSS)
    } else if uri == "/api/status" {
        let json = b"{\"version\":\"1.0.0\",\"app\":\"XRAR\",\"status\":\"ready\"}";
        ("200 OK", "application/json", json)
    } else if uri == "/api/benchmark" {
        // Run real benchmark on-demand
        match xrar_core::raw_benchmark(5) {
            Ok(report) => {
                let serialized = serde_json::to_vec(&report).unwrap_or_else(|_| b"{}".to_vec());
                let header = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                    serialized.len()
                );
                let _ = stream.write_all(header.as_bytes());
                let _ = stream.write_all(&serialized);
                return;
            }
            Err(_) => ("500 Internal Error", "application/json", b"{\"error\":\"Benchmark failed\"}"),
        }
    } else {
        ("404 Not Found", "text/plain", b"404 Not Found")
    };

    let header = format!(
        "HTTP/1.1 {}\r\nContent-Type: {}\r\nContent-Length: {}\r\nCache-Control: no-cache\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n",
        status,
        content_type,
        body.len()
    );

    let _ = stream.write_all(header.as_bytes());
    if method == "GET" {
        let _ = stream.write_all(body);
    }
}

pub fn launch_gui_app() -> ExitCode {
    // 1. Bind to ephemeral port
    let listener = match TcpListener::bind("127.0.0.1:0") {
        Ok(l) => l,
        Err(e) => {
            eprintln!("Failed to bind local GUI server: {}", e);
            return ExitCode::FAILURE;
        }
    };

    let port = match listener.local_addr() {
        Ok(addr) => addr.port(),
        Err(e) => {
            eprintln!("Failed to read local address: {}", e);
            return ExitCode::FAILURE;
        }
    };

    let app_url = format!("http://127.0.0.1:{}", port);

    // 2. Spawn local server thread
    let running = Arc::new(AtomicBool::new(true));
    let running_clone = running.clone();

    thread::spawn(move || {
        for stream in listener.incoming() {
            if !running_clone.load(Ordering::Relaxed) {
                break;
            }
            if let Ok(stream) = stream {
                thread::spawn(move || {
                    handle_connection(stream);
                });
            }
        }
    });

    // 3. Launch App Window
    let mut browser_child: Option<Child> = None;

    if let Some(browser_exe) = find_browser_executable() {
        let app_arg = format!("--app={}", app_url);
        let win_size = "--window-size=1280,820";
        let title_arg = "--name=XRAR — Extreme Compression Archive";

        if let Ok(child) = Command::new(&browser_exe)
            .args([&app_arg, win_size, title_arg])
            .spawn()
        {
            browser_child = Some(child);
        }
    }

    if browser_child.is_none() {
        // Fallback: Open in default browser
        let _ = Command::new("cmd")
            .args(["/c", "start", &app_url])
            .spawn();
    }

    // 4. Wait for window closure or keep process alive
    if let Some(mut child) = browser_child {
        let _ = child.wait();
    } else {
        // If opened via shell start, keep server running until interrupted
        println!("XRAR Desktop Manager running at {}", app_url);
        println!("Press Ctrl+C to close.");
        while running.load(Ordering::Relaxed) {
            thread::sleep(Duration::from_millis(500));
        }
    }

    running.store(false, Ordering::Relaxed);
    ExitCode::SUCCESS
}

fn main() -> ExitCode {
    launch_gui_app()
}
