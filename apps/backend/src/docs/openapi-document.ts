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
  description: "Public token from the lmaa.space URL. This is not the raw numeric shop id.",
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
    description: "Distance radius in kilometers for `city` filtering.",
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
    properties: {
      error: {
        type: "object",
        properties: {
          message: { type: "string" },
          code: { type: "string" },
          issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                path: { type: "string" },
                message: { type: "string" },
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
    enum: REGION_CODES,
  },
  ShopVisibility: {
    type: "string",
    enum: SHOP_VISIBILITIES,
  },
  ShopCategory: {
    type: "object",
    properties: {
      id: { type: "integer" },
      slug: { type: "string" },
      name: { type: "string" },
    },
    required: ["id", "slug", "name"],
  },
  SocialMedia: {
    type: "object",
    properties: Object.fromEntries(
      SOCIAL_PLATFORM_KEYS.map((platform) => [platform, nullable({ type: "string" })]),
    ),
    additionalProperties: nullable({ type: "string" }),
  },
  Headquarters: {
    type: "object",
    properties: {
      street: nullable({ type: "string" }),
      postalCode: nullable({ type: "string" }),
      city: nullable({ type: "string" }),
      state: nullable({ type: "string" }),
      countryCode: { type: "string" },
      latitude: nullable({ type: "number" }),
      longitude: nullable({ type: "number" }),
    },
    required: ["street", "postalCode", "city", "state", "countryCode", "latitude", "longitude"],
  },
  PublicShopListItem: {
    type: "object",
    properties: {
      id: { type: "integer" },
      name: { type: "string" },
      url: { type: "string", format: "uri" },
      categories: arrayOf(ref("ShopCategory")),
      region: arrayOf(ref("RegionCode")),
      pickup: { type: "string" },
      shipping: { type: "string" },
      description: { type: "string" },
      ogImage: nullable({ type: "string", format: "uri" }),
      contactEmail: nullable({ type: "string", format: "email" }),
      socialMedia: ref("SocialMedia"),
      likeCount: { type: "integer", minimum: 0 },
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
    allOf: [
      ref("PublicShopListItem"),
      {
        type: "object",
        properties: {
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          headquarters: nullable(ref("Headquarters")),
          likeToken: { type: "string" },
        },
        required: ["createdAt", "updatedAt", "headquarters", "likeToken"],
      },
    ],
  },
  CategoryShopItem: {
    type: "object",
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
    allOf: [
      ref("PublicShopListItem"),
      {
        type: "object",
        properties: {
          latitude: nullable({ type: "number" }),
          longitude: nullable({ type: "number" }),
        },
        required: ["latitude", "longitude"],
      },
    ],
  },
  RankedShopItem: {
    allOf: [
      ref("PublicShopListItem"),
      {
        type: "object",
        properties: {
          rank: { type: "integer", minimum: 1 },
        },
        required: ["rank"],
      },
    ],
  },
  RankedFilteredShopItem: {
    allOf: [
      ref("FilteredShopItem"),
      {
        type: "object",
        properties: {
          rank: { type: "integer", minimum: 1 },
        },
        required: ["rank"],
      },
    ],
  },
  CategorySummary: {
    type: "object",
    properties: {
      id: { type: "integer" },
      name: { type: "string" },
      slug: { type: "string" },
      imageUrl: nullable({ type: "string", format: "uri" }),
      imagePhotographer: nullable({ type: "string" }),
      imagePhotographerUrl: nullable({ type: "string", format: "uri" }),
      imageFocalPointY: { type: "number" },
      shopCount: { type: "integer", minimum: 0 },
    },
    required: ["id", "name", "slug", "shopCount"],
  },
  CategoryDetail: {
    allOf: [
      ref("CategorySummary"),
      {
        type: "object",
        properties: {
          shops: arrayOf(ref("CategoryShopItem")),
        },
        required: ["shops"],
      },
    ],
  },
  FilteredCategoryDetail: {
    allOf: [
      ref("CategorySummary"),
      {
        type: "object",
        properties: {
          shops: arrayOf(ref("FilteredShopItem")),
        },
        required: ["shops"],
      },
    ],
  },
  SearchResult: {
    type: "object",
    properties: {
      query: { type: "string" },
      total: { type: "integer", minimum: 0 },
      shops: arrayOf(ref("RankedShopItem")),
      categories: arrayOf(ref("CategorySummary")),
    },
    required: ["query", "total", "shops", "categories"],
  },
  FilteredSearchResult: {
    type: "object",
    properties: {
      query: { type: "string" },
      total: { type: "integer", minimum: 0 },
      shops: arrayOf(ref("RankedFilteredShopItem")),
      categories: arrayOf(ref("CategorySummary")),
    },
    required: ["query", "total", "shops", "categories"],
  },
  CheckUrlResult: {
    oneOf: [
      {
        type: "object",
        properties: { status: { type: "string", const: "available" } },
        required: ["status"],
      },
      {
        type: "object",
        properties: {
          status: { type: "string", const: "invalid" },
        },
        required: ["status"],
      },
      {
        type: "object",
        properties: {
          status: { type: "string", const: "blocked" },
          messageMarkdown: { type: "string" },
        },
        required: ["status", "messageMarkdown"],
      },
      {
        type: "object",
        properties: {
          status: { type: "string", const: "published" },
          shopName: { type: "string" },
          shopUrl: { type: "string" },
        },
        required: ["status", "shopName", "shopUrl"],
      },
      {
        type: "object",
        properties: {
          status: { type: "string", const: "rejected" },
          shopName: { type: "string" },
          rejectionUrl: nullable({ type: "string" }),
        },
        required: ["status", "shopName", "rejectionUrl"],
      },
      {
        type: "object",
        properties: {
          status: { type: "string", const: "pending" },
          shopName: { type: "string" },
        },
        required: ["status", "shopName"],
      },
    ],
  },
  RejectionPage: {
    type: "object",
    properties: {
      shopName: { type: "string" },
      shopUrl: { type: "string", format: "uri" },
      rejectionLongText: nullable({ type: "string" }),
      reviewedAt: nullable({ type: "string", format: "date-time" }),
    },
    required: ["shopName", "shopUrl", "rejectionLongText", "reviewedAt"],
  },
  FilteredCategoriesResult: {
    type: "object",
    properties: {
      categories: arrayOf(ref("CategorySummary")),
      totalShops: { type: "integer", minimum: 0 },
    },
    required: ["categories", "totalShops"],
  },
  FilterOptions: {
    type: "object",
    properties: {
      countries: arrayOf(ref("FilterCountry")),
    },
    required: ["countries"],
  },
  FilterCountry: {
    type: "object",
    properties: {
      code: { type: "string", minLength: 2, maxLength: 2 },
      name: { type: "string" },
    },
    required: ["code", "name"],
  },
  ShopListEnvelope: envelope(arrayOf(ref("PublicShopListItem"))),
  ShopDetailEnvelope: envelope(ref("PublicShopDetail")),
  CategoryListEnvelope: envelope(arrayOf(ref("CategorySummary"))),
  CategoryDetailEnvelope: envelope(ref("CategoryDetail")),
  SearchResultEnvelope: envelope(ref("SearchResult")),
  CheckUrlEnvelope: envelope(ref("CheckUrlResult")),
  RejectionPageEnvelope: envelope(ref("RejectionPage")),
  FilteredShopListEnvelope: envelope(arrayOf(ref("FilteredShopItem"))),
  FilteredCategoriesEnvelope: envelope(ref("FilteredCategoriesResult")),
  FilteredCategoryDetailEnvelope: envelope(ref("FilteredCategoryDetail")),
  FilteredSearchResultEnvelope: envelope(ref("FilteredSearchResult")),
  FilterOptionsEnvelope: envelope(ref("FilterOptions")),
};

const publicOpenApiOperations: OpenApiOperation[] = [
  {
    method: "get",
    path: "/api/v1/shops",
    tags: ["Shops"],
    summary: "List public shops",
    description:
      "Returns all active, publicly listed shops with their categories, shipping regions, public description, social profiles and like count. Cached for 60 seconds.",
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
      "Searches public shops and categories. Shop matches are ranked by name, URL, postal-code prefix, imported shop-check notes and description. Category matches are limited to five items.",
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
      "Returns public shops filtered by city/radius, headquarters country and shipping region. Results include latitude/longitude when headquarters coordinates are known.",
    operationId: "listFilteredPublicShops",
    parameters: filterParameters,
    responses: withCommonErrors({
      "200": jsonResponse("Filtered shop list.", ref("FilteredShopListEnvelope")),
    }),
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
    responses: withCommonErrors({
      "200": jsonResponse("Filtered categories.", ref("FilteredCategoriesEnvelope")),
    }),
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
      { notFound: "Category not found." },
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
    responses: withCommonErrors({
      "200": jsonResponse("Filtered search result.", ref("FilteredSearchResultEnvelope")),
    }),
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
        "Public REST API for [lmaa.space](https://lmaa.space), a curated directory of independent online shops in Europe. The document is generated from the backend OpenAPI registry at runtime and shipped with each deployment. Only externally useful public endpoints are listed. Dashboard endpoints, website-internal runtime endpoints and side-effect endpoints are intentionally excluded.",
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
      { name: "Shops", description: "Public shop catalog endpoints." },
      { name: "Categories", description: "Public shop category endpoints." },
      { name: "Search", description: "Catalog search endpoints." },
      { name: "Filters", description: "Location and shipping filter endpoints." },
      { name: "Submission Checks", description: "Read-only checks for submission forms." },
      { name: "Content", description: "Externally shareable public content endpoints." },
    ],
    paths,
    components: { schemas: buildPublicSchemas(paths) },
  };
}
