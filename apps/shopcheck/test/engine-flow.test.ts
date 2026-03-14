import assert from "node:assert/strict";
import test from "node:test";

import { ShopcheckEngine } from "../src/engine";

test("engine run resumes and skips already processed shop ids", async () => {
  const calls: number[] = [];
  const engine = new ShopcheckEngine(
    { batchSize: null },
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
  assert.deepEqual(engine.state.processedShopIds.sort((a, b) => a - b), [1, 2]);
  assert.equal(engine.state.total, 1);
  assert.equal(engine.state.completed, 1);
});

test("engine run reset starts from scratch", async () => {
  const calls: number[] = [];
  const engine = new ShopcheckEngine(
    { batchSize: null },
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
