use std::time::Duration;

/// 実際に GitHub Releases のエンドポイントにリクエストを送り、
/// アップデータが正しく設定されていることを確認する統合テスト。
///
/// ターゲットごとにリクエストし、release が存在すれば JSON の必須フィールド
/// (version, pub_date, url, signature) を検証する。
const TARGETS: &[&str] = &[
    "aarch64-apple-darwin",
    "aarch64-apple-darwin",
    "x86_64-apple-darwin",
    "x86_64-pc-windows-msvc",
];

#[tokio::test]
async fn updater_endpoint_reachable() {
    let version = "0.1.3";

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .user_agent("google-notify-updater-test")
        .build()
        .expect("Failed to create HTTP client");

    for target in TARGETS {
        let url = format!(
            "https://github.com/unischool-sg/google_notify/releases/download/v{}/update-{}.json",
            version, target
        );

        eprintln!("[updater_test] GET {url}");

        let resp = client
            .get(&url)
            .send()
            .await
            .unwrap_or_else(|e| panic!("Failed to reach {target} endpoint: {e}"));

        let status = resp.status();
        eprintln!("[updater_test]   HTTP {status}");

        assert!(
            status.is_success() || status == 404,
            "Expected 200 or 404 for {target}, got {status}",
        );

        if status.is_success() {
            let body = resp.text().await.expect("Failed to read response body");
            let json: serde_json::Value =
                serde_json::from_str(&body).expect("Response is not valid JSON");
            assert!(json.get("version").is_some(), "Missing 'version' field for {target}");
            assert!(json.get("pub_date").is_some(), "Missing 'pub_date' field for {target}");
            assert!(json.get("url").is_some(), "Missing 'url' field for {target}");
            assert!(json.get("signature").is_some(), "Missing 'signature' field for {target}");
            eprintln!("[updater_test]   OK — version={}", json["version"]);
        } else {
            eprintln!(
                "[updater_test]   OK — server reachable (release v{} / {target} does not exist yet, got 404)",
                version
            );
        }
    }
}
