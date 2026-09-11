import assert from "node:assert/strict";
import test from "node:test";
import { createEmptyState, createRoutine, createRoutineWithWeekdays, validateState,
  addExerciseToRoutineDay, updateRoutineExercisePlan, startSessionFromRoutineDay,
  computeMuscleVolume, exercisePersonalRecords, addSetToExercise, completeSession,
  skipPlannedSet, pendingPlannedSets, duplicateSet, updateSet, guidedPlanDeviation,
  guidedExerciseDeviation, setSessionExerciseNote, removeExerciseFromRoutine,
  restoreLastTrainingUndo, replaceSessionExerciseForToday, seedDemoData, removeDemoData } from "../core.js";

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

test("la demo guiada muestra ambos modos, anuladas, calibración y progreso; quitarla restaura los datos", () => {
  const state = createEmptyState();
  const real = createRoutineWithWeekdays(state, "Real", [0]);
  addExerciseToRoutineDay(state, real.id, real.days[0].id, "Press real", { exerciseId: "dataset-0025" });
  const before = structuredClone(state);
  seedDemoData(state, { now: "2026-09-11T10:00:00.000Z" });
  assert.equal(state.meta.demoSeedVersion, 3);
  assert.equal(validateState(state), null);
  assert.deepEqual(new Set(state.training.routines.filter(r => r.isDemo).map(r => r.mode)), new Set(["log", "guided"]));
  const all = state.training.routines.flatMap(r => r.days.flatMap(d => d.exercises));
  assert.ok(all.some(e => e.targetLoadKg === null));
  assert.ok(all.every(e => !("demoLoad" in e)));
  assert.ok(state.training.sessions.some(s => s.exercises.some(e => e.sets.some(set => set.status === "skipped"))));
  const recentLimit = new Date("2026-09-04T10:00:00.000Z");
  assert.ok(state.training.sessions.some(s => new Date(s.endedAt) >= recentLimit
    && s.exercises.some(e => e.sets.some(set => set.status === "skipped"))));
  const loads = state.training.sessions.flatMap(s => s.exercises.filter(e => e.exerciseId === "dataset-0025").flatMap(e => e.sets.filter(set => set.status === "completed" && set.setType === "effective").map(set => set.loadKg)));
  assert.ok(new Set(loads).size > 3);
  removeDemoData(state);
  assert.deepEqual(state, before);
});

test("la nota del ejercicio pertenece a la sesión y no modifica la nota del plan", () => {
  const state = createEmptyState();
  const routine = createRoutineWithWeekdays(state, "Guiada", [1], { mode: "guided" });
  const day = routine.days[0];
  const plan = addExerciseToRoutineDay(state, routine.id, day.id, "Press", {
    plannedSets: 3, repMin: 8, repMax: 12, targetLoadKg: 50, note: "Pausa de 2 s",
  });
  const session = startSessionFromRoutineDay(state, routine.id, day.id);
  const exercise = session.exercises[0];

  setSessionExerciseNote(state, session.id, exercise.id, "  Hombro estable y agarre cómodo  ");
  assert.equal(exercise.sessionNote, "Hombro estable y agarre cómodo");
  assert.equal(exercise.planNote, "Pausa de 2 s");
  assert.equal(plan.note, "Pausa de 2 s");
  assert.equal(validateState(state), null);
  assert.throws(() => setSessionExerciseNote(state, session.id, exercise.id, "x".repeat(301)), /300/);
});

test("la desviación guiada agrupa las series efectivas y no reacciona a una sola aproximación", () => {
  const exercise = {
    routineExerciseId: "routine-exercise-1",
    plannedSets: 3,
    repMin: 8,
    repMax: 12,
    targetLoadKg: 50,
    sets: [
      { status: "completed", planOrder: 1, setType: "warmup", reps: 20, loadKg: 20 },
      { status: "completed", planOrder: 2, setType: "effective", reps: 7, loadKg: 47.5 },
      { status: "completed", planOrder: 3, setType: "effective", reps: 9, loadKg: 52.5 },
      { status: "skipped", planOrder: 4 },
    ],
  };
  assert.deepEqual(guidedExerciseDeviation(exercise), {
    targetLoadKg: 52.5,
    repMin: 7,
    repMax: 9,
    observedSetCount: 2,
  });
  assert.equal(guidedExerciseDeviation({ ...exercise, sets: exercise.sets.slice(0, 1) }), null);
  assert.equal(exercise.targetLoadKg, 50);
});

test("eliminar un ejercicio de una rutina conserva el historial y deshacer restaura todas sus posiciones", () => {
  const state = createEmptyState();
  const routine = createRoutineWithWeekdays(state, "Torso", [1], { mode: "guided" });
  const firstDay = routine.days[0];
  const secondDay = structuredClone(firstDay);
  secondDay.id = "day-second";
  secondDay.name = "Variante";
  secondDay.order = 2;
  secondDay.weekdays = [];
  secondDay.exercises = [];
  routine.days.push(secondDay);
  const first = addExerciseToRoutineDay(state, routine.id, firstDay.id, "Press", {
    exerciseId: "press", plannedSets: 3, repMin: 8, repMax: 12, targetLoadKg: 50,
  });
  const second = addExerciseToRoutineDay(state, routine.id, secondDay.id, "Press", {
    exerciseId: "press", plannedSets: 4, repMin: 6, repMax: 8, targetLoadKg: 55,
  });
  const session = startSessionFromRoutineDay(state, routine.id, firstDay.id);
  const activeExercise = session.exercises[0];
  addSetToExercise(state, session.id, activeExercise.id, {
    planOrder: 1, reps: 10, loadKg: 50, setType: "effective",
  });
  const historical = structuredClone(session);
  historical.id = "historical-session";
  historical.status = "completed";
  historical.endedAt = "2026-09-01T11:00:00.000Z";
  state.training.sessions.push(historical);

  const removed = removeExerciseFromRoutine(state, routine.id, "press", { sessionId: session.id });
  assert.equal(removed.placements.length, 2);
  assert.deepEqual(routine.days.map(day => day.exercises.length), [0, 0]);
  assert.equal(activeExercise.pendingPlanRemoved, true);
  assert.equal(activeExercise.sets.length, 1);
  assert.deepEqual(state.training.sessions.find(item => item.id === historical.id), historical);
  assert.deepEqual(pendingPlannedSets(activeExercise), []);
  assert.equal(validateState(state), null);

  restoreLastTrainingUndo(state);
  assert.deepEqual(routine.days.map(day => day.exercises.map(item => item.id)), [[first.id], [second.id]]);
  assert.equal(activeExercise.pendingPlanRemoved, undefined);
  assert.deepEqual(pendingPlannedSets(activeExercise), [2, 3]);
  assert.equal(validateState(state), null);
});

test("eliminar un ejercicio sin trabajo lo retira de la sesión activa y deshacer lo devuelve", () => {
  const state = createEmptyState();
  const routine = createRoutineWithWeekdays(state, "Torso", [1], { mode: "guided" });
  const day = routine.days[0];
  addExerciseToRoutineDay(state, routine.id, day.id, "Press", {
    exerciseId: "press", plannedSets: 3, repMin: 8, repMax: 12, targetLoadKg: 50,
  });
  const session = startSessionFromRoutineDay(state, routine.id, day.id);
  removeExerciseFromRoutine(state, routine.id, "press", { sessionId: session.id });
  assert.equal(session.exercises.length, 0);
  restoreLastTrainingUndo(state);
  assert.equal(session.exercises[0].exerciseId, "press");
});

test("una sustitución solo de hoy no modifica el plan y permite eliminar el ejercicio original", () => {
  const state = createEmptyState();
  const routine = createRoutineWithWeekdays(state, "Torso", [1], { mode: "guided" });
  const day = routine.days[0];
  addExerciseToRoutineDay(state, routine.id, day.id, "Press", {
    exerciseId: "press", plannedSets: 3, repMin: 8, repMax: 12, targetLoadKg: 50,
  });
  const session = startSessionFromRoutineDay(state, routine.id, day.id);
  const exercise = session.exercises[0];
  replaceSessionExerciseForToday(state, session.id, exercise.id, "Press con mancuernas", {
    exerciseId: "dumbbell-press",
  });
  addSetToExercise(state, session.id, exercise.id, {
    planOrder: 1, reps: 15, loadKg: 30, setType: "effective",
  });

  assert.equal(guidedExerciseDeviation(exercise), null);
  removeExerciseFromRoutine(state, routine.id, exercise.substitutedFrom.exerciseId, { sessionId: session.id });
  assert.equal(day.exercises.length, 0);
  assert.equal(exercise.exerciseId, "dumbbell-press");
  assert.equal(exercise.sets[0].loadKg, 30);
  assert.equal(exercise.pendingPlanRemoved, true);
  assert.deepEqual(pendingPlannedSets(exercise), []);

  restoreLastTrainingUndo(state);
  assert.equal(day.exercises[0].exerciseId, "press");
  assert.equal(exercise.pendingPlanRemoved, undefined);
  assert.deepEqual(pendingPlannedSets(exercise), [2, 3]);
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
