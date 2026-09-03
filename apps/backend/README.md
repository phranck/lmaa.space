# @lmaa/backend

Hono-API für öffentliche Shop-Daten, Admin-Funktionen, Formulare, E-Mail-Versand, Social-Media-Integrationen und operative Jobs.

## Tech Stack

- Hono auf Node.js 22
- PostgreSQL mit Drizzle ORM
- Zod für Runtime-Validierung
- Vitest für Service-, Repository- und Routentests
- tsup für das Produktions-Bundle

## Lokale Entwicklung

```bash
npm run dev -w @lmaa/backend
```

Der Dev-Server lädt `apps/backend/.env.local` und läuft über `src/index.ts`.

## Environment

Minimal für lokale Entwicklung:

```dotenv
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://...
DASHBOARD_URL=http://localhost:5174
FRONTEND_URL=http://localhost:5173
```

`PORT` ist optional und fällt auf 3000 zurück, den Port, den das Deployment in `zerops.yml` deklariert. Zerops belegt den Schlüssel selbst, deshalb steht er dort nicht.

Wichtige produktive Variablen:

- `DATABASE_URL`: Runtime-Verbindung zur PostgreSQL-Datenbank.
- `DATABASE_URL_MIGRATOR`: optionale Migrations-Verbindung, fällt auf `DATABASE_URL` zurück.
- `IP_HASH_SALT`: in Production Pflicht, mindestens 16 Zeichen, für serverseitige Besucher-Hashes.
- `TRUST_PROXY_IP_HEADER`: welcher Header die echte Client-Adresse trägt, Default `x-forwarded-for`. Zusammen mit `TRUST_PROXY_HOPS` muss der Wert zur tatsächlichen Kette vor dem Backend passen, sonst zählt das Rate-Limit die falsche Adresse.
- `SMTP2GO_API_KEY`, `EMAIL_FROM`, `OWNER_EMAIL`: E-Mail-Versand über SMTP2GO EU und Benachrichtigungen an die Betreibenden.
- `DASHBOARD_URL`, `FRONTEND_URL`: externe URLs, in Non-Production Pflicht.
- `UNSPLASH_ACCESS_KEY`: optionale Medien-/Bildsuche.
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`: optionale Push-Benachrichtigungen.
- `RUN_MIGRATIONS_ON_STARTUP`: `true` oder `false`, Default `true`.

Weitere optionale Runtime-Variablen sind in `src/config/env.ts` definiert und werden beim Start validiert.

### Automatisierte Shop-Prüfung

Die automatisierte Prüfung eingehender Shop-Vorschläge läuft als Hintergrund-Job im Backend. Aus der Umgebung kommt nur der Provider-Schlüssel:

| Variable            | Pflicht | Bedeutung                                                                                                    |
| ------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| `ANTHROPIC_API_KEY` | ja      | Schlüssel für die Claude-API. Fehlt er, bleibt der Worker stehen und das übrige Backend läuft normal weiter. |

Alles andere sind Systemeinstellungen und stehen im Dashboard unter Einstellungen im Reiter „Automatische Prüfung". Eine Änderung wirkt beim nächsten Durchlauf des Workers, spätestens nach 30 Sekunden, und braucht kein Deployment.

| Einstellung                             | Default         | Bedeutung                                                                                                                                        |
| --------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Modus                                   | `off`           | `off` nimmt keine Arbeit an. `assist` schreibt das Rechercheergebnis in den Vorschlag und setzt ihn auf „bereit zur Prüfung". |
| Aufnahmen automatisch freigeben         | aus             | Wirkt nur im Modus `assist`.                                                                                                                     |
| Ablehnungen automatisch veröffentlichen | aus             | Wirkt nur im Modus `assist`.                                                                                                                     |
| E-Mail bei automatischer Aufnahme        | keine           | Template, mit dem die Automatik an die vorschlagende Person schreibt. Ohne Template wird nichts versendet. |
| E-Mail bei automatischer Ablehnung       | keine           | Wie oben, für eine Ablehnung. Der Link zur öffentlichen Begründung steckt im Template. |
| Modell                                  | `claude-opus-5` | Zur Auswahl stehen die Modelle, die der Anbieter meldet und die eine Prüfung auch ausführen können. Wird an jeder Prüfung mitgeschrieben. |
| Denktiefe                               | `high`          | Angeboten wird, was das gewählte Modell laut Anbieter annimmt. Claude Sonnet 4.6 kennt zum Beispiel kein `xhigh`. |
| Versuche je Vorschlag                   | `3`             | Danach endet die Prüfung als zurückgestellt.                                                                                                     |
| Deckel je Prüfung                       | `2` USD         | Bricht den laufenden Versuch ab.                                                                                                                 |
| Deckel je Tag                           | `10` USD        | Der Worker nimmt dann keine neuen Vorschläge mehr an.                                                                                            |
| Bericht nach jeder Prüfung              | aus             | Braucht ein E-Mail-Template und geht an `OWNER_EMAIL`.                                                                                           |

Warum die Trennung: der Schlüssel ist ein Geheimnis und gehört nicht in eine Einstellungstabelle, die im Dashboard lesbar ist. Alles andere ist eine Betriebsentscheidung, die man abends um zehn ändern können muss, ohne zu deployen.

Lokal reicht in `apps/backend/.env.local` der Schlüssel; den Modus stellst du im Dashboard auf `assist`. In Produktion bleibt er so lange auf `off`, bis die Strecke abgenommen ist. Zum Ausprobieren ohne echten Vorschlag gibt es `npm run review:shop -w @lmaa/backend -- <url>`, das eine synthetische Prüfung anlegt und danach wieder entfernt.

### Bankverbindung

Die Seite liest die Zahlungseingänge auf ihrem eigenen Konto über Enable Banking, einen lizenzierten Kontoinformationsdienst. Warum dieser Weg und kein anderer, steht in `docs/adr/0001`.

| Variable                        | Pflicht | Bedeutung                                                                                       |
| ------------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `ENABLE_BANKING_APPLICATION_ID` | nein    | Die Anwendung, unter der die Seite beim Anbieter geführt wird.                                    |
| `ENABLE_BANKING_PRIVATE_KEY`    | nein    | Der private RSA-Schlüssel dieser Anwendung, als PKCS#8-PEM. Signiert jede Anfrage an den Anbieter. |

Beide gehören zusammen. Ist nur eine von beiden gesetzt, bricht der Start ab, statt halb bewaffnet zu laufen. Sind beide leer, bleibt die Funktion aus: `/api/v1/admin/bank-connection` meldet `configured: false`, die beiden anderen Routen antworten mit 503, und der Rest des Backends läuft unverändert.

Der Schlüssel hat mehrere Zeilen, das Variablenfeld in Zerops hat eine. Deshalb dürfen die Zeilenumbrüche als `\n` ausgeschrieben sein; `src/config/env.ts` macht daraus wieder Umbrüche.

Verbunden wird im Dashboard unter Sponsoring → Bankverbindung, und nur vom Owner. Der Ablauf ist der übliche: das Backend holt beim Anbieter eine Adresse zur Bank, die Bank schickt die Person auf `https://dashboard.lmaa.space/bank-connection/callback` zurück, und das Dashboard reicht den Code an das Backend weiter, das ihn einlöst. Diese Rückadresse ist beim Anbieter hinterlegt und lässt sich nicht einseitig im Code ändern. Die Zustimmung läuft ab; erneuert wird sie, indem man denselben Weg noch einmal geht.

Steht die Verbindung, liest ein Hintergrundlauf alle sechs Stunden die Eingänge und trägt ein, was diesem Projekt gehört. Was das ist, entscheidet eine Positivliste und keine Ausschlussregel: entweder trägt der Verwendungszweck eine Referenz, die das Sponsorenformular nach ISO 11649 ausgegeben hat und deren Prüfziffern noch stimmen, oder er nennt den Host der Seite. Alles andere ist auf einem privaten Konto fremdes Leben und verlässt die lesende Funktion, ohne gespeichert, gezählt oder geloggt zu werden. Der Name des Zahlers wird nie übernommen, der Verwendungszweck nie im Klartext abgelegt.

Wie oft gelesen werden darf, steht in Artikel 36 Absatz 5 der Delegierten Verordnung (EU) 2018/389: viermal in 24 Stunden, solange der Kontoinhaber nicht selbst fragt. Der Zähler kommt aus der Tabelle `bank_account_reads` statt aus einem Timer, denn ein Deployment startet einen Timer neu und lässt kurz zwei Container mit je einem laufen. `POST /api/v1/admin/bank-connection/sync` löst einen Lauf von Hand aus und zählt getrennt, weil das der Fall aus Buchstabe a ist.

Die Zustimmung läuft ab, und ein Badge allein sieht nur, wer das Dashboard aufmacht. Deshalb meldet sich die Seite von selbst: vierzehn Tage vorher, drei Tage vorher und beim Ablauf, je einmal, per E-Mail an `OWNER_EMAIL` und per Push an den Owner. Welche Stufe schon rausging, steht auf der Verbindung und nicht in einem Timer, sodass weder ein Neustart noch ein zweiter Container sie wiederholt. Eine erneuerte Verbindung ist eine neue Zeile und fängt die Staffel von vorn an.

Scheitert ein Abruf, weil die Bank die Zustimmung zurückgezogen hat, geht dieselbe Meldung raus, auch wenn das gespeicherte Datum noch Luft hatte. Das gespeicherte Datum ist nur, was die Bank beim Erteilen gesagt hat; der abgelehnte Abruf ist, was tatsächlich passiert ist. Beide teilen sich den Vermerk, damit dieselbe Nachricht nicht zweimal kommt.

Auf der Seite Einnahmen steht eine Karte mit Bank, den letzten vier Stellen der Kontokennung, dem Ablaufdatum und dem letzten Lauf. Sie steht dort, weil sich dort die Folge zeigt: läuft die Verbindung ab, bleiben die Zahlen darüber stehen. Lesen darf diese Karte jeder Admin, die beiden Knöpfe darauf sieht nur der Owner, denn beide greifen auf das Konto zu.

In der Liste der Spendeneingänge steht je Zeile, woher sie kam, und darüber lässt sich filtern. Dahinter steckt kein zweites Kennzeichen: eine Zeile mit der Kennung, die die Bank ihrem Eintrag gegeben hat, kam über die Bank, eine ohne wurde von Hand eingetragen.

Getrennt wird auf derselben Seite. Das Backend widerruft die Verbindung zuerst bei sich und schliesst danach die Sitzung beim Anbieter, was die Zustimmung bei der Bank mit beendet. Der Widerruf steht auch dann, wenn das Schliessen scheitert, denn das Aufhören mit dem Lesen ist die Entscheidung dieser Seite; die Antwort sagt in dem Fall, dass die Zustimmung bei der Bank noch bis zu ihrem Ablauf steht. Der Zustand der Verbindung steht als Abzeichen am Eintrag in der Seitenleiste, und vierzehn Tage vor Ablauf wechselt es die Farbe.

## Datenbank

```bash
npm run db:doctor -w @lmaa/backend
npm run db:migrate -w @lmaa/backend
npm run db:generate
```

- `db:doctor` prüft die Datenbankverbindung und grundlegende Voraussetzungen.
- `db:migrate` führt die Drizzle-Migrationen aus.
- `db:generate` erzeugt neue Migrationen aus dem aktuellen Schema.

## Tests und Qualität

```bash
npm test -w @lmaa/backend
npm run typecheck -w @lmaa/backend
npm run build -w @lmaa/backend
```

Der repo-weite Gate ist:

```bash
npm run ci:quality
```

## Betriebshinweise

- Der Public-Shop-Cache in `src/middleware/cache.ts` ist process-lokal und kurzlebig. Er ist für Single-Instance-Deployments oder kurze Stale-Windows gedacht.
- Admin-Mutationen invalidieren nur den Cache der aktuellen Backend-Instanz. Bei dauerhaftem Multi-Instance-Betrieb braucht der Cache Redis oder eine vergleichbare shared invalidation strategy.
- Die Rate-Limit-Buckets sind dagegen datenbankgestützt und bereits für mehrere Backend-Instanzen ausgelegt.
- Die API-Referenz wird von [periwinkle](https://github.com/phranck/periwinkle) als statische Seite erzeugt und unter `/docs` ausgeliefert; `/` leitet dorthin weiter. Das OpenAPI-JSON bleibt unter `/openapi.json`.
- Die Doku ist reine Dokumentation, es gibt kein Try-it-out mehr.
- Gebaut wird sie mit `npm run docs:build -w @lmaa/backend` nach `apps/backend/docs-dist/` (gitignored, im Deploy vom Build-Command erzeugt). Ohne diesen Build antwortet `/docs` lokal mit einem Hinweis statt einer leeren 404.

## Wichtige Module

- `src/index.ts`: Server-Boot, globale Middleware, Routen, OpenAPI/Doku, Background-Jobs und Shutdown.
- `src/routes`: öffentliche und Admin-HTTP-Routen.
- `src/services`: fachliche Use-Cases und Integrationslogik.
- `src/repositories`: Datenbankzugriff.
- `src/db/schema.ts`: Drizzle-Schema.
- `src/db/migrate.ts`: produktiver Migrationseintrittspunkt.
- `src/config/env.ts`: vollständiger Runtime-Vertrag.
