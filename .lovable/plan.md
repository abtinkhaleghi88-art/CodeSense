## Audit findings & fixes

Deployment stays on Lovable hosting (Cloudflare Workers). No Vercel config — adding SPA rewrites there would break every server function (analyze, quota, history, delete).

### 1. Quota is NOT bypass-proof (CRITICAL)

`getQuota` / `analyzeCode` count rows then insert in two separate statements. A user firing 30 parallel requests can race past the 30/day limit because each request sees `used < 30` before any insert lands. RLS scopes per-user correctly, but the check itself is non-atomic.

**Fix:** add a Postgres `SECURITY DEFINER` function `insert_analysis_with_quota(...)` that, in one transaction:
- `LOCK TABLE public.analyses IN SHARE ROW EXCLUSIVE MODE` (or `SELECT ... FOR UPDATE` on a per-user advisory lock via `pg_advisory_xact_lock(hashtext(user_id::text))` — preferred, no global lock)
- `SELECT count(*)` for the caller for today
- if `>= 30` → `RAISE EXCEPTION 'QUOTA_EXCEEDED'`
- else `INSERT ... RETURNING *`

Update `analyzeCode` to call this RPC via `supabase.rpc("insert_analysis_with_quota", {...})` instead of the manual count + insert, and translate `QUOTA_EXCEEDED` into the existing friendly error string. Remove the now-redundant pre-check.

### 2. Theme FOUC (HIGH)

`ThemeProvider` starts in `"dark"` then corrects in `useEffect`. Light-mode users see a black flash on every navigation/reload.

**Fix:** add a tiny inline `<script>` in `src/routes/__root.tsx` head that reads `localStorage["codesense.theme"]` + `prefers-color-scheme` and toggles `document.documentElement.classList` BEFORE React hydrates. Then read the same value lazily inside `useState` initializer in `theme.tsx` so React stays in sync.

### 3. Router missing `defaultErrorComponent` (MEDIUM)

`src/router.tsx` does not register `defaultErrorComponent`. Per TanStack guidance this is a required safety net for in-render throws outside any route's own boundary. Wire the existing branded fallback to `defaultErrorComponent` and `defaultNotFoundComponent`.

### 4. GitHub fetch is unauthenticated client-side (MEDIUM)

`github-tab.tsx` calls `api.github.com` directly from the browser → 60/hr per IP, no auth, plus user-IP leak. Move both calls (tree + file contents) into a new `createServerFn` (`fetchGithubTree`, `fetchGithubFile`) so requests come from the Worker. No secret needed unless we add a token later.

### 5. Small cleanups (LOW)

- `app.tsx`: drop `as any` cast on `analyzeFn({ data: input })` — types resolve correctly without it.
- `auth.tsx`: replace `(v) => setMode(v as any)` with a narrowed handler.
- `analyses.functions.ts`: tighten `as any` casts on `input_method` in DTOs.
- Welcome overlay timers are correctly cleaned up (already verified); leave as-is.
- `_authenticated.tsx`'s in-component auth gate works and redirects properly; not refactoring to `beforeLoad` to avoid scope creep (would need a router context refactor).

### 6. Out of scope (will mention, not change)

- Chunk-size warnings come from the wrapped Lovable Vite config; `manualChunks` overrides risk breaking the cloudflare plugin. Leaving alone unless a specific warning is blocking.
- No password reset flow exists — not requested.

## Files touched

- `supabase/migrations/<new>.sql` — `insert_analysis_with_quota` function + grants
- `src/lib/analyses.functions.ts` — switch insert path to RPC, simplify quota check
- `src/lib/theme.tsx` — lazy `useState` init
- `src/routes/__root.tsx` — inline pre-hydration theme script
- `src/router.tsx` — `defaultErrorComponent` + `defaultNotFoundComponent`
- `src/lib/github.functions.ts` (new) — server-side GitHub fetch
- `src/components/codesense/github-tab.tsx` — call server fns instead of `fetch`
- `src/routes/_authenticated/app.tsx` — drop `as any`
- `src/routes/auth.tsx` — drop `as any`
