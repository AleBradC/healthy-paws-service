---
name: Fix F-19 Session Boot Cleanup
overview: Treat the server's /session endpoint as the single source of truth for token expiry (since after F-12 the JWT is httpOnly and unreadable from JS). On boot, distinguish 401 from other failures and proactively clear the stale cookie so the browser state stays consistent with the auth context.
todos:
  - id: auth-context-boot
    content: Rewrite AuthenticationProvider boot useEffect to distinguish 401 from other /session failures, call POST /logout on 401 to evict the stale cookie, and add a cancellation flag
    status: completed
isProject: false
---

# Fix F-19: Frontend doesn't validate JWT exp on boot

## Important context after F-12

Originally F-19 read: "the frontend stores the JWT in localStorage and never decodes `exp` on app load, so an expired token still looks valid client-side."

After F-12, **the JWT is in an httpOnly cookie**. JavaScript literally cannot read it, decode it, or check `exp`. That is by design — it eliminates the XSS token-theft vector. So the fix is not "decode the JWT" but "treat the server as the source of truth and react correctly when the server says the token is expired."

The server already enforces expiry: [`authentication.routes.ts`](healthy-paws-service/src/features/authentication/authentication.routes.ts) protects `GET /api/auth/session` with `passport.authenticate("jwt", { session: false })`, which validates signature, `exp`, `iss`, `aud` (F-15). An expired token → 401.

## What's left to fix

In [`AuthenticationContext.tsx`](healty-paws-frontend/src/context/AuthenticationContext.tsx) the boot logic looks like:

```ts
useEffect(() => {
  fetch(`${API_BASE_URL}${sessionEndpoint}`, { credentials: "include" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data?.data) {
        setUser({ ... });
        setIsLoggedIn(true);
      }
    })
    .catch(() => {})
    .finally(() => setIsLoading(false));
}, []);
```

Two issues:

1. **A 401 is treated the same as any other failure.** Network down vs expired token are indistinguishable to the rest of the app. We need to know "the user has an expired/invalid token" so we can clean it up.
2. **The stale cookie is never cleared.** After `/session` returns 401, the browser still has `accessToken=<expired>` sitting there. Every subsequent REST or GraphQL call still attaches it. The Apollo errorLink (F-18) catches and redirects on the *next* call, but on a fresh boot the user-agent state is dirty until something else triggers the redirect.

## The fix

### [`AuthenticationContext.tsx`](healty-paws-frontend/src/context/AuthenticationContext.tsx)

Branch on the response status. When `/session` returns 401, call `/logout` to evict the stale cookie. Other failures (network, 5xx) stay silent — same as today.

```ts
useEffect(() => {
  let cancelled = false;

  (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}${sessionEndpoint}`, {
        credentials: "include",
      });

      if (cancelled) return;

      if (res.ok) {
        const data = await res.json();
        if (data?.data) {
          setUser({
            id: data.data.id,
            username: data.data.email ?? "",
            role: data.data.role,
          });
          setIsLoggedIn(true);
        }
      } else if (res.status === 401) {
        // Token expired or invalid. Server already rejected it; now evict the
        // stale cookie from the browser so we stop sending it on every request.
        fetch(`${API_BASE_URL}${logoutEndpoint}`, {
          method: "POST",
          credentials: "include",
        }).catch(() => {});
      }
      // Other status codes (5xx, network failures) — stay silent. User is
      // shown as logged-out and can manually retry.
    } catch {
      // Network failure — stay silent, treat as logged-out.
    } finally {
      if (!cancelled) setIsLoading(false);
    }
  })();

  return () => {
    cancelled = true;
  };
}, []);
```

Three behavioural changes:

- **401 on boot** → fire-and-forget `POST /logout`. The cookie is gone after this; future requests won't carry an expired token, so the Apollo errorLink (F-18) and any REST call simply see no auth instead of an expired auth. Cleaner state.
- **`cancelled` flag** → if the provider unmounts during the fetch (StrictMode double-mount, tests), the `setState` calls are skipped.
- **Explicit `else if (res.status === 401)`** → the boot path now distinguishes "token expired" from "network problem", which is the F-19 intent expressed in cookie-world terms.

## Why not also decode the JWT client-side

We can't. The cookie is `httpOnly` — `document.cookie` won't return it, no JS code can read it. Any attempt to "validate exp on the client" would require either:
- Going back to `localStorage` storage (reverts F-12 and reopens XSS)
- Or duplicating the JWT into a non-httpOnly cookie (defeats F-12 in a sneakier way)

Neither is acceptable. The architecturally correct equivalent is what's above: ask the server, react to 401.

## Files changed

- [`healty-paws-frontend/src/context/AuthenticationContext.tsx`](healty-paws-frontend/src/context/AuthenticationContext.tsx) — boot effect now distinguishes 401 from other failures and clears the stale cookie via `POST /logout`; uses a cancellation flag to avoid setState after unmount
