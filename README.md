# Google Notify

A Tauri v2 desktop application that aggregates unread notifications from Google services (Classroom, Chat) into a single tray-like interface.

Built with **Rust + Tauri v2** backend and **React 19 + TypeScript + MUI v9** frontend.

## Features

- **Google OAuth 2.0 PKCE** authentication flow
- **Unread Classroom items** — courses and coursework updated since last view
- **Unread Chat messages** — spaces and messages filtered by recency
- **Auto-refresh tokens** — seamless token renewal via refresh_token grant
- **Auto-launch** — starts on system login
- **Auto-updater** — signed update artifacts distributed via GitHub Releases

## Quick Start

```bash
# Install dependencies
bun install

# Set up Google OAuth credentials (see docs/setup.md)
cp .env.example .env

# Run in development mode
bun run tauri dev
```

## Documentation

| Document | Description |
|----------|-------------|
| [docs/setup.md](docs/setup.md) | Setup guide, prerequisites, Google Cloud configuration |
| [docs/architecture.md](docs/architecture.md) | System architecture and data flow |
| [docs/oauth-flow.md](docs/oauth-flow.md) | OAuth 2.0 PKCE flow details |
| [docs/api.md](docs/api.md) | Tauri commands and frontend API reference |

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Vite dev server |
| `bun run tauri dev` | Start Tauri app in dev mode |
| `bun run tauri build` | Build production binary |
| `bun test` | Run all tests (Vitest + cargo test) |
| `bun run test:ts` | Run Vitest frontend tests |
| `bun run test:rs` | Run Rust backend tests |
| `bun run lint` | ESLint check |
| `bun run lint:fix` | ESLint auto-fix |

## Tech Stack

**Frontend:** React 19, TypeScript, MUI v9, Tailwind CSS v4, Vite v7, Vitest v4

**Backend:** Rust, Tauri v2, reqwest, tokio, sha2, serde

**CI/CD:** GitHub Actions (unit tests on PR, automated release on tag)

## License

MIT
