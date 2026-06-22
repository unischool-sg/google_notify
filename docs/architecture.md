# Architecture

## Overview

Google Notify is a Tauri v2 desktop application that aggregates unread notifications from Google services (Classroom, Chat). It uses **OAuth 2.0 with PKCE** for authentication and runs as a system-tray-like app with auto-start on login.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, MUI v9, Tailwind CSS v4 |
| Backend | Rust, Tauri v2 |
| Bundler | Vite v7 |
| Testing | Vitest (TS), cargo test (Rust) |
| CI/CD | GitHub Actions |
| Distribution | GitHub Releases + Tauri updater |

## Directory Structure

```
google_notify/
├── src/                        # React frontend
│   ├── main.tsx                # Entry point
│   ├── App.tsx                 # Root: router + update check
│   ├── app/index.tsx           # IndexPage: main unread view
│   ├── lib/google.ts           # GoogleAPIClient (API abstraction)
│   ├── hooks/                  # React hooks (useClassroom, useChat, useProfile)
│   ├── components/             # UI components
│   │   ├── provider/           # Context providers (Session, Utils)
│   │   ├── screen/loading.tsx  # Loading spinner
│   │   ├── ui/                 # Reusable UI (Modal, Button, UpdateDialog)
│   │   └── unread/             # Unread item cards
│   ├── config/                 # Route config, storage keys
│   ├── constants/              # App constants
│   ├── types/                  # TypeScript interfaces
│   └── __tests__/              # Frontend tests
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── main.rs             # Binary entry: auto-launch setup
│   │   ├── lib.rs              # Plugin registration, command handlers
│   │   ├── commands/           # Tauri commands (login, refresh_token)
│   │   └── oauth/google.rs     # OAuth PKCE flow implementation
│   ├── tauri.conf.json         # Tauri configuration
│   ├── capabilities/           # Permission capabilities
│   └── tests/                  # Rust integration tests
├── scripts/                    # Release scripts
└── .github/workflows/          # CI/CD pipelines
```

## Frontend Architecture

```
main.tsx
  └── ThemeProvider + CssBaseline
       └── App.tsx
            ├── BrowserRouter + Routes
            │    └── Layout (Outlet)
            │         ├── SessionProvider (OAuth login)
            │         └── UtilsProvider (window close handler)
            └── UpdateDialog (if update available)
```

### Data Flow

1. **SessionProvider** checks localStorage for existing tokens.
2. If no token, shows a login modal with Google Sign-In button.
3. Clicking Sign-In calls `invoke("login")` → Rust OAuth flow.
4. On success, tokens stored in localStorage.
5. Profile fetched via GoogleAPIClient (cached in sessionStorage).
6. **IndexPage** uses `useClassroom` / `useChat` hooks → GoogleAPIClient → Google APIs.

## Backend Architecture

```
main.rs
  └── setup_autostart()
  └── google_notify_lib::run()
       └── lib.rs
            ├── Plugin: tauri_plugin_opener
            ├── Plugin: tauri_plugin_oauth
            ├── Plugin: tauri_plugin_process
            ├── Plugin: tauri_plugin_updater
            └── Commands:
                 ├── login()          → oauth::google::login()
                 └── refresh_token()  → oauth::google::refresh_access_token()
```

## Security

- **OAuth PKCE** (S256) prevents authorization code interception.
- **State parameter** validated server-side for CSRF protection.
- **CSP** restricts connect-src to Google APIs only.
- **Auto-updater** with signature verification via public key.
