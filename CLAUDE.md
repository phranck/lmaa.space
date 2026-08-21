## graphify

Knowledge graph at `graphify-out/`.

- Codebase questions: `graphify query "<question>"` first, plus `graphify path "<A>" "<B>"` and `graphify explain "<concept>"`. Cheaper than `GRAPH_REPORT.md` or grep.
- Dirty `graphify-out/` files are normal and no reason to skip. Skip only when the task is about stale graph output, or when told to.
- `graphify-out/wiki/index.md` for broad navigation; `GRAPH_REPORT.md` only for architecture review.
- Run `graphify update .` after code changes, and again immediately before every `git push` as a mandatory gate.
- Graphify config, artefacts, manifests and caches stay tracked and ship with every push.

## Gates

- `npx tsc --noEmit -p <project>` can report success whilst errors exist, because it reads cached build state. Binding check is `npm run ci:quality`, whose `typecheck` runs `tsc -b --noEmit`.
- `prettier` is not part of `ci:quality` and the tree has drifted from it. Running `prettier --write` over a directory reformats files unrelated to the change. Format only what you touched.

## Repository

- `scripts/*` is gitignored with a per-file allow-list. A new script there needs `!scripts/<name>` in `.gitignore`, or it is silently left out of the commit whilst something already calls it.
- The repo is public. Security findings go into a private GHSA advisory (`gh api --method POST /repos/phranck/lmaa.space/security-advisories`, `vulnerabilities` is required) plus a neutrally titled board issue linking to it. Never a public issue.
- `apps/backend/openapi.generated.json` is a gitignored build artefact. Edit `src/docs/openapi-document.ts`; regenerate with `tsx src/docs/export-openapi.ts`.

## Migrations

- A new file under `apps/backend/drizzle/` is applied locally at once by `.claude/hooks/auto-migrate.sh`. Without Docker even writing it fails, so start Docker first.
- After a Docker restart the local database is empty. Run `npm run db:migrate -w @lmaa/backend` first.
- Look table names up in the schema. The user table is `admin_users`, not `users`.

## Shell

- `rm` is aliased to `rm -i`. Use `command rm -f`, and `git rm` for tracked files.
- `cp` asks back too. Use `command cp -f`, otherwise it silently leaves the file alone and prints only "not overwritten".
- The working directory outlives a single Bash call. After a `cd`, use absolute paths.

## Deployment

- **Never restart a Zerops service**, neither in the GUI nor via `zcli service stop/start`, and never advise it. The container comes back without the `run.envVariables` from `zerops.yml`, so `PORT` and `DATABASE_URL` are missing, env validation correctly refuses to start, and the service ends on `ACTION_FAILED`. Changed variables are picked up by a redeploy, which applies `zerops.yml` in full. When restoring, deploy every affected service: backend and website both carry `run.envVariables`, the dashboard is static.
- `zcli` cannot set environment variables. That is GUI only, and the values take effect on the next redeploy.
- `appVersionNotFound` right after "Uploading package" is a Zerops-side hiccup, not a repo error. Re-run.
- On a red run start with `gh run view <id> --json jobs`. `deploy-*` and `smoke-prod` fail independently, and `smoke-prod` occasionally fails on the browser.
- `/health` keeps answering `ok` during a failed deployment, because the previous version still serves. The cause sits in `zcli service log --service-id <id>`.
- One container per service: `minContainers` and `maxContainers` are both 1 for `backend`, `website` and `dashboard`. The "Cores 2" beside "1 container" in the panel are CPU cores, not containers.
- Two containers exist during a deployment, whilst the new one is up and the old one has not gone. Both run the `initCommands` from `zerops.yml`, so anything there executes twice against the same database. `runMigrations()` holds a `pg_advisory_lock` for that reason. The overlap shows as two node ids reporting the same step within a second.

## CI

- `deploy.yml` also runs on `pull_request` but deploys nothing there. The deploy jobs test `github.event_name == 'push'` and skip themselves, and `smoke-prod` skips with them. Checks can take a minute to appear; an empty `gh pr checks` right after opening means too early, not absent.
- A `changes` job decides by path filter which services deploy. `packages/ui` reaches website and dashboard but never backend; `shared`, `contracts`, `zerops.yml`, `scripts/` and root config deploy everything. When a service was not deployed, the answer is in `changes`, not in the Zerops panel.
- The React Doctor step in the pre-commit hook reports regressions where there are none (issue #99). It does not block the commit. A full scan is the counter-check.

## React Doctor

- Exceptions belong in `doctor.config.ts` under `ignore.overrides`, each with a one-line reason. No inline disables.
- The dead-code graph does not follow Astro imports, so an export read only by an `.astro` file is falsely reported as `deslop/unused-export`.
- Following a rule blindly can cost behaviour. `async-defer-await` wanted the report dispatch in `services/review/worker.ts` moved below the mode guard, which would have left reports for finished checks unsent whenever the review mode is off. Read what the code does first.

## DNS and domains

- `*.lmaa.space` is a CNAME to the apex and matches at any depth, so every invented name resolves. A real record is recognisable only by answering something other than that CNAME, and any name outside the certificate gets the `O=SSL on this domain is not active` placeholder.
- The certificate covers `lmaa.space`, `www`, `api`, `dashboard` and `mta-sts`. `www` deliberately has no record of its own: the wildcard resolves it, the certificate covers it, and the Zerops L7 balancer 301s it to the apex under "Advanced Location Configuration", not in code, even though `safe-url.ts` and `useMarkdownHtml.ts` carry `www` as a site host. Check the balancer before writing redirect or routing code. Removing the wildcard would require giving `www` an explicit record in the same step.
- AXFR is refused, but the zone is signed with NSEC3. Collecting the hash chain and computing known names against it enumerates the zone in full without panel access.
- Whether a mailbox exists is answered by an SMTP dialogue up to `RCPT TO` without `DATA`. `450 Greylisted` means it exists, `550 User unknown` means it does not. Include an invented control address, or a catch-all gives no sign of itself.

## Tests

- Dashboard tests run without a DOM (`environment: "node"`). Components cannot render there, so move logic into its own module and test that.

## Frontend and CSP

- Astro 7 builds the policy from `astro.config.mjs` and overwrites any `Content-Security-Policy` a route sets. A route with its own policy puts it in `Astro.locals.contentSecurityPolicy`; the middleware applies it after `next()`.
- `X-Frame-Options` is ignored once a policy names `frame-ancestors`. A `SAMEORIGIN` in the route decides nothing.
- `scripts/check-csp.mjs` knows only `--url`. Any other name is discarded and the check silently continues against `https://lmaa.space`.

## Skills

- Under `.claude/skills/` only `lmaa-shop-check` is tracked, because the backend reads it at runtime and `zerops.yml` ships it. Everything else there is local tooling and does not belong in a commit.
