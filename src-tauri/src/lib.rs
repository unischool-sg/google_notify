pub(crate) mod commands;
pub(crate) mod oauth;

use commands::{login, refresh_token};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    dotenvy::dotenv().ok();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_oauth::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![login, refresh_token])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
