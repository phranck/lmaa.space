// Temperature: low for extraction/analysis, moderate for narratives
export const TEMPERATURE_EXTRACTION = 0.1;
export const TEMPERATURE_NARRATIVE = 0.3;

// Timeouts
export const TIMEOUT_PAGE_MS = 30_000;
export const TIMEOUT_SEARCH_MS = 20_000;
export const TIMEOUT_GEOCODE_MS = 20_000;

// Crawling
export const MAX_PAGES = 20;
export const MAX_DISCOVERED_LINKS = 30;
export const CRAWL_DELAY_MS = 30;
export const CONCURRENT_FETCHES = 5;

// Chunking
export const MAX_PAGES_PER_CHUNK = 10;

export const LOCAL_DB_URL = "postgresql://postgres@localhost/lmaa";
export const SHOPCHECK_USER_AGENT = "lmaa-shopcheck/1.0 (+https://lmaa.space)";
