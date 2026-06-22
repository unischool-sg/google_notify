# OAuth 2.0 with PKCE Flow

## Overview

Google Notify uses the **Authorization Code with PKCE** (Proof Key for Code Exchange) flow, which is the recommended OAuth 2.0 flow for desktop applications. This prevents authorization code interception attacks without requiring a client secret.

## Flow Diagram

```
User                    Frontend (React)               Backend (Rust)              Google
 |                           |                              |                        |
 |  Click Sign-In          |                              |                        |
 |------------------------->|                              |                        |
 |                           |  invoke("login")           |                        |
 |                           |----------------------------->|                        |
 |                           |                              |  Generate PKCE params  |
 |                           |                              |  Start OAuth server    |
 |                           |                              |  Open browser          |
 |                           |                              |------------------------>|
 |                           |                              |   Auth URL with:       |
 |                           |                              |   - client_id          |
 |  User authenticates     |                              |   - code_challenge     |
 |<------------------------------------------------------------- state, scopes       |
 |                           |                              |                        |
 |  Approve consent        |                              |                        |
 |-------------------------------------------------------->|                        |
 |                           |                              |                        |
 |                           |   Callback to localhost     |                        |
 |                           |<-----------------------------|                        |
 |                           |                              |                        |
 |                           |                              |  Validate state        |
 |                           |                              |  Exchange code         |
 |                           |                              |------------------------>|
 |                           |                              |   POST /token          |
 |                           |                              |   code + verifier      |
 |                           |                              |<------------------------|
 |                           |                              |   access_token         |
 |                           |  LoginResponse              |   refresh_token        |
 |                           |<-----------------------------|   expires_in           |
 |                           |                              |                        |
 |                           |  Store tokens in localStorage|
 |                           |  Reload page                 |                        |
 |<-------------------------|                              |                        |
```

## Implementation Details

### PKCE Parameter Generation (`oauth/google.rs`)

1. **Code Verifier**: 48 random bytes, base64url-encoded (no padding) = 64 chars.
2. **Code Challenge**: SHA-256 of verifier, base64url-encoded (no padding) = 43 chars.

### State Parameter

A random 32-character alphanumeric string is generated for CSRF protection. The callback validates that the returned `state` matches.

### OAuth Server

- Uses `tauri_plugin_oauth` to start a local HTTP server.
- Port range: 54321, 54322, 54323 (fallback).
- Callback endpoint: `http://127.0.0.1:{port}/callback`
- Timeout: 3 minutes (configurable in code).
- The server is cancelled via `OauthServerGuard` (RAII) when the function exits.

### Token Exchange

- Endpoint: `https://oauth2.googleapis.com/token`
- Parameters: `code`, `client_id`, `code_verifier`, `redirect_uri`, `grant_type=authorization_code`, optionally `client_secret`
- HTTP client timeout: 30 seconds

### Token Refresh

- Endpoint: `https://oauth2.googleapis.com/token`
- Parameters: `refresh_token`, `client_id`, `grant_type=refresh_token`, optionally `client_secret`
- The existing refresh token is reused (Google typically doesn't issue a new one on refresh).

## Scopes

| Scope | Purpose |
|-------|---------|
| `openid` | OpenID Connect |
| `email` | User email address |
| `profile` | User profile info |
| `classroom.courses.readonly` | List courses |
| `classroom.coursework.me.readonly` | List coursework (student) |
| `classroom.coursework.students.readonly` | List coursework (teacher) |
| `classroom.announcements.readonly` | List announcements |
| `chat.spaces.readonly` | List spaces |
| `chat.messages.readonly` | List messages |

## Frontend Token Management

- **access_token** — stored in `localStorage` as `access_token`.
- **refresh_token** — stored in `localStorage` as `refresh_token`.
- **expires_at** — calculated as `Date.now() + expires_in * 1000`, stored in `localStorage`.
- **Profile** — cached in `sessionStorage` as `profile`.

The `GoogleAPIClient.ensureValidToken()` method checks expiry and auto-refreshes if within 60 seconds of expiration. If refresh fails, tokens are cleared and the page reloads to show the login screen.
