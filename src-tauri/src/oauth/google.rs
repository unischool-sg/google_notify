use base64::{engine::general_purpose, Engine as _};
use rand::{distr::Alphanumeric, Rng};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::time::Duration;
use tokio::sync::mpsc;
use url::Url;

#[derive(Deserialize)]
#[allow(dead_code)]
pub(crate) struct TokenResponse {
    pub(crate) access_token: String,
    token_type: String,
    expires_in: u32,
    refresh_token: Option<String>,
    scope: String,
}

fn generate_code_verifier() -> String {
    let bytes: Vec<u8> = (0..48).map(|_| rand::random::<u8>()).collect();
    general_purpose::URL_SAFE_NO_PAD.encode(&bytes)
}

fn compute_code_challenge(verifier: &str) -> String {
    let hash = Sha256::digest(verifier.as_bytes());
    general_purpose::URL_SAFE_NO_PAD.encode(&hash)
}

pub(crate) async fn login() -> Result<String, String> {
    let client_id =
        std::env::var("GOOGLE_CLIENT_ID").map_err(|_| "GOOGLE_CLIENT_ID not set".to_string())?;
    let client_secret = std::env::var("GOOGLE_CLIENT_SECRET").ok();

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

    let redirect_uri = format!("http://127.0.0.1:{port}/callback");
    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?\
         client_id={client_id}&\
         redirect_uri={redirect_uri}&\
         response_type=code&\
         scope=openid%20email%20profile&\
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
             http://127.0.0.1:54321/callback".to_string()
        })?
        .ok_or("OAuth channel closed unexpectedly".to_string())?;

    let _ = tauri_plugin_oauth::cancel(port);

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

    let http = reqwest::Client::new();
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

    Ok(token_data.access_token)
}
