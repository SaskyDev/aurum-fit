import fs from "node:fs";
import { spawnSync } from "node:child_process";

// Importar copias en memoria permite romper el modelo deliberadamente sin
// tocar el checkout ni arriesgar los cambios de otra persona.
const mutations = [
  ["modo", 'routine.mode ??= "log";', 'routine.mode ??= "guided";'],
  ["peso nulo", 'note, targetLoadKg: target.value };', 'note, targetLoadKg: Number(target.value) };'],
  ["herencia", 'plannedSets: guided ? routineExercise.plannedSets : 0,', 'plannedSets: 0,'],
  ["anulación", 'planOrder, status: "skipped", completedAt: null', 'planOrder, status: "completed", completedAt: null'],
  ["desviación", 'return Object.keys(changes).length ? changes : null;', 'return null;'],
  ["calibración", 'if (actual.loadKg !== plan.targetLoadKg)', 'if (plan.targetLoadKg !== null && actual.loadKg !== plan.targetLoadKg)'],
];
const core = fs.readFileSync(new URL("../core.js", import.meta.url), "utf8");
const tests = fs.readFileSync(new URL("../tests/guided.test.js", import.meta.url), "utf8");
for (const [name, before, after] of mutations) {
  if (!core.includes(before)) throw new Error(`Mutación obsoleta: ${name}`);
  const url = `data:text/javascript;base64,${Buffer.from(core.replace(before, after)).toString("base64")}`;
  const source = tests.replace('"../core.js"', JSON.stringify(url));
  const run = spawnSync(process.execPath, ["--input-type=module"], { input: source, encoding: "utf8" });
  const failures = run.stdout.match(/fail (\d+)/)?.[1];
  if (run.status !== 1 || !(Number(failures) > 0)) {
    console.error(run.stdout.slice(-3000), run.stderr.slice(-1000));
    throw new Error(`La mutación ${name} no produjo pruebas rojas.`);
  }
  console.log(`Detectada: ${name} (${failures} pruebas rojas).`);
}
