import assert from "node:assert/strict";
import test from "node:test";

import { ShopcheckEngine } from "../src/engine";

test("engine run resumes and skips already processed shop ids", async () => {
  const calls: number[] = [];
  const engine = new ShopcheckEngine(
    { batchSize: null, provider: "claude" },
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
  assert.equal(engine.state.provider, "claude");
  assert.deepEqual(engine.state.processedShopIds.sort((a, b) => a - b), [1, 2]);
  assert.equal(engine.state.total, 1);
  assert.equal(engine.state.completed, 1);
});

test("engine run reset starts from scratch", async () => {
  const calls: number[] = [];
  const engine = new ShopcheckEngine(
    { batchSize: null, provider: "claude" },
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
    { batchSize: null, provider: null },
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

test("engine chooses provider interactively when not forced by cli", async () => {
  const engine = new ShopcheckEngine(
    { batchSize: null, provider: null },
    {
      persist: false,
      isInteractive: () => true,
      chooseProvider: async () => "ollama",
      loadShops: async () => [],
      chooseBatchSize: async () => null,
    },
  );

  await engine.run();

  assert.equal(engine.state.provider, "ollama");
  assert.equal(engine.state.model, "qwen3.5:397b-cloud");
});
