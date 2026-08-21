## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- Immediately before every `git push`, run `graphify update .` as a mandatory push gate so the index reflects the exact code being pushed.
- Keep all Graphify configuration, generated artifacts, manifests, and caches tracked in Git and include their updates in every push.

## Gates

- `npx tsc --noEmit -p <project>` can report success whilst errors exist, because it reads the cached build state. The binding check is `npm run ci:quality`, whose `typecheck` runs `tsc -b --noEmit`.

## Migrations

- A new file under `apps/backend/drizzle/` is applied locally straight away by `.claude/hooks/auto-migrate.sh`. Without Docker running, even writing the file fails, so start Docker first.
- After a Docker restart the local database is empty. Run `npm run db:migrate -w @lmaa/backend` first, otherwise no table exists.
- Look table names up in the schema rather than guessing them. The user table is called `admin_users`, not `users`.

## Shell

- `rm` is aliased to `rm -i` and asks back. Use `command rm -f` in commands, and `git rm` for tracked files.
- The working directory outlives a single Bash call. After a `cd`, carry on with absolute paths.

## Deployment

- On a red run, start with `gh run view <id> --json jobs`. `deploy-*` and `smoke-prod` fail independently of each other, and `smoke-prod` occasionally fails on the browser.
- `/health` keeps answering `ok` during a failed deployment, because the previous version is still serving. The cause sits in the service log: `zcli service log --service-id <id>`.

## CI

- `deploy.yml` also runs on `pull_request` but deploys nothing there. The deploy jobs test `github.event_name == 'push'` and skip themselves, and `smoke-prod` skips with them for want of a successful deployment.
- A `changes` job decides by path filter which services get deployed. `packages/ui` reaches the website and the dashboard but never the backend, whilst `shared`, `contracts`, `zerops.yml`, `scripts/` and the root configuration deploy everything. When a service was not deployed, the answer is in the `changes` job rather than in the Zerops panel.
- The React Doctor step in the pre-commit hook reports regressions where there are none (issue #99). It does not block the commit. A full scan is the counter-check.

## DNS and domains

- `*.lmaa.space` is a CNAME to the apex and matches at any depth. Every invented name therefore answers successfully, and a real record is recognisable only by returning something other than that CNAME.
- AXFR is refused, but the zone is signed with NSEC3. Collecting the hash chain and computing known names against it locally enumerates the zone in full, without access to the World4You panel.
- `www.lmaa.space` redirects to the apex with a 301, configured at the Zerops L7 balancer under "Advanced Location Configuration" rather than in the code, even though `safe-url.ts` and `useMarkdownHtml.ts` carry `www` as a site host. The balancer does this per domain, so look there before writing code for a redirect or a routing question.
- Whether a mailbox exists is answered by an SMTP dialogue up to `RCPT TO` without `DATA`. `450 Greylisted` means it exists, `550 User unknown` means it does not. Include an invented control address, because otherwise a catch-all gives no sign of itself.

## Tests

- The dashboard tests run without a DOM (`environment: "node"`). Components cannot be rendered there, so move the logic into a module of its own and test that instead.

## Frontend and CSP

- Astro 7 builds the policy from `astro.config.mjs` and writes it over any `Content-Security-Policy` header a route sets. A route with a policy of its own puts it in `Astro.locals.contentSecurityPolicy`, and the middleware applies it after `next()`, which is the last point before the response.
- `X-Frame-Options` is ignored as soon as a policy names `frame-ancestors`. A `SAMEORIGIN` in the route decides nothing.
- `scripts/check-csp.mjs` knows only `--url`. Any other name is discarded, and the check carries on against the default `https://lmaa.space` without saying so.

## Skills

- Under `.claude/skills/` only `lmaa-shop-check` is tracked, because the backend reads it at runtime and `zerops.yml` ships it. Everything else there is local tooling and does not belong in a commit.
