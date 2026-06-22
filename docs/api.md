# API Documentation

## Tauri Commands (Rust → JS Bridge)

### `login`

Initiates the OAuth 2.0 PKCE login flow with Google.

**Invocation:**
```typescript
import { invoke } from "@tauri-apps/api/core";
const res = await invoke<LoginResponse>("login");
```

**Returns** `LoginResponse`:
| Field | Type | Description |
|-------|------|-------------|
| `access_token` | `string` | Google API access token |
| `refresh_token` | `string \| null` | Refresh token (may be null on first login) |
| `expires_in` | `number` | Token lifetime in seconds |

**Errors:** Returns `string` on failure (network, timeout, CSP, etc.).

---

### `refresh_token`

Refreshes an expired access token.

**Invocation:**
```typescript
import { invoke } from "@tauri-apps/api/core";
const res = await invoke<LoginResponse>("refresh_token", { refreshToken: "..." });
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `refreshToken` | `string` | The refresh token |

**Returns** `LoginResponse` (same as `login`).

**Note:** The returned `refresh_token` field will contain the input refresh token (Google typically doesn't issue a new one on refresh).

---

## GoogleAPIClient (Frontend)

Class in `src/lib/google.ts` that wraps Google API calls with automatic token refresh.

### Constructor

```typescript
new GoogleAPIClient(accessToken: string, apiBaseUrl?: string)
```

### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `fetch()` | `endpoint: string`, `options?: RequestInit` | `Promise<Response>` | Generic fetch with Bearer auth and auto-refresh |
| `fetchCourses()` | none | `Promise<ClassroomCourse[]>` | Lists active Google Classroom courses |
| `fetchCourseWorks()` | `courseId: string` | `Promise<ClassroomCourseWork[]>` | Lists coursework for a course |
| `fetchChatSpaces()` | none | `Promise<ChatSpace[]>` | Lists Google Chat spaces |
| `fetchChatMessages()` | `spaceName: string`, `filter: string` | `Promise<ChatMessage[]>` | Lists messages in a space |

---

## Google API Endpoints Used

| Service | Endpoint | Purpose |
|---------|----------|---------|
| OAuth2 | `POST https://oauth2.googleapis.com/token` | Token exchange & refresh |
| OAuth2 | `GET https://www.googleapis.com/oauth2/v3/userinfo` | User profile |
| Classroom | `GET https://classroom.googleapis.com/v1/courses` | List active courses |
| Classroom | `GET https://classroom.googleapis.com/v1/courses/{id}/courseWork` | List coursework |
| Chat | `GET https://chat.googleapis.com/v1/spaces` | List spaces |
| Chat | `GET https://chat.googleapis.com/v1/{space}/messages` | List messages |

---

## Tauri Plugins

| Plugin | Usage |
|--------|-------|
| `tauri-plugin-opener` | Open OAuth URL in default browser |
| `tauri-plugin-oauth` | Local OAuth callback server |
| `tauri-plugin-process` | Relaunch app after update |
| `tauri-plugin-updater` | Check for and install updates |
| `tauri-plugin-fs` | File system access (installed, usage TBD) |

---

## Capabilities (Permissions)

Defined in `src-tauri/capabilities/default.json`:

- `core:default` — Core Tauri IPC
- `opener:default` — Open URLs in browser
- `updater:default` — Check and install updates
- `process:default` — Process management
- `core:window:allow-close` — Close window
- `core:window:allow-destroy` — Destroy window
