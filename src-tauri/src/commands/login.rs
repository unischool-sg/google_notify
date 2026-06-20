use crate::oauth::google;

#[tauri::command]
pub(crate) async fn login() -> Result<google::LoginResponse, String> {
    google::login().await
}
