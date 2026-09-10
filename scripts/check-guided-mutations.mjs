import fs from "node:fs";
import { spawnSync } from "node:child_process";

// Importar copias en memoria permite romper el modelo deliberadamente sin
// tocar el checkout ni arriesgar los cambios de otra persona.
const mutations = [
  ["modo", 'routine.mode ??= "log";', 'routine.mode ??= "guided";'],
  ["peso nulo", 'note, targetLoadKg: target.value };', 'note, targetLoadKg: Number(target.value) };'],
];
const core = fs.readFileSync(new URL("../core.js", import.meta.url), "utf8");
const tests = fs.readFileSync(new URL("../tests/guided.test.js", import.meta.url), "utf8");
for (const [name, before, after] of mutations) {
  if (!core.includes(before)) throw new Error(`Mutación obsoleta: ${name}`);
  const url = `data:text/javascript;base64,${Buffer.from(core.replace(before, after)).toString("base64")}`;
  const source = tests.replace('"../core.js"', JSON.stringify(url));
  const run = spawnSync(process.execPath, ["--input-type=module"], { input: source, encoding: "utf8" });
  if (run.status !== 1 || !run.stdout.includes("fail 1")) {
    console.error(run.stdout.slice(-3000), run.stderr.slice(-1000));
    throw new Error(`La mutación ${name} no produjo exactamente una prueba roja.`);
  }
  console.log(`Detectada: ${name} (1 prueba roja).`);
}
