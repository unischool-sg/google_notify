use base64::{engine::general_purpose, Engine as _};
use rand::{distr::Alphanumeric, Rng};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::time::Duration;
use tokio::sync::mpsc;
use url::Url;

#[derive(Debug, Deserialize)]
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

async fn exchange_token(
    http: &reqwest::Client,
    token_url: &str,
    params: Vec<(&str, &str)>,
) -> Result<TokenResponse, String> {
    let resp = http
        .post(token_url)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token exchange request failed: {e}"))?;

    let status = resp.status();
    let text = resp.text().await.unwrap_or_default();

    if !status.is_success() {
        return Err(format!("Token exchange failed (HTTP {status}): {text}"));
    }

    serde_json::from_str(&text)
        .map_err(|e| format!("Failed to parse token response: {e}\nBody: {text}"))
}

async fn exchange_code(
    http: &reqwest::Client,
    token_url: &str,
    code: &str,
    client_id: &str,
    code_verifier: &str,
    redirect_uri: &str,
    client_secret: Option<&str>,
) -> Result<TokenResponse, String> {
    let mut params = vec![
        ("code", code),
        ("client_id", client_id),
        ("code_verifier", code_verifier),
        ("redirect_uri", redirect_uri),
        ("grant_type", "authorization_code"),
    ];

    if let Some(secret) = client_secret {
        params.push(("client_secret", secret));
    }

    exchange_token(http, token_url, params).await
}

pub(crate) async fn login() -> Result<LoginResponse, String> {
    let client_id = env!("GOOGLE_CLIENT_ID");
    let client_secret = option_env!("GOOGLE_CLIENT_SECRET").map(|s| s.to_string());
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

    let token_data = exchange_code(
        &http,
        "https://oauth2.googleapis.com/token",
        &code,
        client_id,
        &code_verifier,
        &redirect_uri,
        client_secret.as_deref(),
    )
    .await?;

    println!("[oauth] Login successful");

    Ok(LoginResponse {
        access_token: token_data.access_token,
        refresh_token: token_data.refresh_token,
        expires_in: token_data.expires_in,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_code_verifier_length_and_encoding() {
        let verifier = generate_code_verifier();
        assert_eq!(verifier.len(), 64);
        assert!(
            verifier
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_'),
            "Verifier contains non-URL-safe chars: {verifier}"
        );
    }

    #[test]
    fn test_generate_code_verifier_randomness() {
        let a = generate_code_verifier();
        let b = generate_code_verifier();
        assert_ne!(a, b, "Two verifiers should be distinct");
    }

    #[test]
    fn test_compute_code_challenge_deterministic() {
        let verifier = "test-verifier-1234567890-abcdefghijklmnop";
        let c1 = compute_code_challenge(verifier);
        let c2 = compute_code_challenge(verifier);
        assert_eq!(c1, c2, "Same verifier must produce same challenge");
    }

    #[test]
    fn test_compute_code_challenge_known_value() {
        let verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
        let expected_challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
        let challenge = compute_code_challenge(verifier);
        assert_eq!(challenge, expected_challenge);
    }

    #[test]
    fn test_compute_code_challenge_length() {
        let verifier = generate_code_verifier();
        let challenge = compute_code_challenge(&verifier);
        assert_eq!(challenge.len(), 43);
    }

    #[test]
    fn test_token_response_deserialization_full() {
        let json = r#"{
            "access_token": "ya29.a0AfH6SMA",
            "token_type": "Bearer",
            "expires_in": 3600,
            "refresh_token": "1//0gABCDEF",
            "scope": "openid email profile"
        }"#;
        let resp: TokenResponse = serde_json::from_str(json).unwrap();
        assert_eq!(resp.access_token, "ya29.a0AfH6SMA");
        assert_eq!(resp.token_type, "Bearer");
        assert_eq!(resp.expires_in, 3600);
        assert_eq!(resp.refresh_token, Some("1//0gABCDEF".into()));
    }

    #[test]
    fn test_token_response_deserialization_no_refresh() {
        let json = r#"{
            "access_token": "ya29.a0AfH6SMB",
            "token_type": "Bearer",
            "expires_in": 1800,
            "scope": "email"
        }"#;
        let resp: TokenResponse = serde_json::from_str(json).unwrap();
        assert_eq!(resp.access_token, "ya29.a0AfH6SMB");
        assert_eq!(resp.expires_in, 1800);
        assert!(resp.refresh_token.is_none());
    }

    #[test]
    fn test_token_response_empty_access_token() {
        let json = r#"{
            "access_token": "",
            "token_type": "Bearer",
            "expires_in": 0,
            "scope": ""
        }"#;
        let resp: TokenResponse = serde_json::from_str(json).unwrap();
        assert_eq!(resp.access_token, "");
        assert_eq!(resp.expires_in, 0);
        assert!(resp.refresh_token.is_none());
    }

    #[test]
    fn test_login_response_serialization() {
        let resp = LoginResponse {
            access_token: "ya29.test".into(),
            refresh_token: Some("refresh123".into()),
            expires_in: 3600,
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("ya29.test"));
        assert!(json.contains("refresh123"));
        assert!(json.contains("3600"));
    }

    #[test]
    fn test_generate_code_verifier_no_padding() {
        let verifier = generate_code_verifier();
        assert!(!verifier.contains('='), "Verifier should not contain padding");
    }

    #[test]
    fn test_different_verifiers_produce_different_challenges() {
        let v1 = "verifier-one-abcdefghijklmnopqrstuvwx";
        let v2 = "verifier-two-abcdefghijklmnopqrstuvwx";
        let c1 = compute_code_challenge(v1);
        let c2 = compute_code_challenge(v2);
        assert_ne!(c1, c2, "Different verifiers must produce different challenges");
    }

    #[test]
    fn test_login_response_without_refresh_token() {
        let resp = LoginResponse {
            access_token: "token_no_refresh".into(),
            refresh_token: None,
            expires_in: 1800,
        };
        let json = serde_json::to_string(&resp).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed["access_token"], "token_no_refresh");
        assert_eq!(parsed["refresh_token"], serde_json::Value::Null);
        assert_eq!(parsed["expires_in"], 1800);
    }

    #[test]
    fn test_oauth_server_guard_construction() {
        let guard = OauthServerGuard(54321);
        assert_eq!(guard.0, 54321);
    }

    #[test]
    fn test_callback_url_extracts_code_and_state() {
        let url = Url::parse("http://127.0.0.1:54321/callback?code=auth123&state=sec456").unwrap();
        let code = url
            .query_pairs()
            .find(|(k, _)| k == "code")
            .map(|(_, v)| v.into_owned());
        let state = url
            .query_pairs()
            .find(|(k, _)| k == "state")
            .map(|(_, v)| v.into_owned());
        let error = url
            .query_pairs()
            .find(|(k, _)| k == "error");
        assert_eq!(code.as_deref(), Some("auth123"));
        assert_eq!(state.as_deref(), Some("sec456"));
        assert!(error.is_none());
    }

    #[test]
    fn test_callback_url_detects_error() {
        let url = Url::parse(
            "http://127.0.0.1:54321/callback?error=access_denied&state=sec456",
        )
        .unwrap();
        let error = url
            .query_pairs()
            .find(|(k, _)| k == "error")
            .map(|(_, v)| v.into_owned());
        assert_eq!(error.as_deref(), Some("access_denied"));
    }

    #[test]
    fn test_callback_url_missing_params() {
        let url = Url::parse("http://127.0.0.1:54321/callback").unwrap();
        assert!(url.query_pairs().find(|(k, _)| k == "code").is_none());
        assert!(url.query_pairs().find(|(k, _)| k == "state").is_none());
    }

    #[test]
    fn test_token_response_to_login_response_conversion() {
        let token = TokenResponse {
            access_token: "ya29.converted".into(),
            token_type: "Bearer".into(),
            expires_in: 7200,
            refresh_token: Some("rt_converted".into()),
            scope: "email".into(),
        };
        let login = LoginResponse {
            access_token: token.access_token,
            refresh_token: token.refresh_token,
            expires_in: token.expires_in,
        };
        assert_eq!(login.access_token, "ya29.converted");
        assert_eq!(login.refresh_token, Some("rt_converted".into()));
        assert_eq!(login.expires_in, 7200);
    }

    #[test]
    fn test_refresh_response_reuses_input_refresh_token() {
        let input_rt = "my-refresh-token-value";
        let token = TokenResponse {
            access_token: "ya29.refreshed".into(),
            token_type: "Bearer".into(),
            expires_in: 3600,
            refresh_token: None,
            scope: "email".into(),
        };
        let login = LoginResponse {
            access_token: token.access_token,
            refresh_token: Some(input_rt.to_string()),
            expires_in: token.expires_in,
        };
        assert_eq!(login.access_token, "ya29.refreshed");
        assert_eq!(login.refresh_token, Some(input_rt.to_string()));
        assert_eq!(login.expires_in, 3600);
    }

    // --- HTTP mock tests (exchange_token / exchange_code) ---

    #[tokio::test]
    async fn test_exchange_code_success_with_refresh() {
        let mut server = mockito::Server::new_async().await;
        let _m = server
            .mock("POST", "/")
            .with_status(200)
            .with_body(
                r#"{"access_token":"ya29.mock","token_type":"Bearer","expires_in":3600,"refresh_token":"rt1","scope":"email"}"#,
            )
            .create();

        let client = reqwest::Client::new();
        let result = exchange_code(
            &client,
            &server.url(),
            "auth_code_123",
            "client_id_test",
            "verifier_test",
            "http://localhost/callback",
            None,
        )
        .await;

        assert!(result.is_ok());
        let token = result.unwrap();
        assert_eq!(token.access_token, "ya29.mock");
        assert_eq!(token.refresh_token, Some("rt1".into()));
        assert_eq!(token.expires_in, 3600);
    }

    #[tokio::test]
    async fn test_exchange_code_success_no_refresh() {
        let mut server = mockito::Server::new_async().await;
        let _m = server
            .mock("POST", "/")
            .with_status(200)
            .with_body(
                r#"{"access_token":"ya29.mock2","token_type":"Bearer","expires_in":1800,"scope":"email"}"#,
            )
            .create();

        let client = reqwest::Client::new();
        let result = exchange_code(
            &client,
            &server.url(),
            "auth_code_456",
            "client_id_test",
            "verifier_test",
            "http://localhost/callback",
            None,
        )
        .await;

        assert!(result.is_ok());
        let token = result.unwrap();
        assert_eq!(token.access_token, "ya29.mock2");
        assert!(token.refresh_token.is_none());
        assert_eq!(token.expires_in, 1800);
    }

    #[tokio::test]
    async fn test_exchange_code_http_error() {
        let mut server = mockito::Server::new_async().await;
        let _m = server
            .mock("POST", "/")
            .with_status(400)
            .with_body(r#"{"error":"invalid_grant"}"#)
            .create();

        let client = reqwest::Client::new();
        let result = exchange_code(
            &client,
            &server.url(),
            "bad_code",
            "client_id_test",
            "verifier_test",
            "http://localhost/callback",
            None,
        )
        .await;

        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("400"), "error should contain HTTP status");
    }

    #[tokio::test]
    async fn test_exchange_code_with_client_secret() {
        let mut server = mockito::Server::new_async().await;
        let _m = server
            .mock("POST", "/")
            .with_status(200)
            .with_body(
                r#"{"access_token":"ya29.secret","token_type":"Bearer","expires_in":3600,"scope":"email"}"#,
            )
            .create();

        let client = reqwest::Client::new();
        let result = exchange_code(
            &client,
            &server.url(),
            "code_with_secret",
            "client_id_test",
            "verifier_test",
            "http://localhost/callback",
            Some("my_secret"),
        )
        .await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_exchange_token_refresh_success() {
        let mut server = mockito::Server::new_async().await;
        let _m = server
            .mock("POST", "/")
            .with_status(200)
            .with_body(
                r#"{"access_token":"ya29.refreshed","token_type":"Bearer","expires_in":3600,"scope":"email"}"#,
            )
            .create();

        let params = vec![
            ("refresh_token", "old_refresh_token"),
            ("client_id", "client_id_test"),
            ("grant_type", "refresh_token"),
        ];

        let client = reqwest::Client::new();
        let result = exchange_token(&client, &server.url(), params).await;

        assert!(result.is_ok());
        let token = result.unwrap();
        assert_eq!(token.access_token, "ya29.refreshed");
    }

    #[tokio::test]
    async fn test_exchange_token_invalid_json() {
        let mut server = mockito::Server::new_async().await;
        let _m = server
            .mock("POST", "/")
            .with_status(200)
            .with_body("not-json")
            .create();

        let params = vec![("grant_type", "refresh_token")];
        let client = reqwest::Client::new();
        let result = exchange_token(&client, &server.url(), params).await;

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("parse"));
    }
}

pub(crate) async fn refresh_access_token(refresh_token: &str) -> Result<LoginResponse, String> {
    let client_id = env!("GOOGLE_CLIENT_ID");
    let client_secret = option_env!("GOOGLE_CLIENT_SECRET").map(|s| s.to_string());

    let http = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))?;

    let mut params = vec![
        ("refresh_token", refresh_token),
        ("client_id", client_id),
        ("grant_type", "refresh_token"),
    ];

    if let Some(secret) = &client_secret {
        params.push(("client_secret", secret));
    }

    let token_data = exchange_token(&http, "https://oauth2.googleapis.com/token", params).await?;

    Ok(LoginResponse {
        access_token: token_data.access_token,
        refresh_token: Some(refresh_token.to_string()),
        expires_in: token_data.expires_in,
    })
}
