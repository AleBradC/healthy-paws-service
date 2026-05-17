---
name: Fix F-32 login double-data wrap
overview: Server envelopes are fine and consistent; the "double-data" is purely a frontend readability + typing problem in two files where `axios.data.data.role` shows up untyped. Add a shared `ApiResponse<T>` FE type matching the server's `ApiResponse`, type the two call sites, and rename the body binding so the inner `data` is destructured cleanly. No API contract change.
todos:
  - id: api-type
    content: Add healty-paws-frontend/src/types/api.ts exporting a shared ApiResponse<T> that mirrors the server's envelope
    status: completed
  - id: login-page
    content: Type the LoginPage axios.post call with ApiResponse<{id, role}>, rename the binding to body, destructure session once, guard against missing data
    status: completed
  - id: auth-context
    content: Type the /session fetch JSON in AuthenticationContext as ApiResponse<{id, email, role}>, rename to body, drop data.data reads
    status: completed
isProject: false
---

## Where the debt actually lives

The server emits the same standardised envelope from every controller:

```263:268:healthy-paws-service/src/types.ts
// --- STANDARDIZED API RESPONSE ---
export interface ApiResponse<T = any> {
  status: "success" | "error";
  message?: string;
  data?: T;
}
```

Login fills it correctly:

```55:60:healthy-paws-service/src/features/authentication/authentication.controller.ts
const response: ApiResponse<{ role: string; id: string }> = {
  status: "success",
  message: SuccessMessages.LOGIN_SUCCESS,
  data: { role: user.role, id: user.id },
};
return res.json(response);
```

That's the right pattern: error responses go through the global handler with the same envelope (`{ status: "error", message }`), so the client gets a uniform shape on both paths. The server is not the problem.

The problem is the frontend reads it untyped, leaving `data.data.field` everywhere:

```60:71:healty-paws-frontend/src/pages/auth/login/LoginPage.tsx
const { data } = await axios.post(
  `${API_BASE_URL}${loginEndpoint}`,
  { email, password },
  { withCredentials: true }
);

// Token is now an httpOnly cookie set by the server — never touches JS.
// Use role and id returned in the response body to update auth state.
login(data.data.id, data.data.role);

const userRole = data.data.role;
```

```53:62:healty-paws-frontend/src/context/AuthenticationContext.tsx
if (res.ok) {
  const data = await res.json();
  if (!cancelled && data?.data) {
    setUser({
      id: data.data.id,
      username: data.data.email ?? "",
      role: data.data.role,
    });
    setIsLoggedIn(true);
  }
}
```

The outer `data` is the response body (axios's `response.data` or `await res.json()`); the inner `.data` is the envelope's `data` field. They collide because both bindings are called `data` and nothing is typed.

A `rg "data\.data"` over `healty-paws-frontend/src` confirms it: only 5 reads, all in those two files. `RegisterOwnerPage.tsx`, `RegisterDoctorPage.tsx`, and `useResetPasswordApi.ts` don't read the body on success, so they aren't affected.

## The fix

Shared `ApiResponse<T>` on the frontend that mirrors the server type, plus a clean destructure at the two call sites. No new abstractions, no server change.

### 1. New: [healty-paws-frontend/src/types/api.ts](healty-paws-frontend/src/types/api.ts)

```ts
// Mirrors healthy-paws-service/src/types.ts ApiResponse. Keep in sync — these
// two are the contract between the REST endpoints and the SPA.
export interface ApiResponse<T = unknown> {
  status: "success" | "error";
  message?: string;
  data?: T;
}
```

`unknown` instead of `any` so unwrapping is forced through a type assertion or generic, not silently swallowed.

### 2. [healty-paws-frontend/src/pages/auth/login/LoginPage.tsx](healty-paws-frontend/src/pages/auth/login/LoginPage.tsx)

```ts
type LoginResponse = { id: string; role: string };

const { data: body } = await axios.post<ApiResponse<LoginResponse>>(
  `${API_BASE_URL}${loginEndpoint}`,
  { email, password },
  { withCredentials: true }
);

const session = body.data;
if (!session) {
  setError("Login failed. Please try again.");
  return;
}

login(session.id, session.role);

if (session.role === "owner") {
  navigate("/dashboard/owner");
} else if (session.role === "doctor") {
  navigate("/dashboard/doctor");
} else {
  navigate(homePath);
}
```

What changed: `data` is renamed to `body` so the inner `data` reads as itself, the call is typed with `ApiResponse<LoginResponse>`, and `session` is extracted once. The `userRole` reassignment goes away — `session.role` is already typed. The narrow `!session` guard replaces the implicit assumption that the server always returns `data`.

### 3. [healty-paws-frontend/src/context/AuthenticationContext.tsx](healty-paws-frontend/src/context/AuthenticationContext.tsx)

```ts
type SessionResponse = { id: string; email: string; role: string };

if (res.ok) {
  const body = (await res.json()) as ApiResponse<SessionResponse>;
  if (!cancelled && body.data) {
    setUser({
      id: body.data.id,
      username: body.data.email ?? "",
      role: body.data.role,
    });
    setIsLoggedIn(true);
  }
}
```

`fetch` is preserved (no axios rewrite); the rename + type assertion is enough to remove the `data.data` smell and document the wire shape.

### 4. Error message reads (`err.response.data.message`) stay untouched

```81:85:healty-paws-frontend/src/pages/auth/login/LoginPage.tsx
if (axios.isAxiosError(err) && err.response) {
  setError(
    err.response.data.message ||
      "Login failed. Please check your credentials."
  );
}
```

That's `axios.response.data.message` — one level of `data`, reading the envelope's `message`. Not affected by F-32. It will be cleaner once `err.response` is typed as `AxiosResponse<ApiResponse<unknown>>`, but that's a wider refactor and not required to close this finding.

## Why not change the server

The envelope is correct and consistent with every other endpoint. Three reasons to leave it:

- Errors flow through the same shape (`status: "error", message`). Dropping the success envelope would create an asymmetric contract where success has no `status` and errors do — clients would need two code paths.
- `session`, `register/owner`, `register/doctor` all return `ApiResponse<T>`. Changing only `login` is the worst of both worlds.
- The actual debt is "the client reads it badly," not "the server emits it badly." Fix the side that's broken.

## Alternatives I considered and dropped

- **A typed helper `unwrap<T>(res: AxiosResponse<ApiResponse<T>>): T`.** With only two call sites (`LoginPage` + `AuthenticationContext`), introducing a helper is more abstraction than the codebase needs. Worth revisiting if/when a third REST call appears that reads the body on success.
- **A full `apiClient.post<T>()` wrapper that auto-unwraps and throws on `status: "error"`.** Same conclusion — too much surface for two call sites and a `fetch`-based session call. Future-proofing for a need that isn't here.

## Verification

- `rg "data\.data" healty-paws-frontend/src` returns no matches.
- `npx tsc -b` in `healty-paws-frontend` compiles clean.
- Login still navigates to `/dashboard/owner` for owners and `/dashboard/doctor` for doctors.
- Refreshing the page still restores the session and populates `user.username` from the email.
- Sending a wrong password still surfaces the server's `message` via `err.response.data.message`.
- Server contract is byte-identical on the wire.

## Files changed

- [healty-paws-frontend/src/types/api.ts](healty-paws-frontend/src/types/api.ts) — new shared `ApiResponse<T>`.
- [healty-paws-frontend/src/pages/auth/login/LoginPage.tsx](healty-paws-frontend/src/pages/auth/login/LoginPage.tsx) — typed axios call, `body`/`session` destructure, guard on missing `data`.
- [healty-paws-frontend/src/context/AuthenticationContext.tsx](healty-paws-frontend/src/context/AuthenticationContext.tsx) — typed fetch JSON, rename to `body`.

No backend, no `package.json`, no route, no SQL change.
