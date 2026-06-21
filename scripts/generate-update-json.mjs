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

const targetDir = join(process.cwd(), "src-tauri", "target", "release");
const searchDirs = [
  join(targetDir, "bundle"),
  join(targetDir, "bundle", "msi"),
  join(targetDir, "bundle", "dmg"),
  join(targetDir, "bundle", "appimage"),
  targetDir,
  process.cwd(),
];

const sigFiles = [];

for (const dir of searchDirs) {
  if (!existsSync(dir)) continue;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() && /\.(sig|minisig)$/i.test(entry.name)) {
      sigFiles.push(join(dir, entry.name));
    }
  }
}

if (sigFiles.length === 0) {
  console.log("No .sig files found, searching more broadly...");
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        walk(full);
      } else if (/\.(sig|minisig)$/i.test(entry.name)) {
        sigFiles.push(full);
      } else if (/\.(msi|dmg|app|tar\.gz|zip)$/i.test(entry.name)) {
        console.log(`  Found bundle: ${full}`);
      }
    }
  };
  walk(join(process.cwd(), "src-tauri", "target"));
}

if (sigFiles.length === 0) {
  console.log("Listing src-tauri/target/ structure for debugging:");
  const dump = (dir, indent = 2) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      console.log(" ".repeat(indent) + (entry.isDirectory() ? "+ " : "  ") + entry.name);
      if (entry.isDirectory() && indent < 10) dump(join(dir, entry.name), indent + 2);
    }
  };
  dump(join(process.cwd(), "src-tauri", "target", "release"));
  console.error("No .sig files found. The updater requires signed artifacts.");
  console.error("Ensure TAURI_SIGNING_PRIVATE_KEY is set and the build produces .sig files.");
  process.exit(1);
}

for (const sigPath of sigFiles) {
  const signature = readFileSync(sigPath, "utf8").trim();
  const artifactName = basename(sigPath).replace(/\.(sig|minisig)$/i, "");
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

// Tauri 2 updater: {{target}} = OS (darwin/windows/linux), {{arch}} = architecture
function determineTarget(artifactName) {
  if (/windows/i.test(artifactName) || /msi/i.test(artifactName)) {
    return "windows-x86_64";
  }
  if (/aarch64|arm64/i.test(artifactName)) {
    return "darwin-aarch64";
  }
  return "darwin-x86_64";
}
