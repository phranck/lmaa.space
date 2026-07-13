## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- Immediately before every `git push`, run `graphify update .` as a mandatory push gate so the index reflects the exact code being pushed.
- Keep all Graphify configuration, generated artifacts, manifests, and caches tracked in Git and include their updates in every push.

## PostgreSQL migration safety

- Local commands use only the local PostgreSQL connection. Never substitute a Zerops admin or `postgres` URL for `DATABASE_URL` or `DATABASE_URL_MIGRATOR`.
- Remote Drizzle migrations must pass `apps/backend/src/db/migration-safety.ts`: exact `DB_MIGRATION_ROLE`, never `postgres`, never a superuser.
- After Drizzle runs, every application table in `public` must be owned by the connected application role. Do not weaken or bypass this postflight.
- Ownership repairs are administrative operations, not migrations, and require explicit approval plus before/after privilege verification.
