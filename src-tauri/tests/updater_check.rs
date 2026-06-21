use std::time::Duration;

/// アプリが実際に叩く latest リリースの update manifest を検証する統合テスト。
///
/// Tauri 2 の静的 JSON 形式で、必須フィールド
/// (version, platforms.[target].url, platforms.[target].signature) を検証する。
const TARGETS: &[&str] = &[
    "darwin-aarch64",
    "darwin-x86_64",
    "windows-x86_64",
];

const UPDATER_ENDPOINT: &str =
    "https://github.com/unischool-sg/google_notify/releases/latest/download/latest.json";

#[tokio::test]
async fn updater_endpoint_reachable() {
    if std::env::var_os("RUN_UPDATER_ENDPOINT_TEST").is_none() {
        eprintln!(
            "[updater_test] SKIP — set RUN_UPDATER_ENDPOINT_TEST=1 to check the published latest.json"
        );
        return;
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .user_agent("google-notify-updater-test")
        .build()
        .expect("Failed to create HTTP client");

    eprintln!("[updater_test] GET {UPDATER_ENDPOINT}");

    let resp = client
        .get(UPDATER_ENDPOINT)
        .send()
        .await
        .unwrap_or_else(|e| panic!("Failed to reach updater endpoint: {e}"));

    let status = resp.status();
    eprintln!("[updater_test]   HTTP {status}");
    assert!(
        status.is_success(),
        "latest.json must be published to the latest GitHub release"
    );

    let body = resp.text().await.expect("Failed to read response body");
    let json: serde_json::Value = serde_json::from_str(&body).expect("Response is not valid JSON");

    assert!(json.get("version").is_some(), "Missing 'version' field");
    assert!(json.get("pub_date").is_some(), "Missing 'pub_date' field");

    let platforms = json
        .get("platforms")
        .and_then(|value| value.as_object())
        .expect("Missing 'platforms' object");

    for target in TARGETS {
        let platform = platforms
            .get(*target)
            .unwrap_or_else(|| panic!("Missing platform '{target}'"));

        assert!(
            platform.get("url").and_then(|value| value.as_str()).is_some(),
            "Missing platforms.{target}.url"
        );
        assert!(
            platform
                .get("signature")
                .and_then(|value| value.as_str())
                .is_some(),
            "Missing platforms.{target}.signature"
        );
    }

    eprintln!("[updater_test]   OK — version={}", json["version"]);
}
