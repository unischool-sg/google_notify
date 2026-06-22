# Setup

## Prerequisites

- [Bun](https://bun.sh/) (package manager)
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- Tauri v2 system dependencies: [see guide](https://v2.tauri.app/start/prerequisites/)

## Environment Variables

Create a `.env` file in the project root:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

These are embedded at compile time via `env!()` / `option_env!()` macros.

### Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select existing.
3. Enable APIs:
   - Google Classroom API
   - Google Chat API
   - People API (for user profile)
4. Create OAuth 2.0 credentials (Desktop app type).
5. Add redirect URIs:
   - `http://127.0.0.1:54321/callback`
   - `http://127.0.0.1:54322/callback`
   - `http://127.0.0.1:54323/callback`

## Install Dependencies

```bash
bun install
```

## Development

```bash
# Start Tauri dev server (frontend + backend)
bun run tauri dev

# Or run frontend only (for UI work)
bun run dev
```

## Testing

```bash
# Run all tests
bun test

# TypeScript tests only
bun run test:ts

# Rust tests only
bun run test:rs
```

## Building

```bash
bun run tauri build
```

## Release

Push a version tag (`v*`) to trigger the release pipeline:

```bash
git tag v0.2.0
git push origin v0.2.0
```

This builds for Windows and macOS (universal binary), signs updater artifacts, and publishes a GitHub Release.

## Scripts

| Script | Description |
|--------|-------------|
| `dev` | Start Vite dev server |
| `build` | TypeScript check + Vite build |
| `tauri` | Run Tauri CLI |
| `lint` | ESLint check |
| `test` | All tests (TS + Rust) |
| `test:ts` | Vitest (TS) |
| `test:rs` | Cargo test (Rust) |

## Project Configuration Files

- `vite.config.ts` — Vite bundler, dev server on port 1420
- `tsconfig.json` — TypeScript configuration
- `eslint.config.js` — ESLint flat config
- `src-tauri/tauri.conf.json` — Tauri app config, CSP, updater
- `src-tauri/capabilities/default.json` — Tauri permissions
