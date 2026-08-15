<objective>
Evaluate a given shop URL against the current _lmaa.space_ admission criteria and produce a structured acceptance or rejection output, including all data required for database import.
</objective>

<quick_start>
Invoke with a shop URL:

  lmaa-shop-check https://example.com

If no URL is provided, stop immediately with:
  `Bitte eine Shop-URL übergeben, z. B. "lmaa-shop-check https://example.com".`
</quick_start>

<sources>
- Admission criteria: `https://lmaa.space/admissioncriteria`
- Categories API: `https://lmaa.space/api/v1/categories`
- Company-size research (Beschäftigtenzahl, Umsatz): `https://die-deutsche-wirtschaft.de` -- search `<Firmenname> die-deutsche-wirtschaft.de`. Complement with Northdata, Bundesanzeiger, LinkedIn company page (headcount), PitchBook, Statista (always with reference year; mark estimates as Schätzung).
</sources>

<validation>
Before starting the workflow, normalize and verify the input:
- If the input is a bare domain (e.g. `example.com` or `www.example.com`), prepend `https://` automatically and proceed.
- If the input is clearly not a URL or domain (e.g. a search term or plain text), stop and ask: `Bitte eine Shop-URL übergeben, z. B. "lmaa-shop-check https://example.com".`
</validation>

<rules>
- **Time budget:** For acceptance checks, aim for 2 minutes and prioritize speed. For rejections requiring ownership chain research, PE/VC tracing, or registry lookups, take the time needed to reach the minimum source requirement. Do NOT use the TodoWrite tool.
- **Batch mode (when called from `/lmaa-shop-review`)**: Minimize all intermediate text output to save tokens. Do NOT output the criteria checklist table, the header, or any research notes. Only output the final verdict block (acceptance JSON or rejection Kommentar + Langbegründung). Keep all other prose to an absolute minimum.
- ALWAYS reload the admission criteria on every run. NEVER use cached or remembered criteria from a prior run.
- ALWAYS fetch shop pages fresh on every run.
- NEVER truncate page content -- read it entirely from beginning to end.
- Understand the context of each page.
- ALWAYS perform page fetches sequentially, NEVER in parallel.
- If a page fetch does not produce usable content, use targeted web search as fallback.
- Final user-facing texts MUST be in German.
- In all published German texts, ALWAYS use real German umlauts (`ä`, `ö`, `ü`, `Ä`, `Ö`, `Ü`) and sharp s (`ß`, `ẞ`) instead of ASCII transliterations such as `ae`, `oe`, `ue`, or `ss`, unless a source identifier or URL requires ASCII.
- **Gender-neutral German (non-negotiable):** Every generated user-facing German text -- the `description`, the rejection `Kommentar`, and the `Langbegründung` -- MUST use gender-inclusive language and avoid the generic masculine for mixed or unspecified groups. Prefer neutral collective/participle forms (`Mitarbeitende`, `Kundschaft`, `Betreibende`, `Produzierende`, `Interessierte`, `Leserschaft`); where no neutral form fits, use a paired form (`Inhaberinnen und Inhaber`, `Leserinnen und Leser`). Do NOT use gender-star or gender-colon glyphs (`*innen`, `:innen`) -- keep the neutral/paired style for readability and JSON safety. Concrete, named individuals keep their real designation (e.g. `Inhaber Sven Odens`, `Inhaberin Nadine van Rüschen`); this rule targets generalizations, not real people.
- NEVER use Em-dashes. Formulate clear and understandable sentences.
- When `lmaa.space` appears in prose, italicize it.
- Always bold the first occurrence of the shop name in every generated text, including inside the `description` string value in the JSON output block. Example: `"description": "**Shop Name** ist ein ..."` -- the markdown bold markers belong inside the JSON string.
</rules>

<timing_and_tokens>
Measure and display total runtime AND token usage for each run.

**Step 1 (at the very start, before any other tool call):** Run this single Bash command. It captures the start timestamp and the current line count of the active Claude Code session transcript (so we can later diff it).

```bash
SLUG=$(pwd | sed 's|/|-|g; s|\.|-|g'); TRANSCRIPT=$(ls -t "$HOME/.claude/projects/${SLUG}"/*.jsonl 2>/dev/null | head -1); echo "$TRANSCRIPT" > /tmp/lmaa_shop_check_transcript.txt; wc -l < "$TRANSCRIPT" 2>/dev/null > /tmp/lmaa_shop_check_startline.txt; date +%s > /tmp/lmaa_shop_check_start.txt; cat /tmp/lmaa_shop_check_start.txt
```

**Step 2 (after the final output block has been produced):** Run this Bash command. It reads the saved start state, tails the transcript lines written during the run, sums token fields from every `message.usage` object, and prints both the formatted duration and a token breakdown.

```bash
START_TS=$(cat /tmp/lmaa_shop_check_start.txt 2>/dev/null); END_TS=$(date +%s); DUR=$((END_TS - START_TS)); if [ "$DUR" -lt 60 ]; then FMT="${DUR}s"; else FMT="$((DUR/60))m $((DUR%60))s"; fi; TRANSCRIPT=$(cat /tmp/lmaa_shop_check_transcript.txt 2>/dev/null); START_LINE=$(cat /tmp/lmaa_shop_check_startline.txt 2>/dev/null); tail -n +$((START_LINE + 1)) "$TRANSCRIPT" 2>/dev/null | python3 -c "
import json, sys
ti=to=tcc=0
for line in sys.stdin:
    try:
        u=json.loads(line).get('message',{}).get('usage',{})
        ti+=u.get('input_tokens',0) or 0
        to+=u.get('output_tokens',0) or 0
        tcc+=u.get('cache_creation_input_tokens',0) or 0
    except Exception: pass
tot=ti+to+tcc
print(f'LAUFZEIT=$FMT')
print(f'TOTAL={tot}')
print(f'IN={ti}')
print(f'OUT={to}')
print(f'CACHE_CREATE={tcc}')
"
```

Only `input_tokens`, `output_tokens`, and `cache_creation_input_tokens` count as tokens actually consumed for this request. `cache_read_input_tokens` is intentionally ignored because cached context is re-used content, not newly billed consumption — and summing it over all messages in a turn would double-count the same context repeatedly.

**Step 3 (output):** Based on the command output, append these two lines as the very last lines of the response, preceded by a blank line:

```
⏱️ Laufzeit: {LAUFZEIT}
🔢 Tokens: {TOTAL} (in: {IN} / out: {OUT} / cache_create: {CACHE_CREATE})
```

Format numbers with thousand separators (e.g. `12,345`) when ≥ 1000. If the transcript cannot be located or is empty (all token fields are 0), only output the `⏱️ Laufzeit` line and omit the token line.

**Batch mode** (when invoked from `/lmaa-shop-review`): still run both commands to keep timing consistent, but DO NOT output either line to save tokens.
</timing_and_tokens>

<workflow>
1. Load `https://lmaa.space/admissioncriteria` first and extract the current criteria. Do not cut the content!
2. Review the shop homepage and capture shop name, product focus, language, sales/ordering hints, own-brand vs. third-party-brand signals, and company presentation. Note: a direct online checkout is not required -- sales via dealers, phone, or other channels also count.
3. Find the imprint or contact page and capture legal entity, location, owners, corporate ties, and branch structure.
4. Find sales and/or shipping information. The criterion is met if the shop either sells to customers in at least one European country (via any channel: own online shop, dealer network, phone/mail order, etc.) or ships to DACH/EU/worldwide. Record only evidenced regions as `DE`, `AT`, `CH`, `EU`, `WORLD`.
   - Normalize the final `shippingRegions` exactly like the dashboard region selector:
     - If worldwide shipping is evidenced, use only `["WORLD"]`
     - Else if Europe-wide / EU-wide shipping is evidenced, use only `["EU"]`
     - Else use only the concrete evidenced DACH country codes among `DE`, `AT`, `CH`
   - NEVER combine `WORLD` with any other region code
   - NEVER combine `EU` with `DE`, `AT`, or `CH`
   - Only output combinations that make semantic sense for the selector state
5. For acceptance candidates, determine the headquarters address as completely as possible:
   - `street`
   - `postalCode`
   - `city`
   - `state`
   - `countryCode` as ISO-3166-1 alpha-2, for example `DE`, `AT`, `CH`
   - note the source of the address, for example imprint, contact page, registry, or trusted third-party source
6. For acceptance candidates, determine geo coordinates for the headquarters:
   - `latitude`
   - `longitude`
   - this step is mandatory for acceptance candidates
   - prefer shop-controlled or authoritative location sources if available
   - if coordinates are not directly published, geocode with the **Photon API** (Komoot, based on OSM data) as the primary tool and stop at the first reliable hit:
     - Photon URL pattern: `https://photon.komoot.io/api/?q={address}&limit=1`
     - Response format: GeoJSON with coordinates in `[longitude, latitude]` order
     - Fallback cascade (each step uses Photon first, then other available tools):
       1. full address: `street + postalCode + city + countryCode`
       2. without street: `postalCode + city + countryCode`
       3. as last resort: `postalCode + city`
   - if street-level geocoding fails, you MUST still return coordinates for `postalCode + city` when these fields are available
   - only return `geo.latitude = null` and `geo.longitude = null` when even `postalCode + city` cannot be evidenced or geocoded reliably
   - note the exact source and granularity of the coordinates, for example `Nominatim (street-level)` or `Nominatim (PLZ+Ort centroid)`
7. Rate each criterion as `✓`, `✗`, or `~`:
   - Independent online presence
   - Sells to customers in Europe via any channel (worldwide is a plus)
   - Not a large corporation / corporate brand -- rate `✗` when the company exceeds the `<company_size_check>` thresholds (primarily >~100 employees). Research the size before rating; do not assume "small".
   - Not a marketplace
   - Not pure dropshipping
   - Not a chain / department store
   - Not a pure affiliate portal
   - No far-right ties
8. To retrieve the required information, try to use all available tools. Be creative, but don't make anything up!
</workflow>

<company_size_check>
**Mandatory before recommending acceptance.** _lmaa.space_ is a directory for small and mid-sized independent shops, not for large companies. For every acceptance candidate, actively research the company size. NEVER infer "small business" from the imprint, a `GmbH & Co. KG`, a long tradition, or a family-owned impression alone.

**Research the figures (stop at the first reliable source):**
1. `https://die-deutsche-wirtschaft.de` -- search `<Firmenname> die-deutsche-wirtschaft.de` for Beschäftigtenzahl and Umsatz (may be a Schätzung/estimate; note that).
2. Northdata, Bundesanzeiger, LinkedIn company page (headcount), PitchBook, Statista, or the shop's own "Über uns"/press pages.
3. If no figure is findable, say so explicitly and judge from concrete proxies (number of branches, warehouse/retail floor size, catalog scale, job listings). NEVER default to "small".

**Thresholds -- employee count is the PRIMARY signal:**
- **Primary -- employees:** guideline ceiling **~100 employees**. Headcount is the leading criterion because it reflects operational scale far better than revenue.
- **Secondary -- revenue:** orientation value **~20 million € annual revenue**, weak signal only. High revenue with a small headcount (e.g. 30 employees moving high-priced goods) is NOT a rejection reason on its own -- it depends on *what* is sold. Use revenue mainly to confirm a large operation or when the headcount cannot be established.

**Grey-zone with buffer:**
- Clearly above the employee ceiling (roughly **>150 employees**) -> reject as `Großunternehmen / kein kleiner-mittlerer Betrieb`, regardless of family ownership or legal form.
- Just above **~100 employees** -> weigh the whole picture (corporate ties, number of branches, market position, self-presentation) and decide with a documented reason.
- A family business (even third-generation) with several hundred employees is still a large company and MUST be rejected. Owner management does not make a company small.
</company_size_check>

<decision_logic>
- If at least one exclusion criterion is evidenced with `✗`: `❌ Ablehnung empfohlen`
- Company size above the `<company_size_check>` thresholds (primarily headcount) is itself an exclusion criterion (`✗` on "Not a large corporation") and leads to `❌ Ablehnung empfohlen`, even when every other criterion is met.
- If no exclusion criterion applies and the required criteria are met: `✅ Aufnahme empfohlen`
- Mark unclear points as `~` and name them explicitly
</decision_logic>

<extra_research>
Only when the result is `✅ Aufnahme empfohlen`:

- Draft a short shop description (redaktionell; brands and products no longer belong inside the description -- see the `description` rules in `<output_format>`)
- Include owners, locations, and legal entity in the description
- Capture focus areas and brand or product highlights for the `notes.focus` and `notes.brandsOrProducts` arrays (these are persisted in the database and feed the search index, so they MUST still be collected even though they no longer appear in the description prose)
- Derive matching categories from the categories API
- Research social profiles for:
  Mastodon, Bluesky, Twitter/X, Instagram, TikTok, YouTube, Twitch, Pinterest, LinkedIn, Facebook, Threads, Patreon
- Find the contact email address
  - Many shops obfuscate email addresses to prevent spam. Recognize and normalize alternative spellings such as `info(at)example.de`, `info (at) example.de`, `info[at]example[dot]de`, `info @ example.de`, `info(ät)example.de`, `info [at] example [dot] de`, or HTML-entity-encoded `@` / `.` characters. Always convert these to a proper `user@domain.tld` format in the output.
- Apply the address and geocoding steps defined in the Workflow (steps 5 and 6) to resolve the final structured headquarters address and geo coordinates suitable for the shop database
</extra_research>

<rejection_research>
Only when the result is `❌ Ablehnung empfohlen`:

**Minimum source requirement:** At least 5 independently verifiable sources for the Langbegründung. A single source (e.g. Wikipedia alone) is never sufficient.

**Source quality hierarchy (highest to lowest):**
1. Primary sources: imprint, AGB, FAQ, official company website (direct quotes where available)
2. Commercial registries: Handelsregister (Northdata, Unternehmensregister, Handelsregister.de), Bundesanzeiger, Dutch KvK, Portuguese RNPC, etc.
3. Official investor / PE firm pages: portfolio listings, press releases on the investment firm's own domain
4. Reputable trade press: Börsenblatt, Textilwirtschaft, ChannelPartner, FashionUnited, EHI rankings, RetailDetail, etc.
5. Financial databases: Statista (with actual year), MarketScreener, PitchBook (for headcount), NBD Trade Data
6. Regulatory decisions: Bundeskartellamt, EU Commission merger filings
7. General press: reputable news outlets (taz, Süddeutsche, etc.)
8. Wikipedia: only as a supplementary cross-reference, never as the sole or primary source

**Rejection-type-specific research strategies:**

*No own online shop / no direct shipping:*
- Check AGB and FAQ for explicit statements (quote them verbatim)
- Check for absence of cart / checkout functionality on the homepage
- Look for dealer-locator pages as evidence of indirect-only sales
- Search trade press for confirmation

*Private Equity / Venture Capital ownership:*
- Find the investment firm's own portfolio page listing the shop
- Find the original acquisition press release (with date, fund name, stake size if disclosed)
- Trace the full ownership chain via commercial registry (UBO → holding entities → operating company), naming each entity with its registry number
- Note any subsequent refinancing events or exit/sale processes as additional evidence

*Large corporation / oversized business / international group:*
- Obtain current employee count and revenue from `https://die-deutsche-wirtschaft.de` (search `<Firmenname> die-deutsche-wirtschaft.de`), Northdata, LinkedIn, PitchBook, Bundesanzeiger, annual report, EHI ranking, or reputable trade press (always state the reference year; mark estimates as Schätzung)
- Quote the concrete figures against the `<company_size_check>` thresholds (headcount primary, revenue secondary) so a size-based rejection is transparent and verifiable
- Document subsidiary structure with registry numbers where available
- List number of locations and countries of operation from official sources

*Marketplace / platform model:*
- Quote the self-description from the imprint or "About" page
- Document the ownership structure (who are the shareholders behind the platform?)
- Check for regulatory filings (e.g. Bundeskartellamt) that confirm the multi-seller model
- Note absence of own inventory / own logistics

*International brand / non-European manufacturer:*
- Identify the legal entity and country of registration (use official contact page or trademark filings)
- Document global distribution channels (Amazon storefronts by country, AliExpress, other marketplaces)
- Check for a trademark registration (USPTO Justia, EUIPO, DPMA) as an additional primary source
- Confirm absence of a European legal entity or imprint

**Ownership chain documentation:**
Whenever PE/VC ownership or a complex corporate structure is the rejection reason, document the full chain from the investor to the operating entity, naming each intermediate holding company with its registry number. Example:
`Capvis AG → Highrise Holding Germany GmbH (HRB 7539) → Hess Natur Holding GmbH (HRB 7536) → Hess Natur-Textilien GmbH & Co. KG (HRA 4904)`

**What to avoid:**
- Do not cite outdated figures without noting the year (e.g. employee counts from 5+ years ago)
- Do not use a PresseBox article as the only evidence for a factual claim
- Do not rely on Wikipedia as the sole source for ownership or financial data
- Do not speculate: if a fact cannot be sourced, either find a source via web search or omit the claim
</rejection_research>

<output_format>
Output is a minimal data response in BOTH cases. NEVER emit a header, criteria checklist, verdict line, prose summary, or categories/social-profile bullet points outside the data blocks. The criteria evaluation, address resolution and geocoding are still performed internally to drive the decision and to fill the data fields, they are simply not surfaced in the response.

- **On acceptance (`✅ Aufnahme empfohlen`)**: output ONLY the structured JSON code block defined in "Acceptance Output" below, followed by the `⏱️ Laufzeit` / `🔢 Tokens` lines from `<timing_and_tokens>` Step 3.
- **On rejection (`❌ Ablehnung empfohlen`)**: output ONLY the two markdown rejection code blocks (Kommentar + Langbegründung) defined in "Rejection Output" below, followed by the `⏱️ Laufzeit` / `🔢 Tokens` lines.

**Rejection Output:**

Output exactly two markdown code blocks back to back, then the runtime/token footer. Nothing before, nothing between besides a blank line, nothing after besides the footer:

- Short reason for dashboard field `Kommentar`
  - 2 to 3 sentences why the shop should be rejected and why it doesn't fit the acceptance criteria
  - State the main rejection reason clearly
  - Bold the first occurrence of the shop name in the text
  - No footnotes, no source references, no source list -- keep the text clean and readable
  - Do not mention lmaa.space in the description; keep the sentences neutral.
  - Always end with this text in a separate line surrounded by newlines (DO NOT REPLACE THE `[REJECT_TOKEN]` token!):
  `Die vollständige Begründung finden Sie unter:
  https://lmaa.space/rejected/[REJECT_TOKEN]`

- Long reason for `Langbegründung (öffentliche Seite)`
  - 300 to 500 words
  - Structure: `## Einleitung`, `## Ablehnungsgründe`, `### Unterabschnitte je Grund`, `## Schluss`
  - Neutral, factual, no speculation
  - Bold the first occurrence of the shop name in the text
  - Use inline footnote markers
  - Add a complete source list at the end of the same block (see `<footnote_rules>` for the required format)

**Acceptance Output:**

CRITICAL — On acceptance (`✅ Aufnahme empfohlen`), output ONLY the structured JSON code block below. No header, no criteria checklist, no verdict line, no description prose, no separate categories or social profile bullet points outside the JSON. Everything that the dashboard needs is contained in the JSON block. This rule applies in normal mode AND in batch mode.

- Format and content of the `description` field inside the JSON:
  - Brief information about the shop, naming the owners and the city/location of operation. Spelling out the legal-form suffix (`GmbH`, `GbR`, `Einzelunternehmen` etc.) is NOT required and SHOULD be omitted by default -- it adds little reader value and is already captured in `legal.entityType`.
  - Information about workshops, courses or similar events is always interesting.
  - Information about the company's history and origins, as well as amusing/interesting anecdotes, are also interesting.
  - Use paragraphs (`\n\n`) for thematic separation.
  - No sources or footnotes inside this string
  - Do not mention lmaa.space in the description.
  - Keep the sentences neutral.
  - **No brand or product enumerations in the description.** Brands and products belong in `notes.brandsOrProducts`, focus areas in `notes.focus`. Both fields are persisted in the database and indexed for search, so repeating them inside the description prose is redundant. Keep the description redaktionell -- focused on the shop's character, people, location, environment, history, special offerings (workshops, courses, rentals, community work) and notable anecdotes. A brief, naming sentence about the product universe (e.g. "Bergsport-Fachgeschäft für Klettern, Bouldern und Trekking") is fine; an enumerated brand or product list is not.
  - **Avoid generic ownership filler phrases.** Words like `inhabergeführt`, `inhabergeführte`, `eigentümergeführt`, `familiengeführt`, `family-owned`, `owner-run` or similar are FORBIDDEN as default descriptors. For a small or mid-sized business, owner management is the implicit baseline and stating it adds no information. Only mention the ownership model when it explicitly deviates from that baseline (for example a cooperative / `eG`, a foundation-owned company, a worker-collective `GmbH`, an explicit `Genossenschaft`, or a verifiable non-PE/non-VC investor structure that is part of the shop's identity). In that case name the concrete model (e.g. `Genossenschaft`, `Stiftungsunternehmen`, `Mitarbeiter-Kollektiv`) instead of the generic adjective.
  - **No tax, registry or boilerplate legal trivia.** The `description` is a reader-facing portrait of the shop, not an imprint summary. FORBIDDEN: VAT/UStG status (`Kleinunternehmer nach § 19 UStG`, `umsatzsteuerbefreit`, `mehrwertsteuerpflichtig`, `keine Umsatzsteuer ausgewiesen`), VAT IDs / `USt-IdNr.` / `Steuernummer`, `Handelsregister`-/`HRB`-/`HRA`-numbers, share capital figures (`Stammkapital`), `Bundesanzeiger`/`Creditreform`/`Northdata`/`D&B` figures, EORI numbers, financial-year balance sheet totals or revenue figures, and similar registry boilerplate. These belong only in the internal `notes.companyPresentation` field, never in the user-visible `description`. The owners' names and the city/location of the shop ARE welcomed in the description. The legal-form suffix (`GmbH`, `GbR`, `Einzelunternehmen`, `UG (haftungsbeschränkt)` etc.) is already captured in `legal.entityType` and SHOULD be omitted from the description by default; include it only when the legal form is genuinely part of the shop's identity (e.g. a cooperative `eG`, a foundation-owned company, a worker-collective `GmbH`).
- Categories: comma-separated list inside the JSON `categories` array.
- Social profiles inside the JSON `socialMedia` object:
  - Remove tracking parameters before output, for example `utm_*`, `trk`, `si`, `fbclid`, `gclid`, or similar query params
  - Use `null` for platforms that were not found
- Structured JSON as final code block for direct copy/import:
  - This is the ONLY user-facing block on acceptance
  - The JSON MUST include all acceptance data that was gathered, not only the address
  - The JSON MUST be valid JSON, not JSON5
  - **CRITICAL — JSON SAFETY**: German typographic quotes inside JSON string values are forbidden as literal characters. If you need to quote a term or phrase inside a JSON string value, you MUST use the Unicode escape sequences `\u201E` (opening, „) and `\u201C` (closing, "). Example: `"description": "...als \u201Eetwas anderes\u201C bezeichnet..."`. NEVER write `„` or `"` as literal characters inside a JSON string — the parser will treat the literal `"` as the end of the string and break the JSON. When in doubt, rephrase to avoid quotation marks entirely.
  - Use `null` for unknown scalar values, `[]` for unknown empty lists, and `{}` for unknown empty maps
  - Clean all URLs before putting them into the JSON
  - The address and geo fields must match this structure so they fit the database extension:

```json
{
  "name": "Shop Name",
  "url": "https://example.com",
  "description": "Copy-ready shop description",
  "categories": ["Kategorie A", "Kategorie B"],
  "contactEmail": "info@example.com",
  "shippingRegions": ["EU"],
  "legal": {
    "entityName": "Beispiel GmbH",
    "entityType": "GmbH",
    "owners": ["Max Beispiel"],
    "headquartersSource": "Impressum"
  },
  "headquarters": {
    "street": "Musterstraße 1",
    "postalCode": "12345",
    "city": "Berlin",
    "state": "Berlin",
    "countryCode": "DE",
    "source": "Impressum"
  },
  "geo": {
    "latitude": 52.52,
    "longitude": 13.405,
    "source": "Nominatim (street-level)"
  },
  "socialMedia": {
    "mastodon": null,
    "bluesky": null,
    "twitter": null,
    "instagram": null,
    "tiktok": null,
    "youtube": null,
    "twitch": null,
    "pinterest": null,
    "linkedin": null,
    "facebook": null,
    "threads": null,
    "patreon": null
  },
  "notes": {
    "focus": ["Rasiermesser", "Pflege"],
    "brandsOrProducts": ["Marke A", "Produkt B"],
    "companyPresentation": "Kurznotiz zur Unternehmensdarstellung"
  }
}
```

  - `headquarters.state` may be `null` if there is no reliable value
  - `geo.latitude` and `geo.longitude` should normally be present for acceptance candidates
  - if full-address geocoding fails, fall back to `postalCode + city` and return place-level coordinates
  - `geo.latitude` and `geo.longitude` may only be `null` if `postalCode + city` cannot be evidenced or geocoded reliably
  - `headquarters.source` and `geo.source` MUST name the actual source briefly, for example `Impressum`, `Kontaktseite`, `Handelsregister`, `Nominatim`
  - If the verdict is acceptance but geo data are incomplete, apply the fallback cascade first and only then use `null` for unresolved fields
  - `shippingRegions` MUST already be normalized to selector-compatible canonical form:
    - `["WORLD"]` for worldwide shipping
    - `["EU"]` for Europe-wide shipping
    - otherwise only concrete combinations of `DE`, `AT`, `CH`
    - NEVER `["DE", "AT", "CH", "EU"]`, NEVER `["WORLD", ...]`
</output_format>

<footnote_rules>
- Mark concrete facts in prose with footnotes such as `[^1]`, `[^2]` with a headline `### Quellen` (followed by a blank line).
- Separate the footnotes in the text (`[^1]`, `[^2]`...) by a space.
- Every relevant code block must be self-contained: inline footnotes in the text and the matching source list at the end of the same block.
- Hard facts such as legal seat, corporate affiliation, or registry data require a source.
- **EVERY source MUST be a verifiable URL.** Phrases like "allgemein bekannt", "common knowledge", "well-known facts", or any non-URL source are STRICTLY FORBIDDEN. If you cannot provide a concrete URL for a claim, you MUST either find one via web search or omit the claim entirely. No exceptions.
- Format of each source: `[^N]: Description, URL, Stand: $DATUM`
- Exception for `✅ Aufnahme empfohlen`: shop description, categories, contact email, and social URL blocks stay source-free so they can be copied into the target system directly.
</footnote_rules>

<error_handling>
- **Criteria page unreachable**: If `https://lmaa.space/admissioncriteria` cannot be fetched, stop immediately and report: `Die Aufnahmekriterien konnten nicht geladen werden. Bitte später erneut versuchen.`
- **Categories API unreachable**: If `https://lmaa.space/api/v1/categories` fails, note this in the acceptance output and set `"categories": []` in the JSON.
- **All geocoding attempts exhausted**: If the full fallback cascade (street → postalCode+city → city only) produces no reliable result, set `"latitude": null, "longitude": null` and note the geocoding failure explicitly in the output.
- **Shop page unreachable**: If the shop homepage cannot be fetched and web search produces no usable results, stop and report the URL as not accessible.
</error_handling>

<success_criteria>
A run is successful when all of the following conditions are met:

- All 8 criteria in the checklist are rated (`✓`, `✗`, or `~`)
- A clear verdict is rendered (`✅ Aufnahme empfohlen` or `❌ Ablehnung empfohlen`)
- For rejection: both the short `Kommentar` and the `Langbegründung` code blocks are present, `[REJECT_TOKEN]` is intact and unchanged, the source list contains at least 5 independently verifiable URLs, and no factual claim is left without a footnote
- For acceptance: all fields in the JSON block are populated or explicitly set to `null`/`[]`/`{}`, geo coordinates are resolved via the fallback cascade, and the JSON is valid (no trailing commas, no JSON5 syntax)
- Total runtime is measured via Bash `date +%s` at start and end, and (outside batch mode) displayed as a final `⏱️ Laufzeit: ...` line
- Token usage is extracted from the session transcript delta and (outside batch mode) displayed as a final `🔢 Tokens: ...` line immediately after the runtime line
</success_criteria>
