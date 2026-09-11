import assert from "node:assert/strict";
import test from "node:test";
import { createEmptyState, createRoutine, createRoutineWithWeekdays, validateState,
  addExerciseToRoutineDay, updateRoutineExercisePlan, startSessionFromRoutineDay,
  computeMuscleVolume, exercisePersonalRecords, addSetToExercise, completeSession,
  skipPlannedSet, pendingPlannedSets, duplicateSet, updateSet, guidedPlanDeviation } from "../core.js";

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

test("la desviación ofrece cambios en ambos sentidos sin mutar el plan ni confundir un rango válido", () => {
  const plan = { routineExerciseId: "re", plannedSets: 3, repMin: 8, repMax: 12, targetLoadKg: 50 };
  const actual = { status: "completed", planOrder: 1, setType: "effective", reps: 10, loadKg: 50 };
  assert.equal(guidedPlanDeviation(plan, actual), null);
  assert.deepEqual(guidedPlanDeviation(plan, { ...actual, reps: 6, loadKg: 40 }), { targetLoadKg: 40, repMin: 6, repMax: 6 });
  assert.deepEqual(guidedPlanDeviation(plan, { ...actual, reps: 15, loadKg: 60 }), { targetLoadKg: 60, repMin: 15, repMax: 15 });
  assert.deepEqual(guidedPlanDeviation(plan, { ...actual, loadKg: 60 }), { targetLoadKg: 60 });
  assert.equal(guidedPlanDeviation(plan, { ...actual, setType: "warmup", loadKg: 20 }), null);
  assert.equal(guidedPlanDeviation(plan, { ...actual, status: "skipped" }), null);
  assert.equal(guidedPlanDeviation({}, actual), null);
  assert.equal(plan.targetLoadKg, 50);
});

test("calibrar propone solo el peso observado, incluyendo cero, sin adivinar uno inicial", () => {
  const plan = { routineExerciseId: "first", repMin: 8, repMax: 12, targetLoadKg: null };
  const actual = { status: "completed", planOrder: 1, setType: "effective", reps: 8, loadKg: null };
  assert.equal(guidedPlanDeviation(plan, actual), null);
  assert.deepEqual(guidedPlanDeviation(plan, { ...actual, loadKg: 0 }), { targetLoadKg: 0 });
  assert.deepEqual(guidedPlanDeviation(plan, { ...actual, loadKg: 22.5 }), { targetLoadKg: 22.5 });
  assert.equal(plan.targetLoadKg, null);
});

test("anular no completa: las series omitidas no cuentan y cada hueco del plan se resuelve una vez", () => {
  const state = createEmptyState();
  const routine = createRoutineWithWeekdays(state, "Guiada", [1], { mode: "guided" });
  const day = routine.days[0];
  addExerciseToRoutineDay(state, routine.id, day.id, "Press", { plannedSets: 3, repMin: 8, repMax: 12, targetLoadKg: 50 });
  const session = startSessionFromRoutineDay(state, routine.id, day.id);
  const ex = session.exercises[0];
  const skipped = skipPlannedSet(state, session.id, ex.id, 1);
  assert.equal(skipped.status, "skipped");
  assert.equal(skipped.completedAt, null);
  assert.equal(computeMuscleVolume(state).effectiveSets, 0);
  assert.equal(exercisePersonalRecords(state, ex.exerciseId).heaviestSet, null);
  assert.equal(validateState(state), null);
  assert.deepEqual(pendingPlannedSets(ex), [2, 3]);
  assert.throws(() => completeSession(state, session.id), /serie/i);
  assert.throws(() => skipPlannedSet(state, session.id, ex.id, 1), /resuelta/i);
  assert.throws(() => skipPlannedSet(state, session.id, ex.id, 4), /plan/i);
  assert.throws(() => duplicateSet(state, session.id, ex.id, skipped.id), /anulada/i);
  assert.throws(() => updateSet(state, session.id, ex.id, skipped.id, { reps: 10 }), /anulada/i);
  addSetToExercise(state, session.id, ex.id, { reps: 8, loadKg: 40, planOrder: 2 });
  assert.deepEqual(pendingPlannedSets(ex), [3]);
  assert.throws(() => addSetToExercise(state, session.id, ex.id, { reps: 8, planOrder: 2 }), /resuelta/i);
  assert.equal(computeMuscleVolume(state).effectiveSets, 1);
  assert.equal(exercisePersonalRecords(state, ex.exerciseId).heaviestSet.loadKg, 40);
  completeSession(state, session.id);
  assert.throws(() => skipPlannedSet(state, session.id, ex.id, 3), /editar/i);
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
