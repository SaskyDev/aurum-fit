import assert from "node:assert/strict";
import test from "node:test";
import { createEmptyState, createRoutine, createRoutineWithWeekdays, validateState,
  addExerciseToRoutineDay, updateRoutineExercisePlan, startSessionFromRoutineDay,
  computeMuscleVolume, exercisePersonalRecords, addSetToExercise, completeSession } from "../core.js";

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

test("la sesión guiada hereda una foto del plan, no series hechas, y conserva el historial", () => {
  const state = createEmptyState();
  const routine = createRoutineWithWeekdays(state, "Guiada", [1], { mode: "guided" });
  const day = routine.days[0];
  const plan = { plannedSets: 3, repMin: 8, repMax: 12, targetLoadKg: 50, note: "Pausa" };
  const item = addExerciseToRoutineDay(state, routine.id, day.id, "Press", plan);
  const session = startSessionFromRoutineDay(state, routine.id, day.id);
  const ex = session.exercises[0];
  assert.deepEqual([ex.plannedSets, ex.repMin, ex.repMax, ex.targetLoadKg, ex.planNote], [3, 8, 12, 50, "Pausa"]);
  assert.equal(ex.routineExerciseId, item.id);
  assert.deepEqual(ex.sets, []);
  assert.equal(computeMuscleVolume(state).effectiveSets, 0);
  assert.equal(exercisePersonalRecords(state, ex.exerciseId).heaviestSet, null);
  assert.throws(() => completeSession(state, session.id), /serie/i);
  addSetToExercise(state, session.id, ex.id, { reps: 8, loadKg: 50, rir: 2 });
  completeSession(state, session.id);
  const snapshot = JSON.stringify(session);
  updateRoutineExercisePlan(state, routine.id, day.id, item.id, { ...plan, targetLoadKg: 60, plannedSets: 4 });
  assert.equal(JSON.stringify(session), snapshot);
  assert.equal(validateState(state), null);
});

test("el plan guiado exige series y repes pero distingue peso vacío de cero", () => {
  const state = createEmptyState();
  const routine = createRoutineWithWeekdays(state, "Guiada", [1], { mode: "guided" });
  const day = routine.days[0];
  const add = (name, plan) => addExerciseToRoutineDay(state, routine.id, day.id, name, plan);
  assert.throws(() => add("Sin plan", {}), /series/i);
  const item = add("Press", { plannedSets: 3, repMin: 8, repMax: 12 });
  assert.equal(item.targetLoadKg, null);
  const update = (weight) => updateRoutineExercisePlan(state, routine.id, day.id, item.id,
    { plannedSets: 3, repMin: 8, repMax: 12, targetLoadKg: weight });
  update(0);
  assert.equal(item.targetLoadKg, 0);
  update(22.5);
  assert.equal(item.targetLoadKg, 22.5);
  update("");
  assert.equal(item.targetLoadKg, null);
  for (const weight of [-1, 2001, Infinity, "abc"]) assert.throws(() => update(weight), /peso/i);
  assert.equal(validateState(state), null);
  item.targetLoadKg = -1;
  assert.match(validateState(state), /rutina/i);
  item.targetLoadKg = null;
  delete item.repMin;
  assert.match(validateState(state), /rutina/i);
});
