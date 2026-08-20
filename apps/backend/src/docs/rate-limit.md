# Rate Limit / Proxy Strategy

## Aktueller Stand

- Default-Store ist bewusst nur In-Memory und damit **nicht instanzübergreifend**.
- Für produktive Horizontal-Skalierung muss der Store durch ein Shared Backend ersetzt werden.
- `rateLimit()` akzeptiert dafür bereits ein injizierbares `store`-Objekt.

## Schlüssel eines Eimers

- Der Schlüssel lautet `{routePath}:{clientIp}`, nennt also die **getroffene Route** und nicht den angefragten Pfad.
- `/shops/:token` ist damit ein Eimer, gleich welcher Token angefragt wurde.
- Der Pfad trägt den Bezeichner, den der Aufrufer selbst wählt. Auf ihn zu schlüsseln gibt jedem Rateversuch einen eigenen Eimer, und die Grenze erreicht genau den Angriff nie, für den sie da ist.
- Einträge im alten Schlüsselformat laufen von selbst ab, es muss nichts migriert werden.

## Interne Aufrufer

- Anfragen mit gültigem `X-Internal-Token` überspringen die Begrenzung vollständig.
- Das serverseitige Rendern der Website ruft das Backend direkt auf, nicht über den Proxy. Diese Anfragen tragen deshalb keine Client-Adresse und lägen ohne Ausnahme alle in einem Eimer, wodurch das Rendern der gesamten Website an der Grenze eines einzelnen Besuchers hinge.
- Das Geheimnis steht in `INTERNAL_API_TOKEN` und muss auf Backend und Website denselben Wert haben.
- Ist es nicht gesetzt, gibt es keine Ausnahme und alles wird begrenzt wie zuvor. Ein fehlendes Geheimnis öffnet also nichts.
- Die Website schickt den Token ausschließlich an das konfigurierte Backend-Origin.

## Vertrauenswürdige Client-IP

- Die Client-IP wird nur aus **einem explizit konfigurierten Header** gelesen.
- Konfiguration erfolgt über:
  - `TRUST_PROXY_IP_HEADER`
  - `TRUST_PROXY_HOPS` (relevant für `x-forwarded-for`)

## Deployment-Regel

- `cf-connecting-ip` nur verwenden, wenn Cloudflare tatsächlich vor dem Backend sitzt.
- `x-real-ip` oder `x-forwarded-for` nur verwenden, wenn der vorgeschaltete Proxy diese Header zuverlässig setzt und überschreibt.
- Bei `x-forwarded-for` muss `TRUST_PROXY_HOPS` der realen Proxy-Kette entsprechen, damit nicht ein untrusted Hop als Client-IP übernommen wird.
