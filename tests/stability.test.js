import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

function loadServiceWorker({ oldCaches = [] } = {}) {
  const source = fs.readFileSync(new URL("../service-worker.js", import.meta.url), "utf8");
  const listeners = {};
  const opened = [];
  const deleted = [];
  const puts = [];
  const cache = {
    addAll: async (assets) => { opened.push({ name: "assets", assets }); },
    put: async (request) => { puts.push(request); },
  };
  const caches = {
    open: async (name) => {
      opened.push({ name });
      return cache;
    },
    keys: async () => oldCaches,
    delete: async (name) => { deleted.push(name); return true; },
    match: async () => undefined,
  };
  class FakeRequest {
    constructor(request, options = {}) {
      Object.assign(this, request, options);
    }
  }
  const context = {
    caches,
    fetch: async () => ({ ok: true, clone: () => ({}) }),
    Request: FakeRequest,
    self: {
      addEventListener: (name, handler) => { listeners[name] = handler; },
      clients: { claim: async () => {} },
      skipWaiting: async () => {},
    },
  };
  vm.runInNewContext(source, context);
  return { listeners, opened, deleted, puts };
}

test("actualiza desde una caché v1 y precarga el shell coherente v10", async () => {
  const worker = loadServiceWorker({ oldCaches: ["aurum-fit-shell-v1", "aurum-fit-shell-v9"] });
  let activation;
  worker.listeners.activate({ waitUntil: (promise) => { activation = promise; } });
  await activation;
  assert.deepEqual(worker.deleted, ["aurum-fit-shell-v1", "aurum-fit-shell-v9"]);

  let installation;
  worker.listeners.install({ waitUntil: (promise) => { installation = promise; } });
  await installation;
  const precache = worker.opened.find((entry) => entry.assets);
  assert.ok(precache.assets.includes("./app.js?v=10"));
  assert.ok(precache.assets.includes("./core.js?v=10"));
  assert.ok(precache.assets.includes("./styles.css?v=10"));
});
test("prioriza la red para documentos y actualiza la caché activa", async () => {
  const worker = loadServiceWorker();
  let responsePromise;
  worker.listeners.fetch({
    request: { method: "GET", mode: "navigate", destination: "document" },
    respondWith: (promise) => { responsePromise = promise; },
  });
  const response = await responsePromise;
  assert.equal(response.ok, true);
  assert.equal(worker.puts.length, 1);
});
