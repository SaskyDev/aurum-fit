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
  const fetched = [];
  const legacyCacheHits = [];
  const cache = {
    addAll: async (assets) => { opened.push({ name: "assets", assets }); },
    put: async (request, response) => { puts.push({ request, response }); },
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
      if (typeof request === "string") this.url = request;
      else Object.assign(this, request);
      Object.assign(this, options);
    }
  }
  const legacyWorker = {
    cache: new Map([
      ["./index.html", "v9"],
      ["./styles.css?v=10", "v9"],
      ["./app.js?v=10", "v9"],
      ["./core.js?v=10", "v9"],
      ["./data/exercises.es.json", "v9"],
    ]),
    intercept(request) {
      const responseVersion = this.cache.get(request.url);
      if (!responseVersion) return null;
      legacyCacheHits.push(request.url);
      return {
        ok: true,
        version: responseVersion,
        clone() { return this; },
      };
    },
  };
  const fetch = async (request) => {
    fetched.push(request);
    const intercepted = legacyWorker.intercept(request);
    if (intercepted) return intercepted;
    const url = String(request.url ?? "");
    return {
      ok: true,
      version: url.includes("?v=12") ? "v12" : "v9",
      clone() { return this; },
    };
  };
  const context = {
    caches,
    fetch,
    Request: FakeRequest,
    self: {
      addEventListener: (name, handler) => { listeners[name] = handler; },
      clients: { claim: async () => {} },
      skipWaiting: async () => {},
    },
  };
  vm.runInNewContext(source, context);
  return { listeners, opened, deleted, puts, fetched, legacyCacheHits };
}

test("actualiza desde una caché v9 y precarga un shell coherente v12", async () => {
  const worker = loadServiceWorker({ oldCaches: ["aurum-fit-shell-v1", "aurum-fit-shell-v9"] });
  let activation;
  worker.listeners.activate({ waitUntil: (promise) => { activation = promise; } });
  await activation;
  assert.deepEqual(worker.deleted, ["aurum-fit-shell-v1", "aurum-fit-shell-v9"]);

  let installation;
  worker.listeners.install({ waitUntil: (promise) => { installation = promise; } });
  await installation;
  assert.equal(worker.fetched.length, 7);
  assert.ok(worker.fetched.every((request) => request.url.includes("?v=12")));
  assert.deepEqual(worker.legacyCacheHits, []);
  assert.ok(worker.puts.every(({ response }) => response.version === "v12"));
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

test("el submit de serie conserva el bloqueo aunque renderice otro formulario", () => {
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /const pendingSetSubmissions = new Set\(\)/);
  assert.match(app, /pendingSetSubmissions\.has\(key\)/);
  assert.match(app, /const submissionKey = `\$\{session\.id\}:\$\{sessionExercise\.id\}`/);
  assert.match(app, /Serie guardada automáticamente\."\), submissionKey\)/);
});

test("Importar deja el input fuera del foco y la actualización offline no silencia fallos online", () => {
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /id="importFile"[\s\S]*tabindex="-1"[\s\S]*aria-hidden="true"[\s\S]*hidden/);
  assert.match(app, /navigator\.serviceWorker\.controller && networkFailure/);
  assert.match(app, /fetch\("service-worker\.js", \{ cache: "no-store" \}\)/);
  assert.match(app, /console\.error\("No se pudo actualizar el service worker\./);
  assert.doesNotMatch(app, /swReloadKey/);
});
