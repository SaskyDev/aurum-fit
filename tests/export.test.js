import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("el contrato de exportación genera JSON y dispara la descarga", () => {
  const source = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  assert.match(source, /new Blob\(\[JSON\.stringify\(state, null, 2\)\]/);
  assert.match(source, /type: "application\/json"/);
  assert.match(source, /link\.download = `aurum-fit-v2-\$\{today\}\.json`/);
  assert.match(source, /link\.click\(\)/);
});
