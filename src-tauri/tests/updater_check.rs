use std::time::Duration;

/// アプリが実際に叩く latest リリースの update manifest を検証する統合テスト。
///
/// Tauri 2 の {{target}}-{{arch}} 形式（例: darwin-aarch64）でリクエストし、
/// 必須フィールド (version, pub_date, url, signature) を検証する。
const TARGETS: &[&str] = &[
    "darwin-aarch64",
    "darwin-x86_64",
    "windows-x86_64",
];

const UPDATER_ENDPOINT: &str =
    "https://github.com/unischool-sg/google_notify/releases/download/latest/update-{target}.json";

#[tokio::test]
async fn updater_endpoint_reachable() {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .user_agent("google-notify-updater-test")
        .build()
        .expect("Failed to create HTTP client");

    let mut found_any = false;

    for target in TARGETS {
        let url = UPDATER_ENDPOINT.replace("{target}", target);

        eprintln!("[updater_test] GET {url}");

        let resp = client
            .get(&url)
            .send()
            .await
            .unwrap_or_else(|e| panic!("Failed to reach {target} endpoint: {e}"));

        let status = resp.status();
        eprintln!("[updater_test]   HTTP {status}");

        if !status.is_success() {
            eprintln!(
                "[updater_test]   SKIP — manifest not found for {target} (expected until next release with new naming)"
            );
            continue;
        }

        found_any = true;
        let body = resp.text().await.expect("Failed to read response body");
        let json: serde_json::Value =
            serde_json::from_str(&body).expect("Response is not valid JSON");
        assert!(json.get("version").is_some(), "Missing 'version' field for {target}");
        assert!(json.get("pub_date").is_some(), "Missing 'pub_date' field for {target}");
        assert!(json.get("url").is_some(), "Missing 'url' field for {target}");
        assert!(json.get("signature").is_some(), "Missing 'signature' field for {target}");
        eprintln!("[updater_test]   OK — version={}", json["version"]);
    }

    assert!(
        found_any,
        "No update manifests found at latest release. \
         Publish a release with update-{{target}}-{{arch}}.json naming (e.g. update-darwin-aarch64.json)."
    );
}
