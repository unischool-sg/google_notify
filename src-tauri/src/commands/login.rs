use crate::oauth::google;

#[tauri::command]
pub(crate) async fn login() -> Result<String, String> {
    google::login().await
}
