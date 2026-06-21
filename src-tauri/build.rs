use std::path::Path;

fn main() {
    let config = dotenv_build::Config {
        filename: Path::new("../.env"),
        fail_if_missing_dotenv: true,
        ..Default::default()
    };
    dotenv_build::output(config).unwrap();
    tauri_build::build();
}
