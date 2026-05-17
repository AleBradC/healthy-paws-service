---
name: Fix F-18 Apollo UNAUTHENTICATED
overview: Make the Apollo errorLink catch GraphQL UNAUTHENTICATED errors (not just HTTP 401) and route the user to the correct login path while clearing auth state and the server-side cookie. Currently UNAUTHENTICATED errors from the GraphQL resolvers go unhandled and leave the UI in a stuck state.
todos:
  - id: apollo-error-link
    content: Rewrite errorLink in apollo-wrapper.tsx to handle both UNAUTHENTICATED graphQLErrors and HTTP 401 networkError; redirect to authLoginPath; call /logout first; short-circuit when already on the login page
    status: completed
isProject: false
---

# Fix F-18: No Apollo errorLink for UNAUTHENTICATED

## The problem

Today [`apollo-wrapper.tsx`](healty-paws-frontend/src/lib/graphql/apollo-wrapper.tsx) only inspects `networkError`:

```ts
const errorLink = onError(({ networkError }) => {
  if (networkError && "statusCode" in networkError && networkError.statusCode === 401) {
    window.location.href = "/login";
  }
});
```

That covers the case where REST cookie auth fails at the HTTP layer. But the **GraphQL** layer throws a different shape entirely.

In [`schema/resolvers.ts`](healthy-paws-service/src/schema/resolvers.ts) the `requireAuth` wrapper throws:

```ts
throw new GraphQLError("You must be logged in to perform this action", {
  extensions: { code: "UNAUTHENTICATED" },
});
```

When this happens, Apollo Server returns **HTTP 200** with the error in the response body. So:

- `networkError` is `null`
- `graphQLErrors` contains an entry with `extensions.code === "UNAUTHENTICATED"`
- The current errorLink does nothing — the UI silently shows broken queries (cards empty, "no data" states) instead of redirecting to login

Two other issues in the same block:
- The redirect target `/login` does not exist — the actual route is `/auth/login` (see [`utils/path.ts`](healty-paws-frontend/src/utils/path.ts))
- `window.location.href = ...` does a hard navigation but never clears the `AuthenticationContext` state nor calls `/logout` to clear the cookie. After redirect, on the new page, the context briefly thinks the user is still logged in.

## The fix

Rewrite the `errorLink` in [`apollo-wrapper.tsx`](healty-paws-frontend/src/lib/graphql/apollo-wrapper.tsx) to handle both error shapes and to clean up properly.

### 1. Inspect both `graphQLErrors` and `networkError`

```ts
import { ApolloClient, InMemoryCache, HttpLink, from } from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import { API_BASE_URL, logoutEndpoint } from "../../api/endpoint";
import { authLoginPath } from "../../utils/path";

const isAlreadyOnLogin = () =>
  window.location.pathname.startsWith(authLoginPath);

const handleUnauthenticated = () => {
  if (isAlreadyOnLogin()) return; // avoid redirect loop

  // Best-effort server-side cookie clear. Don't await — errorLink must stay sync.
  fetch(`${API_BASE_URL}${logoutEndpoint}`, {
    method: "POST",
    credentials: "include",
  }).catch(() => {});

  window.location.href = authLoginPath;
};

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors?.some((e) => e.extensions?.code === "UNAUTHENTICATED")) {
    handleUnauthenticated();
    return;
  }

  if (
    networkError &&
    "statusCode" in networkError &&
    (networkError as { statusCode: number }).statusCode === 401
  ) {
    handleUnauthenticated();
  }
});
```

### What changes

- The errorLink now triggers on **both** GraphQL `UNAUTHENTICATED` extensions and HTTP 401 network errors.
- The redirect target is the real `authLoginPath` (`/auth/login`), not the non-existent `/login`.
- Before redirecting, the link fires `POST /api/auth/logout` so the httpOnly cookie is invalidated server-side. The page reload that follows will trigger `AuthenticationProvider`'s `useEffect`, which calls `GET /session` and finds no session — context state ends up consistent without any extra wiring.
- `isAlreadyOnLogin()` short-circuits when the user is already on the login page (e.g. failed `POST /login` returning a 401), preventing a self-redirect loop.

## Why `window.location.href` (hard reload) rather than `useNavigate`

This file is the Apollo link layer, outside React's component tree. We have no `useNavigate` here, and we want the cache, in-flight queries, and React state all reset — a hard reload is the simplest correct behavior. Most production apps do the same here.

## Files changed

- [`healty-paws-frontend/src/lib/graphql/apollo-wrapper.tsx`](healty-paws-frontend/src/lib/graphql/apollo-wrapper.tsx) — extend `errorLink` to handle GraphQL `UNAUTHENTICATED`; fix redirect path; call `/logout` first; add login-page short-circuit
