import { readFileSync, readdirSync, existsSync, writeFileSync } from "fs";
import { join, dirname, basename } from "path";

const rawVersion = process.env.RELEASE_VERSION || "";
const version = rawVersion.replace(/^v/, "");
if (!version) {
  console.error("RELEASE_VERSION is required (e.g. v0.1.1 or 0.1.1)");
  process.exit(1);
}

const repo = "unischool-sg/google_notify";
const baseUrl = `https://github.com/${repo}/releases/download/v${version}`;

const bundleDir = join(process.cwd(), "src-tauri", "target", "release", "bundle");

if (!existsSync(bundleDir)) {
  console.error(`Bundle directory not found: ${bundleDir}`);
  process.exit(1);
}

const sigFiles = [];

const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.name.endsWith(".sig")) {
      sigFiles.push(full);
    }
  }
};
walk(bundleDir);

if (sigFiles.length === 0) {
  console.error("No .sig files found in bundle directory");
  process.exit(1);
}

for (const sigPath of sigFiles) {
  const signature = readFileSync(sigPath, "utf8").trim();
  const artifactName = basename(sigPath, ".sig");
  const url = `${baseUrl}/${artifactName}`;

  const pubDate = new Date().toISOString().replace(
    /\.\d{3}Z$/, "Z"
  ).replace("T", " ").replace(/\s/, "T");

  const update = {
    version,
    pub_date: new Date().toISOString(),
    url,
    signature,
  };

  const target = determineTarget(artifactName);
  const filename = `update-${target}.json`;

  writeFileSync(join(process.cwd(), filename), JSON.stringify(update, null, 2));
  console.log(`Generated ${filename}`);
}

function determineTarget(artifactName) {
  if (/windows/i.test(artifactName) || /msi/i.test(artifactName)) {
    return "x86_64-pc-windows-msvc";
  }
  if (/aarch64|arm64/i.test(artifactName)) {
    return "aarch64-apple-darwin";
  }
  return "x86_64-apple-darwin";
}
