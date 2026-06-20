use base64::{engine::general_purpose, Engine as _};
use rand::{distr::Alphanumeric, Rng};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::time::Duration;
use tokio::sync::mpsc;
use url::Url;

#[derive(Deserialize)]
#[allow(dead_code)]
struct TokenResponse {
    access_token: String,
    token_type: String,
    expires_in: u32,
    refresh_token: Option<String>,
    scope: String,
}

#[derive(Serialize)]
pub(crate) struct LoginResponse {
    pub(crate) access_token: String,
    pub(crate) refresh_token: Option<String>,
    pub(crate) expires_in: u32,
}

fn generate_code_verifier() -> String {
    let bytes: Vec<u8> = (0..48).map(|_| rand::random::<u8>()).collect();
    general_purpose::URL_SAFE_NO_PAD.encode(&bytes)
}

fn compute_code_challenge(verifier: &str) -> String {
    let hash = Sha256::digest(verifier.as_bytes());
    general_purpose::URL_SAFE_NO_PAD.encode(&hash)
}

struct OauthServerGuard(u16);

impl Drop for OauthServerGuard {
    fn drop(&mut self) {
        let _ = tauri_plugin_oauth::cancel(self.0);
    }
}

pub(crate) async fn login() -> Result<LoginResponse, String> {
    let client_id =
        std::env::var("GOOGLE_CLIENT_ID").map_err(|_| "GOOGLE_CLIENT_ID not set".to_string())?;
    let client_secret = std::env::var("GOOGLE_CLIENT_SECRET").ok();
    let scopes = vec![
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/classroom.courses.readonly",
        "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
        "https://www.googleapis.com/auth/classroom.coursework.students.readonly",
        "https://www.googleapis.com/auth/classroom.announcements.readonly",
        "https://www.googleapis.com/auth/chat.spaces.readonly",
        "https://www.googleapis.com/auth/chat.messages.readonly",
    ];

    let state: String = rand::rng()
        .sample_iter(&Alphanumeric)
        .take(32)
        .map(char::from)
        .collect();

    let code_verifier = generate_code_verifier();
    let code_challenge = compute_code_challenge(&code_verifier);

    let (tx, mut rx) = mpsc::unbounded_channel::<String>();

    let config = tauri_plugin_oauth::OauthConfig {
        ports: Some(vec![54321, 54322, 54323]),
        response: None,
    };

    let port = tauri_plugin_oauth::start_with_config(config, move |url| {
        let _ = tx.send(url);
    })
    .map_err(|e| format!("Failed to start OAuth server: {e}. Try registering one of these redirect URIs in Google Cloud Console:\n  http://127.0.0.1:54321/callback\n  http://127.0.0.1:54322/callback\n  http://127.0.0.1:54323/callback"))?;

    let _guard = OauthServerGuard(port);

    let redirect_uri = format!("http://127.0.0.1:{port}/callback");
    let scopes_str = scopes.join("%20");
    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?\
         client_id={client_id}&\
         redirect_uri={redirect_uri}&\
         response_type=code&\
         scope={scopes_str}&\
         state={state}&\
         code_challenge={code_challenge}&\
         code_challenge_method=S256&\
         access_type=offline&\
         prompt=consent",
    );

    println!("[oauth] Opening browser: {auth_url}");
    println!("[oauth] Redirect URI: {redirect_uri}");

    tauri_plugin_opener::open_url(&auth_url, None::<&str>)
        .map_err(|e| format!("Failed to open browser: {e}"))?;

    println!("[oauth] Waiting for callback...");

    let callback_url = tokio::time::timeout(Duration::from_secs(180), rx.recv())
        .await
        .map_err(|_| {
            "OAuth timeout: no callback received within 3 minutes.\n\
             Make sure the redirect URI is registered in Google Cloud Console:\n  \
             http://127.0.0.1:54321/callback"
                .to_string()
        })?
        .ok_or("OAuth channel closed unexpectedly".to_string())?;

    println!("[oauth] Callback received");

    let parsed =
        Url::parse(&callback_url).map_err(|e| format!("Failed to parse callback URL: {e}"))?;

    if let Some((_, err)) = parsed.query_pairs().find(|(k, _)| k == "error") {
        return Err(format!("Google returned an error: {err}"));
    }

    let received_state = parsed
        .query_pairs()
        .find(|(k, _)| k == "state")
        .map(|(_, v)| v.into_owned())
        .ok_or("Missing state parameter in callback".to_string())?;

    if received_state != state {
        return Err("State mismatch: possible CSRF attack".to_string());
    }

    let code = parsed
        .query_pairs()
        .find(|(k, _)| k == "code")
        .map(|(_, v)| v.into_owned())
        .ok_or("Missing authorization code in callback".to_string())?;

    println!("[oauth] Exchanging code for token...");

    let http = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))?;

    let mut params = vec![
        ("code", code.as_str()),
        ("client_id", client_id.as_str()),
        ("code_verifier", code_verifier.as_str()),
        ("redirect_uri", redirect_uri.as_str()),
        ("grant_type", "authorization_code"),
    ];

    if let Some(secret) = &client_secret {
        params.push(("client_secret", secret.as_str()));
    }

    let resp = http
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token exchange request failed: {e}"))?;

    let status = resp.status();
    let text = resp.text().await.unwrap_or_default();

    if !status.is_success() {
        return Err(format!("Token exchange failed (HTTP {status}): {text}"));
    }

    let token_data: TokenResponse = serde_json::from_str(&text)
        .map_err(|e| format!("Failed to parse token response: {e}\nBody: {text}"))?;

    println!("[oauth] Login successful");

    Ok(LoginResponse {
        access_token: token_data.access_token,
        refresh_token: token_data.refresh_token,
        expires_in: token_data.expires_in,
    })
}

pub(crate) async fn refresh_access_token(refresh_token: &str) -> Result<LoginResponse, String> {
    let client_id =
        std::env::var("GOOGLE_CLIENT_ID").map_err(|_| "GOOGLE_CLIENT_ID not set".to_string())?;
    let client_secret = std::env::var("GOOGLE_CLIENT_SECRET").ok();

    let http = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))?;

    let mut params = vec![
        ("refresh_token", refresh_token),
        ("client_id", &client_id),
        ("grant_type", "refresh_token"),
    ];

    if let Some(secret) = &client_secret {
        params.push(("client_secret", secret));
    }

    let resp = http
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token refresh request failed: {e}"))?;

    let status = resp.status();
    let text = resp.text().await.unwrap_or_default();

    if !status.is_success() {
        return Err(format!("Token refresh failed (HTTP {status}): {text}"));
    }

    let token_data: TokenResponse = serde_json::from_str(&text)
        .map_err(|e| format!("Failed to parse token refresh response: {e}\nBody: {text}"))?;

    Ok(LoginResponse {
        access_token: token_data.access_token,
        refresh_token: Some(refresh_token.to_string()),
        expires_in: token_data.expires_in,
    })
}
