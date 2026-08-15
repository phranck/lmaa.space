---
name: lmaa-shop-check
description: Use when a shop URL has to be judged against the lmaa.space admission criteria, whether by hand or by the automated review. Produces the acceptance JSON the dashboard imports, or the rejection texts, together with the evidence each verdict rests on.
version: "2.0.0"
---

<objective>
Evaluate a shop URL against the current _lmaa.space_ admission criteria and produce a structured acceptance or rejection output, including all data required for database import.
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
- Company size (Beschäftigtenzahl, Umsatz): `https://die-deutsche-wirtschaft.de`, searched as `<Firmenname> die-deutsche-wirtschaft.de`. Complement with Northdata, Bundesanzeiger, LinkedIn company page (headcount), PitchBook, Statista. Always state the reference year and mark estimates as Schätzung.
</sources>

<validation>
- A bare domain (`example.com`, `www.example.com`) gets `https://` prepended.
- Anything that is not a URL or domain stops the run with: `Bitte eine Shop-URL übergeben, z. B. "lmaa-shop-check https://example.com".`
</validation>

<rules>
- **Time budget:** aim for 2 minutes on an acceptance. A rejection that needs ownership chains, PE/VC tracing or registry lookups takes the time the minimum source requirement needs. Do NOT use the TodoWrite tool.
- Reload the admission criteria on every run. Never use remembered criteria.
- Fetch shop pages fresh, sequentially, never in parallel, and read each one whole. Where a fetch yields nothing usable, fall back to targeted web search.
- Invent nothing. A fact without a source is omitted, not guessed.
- User-facing texts are German, with real umlauts (`ä`, `ö`, `ü`, `Ä`, `Ö`, `Ü`) and `ß`/`ẞ` rather than `ae`, `oe`, `ue`, `ss`, unless an identifier or URL requires ASCII.
- **Gender-inclusive German (non-negotiable):** `description`, `Kommentar` and `Langbegründung` avoid the generic masculine for mixed or unspecified groups. Use neutral collective or participle forms (`Mitarbeitende`, `Kundschaft`, `Betreibende`, `Produzierende`, `Interessierte`, `Leserschaft`), or a paired form where none fits (`Inhaberinnen und Inhaber`, `Leserinnen und Leser`). Gender-star and gender-colon glyphs (`*innen`, `:innen`) are forbidden. Named individuals keep their real designation (`Inhaber Sven Odens`, `Inhaberin Nadine van Rüschen`).
- Never use em-dashes. Write plain, complete sentences.
- Italicize `lmaa.space` in prose. Bold the first occurrence of the shop name in every generated text, including inside the `description` string: `"description": "**Shop Name** ist ein ..."`.
- Be descriptive, as you would tell a friend about the shop.
</rules>

<timing_and_tokens>
Measure and display total runtime AND token usage for each run.

**Step 1 (at the very start, before any other tool call):** capture the start timestamp and the current line count of the session transcript.

```bash
SLUG=$(pwd | sed 's|/|-|g; s|\.|-|g'); TRANSCRIPT=$(ls -t "$HOME/.claude/projects/${SLUG}"/*.jsonl 2>/dev/null | head -1); echo "$TRANSCRIPT" > /tmp/lmaa_shop_check_transcript.txt; wc -l < "$TRANSCRIPT" 2>/dev/null > /tmp/lmaa_shop_check_startline.txt; date +%s > /tmp/lmaa_shop_check_start.txt; cat /tmp/lmaa_shop_check_start.txt
```

**Step 2 (after the final output block):** read the saved state, sum the token fields written during the run, and print duration and breakdown.

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

Only `input_tokens`, `output_tokens` and `cache_creation_input_tokens` from each `message.usage` count as consumed. `cache_read_input_tokens` is deliberately ignored: cached context is re-used content, and summing it per message would count the same context many times.

**Step 3:** append these two lines last, after a blank line:

```
⏱️ Laufzeit: {LAUFZEIT}
🔢 Tokens: {TOTAL} (in: {IN} / out: {OUT} / cache_create: {CACHE_CREATE})
```

Numbers ≥ 1000 carry thousand separators (`12,345`). Where the transcript is missing or every token field is 0, print the `⏱️ Laufzeit` line alone.
</timing_and_tokens>

<workflow>
1. Load `https://lmaa.space/admissioncriteria` and extract the current criteria in full.
2. Read the homepage: shop name, product focus, language, sales and ordering hints, own brands against third-party brands, company presentation. A checkout is not required; selling through dealers, phone or mail order counts.
3. Read the imprint or contact page: legal entity, location, owners, corporate ties, branch structure.
4. Establish where the shop sells and ships. The criterion is met when it sells to customers in at least one European country through any channel, or ships to DACH, the EU or worldwide. Normalize `shippingRegions` exactly as the dashboard selector does, and use this form everywhere it appears:
   - worldwide evidenced: `["WORLD"]` alone
   - otherwise Europe-wide evidenced: `["EU"]` alone
   - otherwise only the evidenced codes among `DE`, `AT`, `CH`
   - never combine `WORLD` with anything, never combine `EU` with `DE`, `AT` or `CH`
5. Establish the accepted payment methods from shop-controlled sources: checkout, payment information, FAQ, terms, shipping pages, footer. Record only evidenced methods, using these canonical keys and no others: `paypal`, `credit_card`, `stripe`, `sepa`, `bank_transfer`, `invoice`, `klarna`, `apple_pay`, `google_pay`, `amazon_pay`, `visa`, `mastercard`, `american_express`, `maestro`, `shop_pay`.
   - `credit_card` only where card acceptance is evidenced but no network can be identified. Where Visa, Mastercard or American Express is evidenced, name the network and omit `credit_card`.
   - Nothing evidenced means an empty array. An ecommerce platform alone evidences nothing.
   - Shops draw these as icons, so the names sit in the markup rather than in the page text. Where a tool for reading payment methods from a page exists, use it on the start page, then on the payment or checkout page, and take the canonical keys it returns.
6. For an acceptance candidate, establish the headquarters as completely as evidenced: `street`, `postalCode`, `city`, `state`, `countryCode` as ISO-3166-1 alpha-2 (`DE`, `AT`, `CH`), and the source of the address, such as imprint, contact page or registry.
7. For an acceptance candidate, establish `latitude` and `longitude` for that address. This is mandatory. Prefer shop-controlled or authoritative sources; otherwise geocode with the **Photon API** (Komoot, OSM data) and stop at the first reliable hit:
   - `https://photon.komoot.io/api/?q={address}&limit=1`, GeoJSON, coordinates in `[longitude, latitude]` order
   - cascade: `street + postalCode + city + countryCode`, then `postalCode + city + countryCode`, then `postalCode + city`
   - where street level fails, coordinates for `postalCode + city` are still required
   - both `null` only where even `postalCode + city` cannot be evidenced or geocoded
   - name source and granularity, such as `Nominatim (street-level)` or `Nominatim (PLZ+Ort centroid)`
8. Rate each of the eight criteria as `✓`, `✗` or `~`: independent online presence; sells to customers in Europe through any channel, worldwide being a plus; not a large corporation, rated `✗` above the `<company_size_check>` thresholds and researched rather than assumed; not a marketplace; not pure dropshipping; not a chain or department store; not a pure affiliate portal; no far-right ties.
9. Use every tool available to get the information. Be creative, invent nothing.
</workflow>

<company_size_check>
**Mandatory before recommending acceptance.** _lmaa.space_ lists small and mid-sized independent shops, not large companies. Research the size actively. Never infer "small" from the imprint, a `GmbH & Co. KG`, a long tradition or a family-owned impression.

**Figures, stopping at the first reliable source:**
1. `https://die-deutsche-wirtschaft.de`, searched as `<Firmenname> die-deutsche-wirtschaft.de`, for Beschäftigtenzahl and Umsatz, marking a Schätzung as such.
2. Northdata, Bundesanzeiger, LinkedIn company page (headcount), PitchBook, Statista, or the shop's own Über-uns and press pages.
3. Where no figure is findable, say so and judge from concrete proxies: number of branches, warehouse or retail floor size, catalogue scale, job listings. Never default to "small".

**Thresholds, headcount first:**
- **Employees, the primary signal:** guideline ceiling **~100 employees**, because headcount reflects operational scale far better than revenue.
- **Revenue, secondary and weak:** orientation value **~20 million € annual revenue**. High revenue on a small headcount, such as 30 people moving high-priced goods, is no rejection reason by itself. Use revenue to confirm a large operation or where headcount cannot be established.
- Clearly above the ceiling, roughly **>150 employees**: reject as `Großunternehmen / kein kleiner-mittlerer Betrieb`, whatever the ownership or legal form.
- Just above **~100 employees**: weigh corporate ties, branches, market position and self-presentation, and decide with a documented reason.
- A family business with several hundred employees is a large company and is rejected. Owner management does not make a company small.
</company_size_check>

<decision_logic>
- One exclusion criterion evidenced as `✗`: `❌ Ablehnung empfohlen`.
- A company above the `<company_size_check>` thresholds is itself such a criterion and leads to `❌ Ablehnung empfohlen` even where everything else is met.
- No exclusion criterion and the required criteria met: `✅ Aufnahme empfohlen`.
- Unclear points are marked `~` and named explicitly.
</decision_logic>

<extra_research>
Only on `✅ Aufnahme empfohlen`:

- Draft the `description` as an editorial portrait, following the `description` rules in `<output_format>`.
- Collect focus areas and brand or product highlights for `notes.focus` and `notes.brandsOrProducts`. Both are persisted and feed the search index, so they are collected even though they no longer appear in the description prose.
- Derive matching categories from the categories API.
- Find profiles for Mastodon, Bluesky, Twitter/X, Instagram, TikTok, YouTube, Twitch, Pinterest, LinkedIn, Facebook, Threads and Patreon.
- Find the contact email. Shops obfuscate it against spam, so normalize spellings such as `info(at)example.de`, `info (at) example.de`, `info[at]example[dot]de`, `info @ example.de`, `info(ät)example.de`, `info [at] example [dot] de` and HTML-entity-encoded `@` or `.` into `user@domain.tld`.
- Resolve headquarters and coordinates through workflow steps 6 and 7, and payment methods through step 5.
</extra_research>

<rejection_research>
Only on `❌ Ablehnung empfohlen`:

**Minimum sources:** at least 5 independently verifiable sources for the Langbegründung. One source, Wikipedia in particular, is never enough.

**Source quality, best first:**
1. Primary: imprint, AGB, FAQ, the company's own site, quoted directly where possible
2. Registries: Handelsregister (Northdata, Unternehmensregister, Handelsregister.de), Bundesanzeiger, Dutch KvK, Portuguese RNPC
3. Investor and PE firm pages: portfolio listings, press releases on the firm's own domain
4. Trade press: Börsenblatt, Textilwirtschaft, ChannelPartner, FashionUnited, EHI rankings, RetailDetail
5. Financial databases: Statista with the actual year, MarketScreener, PitchBook for headcount, NBD Trade Data
6. Regulatory decisions: Bundeskartellamt, EU Commission merger filings
7. General press: taz, Süddeutsche and comparable outlets
8. Wikipedia: supplementary cross-reference only, never the sole or primary source

**By rejection type:**

*No own shop or no direct shipping:* quote AGB and FAQ verbatim; note the absence of cart or checkout; look for dealer-locator pages as evidence of indirect sales; confirm through trade press.

*Private equity or venture capital ownership:* find the investor's own portfolio page; find the acquisition press release with date, fund name and stake size where disclosed; trace the chain from UBO through holdings to the operating company, naming each entity with its registry number; note refinancing or exit processes.

*Large corporation or international group:* obtain headcount and revenue from `https://die-deutsche-wirtschaft.de`, Northdata, LinkedIn, PitchBook, Bundesanzeiger, the annual report, EHI rankings or trade press, always with the reference year and estimates marked as Schätzung; quote the figures against the `<company_size_check>` thresholds so the rejection is verifiable; document the subsidiary structure with registry numbers; list locations and countries from official sources.

*Marketplace or platform:* quote the self-description from the imprint or About page; document who the shareholders are; check regulatory filings such as Bundeskartellamt for the multi-seller model; note the absence of own inventory or logistics.

*International brand or non-European manufacturer:* identify the legal entity and country of registration through the official contact page or trademark filings; document global distribution such as Amazon storefronts by country, AliExpress and other marketplaces; check a trademark registration (USPTO Justia, EUIPO, DPMA); confirm that no European legal entity or imprint exists.

**Ownership chains:** where PE or VC ownership or a complex structure is the reason, document the full chain with registry numbers, for example `Capvis AG → Highrise Holding Germany GmbH (HRB 7539) → Hess Natur Holding GmbH (HRB 7536) → Hess Natur-Textilien GmbH & Co. KG (HRA 4904)`.

**Avoid:** figures without their year, such as a headcount from five years ago; a PresseBox article as the only evidence; Wikipedia as the sole source for ownership or financial data; and any claim that cannot be sourced.
</rejection_research>

<output_format>
The response carries data and nothing else, in both cases. No header, no criteria checklist, no verdict line, no prose summary, no category or social-profile bullets outside the data blocks. Criteria, address and geocoding are still worked out internally; they simply are not printed.

- On `✅ Aufnahme empfohlen`: only the JSON block below, then the `⏱️ Laufzeit` and `🔢 Tokens` lines.
- On `❌ Ablehnung empfohlen`: only the two markdown blocks below, back to back and separated by one blank line, then the same two lines.

**Rejection output**

`Kommentar`, for the dashboard field:
- 2 to 3 sentences on why the shop is rejected and where it misses the criteria, with the main reason stated plainly
- the first occurrence of the shop name in bold
- no footnotes, no sources, no source list
- no mention of lmaa.space, neutral tone
- ends with this, on its own line and surrounded by blank lines, with `[REJECT_TOKEN]` left exactly as it is:
  `Die vollständige Begründung finden Sie unter:
  https://lmaa.space/rejected/[REJECT_TOKEN]`

`Langbegründung`, for the public page:
- 300 to 500 words
- structure: `## Einleitung`, `## Ablehnungsgründe`, `### Unterabschnitte je Grund`, `## Schluss`
- neutral and factual, no speculation
- the first occurrence of the shop name in bold
- inline footnote markers and a complete source list at the end of the same block, in the format `<footnote_rules>` gives

**Acceptance output**

Only the JSON block, holding everything the dashboard needs.

`description`:
- a brief portrait naming the owners and the city. The legal-form suffix (`GmbH`, `GbR`, `Einzelunternehmen`, `UG (haftungsbeschränkt)`) is already in `legal.entityType` and is omitted unless the form is part of the shop's identity, such as an `eG`, a foundation-owned company or a worker collective.
- workshops, courses and comparable events are always worth mentioning, as are the company's history, origins and any amusing anecdote
- paragraphs separated by `\n\n`, no sources, no footnotes, no mention of lmaa.space, neutral sentences
- **no brand or product enumerations.** Brands and products belong in `notes.brandsOrProducts`, focus areas in `notes.focus`; both are persisted and indexed, so repeating them here is redundant. One naming sentence about the product universe is fine, such as "Bergsport-Fachgeschäft für Klettern, Bouldern und Trekking"; a list is not. Keep it editorial: character, people, location, environment, history, special offerings, anecdotes.
- **no ownership filler.** `inhabergeführt`, `eigentümergeführt`, `familiengeführt`, `family-owned`, `owner-run` and the like are forbidden as default descriptors, because owner management is the baseline for a small business and stating it adds nothing. Name a concrete model only where it deviates: `Genossenschaft`, `Stiftungsunternehmen`, `Mitarbeiter-Kollektiv`.
- **no registry or tax boilerplate.** Forbidden: VAT status (`Kleinunternehmer nach § 19 UStG`, `umsatzsteuerbefreit`, `mehrwertsteuerpflichtig`, `keine Umsatzsteuer ausgewiesen`), `USt-IdNr.`, `Steuernummer`, `Handelsregister`, `HRB` and `HRA` numbers, `Stammkapital`, figures from `Bundesanzeiger`, `Creditreform`, `Northdata` or `D&B`, EORI numbers, balance sheet totals and revenue. All of that belongs in `notes.companyPresentation`.

JSON requirements:
- valid JSON, never JSON5, no trailing commas
- **quotes:** German typographic quotes inside a string value are written as the escape sequences `\u201E` (opening) and `\u201C` (closing), for example `"description": "...als \u201Eetwas anderes\u201C bezeichnet..."`. Never write `„` or `"` as literal characters inside a string: the parser reads the literal `"` as the end of the string and the JSON breaks. Where in doubt, rephrase without quotation marks.
- **one line per value:** every string value is one physical line. An internal break is `\n`, never an actual newline inside the string. This holds for `description`, `notes.companyPresentation` and every other text field.
- `null` for unknown scalars, `[]` for unknown lists, `{}` for unknown maps
- URLs cleaned of tracking parameters such as `utm_*`, `trk`, `si`, `fbclid`, `gclid`, in `socialMedia` and everywhere else; `null` for platforms that were not found
- `shippingRegions` and `paymentMethods` already normalized as workflow steps 4 and 5 define
- `headquarters.state` may be `null`; `headquarters.source` and `geo.source` name the actual source briefly, such as `Impressum`, `Kontaktseite`, `Handelsregister`, `Nominatim`
- `geo.latitude` and `geo.longitude` follow the cascade in workflow step 7 and are `null` only when it is exhausted

```json
{
  "name": "Shop Name",
  "url": "https://example.com",
  "description": "Copy-ready shop description",
  "categories": ["Kategorie A", "Kategorie B"],
  "contactEmail": "info@example.com",
  "shippingRegions": ["EU"],
  "paymentMethods": ["paypal", "visa", "mastercard", "sepa"],
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
</output_format>

<footnote_rules>
- Mark concrete facts with footnotes such as `[^1]`, `[^2]`, separated by a space, under a `### Quellen` headline followed by a blank line.
- Every code block is self-contained: its markers and its source list live in the same block.
- Hard facts such as legal seat, corporate affiliation or registry data always carry a source.
- **Every source is a verifiable URL.** "allgemein bekannt", "common knowledge" and any other non-URL source are forbidden. Without a URL, find one by search or drop the claim.
- Format: `[^N]: [Description](URL), Stand: $DATUM`, with the description as the link label. No bare URLs.
- On `✅ Aufnahme empfohlen` the description, categories, contact email and social URLs stay source-free, so they can be copied straight into the target system.
</footnote_rules>

<error_handling>
- **Criteria page unreachable:** stop and report `Die Aufnahmekriterien konnten nicht geladen werden. Bitte später erneut versuchen.`
- **Categories API unreachable:** note it in the acceptance output and set `"categories": []`.
- **Geocoding exhausted:** set `"latitude": null, "longitude": null` and state the failure.
- **Shop unreachable:** where neither fetch nor search yields anything usable, stop and report the URL as not accessible.
</error_handling>

<success_criteria>
- All 8 criteria rated `✓`, `✗` or `~`, and a clear verdict rendered.
- On rejection: both blocks present, `[REJECT_TOKEN]` intact, at least 5 independently verifiable URLs in the source list, no factual claim without a footnote.
- On acceptance: every JSON field populated or explicitly `null`, `[]` or `{}`; coordinates resolved through the cascade; valid JSON; `paymentMethods` present and holding only canonical keys, `[]` where none is evidenced.
- Runtime measured with `date +%s` and printed as `⏱️ Laufzeit: ...`, token usage from the transcript delta printed as `🔢 Tokens: ...` on the following line.
</success_criteria>
