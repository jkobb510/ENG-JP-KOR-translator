# Copilot Instructions

Minimal English/Japanese/Korean translator: React 19 + Vite frontend (`src/`), Express 5 + PostgreSQL backend (`src/server/`, `server.js`), Jest + Testing Library tests (`tests/`). Plain JavaScript with ES modules (JSX for components); no TypeScript.

Prioritize deterministic behavior, explicit error handling, and testability over brevity or clever shortcuts.

## Commands
- `npm run dev` – Vite dev server
- `npm run build` – production build
- `npm start` – run Express server
- `npm test` – Jest

Run `npm test` and `npm run build` after non-trivial changes. Add or update tests for every behavior change.

## 1. Async Safety & Error Boundaries
- No floating promises. Every promise is awaited, returned, or handled. Intentional fire-and-forget must be wrapped in a named background-task helper that handles its own rejections.
- Use explicit `try/catch` around async work that can fail. A `catch` must re-throw, map to a domain-specific error (preserve the original via `{ cause }`), or invoke a designated fallback. Never swallow errors, and never only `console.error`.
- Run independent async work with `Promise.all`; use `Promise.allSettled` when partial failure is acceptable. Never `await` inside loops for independent work.
- Do not use `?.` or `??` to mask unvalidated contract boundaries. Validate required fields at the entry boundary (route handler, API client, `req.body`, DB row, env config) and throw a clear error. Use `?.` only for genuinely optional data.
- Always release resources in `finally` (DB clients, timers, listeners, abort controllers).

## 2. Structural & Architectural Isolation
- Separate pure logic (transformations, validation, formatting, kana/romanization) from I/O (HTTP, DB, Google Cloud clients, React state updates). Pure functions live in their own modules.
- Express: routes parse and validate input, call a service, and map results/errors to HTTP responses. No business logic or SQL in route handlers.
- React: components render; hooks (`src/hooks/`) own state and side effects; `src/api/` owns network calls. Keep effects cleaned up and dependency arrays correct.
- Prefer `.map()` / `.filter()` for simple transforms. Avoid multi-layered `.reduce()`; use a clear loop or a pipeline of single-step pure functions.
- Treat arguments as immutable. Never mutate passed objects, arrays, or React state; return new values (spread, `toSorted`, `toSpliced`, `structuredClone`).
- Prefer `const`; no `var`; no implicit globals.

## 3. Naming & Layout
- Domain-specific names (`activeUserSession`, `serializedPayload`, `translationRequest`). No single-letter variables except loop indices; avoid vague names (`data`, `obj`, `res`, `tmp`, `item`).
- Booleans read as predicates (`isLoading`, `hasTranslation`). Functions are verbs.
- Use guard clauses and early returns; keep the happy path flat at the bottom.
- Do not split functions just to hit line counts. Extract only a distinct reusable domain concept or an independently testable unit.
- Named constants instead of magic numbers/strings. Use strict equality (`===`).
- Comments explain why, not what; keep them to one short line.

## 4. Testability & Dependency Injection
- Services and utilities receive dependencies (DB pool, translate/TTS clients, config, clock, logger) as arguments or factory parameters, not hardcoded module-level singletons. Wire real dependencies only at the composition root (`server.js`, `src/server/app.js`).
- Read `process.env` only in `src/server/config.js`; pass config values down.
- Tests are deterministic: stub network, DB, time, and randomness. Test behavior via public interfaces; use Testing Library queries by role/label rather than implementation details.
- Cover failure paths and validation errors, not just the happy path.

## 5. Security & Robustness
- Validate and sanitize all external input (type, length, allowed values) at the boundary. Reject unknown fields rather than passing them through.
- Use parameterized SQL only (`pg` `$1, $2`); never concatenate input into queries.
- Never log or commit secrets or credentials; load them via environment variables. Do not expose stack traces or internal errors in HTTP responses.
- Return consistent error shapes and correct status codes (400 validation, 404 missing, 500 unexpected).
- Never render untrusted content with `dangerouslySetInnerHTML`.

## 6. Modern JavaScript Conventions
- ES modules (`import`/`export`); named exports preferred over default exports for non-components.
- Use `async/await` over `.then()` chains; `Object.hasOwn(target, key)` for key checks (against the actual target object).
- Throw `Error` subclasses, never strings. Give custom errors a `name` and stable `code`.
- Use `AbortController` and timeouts for outbound requests.
- Match the existing formatting and style of surrounding files; do not reformat unrelated code or add dependencies without need.
