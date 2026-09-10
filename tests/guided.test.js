import assert from "node:assert/strict";
import test from "node:test";
import { createEmptyState, createRoutine, createRoutineWithWeekdays, validateState } from "../core.js";

test("modo de rutina: compatibilidad log, creación guiada y rechazo de valores desconocidos", () => {
  const state = createEmptyState();
  const legacy = createRoutine(state, "Antigua");
  delete legacy.mode;
  assert.equal(validateState(state), null);
  assert.equal(legacy.mode, "log");
  assert.equal(createRoutine(state, "Nueva").mode, "log");
  const guided = createRoutineWithWeekdays(state, "Guiada", [1], { mode: "guided" });
  assert.equal(guided.mode, "guided");
  assert.throws(() => createRoutine(state, "Inválida", { mode: "other" }), /modo/i);
  guided.mode = "other";
  assert.match(validateState(state), /rutina/i);
});
