

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use auto_launch::AutoLaunch;
fn setup_autostart() -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(target_os = "macos")]
    let app = AutoLaunch::new(
        "Google Notify",
        std::env::current_exe()?
            .to_str()
            .unwrap(),
        false,
        &[] as &[&str],
    );
    #[cfg(not(target_os = "macos"))]
    let app = AutoLaunch::new(
        "Google Notify",
        std::env::current_exe()?
            .to_str()
            .unwrap(),
        &[] as &[&str],
    );

    if !app.is_enabled()? {
        app.enable()?;
    }

    Ok(())
}

fn main() {
    let _ = setup_autostart();
    google_notify_lib::run()
}