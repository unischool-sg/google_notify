use crate::oauth::google;

#[tauri::command]
pub(crate) async fn refresh_token(refresh_token: &str) -> Result<google::LoginResponse, String> {
    google::refresh_access_token(refresh_token).await
}
