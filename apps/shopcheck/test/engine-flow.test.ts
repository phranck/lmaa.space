import assert from "node:assert/strict";
import test from "node:test";

import { ShopcheckEngine } from "../src/engine";

test("engine run resumes and skips already processed shop ids", async () => {
  const calls: number[] = [];
  const engine = new ShopcheckEngine(
    { batchSize: null, provider: "ollama" },
    {
      persist: false,
      isInteractive: () => true,
      chooseStartMode: async () => "resume",
      loadShops: async () => [
        { id: 1, name: "A", url: "https://a.example" },
        { id: 2, name: "B", url: "https://b.example" },
      ],
      chooseBatchSize: async () => null,
      processShop: async (shop) => {
        calls.push(shop.id);
        return { verdict: "accept" };
      },
    },
  );

  engine.state.processedShopIds = [1];
  engine.state.completed = 1;
  engine.state.total = 2;

  await engine.run();

  assert.deepEqual(calls, [2]);
  assert.equal(engine.state.mode, "resume");
  assert.equal(engine.state.provider, "ollama");
  assert.deepEqual(engine.state.processedShopIds.sort((a, b) => a - b), [1, 2]);
  assert.equal(engine.state.total, 1);
  assert.equal(engine.state.completed, 1);
});

test("engine run reset starts from scratch", async () => {
  const calls: number[] = [];
  const engine = new ShopcheckEngine(
    { batchSize: null, provider: "ollama" },
    {
      persist: false,
      isInteractive: () => true,
      chooseStartMode: async () => "reset",
      loadShops: async () => [
        { id: 1, name: "A", url: "https://a.example" },
        { id: 2, name: "B", url: "https://b.example" },
      ],
      chooseBatchSize: async () => null,
      processShop: async (shop) => {
        calls.push(shop.id);
        return { verdict: "accept" };
      },
    },
  );

  engine.state.processedShopIds = [1];
  engine.state.completed = 1;
  engine.state.total = 2;

  await engine.run();

  assert.deepEqual(calls, [1, 2]);
  assert.equal(engine.state.mode, "run");
  assert.deepEqual(engine.state.processedShopIds.sort((a, b) => a - b), [1, 2]);
  assert.equal(engine.state.completed, 2);
});

test("engine defaults to ollama when provider is not forced and non-interactive", async () => {
  const defaultEngine = new ShopcheckEngine(
    { batchSize: null },
    {
      persist: false,
      isInteractive: () => false,
      loadShops: async () => [],
      chooseBatchSize: async () => null,
    },
  );

  await defaultEngine.run();

  assert.equal(defaultEngine.state.provider, "ollama");
  assert.equal(defaultEngine.state.model, "qwen3.5:397b-cloud");
});

test("engine serializes single-url results as a single object", () => {
  const engine = new ShopcheckEngine(
    { batchSize: null, singleUrl: "https://example-shop.de", provider: "ollama" },
    { persist: false },
  );

  engine.results.entries = [
    {
      shopId: 0,
      shopJson: {
        name: "Example Shop",
        url: "https://example-shop.de",
      },
    },
  ];

  assert.deepEqual(engine.buildResultsPayload(), {
    name: "Example Shop",
    url: "https://example-shop.de",
  });
});

test("engine serializes batch results as a flat array", () => {
  const engine = new ShopcheckEngine(
    { batchSize: null, provider: "ollama" },
    { persist: false },
  );

  engine.results.entries = [
    {
      shopId: 1,
      shopJson: {
        name: "A",
        url: "https://a.example",
      },
    },
    {
      shopId: 2,
      shopJson: {
        name: "B",
        url: "https://b.example",
      },
    },
  ];

  assert.deepEqual(engine.buildResultsPayload(), [
    { name: "A", url: "https://a.example" },
    { name: "B", url: "https://b.example" },
  ]);
});

test("engine marks verdict=error runs as failed and does not count them as succeeded", async () => {
  const engine = new ShopcheckEngine(
    { batchSize: null, singleUrl: "https://broken.example", provider: "ollama" },
    {
      persist: false,
      processShop: async () => ({
        verdict: "error",
        shopName: "broken.example",
        shopUrl: "https://broken.example",
        shopJson: null,
        rejectionMarkdown: null,
      }),
    },
  );

  await engine.run();

  assert.equal(engine.state.status, "failed");
  assert.equal(engine.state.metrics.succeeded, 0);
  assert.equal(engine.results.entries.length, 0);
  assert.equal(engine.results.skipped.length, 1);
  assert.equal(engine.results.skipped[0]?.verdict, "error");
});

test("engine uses deterministic pipeline for ollama", async () => {
  let deterministicCalls = 0;
  const engine = new ShopcheckEngine(
    { batchSize: null, singleUrl: "https://example-shop.de", provider: "ollama" },
    {
      persist: false,
      runDeterministicOllamaFlow: async ({ shopName, shopUrl }) => {
        deterministicCalls += 1;
        return {
          shopName,
          shopUrl,
          verdict: "accept",
          shopJson: {
            name: shopName,
            url: shopUrl,
            description: "Beschreibung",
            categories: [],
            contactEmail: null,
            shippingRegions: ["DE"],
            legal: {
              entityName: null,
              entityType: null,
              owners: [],
              headquartersSource: null,
            },
            headquarters: { street: "", postalCode: "", city: "", state: "", countryCode: "DE" },
            geo: { latitude: 1, longitude: 2 },
            socialMedia: {
              mastodon: null,
              bluesky: null,
              twitter: null,
              instagram: null,
              tiktok: null,
              youtube: null,
              twitch: null,
              pinterest: null,
              linkedin: null,
              facebook: null,
              threads: null,
              patreon: null,
            },
            affiliate: { infoUrl: null },
            notes: { focus: [], brandsOrProducts: [], companyPresentation: null },
          },
          rejectionMarkdown: null,
        };
      },
    },
  );

  await engine.run();

  assert.equal(deterministicCalls, 1);
  assert.equal(engine.state.status, "completed");
  assert.equal(engine.state.metrics.succeeded, 1);
});
