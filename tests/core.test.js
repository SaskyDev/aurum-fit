import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  BACKUP_STORE_KEY,
  LEGACY_STORE_KEY,
  STORE_KEY,
  addExerciseToRoutineDay,
  addExerciseToSession,
  addRoutineDay,
  addSetToExercise,
  completeSession,
  createEmptyState,
  createRoutine,
  deleteSet,
  findLastComparableExercise,
  loadAppState,
  moveRoutineDay,
  moveRoutineExercise,
  parseImportPayload,
  persistState,
  removeExerciseFromRoutineDay,
  restoreLastDeletedSet,
  replaceSessionExerciseForToday,
  removeDemoData,
  seedDemoData,
  setSessionExerciseSkipped,
  setRoutineDayWeekday,
  setSuggestedRoutineDay,
  startFreeSession,
  startSessionFromRoutineDay,
  updateSet,
  updateRoutineExercisePlan,
  validateState,
  validateSetInput,
} from "../core.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    values,
  };
}

function stateWithActiveSession() {
  const state = createEmptyState({ now: "2026-07-24T08:00:00.000Z" });
  const session = startFreeSession(state, {
    id: "session-1",
    now: "2026-07-24T08:10:00.000Z",
  });
  const exercise = addExerciseToSession(state, session.id, "Press banca", {
    exerciseId: "exercise-1",
    sessionExerciseId: "session-exercise-1",
  });
  return { state, session, exercise };
}

test("migra una copia del estado antiguo sin borrarlo", () => {
  const legacy = JSON.stringify({
    days: {
      "2026-07-23": {
        foods: [{ name: "Arroz", calories: 200 }],
        workouts: [{ exercise: "Sentadilla", sets: 3, reps: "10,9,8" }],
      },
    },
  });
  const storage = memoryStorage({ [LEGACY_STORE_KEY]: legacy });

  const result = loadAppState(storage, "2026-07-24T09:00:00.000Z");

  assert.deepEqual(result.state.legacy.days["2026-07-23"].foods[0].name, "Arroz");
  assert.equal(storage.getItem(LEGACY_STORE_KEY), legacy);
  assert.ok(storage.getItem(STORE_KEY));
  assert.match(result.notices[0], /copia original sigue intacta/i);
});

test("guarda una copia previa antes de sustituir el estado v2", () => {
  const storage = memoryStorage();
  const first = createEmptyState({ now: "2026-07-24T09:00:00.000Z" });
  storage.setItem(STORE_KEY, JSON.stringify(first));
  const next = structuredClone(first);
  next.owner.displayName = "Alex";

  persistState(storage, next, "2026-07-24T09:01:00.000Z");

  assert.deepEqual(JSON.parse(storage.getItem(BACKUP_STORE_KEY)), first);
  assert.equal(JSON.parse(storage.getItem(STORE_KEY)).owner.displayName, "Alex");
});

test("abre en memoria y conserva el legado si el almacenamiento está lleno", () => {
  const legacy = JSON.stringify({
    days: {
      "2026-07-23": {
        foods: [{ name: "Arroz", calories: 200 }],
        workouts: [],
      },
    },
  });
  const storage = {
    getItem: (key) => (key === LEGACY_STORE_KEY ? legacy : null),
    setItem: () => {
      const error = new Error("Quota exceeded");
      error.name = "QuotaExceededError";
      throw error;
    },
  };

  const result = loadAppState(storage, "2026-07-24T09:00:00.000Z");

  assert.equal(result.state.legacy.days["2026-07-23"].foods[0].name, "Arroz");
  assert.equal(result.persistenceAvailable, false);
  assert.match(result.notices.join(" "), /no se han borrado/i);
  assert.match(result.notices.join(" "), /exporta una copia/i);
  assert.equal(storage.getItem(LEGACY_STORE_KEY), legacy);
});

test("explica un fallo de cuota al guardar y mantiene el estado anterior", () => {
  const previous = createEmptyState({ now: "2026-07-24T09:00:00.000Z" });
  const previousRaw = JSON.stringify(previous);
  const storage = {
    getItem: (key) => (key === STORE_KEY ? previousRaw : null),
    setItem: () => {
      const error = new Error("Quota exceeded");
      error.name = "QuotaExceededError";
      throw error;
    },
  };
  const next = structuredClone(previous);
  next.owner.displayName = "Alex";

  assert.throws(
    () => persistState(storage, next, "2026-07-24T09:01:00.000Z"),
    /estado anterior sigue intacto.*exporta una copia/i,
  );
  assert.equal(storage.getItem(STORE_KEY), previousRaw);
});

test("rechaza valores vacíos, extremos y contradictorios en una serie", () => {
  assert.match(validateSetInput({ reps: "" }).error, /número/i);
  assert.match(validateSetInput({ reps: 8.5 }).error, /entero/i);
  assert.match(validateSetInput({ reps: 8, loadKg: -1 }).error, /peso/i);
  assert.match(validateSetInput({ reps: 8, loadKg: 3000 }).error, /peso/i);
  assert.match(validateSetInput({ reps: 8, rpe: 10.2 }).error, /RPE/i);
  assert.match(validateSetInput({ reps: 8, rir: 6 }).error, /RIR/i);
  assert.match(validateSetInput({ reps: 8, rir: 1.5 }).error, /RIR/i);
  assert.match(validateSetInput({ reps: 8, note: "x".repeat(301) }).error, /nota/i);
});

test("guarda RIR de 0 a 5 y mantiene compatibilidad con RPE antiguo", () => {
  const { state, session, exercise } = stateWithActiveSession();
  const set = addSetToExercise(state, session.id, exercise.id, { reps: 8, loadKg: 80, rir: 2 });
  assert.equal(set.rir, 2);
  assert.equal(set.rpe, null);
  const legacySet = addSetToExercise(state, session.id, exercise.id, { reps: 8, loadKg: 80, rpe: 8 });
  assert.equal(legacySet.rpe, 8);
  assert.equal(legacySet.rir, null);
});

test("crea, edita, borra y deshace series independientes", () => {
  const { state, session, exercise } = stateWithActiveSession();
  const workoutSet = addSetToExercise(
    state,
    session.id,
    exercise.id,
    { reps: 10, loadKg: 60, rpe: 7, isWarmup: false, note: "<img src=x>" },
    { id: "set-1", now: "2026-07-24T08:15:00.000Z" },
  );

  assert.equal(workoutSet.loadKg, 60);
  assert.equal(workoutSet.note, "<img src=x>");
  updateSet(
    state,
    session.id,
    exercise.id,
    workoutSet.id,
    { reps: 9, loadKg: 62.5, rpe: 7.5, isWarmup: false, note: "Corregida" },
  );
  assert.equal(exercise.sets[0].reps, 9);

  deleteSet(state, session.id, exercise.id, workoutSet.id);
  assert.equal(exercise.sets.length, 0);
  restoreLastDeletedSet(state);
  assert.equal(exercise.sets[0].id, "set-1");
  assert.equal(state.training.undo, null);
});

test("recupera la última referencia solo desde una sesión finalizada comparable", () => {
  const { state, session, exercise } = stateWithActiveSession();
  addSetToExercise(
    state,
    session.id,
    exercise.id,
    { reps: 10, loadKg: 60 },
    { id: "set-1", now: "2026-07-24T08:15:00.000Z" },
  );
  completeSession(state, session.id, "2026-07-24T09:00:00.000Z");

  const nextSession = startFreeSession(state, {
    id: "session-2",
    now: "2026-07-25T08:10:00.000Z",
  });
  const nextExercise = addExerciseToSession(state, nextSession.id, "  PRESS   BANCA  ", {
    sessionExerciseId: "session-exercise-2",
  });
  const reference = findLastComparableExercise(state, nextExercise.exerciseId, nextSession.id);

  assert.equal(nextExercise.exerciseId, "exercise-1");
  assert.equal(reference.sets[0].loadKg, 60);
  assert.equal(reference.date, "2026-07-24T09:00:00.000Z");
});

test("impide duplicar un ejercicio en una sesión aunque se añada dos veces rápido", () => {
  const { state, session } = stateWithActiveSession();

  assert.throws(
    () => addExerciseToSession(state, session.id, "  PRESS   BANCA  ", {
      exerciseId: "exercise-1",
      sessionExerciseId: "session-exercise-duplicate",
    }),
    /ya está en la sesión/i,
  );
  assert.equal(session.exercises.length, 1);
});

test("no permite finalizar una sesión vacía", () => {
  const state = createEmptyState();
  const session = startFreeSession(state, { id: "session-empty" });
  assert.throws(() => completeSession(state, session.id), /al menos una serie/i);
});

test("la importación acepta v2 y legado, y rechaza estructuras ajenas", () => {
  const state = createEmptyState();
  assert.equal(parseImportPayload(JSON.stringify(state)).schemaVersion, 2);
  assert.deepEqual(
    parseImportPayload(JSON.stringify({ days: { "2026-07-24": { foods: [] } } }))
      .legacy.days["2026-07-24"].foods,
    [],
  );
  assert.throws(() => parseImportPayload("{mal"), /JSON válido/i);
  assert.throws(() => parseImportPayload(JSON.stringify({ admin: true })), /compatible/i);

  const manipulated = createEmptyState();
  manipulated.training.sessions.push({
    id: "fake",
    userId: "local-user",
    status: "completed",
    source: { type: "free", label: "Manipulada" },
    startedAt: "2026-07-24T10:00:00.000Z",
    endedAt: null,
    exercises: [],
  });
  assert.throws(
    () => parseImportPayload(JSON.stringify(manipulated)),
    /fecha de fin/i,
  );
});

test("normaliza listas ausentes del prototipo sin tocar el origen", () => {
  const legacy = { days: { "2026-07-24": { foods: "no-es-lista", notes: "<script>" } } };
  const storage = memoryStorage({ [LEGACY_STORE_KEY]: JSON.stringify(legacy) });
  const result = loadAppState(storage);

  assert.deepEqual(result.state.legacy.days["2026-07-24"].foods, []);
  assert.deepEqual(result.state.legacy.days["2026-07-24"].workouts, []);
  assert.equal(result.state.legacy.days["2026-07-24"].notes, "<script>");
  assert.equal(storage.getItem(LEGACY_STORE_KEY), JSON.stringify(legacy));
});

test("el catálogo completo conserva trazabilidad, deduplica y excluye multimedia", () => {
  const rawCatalog = fs.readFileSync(new URL("../data/exercises.es.json", import.meta.url), "utf8");
  const catalog = JSON.parse(rawCatalog);
  const forbiddenFields = ["image", "gif_url", "media_id", "attribution"];

  assert.equal(catalog.exercises.length, 1317);
  assert.equal(new Set(catalog.exercises.map((exercise) => exercise.id)).size, 1317);
  assert.ok(Buffer.byteLength(rawCatalog) < 4_000_000);
  assert.equal(catalog.exercises.some((exercise) => exercise.id === "dataset-3211"), false);
  assert.equal(catalog.exercises.some((exercise) => exercise.id === "dataset-0576"), true);
  assert.equal(catalog.exercises.some((exercise) => exercise.id === "dataset-0577"), false);
  assert.equal(catalog.policy.excludedRecords[0].sourceId, "3211");
  assert.equal(catalog.policy.duplicateExclusions.length, 6);
  assert.equal(catalog.audit.sourceRecords, 1324);
  assert.equal(catalog.audit.exactDuplicateGroups, 6);
  assert.match(catalog.source.commit, /^[a-f0-9]{40}$/);
  assert.equal(catalog.exercises.filter((exercise) => exercise.nameLocale === "es").length, 23);
  catalog.exercises.forEach((exercise) => {
    assert.ok(exercise.nameEs);
    assert.ok(exercise.instructionsEs);
    assert.ok(exercise.targetEs);
    assert.ok(exercise.equipmentEs);
    assert.equal(exercise.reviewStatus, "pending_professional_review");
    forbiddenFields.forEach((field) => assert.equal(field in exercise, false));
  });
});

test("crea una rutina con días y ejercicios ordenados", () => {
  const state = createEmptyState({ now: "2026-07-24T08:00:00.000Z" });
  const routine = createRoutine(state, "Torso y pierna", {
    id: "routine-1",
    now: "2026-07-24T08:01:00.000Z",
  });
  const torso = addRoutineDay(state, routine.id, "Torso", {
    id: "day-torso",
    now: "2026-07-24T08:02:00.000Z",
  });
  const pierna = addRoutineDay(state, routine.id, "Pierna", {
    id: "day-pierna",
    now: "2026-07-24T08:03:00.000Z",
  });
  const press = addExerciseToRoutineDay(state, routine.id, torso.id, "Press banca", {
    exerciseId: "exercise-press",
    routineExerciseId: "routine-exercise-press",
  });
  const row = addExerciseToRoutineDay(state, routine.id, torso.id, "Remo", {
    exerciseId: "exercise-row",
    routineExerciseId: "routine-exercise-row",
  });

  moveRoutineDay(state, routine.id, pierna.id, "up");
  moveRoutineExercise(state, routine.id, torso.id, row.id, "up");
  setSuggestedRoutineDay(state, routine.id, torso.id);

  assert.deepEqual(routine.days.map((day) => [day.name, day.order]), [
    ["Pierna", 1],
    ["Torso", 2],
  ]);
  assert.deepEqual(torso.exercises.map((exercise) => [exercise.exerciseName, exercise.order]), [
    ["Remo", 1],
    ["Press banca", 2],
  ]);
  assert.equal(routine.suggestedDayId, torso.id);
  assert.equal(press.exerciseId, "exercise-press");
});

test("inicia desde un día y conserva una copia histórica al editar la rutina", () => {
  const state = createEmptyState({ now: "2026-07-24T08:00:00.000Z" });
  const routine = createRoutine(state, "Torso-pierna", { id: "routine-1" });
  const torso = addRoutineDay(state, routine.id, "Torso", { id: "day-torso" });
  addExerciseToRoutineDay(state, routine.id, torso.id, "Press banca", {
    exerciseId: "exercise-press",
    routineExerciseId: "routine-exercise-press",
  });

  const session = startSessionFromRoutineDay(state, routine.id, torso.id, {
    id: "session-1",
    now: "2026-07-24T09:00:00.000Z",
    sessionExerciseIds: ["session-exercise-press"],
  });
  addExerciseToRoutineDay(state, routine.id, torso.id, "Remo", {
    exerciseId: "exercise-row",
    routineExerciseId: "routine-exercise-row",
  });
  moveRoutineExercise(
    state,
    routine.id,
    torso.id,
    "routine-exercise-row",
    "up",
  );
  removeExerciseFromRoutineDay(
    state,
    routine.id,
    torso.id,
    "routine-exercise-row",
  );

  assert.equal(session.source.type, "routine_day");
  assert.deepEqual(session.source.snapshot, {
    routineName: "Torso-pierna",
    routineDayName: "Torso",
  });
  assert.deepEqual(session.exercises.map((exercise) => exercise.exerciseName), ["Press banca"]);
  assert.deepEqual(torso.exercises.map((exercise) => exercise.exerciseName), ["Press banca"]);
});

test("copia series y rango previstos sin alterar una sesión ya iniciada", () => {
  const state = createEmptyState({ now: "2026-07-24T08:00:00.000Z" });
  const routine = createRoutine(state, "Empuje", { id: "routine-1" });
  const day = addRoutineDay(state, routine.id, "Push", { id: "day-push" });
  const exercise = addExerciseToRoutineDay(state, routine.id, day.id, "Press banca", {
    exerciseId: "exercise-press",
    routineExerciseId: "routine-exercise-press",
    plannedSets: 4,
    repMin: 6,
    repMax: 8,
    note: "Pausa en el pecho",
  });
  const session = startSessionFromRoutineDay(state, routine.id, day.id, {
    id: "session-1",
    sessionExerciseIds: ["session-exercise-press"],
  });

  updateRoutineExercisePlan(state, routine.id, day.id, exercise.id, {
    plannedSets: 3,
    repMin: 8,
    repMax: 10,
    note: "Cambio futuro",
  });

  assert.deepEqual(
    session.exercises.map(({ plannedSets, repMin, repMax, planNote }) => ({
      plannedSets,
      repMin,
      repMax,
      planNote,
    })),
    [{ plannedSets: 4, repMin: 6, repMax: 8, planNote: "Pausa en el pecho" }],
  );
  assert.equal(exercise.plannedSets, 3);
});

test("distingue series efectivas, de aproximación y de calentamiento", () => {
  const { state, session, exercise } = stateWithActiveSession();
  const effective = addSetToExercise(state, session.id, exercise.id, {
    reps: 8,
    loadKg: 80,
    setType: "effective",
  });
  const approach = addSetToExercise(state, session.id, exercise.id, {
    reps: 3,
    loadKg: 70,
    setType: "approach",
  });
  const warmup = addSetToExercise(state, session.id, exercise.id, {
    reps: 12,
    loadKg: 20,
    isWarmup: true,
  });

  assert.equal(effective.setType, "effective");
  assert.equal(approach.setType, "approach");
  assert.equal(warmup.setType, "warmup");
  assert.equal(warmup.isWarmup, true);
  assert.match(validateSetInput({ reps: 8, setType: "invented" }).error, /tipo de serie/i);
});

test("permite omitir un ejercicio pendiente pero no uno que ya tiene series", () => {
  const { state, session, exercise } = stateWithActiveSession();
  setSessionExerciseSkipped(state, session.id, exercise.id, true);
  assert.equal(exercise.status, "skipped");
  setSessionExerciseSkipped(state, session.id, exercise.id, false);
  addSetToExercise(state, session.id, exercise.id, { reps: 8, loadKg: 80 });
  assert.throws(
    () => setSessionExerciseSkipped(state, session.id, exercise.id, true),
    /series completadas/i,
  );
});

test("sustituye un ejercicio solo en la sesión activa y conserva el plan original", () => {
  const state = createEmptyState();
  const routine = createRoutine(state, "Empuje", { id: "routine-1" });
  const day = addRoutineDay(state, routine.id, "Push", { id: "day-push" });
  addExerciseToRoutineDay(state, routine.id, day.id, "Press banca", {
    exerciseId: "exercise-press",
    routineExerciseId: "routine-exercise-press",
  });
  const session = startSessionFromRoutineDay(state, routine.id, day.id, {
    id: "session-1",
    sessionExerciseIds: ["session-exercise-press"],
  });

  replaceSessionExerciseForToday(
    state,
    session.id,
    session.exercises[0].id,
    "Press con mancuernas",
    { exerciseId: "exercise-dumbbell" },
  );

  assert.equal(day.exercises[0].exerciseName, "Press banca");
  assert.equal(session.exercises[0].exerciseName, "Press con mancuernas");
  assert.equal(session.exercises[0].substitutedFrom.exerciseName, "Press banca");
  assert.equal(session.exercises[0].isSubstitution, true);
  addSetToExercise(state, session.id, session.exercises[0].id, { reps: 8, loadKg: 30 });
  assert.throws(
    () => replaceSessionExerciseForToday(
      state,
      session.id,
      session.exercises[0].id,
      "Press en máquina",
    ),
    /series completadas/i,
  );
});

test("una sesión finalizada es inmutable", () => {
  const { state, session, exercise } = stateWithActiveSession();
  const workoutSet = addSetToExercise(state, session.id, exercise.id, {
    reps: 8,
    loadKg: 80,
  });
  completeSession(state, session.id, "2026-07-24T09:00:00.000Z");
  assert.throws(
    () => updateSet(state, session.id, exercise.id, workoutSet.id, { reps: 9, loadKg: 80 }),
    /no se puede editar/i,
  );
});

test("crea y elimina una demostración completa sin tocar datos reales", () => {
  const state = createEmptyState({ now: "2026-08-11T09:00:00.000Z" });
  state.legacy.days["2026-08-01"] = {
    foods: [],
    workouts: [],
    notes: "Dato real",
  };

  seedDemoData(state, { now: "2026-08-11T09:00:00.000Z" });

  assert.equal(state.training.routines.filter((routine) => routine.isDemo).length, 3);
  assert.equal(
    state.training.routines.filter((routine) => routine.isDemo).flatMap((routine) => routine.days).length,
    6,
  );
  assert.ok(state.training.sessions.filter((session) => session.isDemo).length >= 20);
  assert.equal(state.training.sessions.every((session) => session.status === "completed"), true);
  assert.equal(state.nutrition.recipes.filter((recipe) => recipe.isDemo).length, 3);
  assert.equal(state.nutrition.labels.filter((label) => label.isDemo).length, 2);
  assert.equal(state.legacy.days["2026-08-11"].steps, 8432);
  assert.equal(validateState(state), null);

  removeDemoData(state);

  assert.equal(state.training.routines.some((routine) => routine.isDemo), false);
  assert.equal(state.training.sessions.some((session) => session.isDemo), false);
  assert.equal(Object.values(state.legacy.days).some((day) => day.isDemo), false);
  assert.equal(state.legacy.days["2026-08-01"].notes, "Dato real");
  assert.equal(validateState(state), null);
});

test("carga la demostración sin ocultar ni sustituir una sesión real activa", () => {
  const { state, session } = stateWithActiveSession();

  seedDemoData(state, { now: "2026-08-11T09:00:00.000Z" });

  assert.equal(state.training.activeSessionId, session.id);
  assert.equal(state.training.sessions.find((item) => item.id === session.id)?.status, "in_progress");
  assert.equal(state.training.routines.filter((routine) => routine.isDemo).length, 3);
  assert.ok(state.training.sessions.filter((item) => item.isDemo).length >= 20);
  assert.equal(validateState(state), null);
});

test("impide iniciar un día vacío y duplicar nombres dentro de una rutina", () => {
  const state = createEmptyState();
  const routine = createRoutine(state, "Fuerza", { id: "routine-1" });
  const day = addRoutineDay(state, routine.id, "Día A", { id: "day-a" });

  assert.throws(
    () => startSessionFromRoutineDay(state, routine.id, day.id),
    /al menos un ejercicio/i,
  );
  assert.throws(() => createRoutine(state, " fuerza "), /ya existe/i);
  assert.throws(() => addRoutineDay(state, routine.id, " día a "), /ya existe/i);
});

test("asigna días de la semana sin permitir conflictos entre rutinas", () => {
  const state = createEmptyState();
  const first = createRoutine(state, "Rutina A");
  const firstDay = addRoutineDay(state, first.id, "Empuje");
  const second = createRoutine(state, "Rutina B");
  const secondDay = addRoutineDay(state, second.id, "Pierna");

  setRoutineDayWeekday(state, first.id, firstDay.id, 1);
  assert.equal(firstDay.weekday, 1);
  assert.throws(
    () => setRoutineDayWeekday(state, second.id, secondDay.id, 1),
    /lunes.*Rutina A.*Empuje/i,
  );
  setRoutineDayWeekday(state, second.id, secondDay.id, 3);
  setRoutineDayWeekday(state, first.id, firstDay.id, null);
  assert.equal(firstDay.weekday, null);
});
