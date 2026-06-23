import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { basename, join } from "path";

const repo = process.env.GITHUB_REPOSITORY || "unischool-sg/google_notify";
const rawVersion = process.env.RELEASE_VERSION || "";
const version = rawVersion.replace(/^v/, "");

if (!version) {
  console.error("RELEASE_VERSION is required (e.g. v0.1.1 or 0.1.1)");
  process.exit(1);
}

const mode = process.argv[2] || "partial";

if (mode === "partial") {
  writePartialManifest();
} else if (mode === "merge") {
  mergePartialManifests();
} else {
  console.error(`Unknown mode: ${mode}`);
  process.exit(1);
}

function writePartialManifest() {
  const sigFiles = findSignatureFiles(join(process.cwd(), "src-tauri", "target"));
  const updateArtifacts = sigFiles
    .map((sigPath) => toUpdateArtifact(sigPath))
    .filter(Boolean);

  if (updateArtifacts.length === 0) {
    dumpTargetTree();
    console.error("No updater .sig files found.");
    console.error("Ensure TAURI_SIGNING_PRIVATE_KEY is set and createUpdaterArtifacts is enabled.");
    process.exit(1);
  }

  const platformHints = parsePlatformHints(process.env.UPDATE_PLATFORM_KEYS || "");
  const platforms = {};

  for (const artifact of updateArtifacts) {
    const inferredPlatforms = determinePlatforms(artifact.name);
    const platformKeys = platformHints.length > 0
      ? platformHints
      : inferredPlatforms;

    for (const platformKey of platformKeys) {
      const current = platforms[platformKey];
      if (current && artifactRank(current.artifactName) >= artifactRank(artifact.name)) {
        continue;
      }

      platforms[platformKey] = {
        artifactName: artifact.name,
        signature: artifact.signature,
        url: releaseAssetUrl(artifact.name),
      };
    }
  }

  if (Object.keys(platforms).length === 0) {
    console.error("Could not determine any updater platforms from signed artifacts.");
    process.exit(1);
  }

  const output = process.env.UPDATE_MANIFEST_PART || "update-manifest-part.json";
  writeFileSync(output, JSON.stringify(baseManifest(platforms), null, 2));
  console.log(`Generated ${output} with platforms: ${Object.keys(platforms).join(", ")}`);
}

function mergePartialManifests() {
  const inputDir = process.env.UPDATE_MANIFEST_PARTS_DIR || "update-manifests";
  const output = process.env.UPDATE_JSON_OUTPUT || "latest.json";
  const partFiles = findJsonFiles(inputDir);
  const platforms = {};

  if (partFiles.length === 0) {
    console.error(`No manifest parts found under ${inputDir}`);
    process.exit(1);
  }

  for (const partFile of partFiles) {
    const part = JSON.parse(readFileSync(partFile, "utf8"));
    if (!part.platforms || typeof part.platforms !== "object") {
      console.error(`Manifest part has no platforms object: ${partFile}`);
      process.exit(1);
    }

    for (const [platformName, platform] of Object.entries(part.platforms)) {
      if (platforms[platformName] && !samePlatform(platforms[platformName], platform)) {
        console.error(`Conflicting duplicate platform '${platformName}' in ${partFile}`);
        console.error(`Existing URL: ${platforms[platformName].url}`);
        console.error(`Duplicate URL: ${platform.url}`);
        process.exit(1);
      }

      platforms[platformName] = platform;
    }
  }

  validatePlatforms(platforms);
  writeFileSync(output, JSON.stringify(baseManifest(platforms), null, 2));
  console.log(`Generated ${output} with platforms: ${Object.keys(platforms).join(", ")}`);
}

function baseManifest(platforms) {
  return {
    version,
    pub_date: new Date().toISOString(),
    platforms: Object.fromEntries(
      Object.entries(platforms).map(([name, platform]) => [
        name,
        {
          signature: platform.signature,
          url: platform.url,
        },
      ])
    ),
  };
}

function releaseAssetUrl(assetName) {
  // tauri-action renames uploaded artifacts:
  //   "Google Notify.app.tar.gz" → "Google.Notify_universal.app.tar.gz"
  //   1. spaces → dots
  //   2. macOS universal: insert _universal before .app.tar.gz
  let name = assetName.replace(/ /g, '.');
  if (/\.app\.tar\.gz$/i.test(name) && !/universal/i.test(name)) {
    name = name.replace(/\.app\.tar\.gz$/i, '_universal.app.tar.gz');
  }
  return `https://github.com/${repo}/releases/download/v${version}/${encodeURIComponent(name)}`;
}

function findSignatureFiles(root) {
  const sigFiles = [];

  const walk = (dir) => {
    if (!existsSync(dir)) return;

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        walk(fullPath);
      } else if (/\.(sig|minisig)$/i.test(entry.name)) {
        sigFiles.push(fullPath);
      }
    }
  };

  walk(root);
  return sigFiles;
}

function findJsonFiles(root) {
  const jsonFiles = [];

  const walk = (dir) => {
    if (!existsSync(dir)) return;

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (/\.json$/i.test(entry.name)) {
        jsonFiles.push(fullPath);
      }
    }
  };

  walk(root);
  return jsonFiles.sort();
}

function toUpdateArtifact(sigPath) {
  const name = basename(sigPath).replace(/\.(sig|minisig)$/i, "");

  if (!isUpdaterArtifact(name)) {
    return null;
  }

  return {
    name,
    signature: readFileSync(sigPath, "utf8").trim(),
  };
}

function isUpdaterArtifact(name) {
  return /\.(app\.tar\.gz|appimage|msi|exe|msi\.zip|nsis\.zip)$/i.test(name);
}

function parsePlatformHints(value) {
  return value
    .split(",")
    .map((platform) => platform.trim())
    .filter(Boolean);
}

function determinePlatforms(artifactName) {
  if (/windows|\.msi$|\.exe$|\.msi\.zip$|\.nsis\.zip$/i.test(artifactName)) {
    return ["windows-x86_64"];
  }

  if (/linux|appimage/i.test(artifactName)) {
    return [artifactName.match(/aarch64|arm64/i) ? "linux-aarch64" : "linux-x86_64"];
  }

  if (/universal/i.test(artifactName)) {
    return ["darwin-x86_64", "darwin-aarch64"];
  }

  if (/aarch64|arm64/i.test(artifactName)) {
    return ["darwin-aarch64"];
  }

  if (/\.app\.tar\.gz$/i.test(artifactName) && /x86_64|aarch64|arm64|universal/i.test(artifactName) === false) {
    return ["darwin-x86_64", "darwin-aarch64"];
  }

  return ["darwin-x86_64"];
}

function artifactRank(artifactName = "") {
  if (/\.app\.tar\.gz$/i.test(artifactName)) return 50;
  if (/\.msi$/i.test(artifactName)) return 40;
  if (/\.exe$/i.test(artifactName)) return 30;
  if (/\.appimage$/i.test(artifactName)) return 20;
  if (/\.(msi|nsis)\.zip$/i.test(artifactName)) return 10;
  return 0;
}

function samePlatform(a, b) {
  return a.url === b.url && a.signature === b.signature;
}

function validatePlatforms(platforms) {
  const names = Object.keys(platforms);

  if (names.length === 0) {
  console.error("Merged latest.json would not contain any platforms.");
    process.exit(1);
  }

  for (const name of names) {
    const platform = platforms[name];
    if (!platform.url || !platform.signature) {
      console.error(`Platform ${name} must include url and signature.`);
      process.exit(1);
    }
  }
}

function dumpTargetTree() {
  const root = join(process.cwd(), "src-tauri", "target");

  console.log("Listing src-tauri/target structure for debugging:");

  const dump = (dir, indent = 2) => {
    if (!existsSync(dir)) return;

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      console.log(" ".repeat(indent) + (entry.isDirectory() ? "+ " : "  ") + entry.name);
      if (entry.isDirectory() && indent < 10) dump(join(dir, entry.name), indent + 2);
    }
  };

  dump(root);
}
