import { SOCIAL_PLATFORM_KEYS, REGION_CODES, SHOP_VISIBILITIES } from "@lmaa/shared";

type HttpMethod = "get" | "post" | "put" | "delete" | "patch";
type SchemaObject = Record<string, unknown>;

interface OpenApiCodeSample {
  lang: string;
  label: string;
  source: string;
}

interface OpenApiOperation {
  method: HttpMethod;
  path: string;
  tags: string[];
  summary: string;
  description: string;
  operationId: string;
  parameters?: SchemaObject[];
  responses: Record<string, SchemaObject>;
  "x-codeSamples"?: OpenApiCodeSample[];
  "x-code-samples"?: OpenApiCodeSample[];
}

const PRODUCTION_API_BASE_URL = "https://api.lmaa.space";

function getOpenApiServers() {
  return [{ url: PRODUCTION_API_BASE_URL, description: "Production" }];
}

function ref(name: string): SchemaObject {
  return { $ref: `#/components/schemas/${name}` };
}

function arrayOf(items: SchemaObject): SchemaObject {
  return { type: "array", items };
}

function nullable(schema: SchemaObject): SchemaObject {
  if (schema.type === "string") return { ...schema, type: ["string", "null"] };
  if (schema.type === "integer") return { ...schema, type: ["integer", "null"] };
  if (schema.type === "number") return { ...schema, type: ["number", "null"] };
  if (schema.type === "boolean") return { ...schema, type: ["boolean", "null"] };
  return { oneOf: [schema, { type: "null" }] };
}

function envelope(dataSchema: SchemaObject): SchemaObject {
  return {
    type: "object",
    properties: { data: dataSchema },
    required: ["data"],
  };
}

/**
 * Attaches a description to a schema built by one of the helpers above.
 *
 * `nullable()` and `envelope()` return finished schema objects, so the only way
 * to document their result without repeating the shape is to spread it.
 *
 * @param schema The schema to document.
 * @param description Prose shown next to the field or schema in the reference.
 * @returns A copy of the schema carrying the description.
 */
function described(schema: SchemaObject, description: string): SchemaObject {
  return { ...schema, description };
}

function jsonResponse(description: string, schema: SchemaObject): SchemaObject {
  return {
    description,
    content: {
      "application/json": { schema },
    },
  };
}

function errorResponse(description: string): SchemaObject {
  return jsonResponse(description, ref("ErrorEnvelope"));
}

function withCommonErrors(
  responses: Record<string, SchemaObject>,
  options: { badRequest?: string; notFound?: string } = {},
): Record<string, SchemaObject> {
  return {
    ...responses,
    ...(options.badRequest ? { "400": errorResponse(options.badRequest) } : {}),
    ...(options.notFound ? { "404": errorResponse(options.notFound) } : {}),
    "429": errorResponse("Rate limit exceeded."),
  };
}

const samplePathsByOperationId: Record<string, string> = {
  listPublicShops: "/api/v1/shops",
  getPublicShop: "/api/v1/shops/layered-work",
  listPublicCategories: "/api/v1/categories",
  getPublicCategory: "/api/v1/categories/fair-fashion",
  searchPublicCatalog: "/api/v1/search?q=kaffee",
  checkShopUrl: "/api/v1/check-url?url=https%3A%2F%2Fexample-shop.de",
  getPublicRejectionNotice: "/api/v1/rejected/0123456789abcdef0123456789abcdef",
  listFilteredPublicShops: "/api/v1/filtered/shops?city=Berlin&radius=50&country=DE&region=EU",
  listFilteredPublicCategories:
    "/api/v1/filtered/categories?city=Berlin&radius=50&country=DE&region=EU",
  getFilteredPublicCategory:
    "/api/v1/filtered/categories/fair-fashion?city=Berlin&radius=50&country=DE&region=EU",
  searchFilteredPublicCatalog:
    "/api/v1/filtered/search?q=kaffee&city=Berlin&radius=50&country=DE&region=EU",
  getPublicFilterOptions: "/api/v1/filter-options",
};

function getOperationSampleUrl(operationId: string): string {
  const samplePath = samplePathsByOperationId[operationId];
  if (!samplePath) throw new Error(`Missing OpenAPI sample path for ${operationId}`);
  return new URL(samplePath, PRODUCTION_API_BASE_URL).toString();
}

function buildCodeSamples(operationId: string): OpenApiCodeSample[] {
  const url = getOperationSampleUrl(operationId);
  // Every documented operation wraps its payload in the `data` envelope, so
  // each sample reads the payload from there.
  const jsLogStatement = "console.log(payload.data);";
  const phpLogStatement = "print_r($payload['data']);";
  const pythonLogStatement = 'print(payload["data"])';
  const rubyLogStatement = 'puts payload["data"]';
  const rustLogStatement = 'println!("{}", payload["data"]);';
  const swiftLogStatement = 'print(payload["data"] ?? payload)';
  const objcLogStatement = 'NSLog(@"%@", payload[@"data"] ?: payload);';

  return [
    {
      lang: "Curl",
      label: "cURL",
      source: [
        "curl --request GET \\",
        `  --url '${url}' \\`,
        "  --header 'Accept: application/json'",
      ].join("\n"),
    },
    {
      lang: "Shell",
      label: "POSIX",
      source: [
        "#!/usr/bin/env sh",
        "set -eu",
        "",
        `response="$(curl --fail --silent --show-error \\`,
        `  --header 'Accept: application/json' \\`,
        `  '${url}')"`,
        "",
        `printf '%s\\n' "$response"`,
      ].join("\n"),
    },
    {
      lang: "Node.js",
      label: "Fetch",
      source: [
        `const response = await fetch("${url}", {`,
        '  headers: { Accept: "application/json" },',
        "});",
        "",
        "if (!response.ok) {",
        "  throw new Error(`LMAA API request failed: ${response.status}`);",
        "}",
        "",
        "const payload = await response.json();",
        jsLogStatement,
      ].join("\n"),
    },
    {
      lang: "PHP",
      label: "Guzzle",
      source: [
        "<?php",
        "$client = new \\GuzzleHttp\\Client();",
        `$response = $client->request('GET', '${url}', [`,
        "    'headers' => ['Accept' => 'application/json'],",
        "]);",
        "$payload = json_decode((string) $response->getBody(), true);",
        phpLogStatement,
      ].join("\n"),
    },
    {
      lang: "Python",
      label: "Requests",
      source: [
        "import requests",
        "",
        `response = requests.get("${url}", headers={"Accept": "application/json"}, timeout=10)`,
        "response.raise_for_status()",
        "payload = response.json()",
        pythonLogStatement,
      ].join("\n"),
    },
    {
      lang: "Ruby",
      label: "Net::HTTP",
      source: [
        'require "json"',
        'require "net/http"',
        "",
        `uri = URI("${url}")`,
        'request = Net::HTTP::Get.new(uri, "Accept" => "application/json")',
        'response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") do |http|',
        "  http.request(request)",
        "end",
        "response.value",
        "payload = JSON.parse(response.body)",
        rubyLogStatement,
      ].join("\n"),
    },
    {
      lang: "Rust",
      label: "Reqwest",
      source: [
        "#[tokio::main]",
        "async fn main() -> Result<(), Box<dyn std::error::Error>> {",
        "    let payload: serde_json::Value = reqwest::Client::new()",
        `        .get("${url}")`,
        '        .header("Accept", "application/json")',
        "        .send()",
        "        .await?",
        "        .error_for_status()?",
        "        .json()",
        "        .await?;",
        `    ${rustLogStatement}`,
        "    Ok(())",
        "}",
      ].join("\n"),
    },
    {
      lang: "Swift",
      label: "URLSession",
      source: [
        `let url = URL(string: "${url}")!`,
        "var request = URLRequest(url: url)",
        'request.setValue("application/json", forHTTPHeaderField: "Accept")',
        "",
        "let (data, response) = try await URLSession.shared.data(for: request)",
        "guard let httpResponse = response as? HTTPURLResponse, (200..<300).contains(httpResponse.statusCode) else {",
        "  throw URLError(.badServerResponse)",
        "}",
        "let payload = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]",
        swiftLogStatement,
      ].join("\n"),
    },
    {
      lang: "ObjC",
      label: "NSURLSession",
      source: [
        `NSURL *url = [NSURL URLWithString:@"${url}"];`,
        "NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];",
        '[request setValue:@"application/json" forHTTPHeaderField:@"Accept"];',
        "",
        "NSURLSessionDataTask *task = [[NSURLSession sharedSession]",
        "  dataTaskWithRequest:request",
        "  completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {",
        '    if (error) { NSLog(@"%@", error); return; }',
        "    NSDictionary *payload = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];",
        `    ${objcLogStatement}`,
        "  }];",
        "[task resume];",
      ].join("\n"),
    },
    {
      lang: "C",
      label: "libcurl",
      source: [
        "#include <curl/curl.h>",
        "",
        "int main(void) {",
        "  CURL *curl = curl_easy_init();",
        "  if (!curl) return 1;",
        "",
        "  struct curl_slist *headers = NULL;",
        '  headers = curl_slist_append(headers, "Accept: application/json");',
        `  curl_easy_setopt(curl, CURLOPT_URL, "${url}");`,
        "  curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);",
        "  CURLcode result = curl_easy_perform(curl);",
        "",
        "  curl_slist_free_all(headers);",
        "  curl_easy_cleanup(curl);",
        "  return result == CURLE_OK ? 0 : 1;",
        "}",
      ].join("\n"),
    },
  ];
}

const tokenParam: SchemaObject = {
  in: "path",
  name: "token",
  required: true,
  schema: { type: "string" },
  description: "Public token from the lmaa.space URL. This is not the raw numeric shop ID.",
};

const slugParam: SchemaObject = {
  in: "path",
  name: "slug",
  required: true,
  schema: { type: "string" },
  description: "URL-safe category slug.",
};

const searchQueryParam: SchemaObject = {
  in: "query",
  name: "q",
  required: false,
  schema: { type: "string", minLength: 2, maxLength: 200 },
  description:
    "Search term. Missing values or values shorter than two characters return an empty result set.",
};

const filterParameters: SchemaObject[] = [
  {
    in: "query",
    name: "city",
    required: false,
    schema: { type: "string", maxLength: 200 },
    description:
      "City name used for distance filtering. When set, `radius` limits shops around the geocoded city.",
  },
  {
    in: "query",
    name: "radius",
    required: false,
    schema: { type: "integer", minimum: 1, maximum: 500, default: 50 },
    description: "Distance radius in kilometres for `city` filtering.",
  },
  {
    in: "query",
    name: "country",
    required: false,
    schema: { type: "string", maxLength: 50 },
    description: "Comma-separated ISO 3166-1 alpha-2 country codes, for example `DE,AT`.",
  },
  {
    in: "query",
    name: "region",
    required: false,
    schema: { type: "string", maxLength: 50 },
    description: "Comma-separated shipping region codes, for example `DE,EU`.",
  },
];

const schemas: Record<string, SchemaObject> = {
  ErrorEnvelope: {
    type: "object",
    description:
      "Body of every error response. The HTTP status carries the outcome, this envelope carries the explanation.",
    properties: {
      error: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description:
              'Human-readable explanation. Treat it as display text only, because its wording can change at any time. Unexpected server faults are reported as "Internal Server Error" so that internals never leak.',
          },
          code: {
            type: "string",
            description:
              "Stable machine-readable error identifier. Reserved for future use, as no endpoint documented here sets it.",
          },
          issues: {
            type: "array",
            description:
              "Per-field validation failures. Only write endpoints produce these, so no endpoint documented here returns them.",
            items: {
              type: "object",
              properties: {
                path: { type: "string", description: "Dot-joined path of the offending field." },
                message: { type: "string", description: "What is wrong with that field." },
              },
              required: ["path", "message"],
            },
          },
        },
        required: ["message"],
      },
    },
    required: ["error"],
  },
  RegionCode: {
    type: "string",
    description:
      "Area a shop delivers to, not the area it is based in. DE, AT, and CH are the individual countries, EU is Europe, and WORLD is worldwide delivery.",
    enum: REGION_CODES,
  },
  ShopVisibility: {
    type: "string",
    description:
      "Moderation state of a shop. Only shops in state public are served by this API, so the value never appears in a public payload and is documented here as vocabulary.",
    enum: SHOP_VISIBILITIES,
  },
  ShopCategory: {
    type: "object",
    description: "Category reference embedded in a shop payload.",
    properties: {
      id: { type: "integer" },
      slug: {
        type: "string",
        description: "URL-safe identifier, and the value to pass to the category endpoints.",
      },
      name: { type: "string", description: "Display name, unique across all categories." },
    },
    required: ["id", "slug", "name"],
  },
  SocialMedia: {
    type: "object",
    description:
      "Social profiles of the shop, keyed by platform. Every value is a full canonical profile URL rather than a handle, because handles are expanded when a shop is saved. A shop without any profile yields an empty object.",
    properties: Object.fromEntries(
      SOCIAL_PLATFORM_KEYS.map((platform) => [platform, nullable({ type: "string" })]),
    ),
    additionalProperties: nullable({ type: "string" }),
  },
  Headquarters: {
    type: "object",
    description:
      "Registered address of the shop. The record exists only when a country is known, so every other part may be missing individually while countryCode is always present.",
    properties: {
      street: nullable({ type: "string" }),
      postalCode: nullable({ type: "string" }),
      city: described(
        nullable({ type: "string" }),
        "City name resolved from the geo reference table, null when no city is linked.",
      ),
      state: described(
        nullable({ type: "string" }),
        "Region or state name resolved from the geo reference table, null when none is linked.",
      ),
      countryCode: {
        type: "string",
        description: "ISO 3166-1 alpha-2 country code in upper case.",
      },
      latitude: described(
        nullable({ type: "number" }),
        "Decimal degrees (WGS 84), null until the address has been geocoded. Used by the radius filter.",
      ),
      longitude: described(
        nullable({ type: "number" }),
        "Decimal degrees (WGS 84), null until the address has been geocoded.",
      ),
    },
    required: ["street", "postalCode", "city", "state", "countryCode", "latitude", "longitude"],
  },
  PublicShopListItem: {
    type: "object",
    description: "A shop as it appears in the public catalogue.",
    properties: {
      id: {
        type: "integer",
        description:
          "Numeric shop identifier. The shop detail endpoint takes the URL token instead, so this is only useful for correlating records.",
      },
      name: { type: "string", description: "Shop name. All listings are sorted by it." },
      url: {
        type: "string",
        format: "uri",
        description:
          "Shop homepage, normalised when the shop is submitted: tracking parameters, fragments, a leading www, and a trailing slash are all removed.",
      },
      categories: described(
        arrayOf(ref("ShopCategory")),
        "Categories the shop is filed under. Empty when it has not been categorised yet.",
      ),
      region: described(
        arrayOf(ref("RegionCode")),
        "Areas the shop delivers to. Empty when the shop has not declared any.",
      ),
      pickup: {
        type: "string",
        description:
          "Free-text note about collecting an order in person, written by the operator and usually in German. Frequently an empty string, which means no note rather than no collection.",
      },
      shipping: {
        type: "string",
        description:
          "Free-text note about delivery terms, for example a threshold for free shipping. Says nothing about where the shop delivers, which is what region covers. Frequently an empty string.",
      },
      description: {
        type: "string",
        description: "Public description of the shop, written in Markdown. May be an empty string.",
      },
      ogImage: described(
        nullable({ type: "string", format: "uri" }),
        "Preview image taken from the shop's own website, discovered automatically from its touch icon, Open Graph tag, manifest, or logo. Hosted by the shop rather than by lmaa.space, so it is not guaranteed to stay reachable. Null when nothing suitable was found.",
      ),
      contactEmail: described(
        nullable({ type: "string", format: "email" }),
        "Public contact address of the shop, not the address of whoever submitted it.",
      ),
      socialMedia: ref("SocialMedia"),
      likeCount: {
        type: "integer",
        minimum: 0,
        description:
          "Number of visitors who have liked the shop. A stored counter, kept in step with the like records, and never negative.",
      },
    },
    required: [
      "id",
      "name",
      "url",
      "categories",
      "region",
      "pickup",
      "shipping",
      "description",
      "socialMedia",
      "likeCount",
    ],
  },
  PublicShopDetail: {
    description:
      "A single shop with the fields that only the detail endpoint returns, on top of everything in the catalogue listing.",
    allOf: [
      ref("PublicShopListItem"),
      {
        type: "object",
        properties: {
          createdAt: {
            type: "string",
            format: "date-time",
            description: "When the shop was added to the directory.",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
            description: "When the shop record last changed for any reason.",
          },
          headquarters: described(
            nullable(ref("Headquarters")),
            "Registered address of the shop, null when none has been recorded.",
          ),
          likeToken: {
            type: "string",
            description:
              "Short-lived challenge for the like endpoint, formatted as signature.timestamp and valid for 30 minutes from the moment this response was produced. It is tied to the shop rather than to a visitor, and a fresh one is issued on every detail request.",
          },
        },
        required: ["createdAt", "updatedAt", "headquarters", "likeToken"],
      },
    ],
  },
  CategoryShopItem: {
    type: "object",
    description:
      "A shop inside a category response. Same as the catalogue entry without the category list, which the surrounding response already states, and without the contact address.",
    properties: {
      id: { type: "integer" },
      name: { type: "string" },
      url: { type: "string", format: "uri" },
      region: arrayOf(ref("RegionCode")),
      pickup: { type: "string" },
      shipping: { type: "string" },
      description: { type: "string" },
      ogImage: nullable({ type: "string", format: "uri" }),
      socialMedia: ref("SocialMedia"),
      likeCount: { type: "integer", minimum: 0 },
    },
    required: [
      "id",
      "name",
      "url",
      "region",
      "pickup",
      "shipping",
      "description",
      "socialMedia",
      "likeCount",
    ],
  },
  FilteredShopItem: {
    description: "A shop returned by the filter endpoints, carrying the coordinates the map needs.",
    allOf: [
      ref("PublicShopListItem"),
      {
        type: "object",
        properties: {
          latitude: described(
            nullable({ type: "number" }),
            "Latitude of the shop's registered address in decimal degrees, not of the place searched for. Null when the address is unknown or not yet geocoded.",
          ),
          longitude: described(
            nullable({ type: "number" }),
            "Longitude of the shop's registered address in decimal degrees.",
          ),
        },
        required: ["latitude", "longitude"],
      },
    ],
  },
  RankedShopItem: {
    description: "A search hit, which is a catalogue entry plus the reason it matched.",
    allOf: [
      ref("PublicShopListItem"),
      {
        type: "object",
        properties: {
          rank: {
            type: "integer",
            minimum: 1,
            maximum: 7,
            description:
              "Which part of the shop matched, from 1 for the strongest to 6 for the weakest: 1 the name, 2 the URL, 3 the postcode of the registered address, 4 imported shop-check notes, 5 the description, 6 the name of one of its categories. Results are sorted by this value and then by name. It ranks the match, it does not score it.",
          },
        },
        required: ["rank"],
      },
    ],
  },
  RankedFilteredShopItem: {
    description:
      "A search hit within the active filters, ranked the same way as an unfiltered one.",
    allOf: [
      ref("FilteredShopItem"),
      {
        type: "object",
        properties: {
          rank: {
            type: "integer",
            minimum: 1,
            maximum: 7,
            description: "Match class, identical in meaning to the one on RankedShopItem.",
          },
        },
        required: ["rank"],
      },
    ],
  },
  CategorySummary: {
    type: "object",
    description: "A category with its artwork and the number of public shops filed under it.",
    properties: {
      id: { type: "integer" },
      name: { type: "string", description: "Display name, unique across all categories." },
      slug: {
        type: "string",
        description: "URL-safe identifier, and the value the category endpoints expect.",
      },
      imageUrl: described(
        nullable({ type: "string", format: "uri" }),
        "Header image of the category, null when none has been chosen.",
      ),
      imagePhotographer: described(
        nullable({ type: "string" }),
        "Name of the photographer, to be displayed wherever the image is shown.",
      ),
      imagePhotographerUrl: described(
        nullable({ type: "string", format: "uri" }),
        "Profile of the photographer, to be linked alongside the credit.",
      ),
      imageFocalPointY: {
        type: "number",
        minimum: 0,
        maximum: 100,
        description:
          "Vertical focal point of the header image as a percentage of its height, where 0 is the top edge and 100 the bottom. Use it when cropping the image so the subject stays visible. The horizontal focal point is always centred.",
      },
      shopCount: {
        type: "integer",
        minimum: 0,
        description:
          "Number of public shops in this category, counted per request rather than stored. On the filter endpoints it counts only the shops matching the active filters, so it can be 0.",
      },
    },
    required: ["id", "name", "slug", "shopCount"],
  },
  CategoryDetail: {
    description: "A category together with every public shop filed under it.",
    allOf: [
      ref("CategorySummary"),
      {
        type: "object",
        properties: {
          shops: described(arrayOf(ref("CategoryShopItem")), "The shops, sorted by name."),
        },
        required: ["shops"],
      },
    ],
  },
  FilteredCategoryDetail: {
    description:
      "A category together with only those of its shops that match the active filters. The category itself is unaffected by the filters.",
    allOf: [
      ref("CategorySummary"),
      {
        type: "object",
        properties: {
          shops: described(arrayOf(ref("FilteredShopItem")), "The matching shops, sorted by name."),
        },
        required: ["shops"],
      },
    ],
  },
  SearchResult: {
    type: "object",
    description: "Shops and categories matching a search term.",
    properties: {
      query: { type: "string", description: "The search term as it was interpreted, trimmed." },
      total: {
        type: "integer",
        minimum: 0,
        description:
          "Number of items in this response, that is shops plus categories. Both lists are capped, at 40 and 5 respectively, so this is not a count of everything that matches and cannot be used for paging.",
      },
      shops: described(
        arrayOf(ref("RankedShopItem")),
        "Matching shops, best match first, at most 40.",
      ),
      categories: described(
        arrayOf(ref("CategorySummary")),
        "Categories whose name contains the term, at most 5.",
      ),
    },
    required: ["query", "total", "shops", "categories"],
  },
  FilteredSearchResult: {
    type: "object",
    description:
      "Search results restricted to the active filters. Note that the filters apply to the shops only; the category matches are the same ones an unfiltered search returns.",
    properties: {
      query: { type: "string", description: "The search term as it was interpreted, trimmed." },
      total: {
        type: "integer",
        minimum: 0,
        description:
          "Number of items in this response, that is shops plus categories, subject to the same caps of 40 and 5.",
      },
      shops: described(
        arrayOf(ref("RankedFilteredShopItem")),
        "Matching shops within the filters, best match first, at most 40.",
      ),
      categories: described(
        arrayOf(ref("CategorySummary")),
        "Categories whose name contains the term, at most 5, not restricted by the filters.",
      ),
    },
    required: ["query", "total", "shops", "categories"],
  },
  CheckUrlResult: {
    description:
      "What the directory already knows about a domain. The variants are checked in a fixed order, so a blocked domain is reported as blocked even when a shop for it exists.",
    oneOf: [
      {
        type: "object",
        description:
          "The domain is unknown and can be submitted. Also returned when the url parameter is missing or empty, in which case nothing was checked.",
        properties: { status: { type: "string", const: "available" } },
        required: ["status"],
      },
      {
        type: "object",
        description:
          "No registrable domain could be read from the input, so there was nothing to look up.",
        properties: {
          status: { type: "string", const: "invalid" },
        },
        required: ["status"],
      },
      {
        type: "object",
        description: "The operator has barred this domain from the directory.",
        properties: {
          status: { type: "string", const: "blocked" },
          messageMarkdown: {
            type: "string",
            description:
              "The operator's explanation for the block, written in Markdown and meant to be shown to whoever tried to submit the shop.",
          },
        },
        required: ["status", "messageMarkdown"],
      },
      {
        type: "object",
        description: "The shop is already listed.",
        properties: {
          status: { type: "string", const: "published" },
          shopName: { type: "string", description: "Name under which the shop is listed." },
          shopUrl: {
            type: "string",
            description:
              "Path of the shop page on lmaa.space, relative to the site root, for example /shop/ab12cd34. This is not the shop's own address.",
          },
        },
        required: ["status", "shopName", "shopUrl"],
      },
      {
        type: "object",
        description: "The shop or an earlier submission for it was turned down.",
        properties: {
          status: { type: "string", const: "rejected" },
          shopName: { type: "string" },
          rejectionUrl: described(
            nullable({ type: "string" }),
            "Path of the public notice explaining the decision, relative to the site root, for example /rejected/0123456789abcdef0123456789abcdef. Null for older decisions that were recorded without such a notice.",
          ),
        },
        required: ["status", "shopName", "rejectionUrl"],
      },
      {
        type: "object",
        description:
          "A submission for this domain is waiting to be reviewed or has been put on hold.",
        properties: {
          status: { type: "string", const: "pending" },
          shopName: { type: "string", description: "Name given in the submission." },
        },
        required: ["status", "shopName"],
      },
    ],
  },
  RejectionPage: {
    type: "object",
    description:
      "Public notice explaining why a shop or a submission was turned down. Published so that decisions stay traceable.",
    properties: {
      shopName: { type: "string" },
      shopUrl: { type: "string", format: "uri", description: "Address of the shop concerned." },
      rejectionLongText: described(
        nullable({ type: "string" }),
        "The reasoning that is meant for the public. Internal review notes are never part of this response. Null when the decision was recorded without a public text.",
      ),
      reviewedAt: described(
        nullable({ type: "string", format: "date-time" }),
        "When the decision was made. For shops that were listed first and turned down later, this is the time of the last change to the record.",
      ),
    },
    required: ["shopName", "shopUrl", "rejectionLongText", "reviewedAt"],
  },
  FilteredCategoriesResult: {
    type: "object",
    description: "Every category with its filtered shop count, plus the overall number of matches.",
    properties: {
      categories: described(
        arrayOf(ref("CategorySummary")),
        "All categories, including those whose filtered count is 0, sorted by name.",
      ),
      totalShops: {
        type: "integer",
        minimum: 0,
        description:
          "Number of distinct shops matching the filters. This is not the sum of the counts above: a shop in several categories is counted once here but in each of its categories there, and a shop without any category is counted here only.",
      },
    },
    required: ["categories", "totalShops"],
  },
  FilterOptions: {
    type: "object",
    description:
      "Filter values that are worth offering, derived from the shops currently listed. Delivery regions are a fixed vocabulary and are therefore not part of this response.",
    properties: {
      countries: arrayOf(ref("FilterCountry")),
    },
    required: ["countries"],
  },
  FilterCountry: {
    type: "object",
    description:
      "A country at least one listed shop is based in. Countries without a listed shop never appear.",
    properties: {
      code: {
        type: "string",
        minLength: 2,
        maxLength: 2,
        description:
          "ISO 3166-1 alpha-2 code in upper case, and the value the country filter expects.",
      },
      name: {
        type: "string",
        description:
          "Stored country name. It falls back to the code itself where no name has been recorded, so treat it as a hint and localise from the code when you need a proper label.",
      },
    },
    required: ["code", "name"],
  },
  // Every successful response wraps its payload in `data`, so each of these is
  // the plain envelope around one of the schemas above.
  ShopListEnvelope: described(
    envelope(arrayOf(ref("PublicShopListItem"))),
    "The public shop catalogue, sorted by name.",
  ),
  ShopDetailEnvelope: described(envelope(ref("PublicShopDetail")), "One shop with its details."),
  CategoryListEnvelope: described(
    envelope(arrayOf(ref("CategorySummary"))),
    "All categories, sorted by name.",
  ),
  CategoryDetailEnvelope: described(
    envelope(ref("CategoryDetail")),
    "One category with its shops.",
  ),
  SearchResultEnvelope: described(envelope(ref("SearchResult")), "Search results."),
  CheckUrlEnvelope: described(
    envelope(ref("CheckUrlResult")),
    "What the directory knows about the domain that was checked.",
  ),
  RejectionPageEnvelope: described(envelope(ref("RejectionPage")), "A public rejection notice."),
  FilteredShopListEnvelope: described(
    envelope(arrayOf(ref("FilteredShopItem"))),
    "Shops matching the active filters, sorted by name.",
  ),
  FilteredCategoriesEnvelope: described(
    envelope(ref("FilteredCategoriesResult")),
    "Categories with filtered shop counts.",
  ),
  FilteredCategoryDetailEnvelope: described(
    envelope(ref("FilteredCategoryDetail")),
    "One category with the shops matching the active filters.",
  ),
  FilteredSearchResultEnvelope: described(
    envelope(ref("FilteredSearchResult")),
    "Search results within the active filters.",
  ),
  FilterOptionsEnvelope: described(
    envelope(ref("FilterOptions")),
    "Filter values currently worth offering.",
  ),
};

const publicOpenApiOperations: OpenApiOperation[] = [
  {
    method: "get",
    path: "/api/v1/shops",
    tags: ["Shops"],
    summary: "List public shops",
    description:
      "Returns all active, publicly listed shops with their categories, shipping regions, public description, social profiles, and like count. Cached for 60 seconds.",
    operationId: "listPublicShops",
    responses: withCommonErrors({
      "200": jsonResponse("Public shop list.", ref("ShopListEnvelope")),
    }),
  },
  {
    method: "get",
    path: "/api/v1/shops/{token}",
    tags: ["Shops"],
    summary: "Get one public shop",
    description:
      "Returns a single public shop by its URL token, enriched with headquarters data and a short-lived like challenge token.",
    operationId: "getPublicShop",
    parameters: [tokenParam],
    responses: withCommonErrors(
      {
        "200": jsonResponse("Public shop detail.", ref("ShopDetailEnvelope")),
      },
      {
        badRequest: "Invalid shop token.",
        notFound: "Shop not found.",
      },
    ),
  },
  {
    method: "get",
    path: "/api/v1/categories",
    tags: ["Categories"],
    summary: "List public categories",
    description:
      "Returns all shop categories with image metadata and the number of public shops assigned to each category. Cached privately for 30 seconds.",
    operationId: "listPublicCategories",
    responses: withCommonErrors({
      "200": jsonResponse("Category list.", ref("CategoryListEnvelope")),
    }),
  },
  {
    method: "get",
    path: "/api/v1/categories/{slug}",
    tags: ["Categories"],
    summary: "Get category shops",
    description:
      "Returns one category and the public shops assigned to it. Use slugs from the category list endpoint.",
    operationId: "getPublicCategory",
    parameters: [slugParam],
    responses: withCommonErrors(
      {
        "200": jsonResponse("Category detail with shops.", ref("CategoryDetailEnvelope")),
      },
      { notFound: "Category not found." },
    ),
  },
  {
    method: "get",
    path: "/api/v1/search",
    tags: ["Search"],
    summary: "Search shops and categories",
    description:
      "Searches public shops and categories. Shop matches are ranked by name, URL, postal-code prefix, imported shop-check notes, and description. Category matches are limited to five items.",
    operationId: "searchPublicCatalog",
    parameters: [searchQueryParam],
    responses: withCommonErrors({
      "200": jsonResponse("Search result.", ref("SearchResultEnvelope")),
    }),
  },
  {
    method: "get",
    path: "/api/v1/check-url",
    tags: ["Submission Checks"],
    summary: "Check shop URL availability",
    description:
      "Checks whether a shop domain is unknown, blocked by a managed domain alert, already listed, previously rejected, queued for review, or invalid. Domain extraction uses the Public Suffix List via `tldts`.",
    operationId: "checkShopUrl",
    parameters: [
      {
        in: "query",
        name: "url",
        required: true,
        schema: { type: "string" },
        description:
          "Shop URL or hostname to check. Missing schemes are accepted by backend normalization.",
      },
    ],
    responses: withCommonErrors({
      "200": jsonResponse("URL availability result.", ref("CheckUrlEnvelope")),
    }),
  },
  {
    method: "get",
    path: "/api/v1/rejected/{token}",
    tags: ["Content"],
    summary: "Get public rejection notice",
    description:
      "Returns the public rejection notice for a rejected shop or submission. Tokens are 32-character lowercase hex strings.",
    operationId: "getPublicRejectionNotice",
    parameters: [
      {
        in: "path",
        name: "token",
        required: true,
        schema: { type: "string", pattern: "^[0-9a-f]{32}$" },
        description: "Rejection notice token.",
      },
    ],
    responses: withCommonErrors(
      {
        "200": jsonResponse("Rejection notice.", ref("RejectionPageEnvelope")),
      },
      {
        badRequest: "Invalid token format.",
        notFound: "Rejection notice not found.",
      },
    ),
  },
  {
    method: "get",
    path: "/api/v1/filtered/shops",
    tags: ["Filters"],
    summary: "List filtered public shops",
    description:
      "Returns public shops filtered by city and radius, headquarters country, and shipping region. Results include latitude and longitude when headquarters coordinates are known.",
    operationId: "listFilteredPublicShops",
    parameters: filterParameters,
    responses: withCommonErrors(
      {
        "200": jsonResponse("Filtered shop list.", ref("FilteredShopListEnvelope")),
      },
      { badRequest: "Filter parameters outside the documented bounds." },
    ),
  },
  {
    method: "get",
    path: "/api/v1/filtered/categories",
    tags: ["Filters"],
    summary: "List filtered categories",
    description:
      "Returns categories with filtered shop counts plus the total number of shops matching the active filters.",
    operationId: "listFilteredPublicCategories",
    parameters: filterParameters,
    responses: withCommonErrors(
      {
        "200": jsonResponse("Filtered categories.", ref("FilteredCategoriesEnvelope")),
      },
      { badRequest: "Filter parameters outside the documented bounds." },
    ),
  },
  {
    method: "get",
    path: "/api/v1/filtered/categories/{slug}",
    tags: ["Filters"],
    summary: "Get filtered category shops",
    description:
      "Returns one category and only those shops in the category that match the active filters.",
    operationId: "getFilteredPublicCategory",
    parameters: [slugParam, ...filterParameters],
    responses: withCommonErrors(
      {
        "200": jsonResponse(
          "Filtered category detail with shops.",
          ref("FilteredCategoryDetailEnvelope"),
        ),
      },
      {
        badRequest: "Filter parameters outside the documented bounds.",
        notFound: "Category not found.",
      },
    ),
  },
  {
    method: "get",
    path: "/api/v1/filtered/search",
    tags: ["Filters"],
    summary: "Search within filtered shops",
    description:
      "Searches public shops within the active filters, including imported shop-check notes, and returns matching categories for the query.",
    operationId: "searchFilteredPublicCatalog",
    parameters: [searchQueryParam, ...filterParameters],
    responses: withCommonErrors(
      {
        "200": jsonResponse("Filtered search result.", ref("FilteredSearchResultEnvelope")),
      },
      { badRequest: "Filter parameters outside the documented bounds." },
    ),
  },
  {
    method: "get",
    path: "/api/v1/filter-options",
    tags: ["Filters"],
    summary: "List available filter options",
    description:
      "Returns currently available filter values derived from public shop headquarters. At the moment this contains countries.",
    operationId: "getPublicFilterOptions",
    responses: withCommonErrors({
      "200": jsonResponse("Available filter options.", ref("FilterOptionsEnvelope")),
    }),
  },
];

/**
 * Public `/api/v1` routes intentionally excluded from the external OpenAPI document.
 *
 * The list is used by tests to make new route additions explicit: each route
 * must either be documented or receive an exclusion reason.
 */
export const excludedPublicRouteKeys = [
  "GET /api/v1/stats",
  "POST /api/v1/form/{slug}/submit",
  "GET /api/v1/nav/{navId}",
  "GET /api/v1/content",
  "GET /api/v1/content/{slug}",
  "GET /api/v1/content-preview/{token}",
  "POST /api/v1/shops/{id}/report",
  "POST /api/v1/shops/{id}/concern",
  "POST /api/v1/shops/{id}/like",
  "GET /api/v1/form-config/{name}",
  "GET /api/v1/form-config-by-slug/{slug}",
  "GET /api/v1/footer-config",
  "GET /api/v1/social-media-accounts/footer",
  "GET /api/v1/social-preview-image",
  "GET /api/v1/markdown-widgets/{key}",
  "GET /api/v1/footer-preview/{token}",
  "GET /api/v1/rejected-shops",
  "GET /api/v1/media-aliases",
  "GET /api/v1/media-shortcode-assets",
  "GET /api/v1/hero",
] as const;

function operationKey(operation: Pick<OpenApiOperation, "method" | "path">): string {
  return `${operation.method.toUpperCase()} ${operation.path}`;
}

export function documentedRouteKeys(): string[] {
  return publicOpenApiOperations.map(operationKey);
}

function buildPaths() {
  const paths: Record<string, Record<string, Omit<OpenApiOperation, "method" | "path">>> = {};
  for (const { method, path, ...operation } of publicOpenApiOperations) {
    const codeSamples = buildCodeSamples(operation.operationId);
    paths[path] ??= {};
    paths[path][method] = {
      ...operation,
      "x-codeSamples": codeSamples,
      "x-code-samples": codeSamples,
    };
  }
  return paths;
}

function collectComponentSchemaRefs(value: unknown, refs = new Set<string>()): Set<string> {
  if (!value || typeof value !== "object") return refs;

  if (Array.isArray(value)) {
    for (const item of value) collectComponentSchemaRefs(item, refs);
    return refs;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.$ref === "string") {
    const match = record.$ref.match(/^#\/components\/schemas\/(.+)$/);
    if (match) refs.add(match[1]);
  }

  for (const nestedValue of Object.values(record)) {
    collectComponentSchemaRefs(nestedValue, refs);
  }

  return refs;
}

function buildPublicSchemas(paths: unknown) {
  const publicSchemaNames = collectComponentSchemaRefs(paths);

  let hasNewRefs = true;
  while (hasNewRefs) {
    hasNewRefs = false;
    for (const schemaName of [...publicSchemaNames]) {
      const nestedSchema = schemas[schemaName];
      if (!nestedSchema) continue;

      const previousSize = publicSchemaNames.size;
      collectComponentSchemaRefs(nestedSchema, publicSchemaNames);
      hasNewRefs = hasNewRefs || publicSchemaNames.size > previousSize;
    }
  }

  return Object.fromEntries(
    Object.entries(schemas).filter(([schemaName]) => publicSchemaNames.has(schemaName)),
  );
}

export function buildOpenApiDocument() {
  const paths = buildPaths();

  return {
    openapi: "3.1.0",
    info: {
      title: "LMAA Public API",
      version: "1.1.0",
      // Two paragraphs: what the API is and what it covers, then how its
      // responses behave. Each paragraph is one continuous line; the empty
      // entry is the Markdown paragraph break.
      description: [
        "Public REST API for [lmaa.space](https://lmaa.space), a curated directory of independent online shops in Europe. The backend serves this document itself, so it ships with every deployment. Only externally useful public endpoints are listed, and dashboard endpoints, website-internal runtime endpoints, and side-effect endpoints are deliberately excluded.",
        "",
        'All documented API responses return JSON wrapped in a `{ "data": ... }` envelope. Errors use `{ "error": { "message": "..." } }`. Rate-limited endpoints allow 100 read requests per minute per IP and include `X-RateLimit-*` response headers.',
      ].join("\n"),
      contact: {
        name: "LMAA",
        url: "https://lmaa.space",
      },
    },
    servers: getOpenApiServers(),
    tags: [
      { name: "Shops", description: "Public shop catalogue endpoints." },
      { name: "Categories", description: "Public shop category endpoints." },
      { name: "Search", description: "Catalogue search endpoints." },
      { name: "Filters", description: "Location and shipping filter endpoints." },
      { name: "Submission Checks", description: "Read-only checks for submission forms." },
      { name: "Content", description: "Externally shareable public content endpoints." },
    ],
    paths,
    components: { schemas: buildPublicSchemas(paths) },
  };
}
