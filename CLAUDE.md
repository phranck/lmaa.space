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

- `npx tsc --noEmit -p <projekt>` kann grün melden, obwohl Fehler vorliegen: es liest den zwischengespeicherten Build-Stand. Verbindlich ist `npm run ci:quality`, dessen `typecheck` mit `tsc -b --noEmit` läuft.

## Migrationen

- Eine neue Datei unter `apps/backend/drizzle/` wird von `.claude/hooks/auto-migrate.sh` sofort lokal angewendet. Läuft Docker nicht, schlägt schon das Schreiben fehl. Docker vorher starten.
- Nach einem Docker-Neustart ist die lokale Datenbank leer: erst `npm run db:migrate -w @lmaa/backend`, sonst existiert keine Tabelle.
- Tabellennamen im Schema nachsehen, nicht raten. Die Nutzertabelle heißt `admin_users`, nicht `users`.

## Shell

- `rm` ist auf `rm -i` aliasiert und fragt zurück. In Befehlen `command rm -f` verwenden, für versionierte Dateien `git rm`.
- Das Arbeitsverzeichnis überdauert einzelne Bash-Aufrufe. Nach einem `cd` mit absoluten Pfaden weiterarbeiten.

## Deploy

- Bei rotem Lauf zuerst `gh run view <id> --json jobs`: `deploy-*` und `smoke-prod` scheitern unabhängig voneinander, und `smoke-prod` fällt gelegentlich am Browser aus.
- `/health` sagt während eines gescheiterten Deploys weiter `ok`, weil die alte Version bedient. Ursachen stehen im Dienstprotokoll: `zcli service log --service-id <id>`.

## Tests

- Die Dashboard-Tests laufen ohne DOM (`environment: "node"`). Komponenten lassen sich dort nicht rendern; Logik dafür in ein eigenes Modul ziehen und dieses prüfen.
