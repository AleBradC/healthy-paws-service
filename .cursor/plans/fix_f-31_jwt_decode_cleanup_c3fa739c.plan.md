---
name: Fix F-31 JWT decode cleanup
overview: "The live frontend doesn't manually base64-decode any JWT - it doesn't decode JWTs at all post-F-12/F-19. The finding maps to dead cruft: an orphaned `pages/context/AuthenticationContext.tsx` that re-implements the pre-F-12 broken pattern, plus the now-unused `jwt-decode` dependency. Delete both."
todos:
  - id: delete-orphan
    content: Delete the orphaned healty-paws-frontend/src/pages/context/AuthenticationContext.tsx (sole consumer of jwt-decode, pre-F-12 localStorage pattern)
    status: completed
  - id: drop-dep
    content: Remove jwt-decode from healty-paws-frontend/package.json and regenerate the lockfile via npm install
    status: completed
  - id: verify
    content: Verify no remaining references (rg jwt-decode, pages/context, atob), run build to confirm no compile errors
    status: completed
isProject: false
---

## Why F-31, as stated, doesn't apply

The finding presumes the frontend manually base64-decodes a JWT. After F-12 (JWT moved to an httpOnly cookie) and F-19 (boot-time session validated via `GET /session`), the live `AuthenticationContext` never touches the token:

```36:82:healty-paws-frontend/src/context/AuthenticationContext.tsx
  // On mount, restore session by calling /session. The httpOnly cookie is sent
  // automatically. Since the JWT is httpOnly we can't decode exp client-side -
  // the server is the source of truth. A 401 means the token is expired or
  // invalid, in which case we proactively evict the stale cookie so subsequent
  // requests don't keep carrying it.
  useEffect(() => {
    ...
    const res = await fetch(`${API_BASE_URL}${sessionEndpoint}`, {
      credentials: "include",
    });
    ...
```

A `rg "atob|jwt-decode|jwtDecode|btoa"` across `healty-paws-frontend/src` confirms it: no `atob`, no `.split(".")[1]`, no token decoding in any live code path.

## What the audit actually caught

There are two `AuthenticationContext.tsx` files in the repo:

- [healty-paws-frontend/src/context/AuthenticationContext.tsx](healty-paws-frontend/src/context/AuthenticationContext.tsx) - the canonical, cookie-based, server-validated context. Everything in `src/` imports from here.
- [healty-paws-frontend/src/pages/context/AuthenticationContext.tsx](healty-paws-frontend/src/pages/context/AuthenticationContext.tsx) - an orphan. Nothing imports from it. It re-implements the pre-F-12 shape:

```37:64:healty-paws-frontend/src/pages/context/AuthenticationContext.tsx
  useEffect(() => {
    try {
      const token = localStorage.getItem("accessToken");
      if (token) {
        const decodedUser: User = jwtDecode(token);
        setUser(decodedUser);
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error("Invalid token:", error);
      localStorage.removeItem("accessToken");
      ...
    }
  }, []);

  const login = (token: string) => {
    localStorage.setItem("accessToken", token);
    try {
      const decodedUser: User = jwtDecode(token);
      setUser(decodedUser);
      setIsLoggedIn(true);
    } catch (error) {
      console.error("Failed to decode token:", error);
    }
  };
```

This file is a landmine: pulled into any future `import` by autocomplete (both contexts export `AuthenticationProvider` and `useAuthentication` with the same names), it silently re-introduces F-12 (localStorage XSS), drops the F-19 boot validation, and changes the `login` signature from `(id, role)` to `(token)` so callers will compile but behave differently.

A grep confirms the orphan is the *only* consumer of `jwt-decode` in `src/`:

```
healty-paws-frontend/src/pages/context/AuthenticationContext.tsx
  8:import { jwtDecode } from "jwt-decode";
 41:        const decodedUser: User = jwtDecode(token);
 58:      const decodedUser: User = jwtDecode(token);
```

And [healty-paws-frontend/package.json](healty-paws-frontend/package.json) still ships `"jwt-decode": "^4.0.0"` for it.

## The fix

Two deletions and a dep removal. No production code paths change, because the orphan was never wired up.

### 1. Delete [healty-paws-frontend/src/pages/context/AuthenticationContext.tsx](healty-paws-frontend/src/pages/context/AuthenticationContext.tsx)

Verified zero imports: every consumer (`App.tsx`, `LoginPage.tsx`, `ProtectedRoute`, `PublicRoute`, `Header`, both dashboards, `DoctorsPage`, `HomePage`) points at `src/context/AuthenticationContext.tsx`. Removing the orphan removes the foot-gun.

### 2. Drop `jwt-decode` from [healty-paws-frontend/package.json](healty-paws-frontend/package.json) and regenerate the lockfile

```diff
 "dependencies": {
   ...
-  "jwt-decode": "^4.0.0",
   ...
 }
```

After the edit:

```bash
cd healty-paws-frontend && npm install
```

to refresh `package-lock.json`. Nothing in `src/` will reference the package after step 1, so this is a pure removal.

### 3. Empty `pages/context/` directory

Delete the now-empty `healty-paws-frontend/src/pages/context/` folder (it only ever held the orphan). Confirmed by glob: it has exactly one file.

## What stays out of scope

- [healty-paws-frontend/src/pages/auth/login/LoginPage.test.tsx](healty-paws-frontend/src/pages/auth/login/LoginPage.test.tsx) uses `btoa(JSON.stringify(...))` to build a fake JWT and asserts the pre-F-12 shape (`mockLogin` called with a `token` string, response read from `data.data.accessToken`). It is stale against the current `LoginPage`, but the staleness is unrelated to F-31 - it's a test-suite refresh against the F-12 changes, not a "JWT decode" finding. Leave for a dedicated cleanup pass.
- The canonical [healty-paws-frontend/src/context/AuthenticationContext.tsx](healty-paws-frontend/src/context/AuthenticationContext.tsx) needs no edits.

## Verification

- `rg "jwt-decode|jwtDecode|atob" healty-paws-frontend/src` returns no matches.
- `rg "pages/context" healty-paws-frontend/src` returns no matches.
- `npm install` in `healty-paws-frontend` removes `jwt-decode` and its sub-tree from `node_modules` and `package-lock.json`.
- `npm run build` (Vite/tsc) succeeds - the only files that touched `jwt-decode` are gone.
- App still boots, login still works, refresh still restores the session via `/session` (no behavioral change).
- `rg "AuthenticationProvider" healty-paws-frontend/src` shows only the canonical export at `src/context/AuthenticationContext.tsx`.

## Files changed

- [healty-paws-frontend/src/pages/context/AuthenticationContext.tsx](healty-paws-frontend/src/pages/context/AuthenticationContext.tsx) - deleted (orphan, sole user of `jwt-decode`).
- `healty-paws-frontend/src/pages/context/` - directory removed (was the only file).
- [healty-paws-frontend/package.json](healty-paws-frontend/package.json) - `jwt-decode` removed from `dependencies`.
- `healty-paws-frontend/package-lock.json` - regenerated via `npm install`.

## Alternative if you'd rather close F-31 as moot

If you'd prefer to leave the orphan untouched, you could just remove `jwt-decode` from `package.json` and accept that the orphan becomes broken-by-design. I don't recommend this - the orphan's hazard is exactly the same with or without the dep, since `jwtDecode` is only one part of the pre-F-12 pattern the file resurrects. The full cleanup is the safer call.
