import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  BACKUP_STORE_KEY,
  CARDIO_ACTIVITY_TYPES,
  LEGACY_STORE_KEY,
  MUSCLE_REGIONS,
  STORE_KEY,
  addExerciseToRoutineDay,
  addExerciseToSession,
  addRoutineDay,
  addCardioToSession,
  archiveRoutine,
  addSetToExercise,
  cardioPaceSecondsPerKm,
  cardioDerivedMetrics,
  completeSession,
  cleanupPublishedData,
  computeMuscleVolume,
  createEmptyState,
  createRoutine,
  createRoutineWithWeekdays,
  deleteSet,
  duplicateSet,
  discardSession,
  findLastComparableExercise,
  loadAppState,
  moveRoutineDay,
  moveRoutineExercise,
  muscleIntensity,
  muscleRegionLabel,
  normalizeCatalogMuscles,
  normalizeMuscleName,
  parseImportPayload,
  persistState,
  removeExerciseFromRoutineDay,
  restoreLastDeletedSet,
  sanitizeExerciseMuscles,
  replaceSessionExerciseForToday,
  removeDemoData,
  routineDayWeekdays,
  seedDemoData,
  setSessionExerciseSkipped,
  setRoutineDayWeekday,
  setRoutineDayWeekdays,
  setRoutineAccentColor,
  setSuggestedRoutineDay,
  startFreeSession,
  startSessionFromRoutineDay,
  updateSet,
  validateLabelPhotoFile,
  validateCardioInput,
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

test("crea y valida preferencias de apariencia y entrenamiento", () => {
  const state = createEmptyState({ now: "2026-09-01T08:00:00.000Z" });

  assert.deepEqual(state.owner.preferences, {
    accentColor: "lime",
    appearanceMode: "system",
    effortScale: "rir",
    defaultRestSeconds: 60,
  });

  state.owner.preferences.accentColor = "violet";
  state.owner.preferences.appearanceMode = "light";
  state.owner.preferences.effortScale = "rpe";
  state.owner.preferences.defaultRestSeconds = 90;
  assert.equal(validateState(state), null);

  state.owner.preferences.accentColor = "neon-random";
  assert.match(validateState(state), /color de acento/i);

  state.owner.preferences.accentColor = "lime";
  state.owner.preferences.appearanceMode = "sepia";
  assert.match(validateState(state), /modo de apariencia/i);
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

test("valida la foto de etiqueta antes de previsualizarla o comprimirla", () => {
  assert.deepEqual(validateLabelPhotoFile(null), { value: null });
  assert.equal(validateLabelPhotoFile({ type: "image/jpeg", size: 2_000_000 }).error, undefined);
  assert.match(validateLabelPhotoFile({ type: "text/html", size: 1200 }).error, /fotografía válida/i);
  assert.match(validateLabelPhotoFile({ type: "image/png", size: 16 * 1024 * 1024 }).error, /demasiado grande/i);
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

test("duplica una serie completa como una nueva serie independiente", () => {
  const { state, session, exercise } = stateWithActiveSession();
  addSetToExercise(
    state,
    session.id,
    exercise.id,
    { reps: 8, loadKg: 82.5, rir: 1, setType: "effective", note: "Agarre neutro" },
    { id: "set-source", now: "2026-08-21T08:15:00.000Z" },
  );
  const copy = duplicateSet(
    state,
    session.id,
    exercise.id,
    "set-source",
    { id: "set-copy", now: "2026-08-21T08:18:00.000Z" },
  );

  assert.equal(copy.id, "set-copy");
  assert.equal(copy.order, 2);
  assert.deepEqual(
    { reps: copy.reps, loadKg: copy.loadKg, rir: copy.rir, setType: copy.setType, note: copy.note },
    { reps: 8, loadKg: 82.5, rir: 1, setType: "effective", note: "Agarre neutro" },
  );
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
  assert.equal(catalog.exercises.filter((exercise) => exercise.nameLocale === "es").length, 40);
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
    routineAccentColor: null,
    routineDayType: "strength",
    cardioType: null,
  });
  assert.deepEqual(session.exercises.map((exercise) => exercise.exerciseName), ["Press banca"]);
  assert.deepEqual(torso.exercises.map((exercise) => exercise.exerciseName), ["Press banca"]);
});

test("la rutina solo copia ejercicios y la sesión empieza sin objetivos ficticios", () => {
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

  assert.deepEqual(
    session.exercises.map(({ plannedSets, repMin, repMax, planNote }) => ({
      plannedSets,
      repMin,
      repMax,
      planNote,
    })),
    [{ plannedSets: 0, repMin: null, repMax: null, planNote: "" }],
  );
  assert.equal(exercise.exerciseName, "Press banca");
});

test("descarta únicamente la sesión activa y libera el siguiente entrenamiento", () => {
  const { state, session } = stateWithActiveSession();
  const totalBefore = state.training.sessions.length;

  const discarded = discardSession(state, session.id);

  assert.equal(discarded.id, session.id);
  assert.equal(state.training.activeSessionId, null);
  assert.equal(state.training.sessions.length, totalBefore - 1);
  assert.equal(state.training.sessions.some((item) => item.id === session.id), false);
  assert.throws(() => discardSession(state, session.id), /sesión activa/i);
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

test("al finalizar registra la duración total de la sesión", () => {
  const { state, session, exercise } = stateWithActiveSession();
  session.startedAt = "2026-07-24T08:10:00.000Z";
  addSetToExercise(state, session.id, exercise.id, { reps: 8, loadKg: 80 });

  completeSession(state, session.id, "2026-07-24T09:25:30.000Z");

  assert.equal(session.durationSeconds, 4530);
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
    3,
  );
  state.training.routines.filter((routine) => routine.isDemo).forEach((routine) => {
    assert.equal(routine.days.length, 1);
    assert.equal(routine.days[0].name, "Entrenamiento");
    assert.equal(routineDayWeekdays(routine.days[0]).length, 2);
  });
  assert.equal(
    state.training.routines
      .filter((routine) => routine.isDemo)
      .flatMap((routine) => routine.days)
      .some((day) => /push|pull|pierna .?b/i.test(day.name)),
    false,
  );
  assert.ok(state.training.sessions.filter((session) => session.isDemo).length >= 45);
  assert.equal(state.training.sessions.every((session) => session.status === "completed"), true);
  assert.equal(state.nutrition.recipes.filter((recipe) => recipe.isDemo).length, 3);
  assert.equal(state.nutrition.labels.filter((label) => label.isDemo).length, 2);
  assert.equal(Object.values(state.legacy.days).filter((day) => day.isDemo).length, 60);
  assert.equal(state.legacy.days["2026-08-11"].steps, 8432);
  assert.ok(state.legacy.days["2026-06-12"]?.isDemo);
  assert.equal(state.meta.publicCleanupVersion, 2);
  assert.equal(validateState(state), null);

  removeDemoData(state);

  assert.equal(state.training.routines.some((routine) => routine.isDemo), false);
  assert.equal(state.training.sessions.some((session) => session.isDemo), false);
  assert.equal(Object.values(state.legacy.days).some((day) => day.isDemo), false);
  assert.equal(state.legacy.days["2026-08-01"].notes, "Dato real");
  assert.equal(validateState(state), null);
});

test("la limpieza publicada retira demos y la rutina de prueba sin tocar datos reales", () => {
  const state = createEmptyState({ now: "2026-08-12T08:00:00.000Z" });
  const realRoutine = createRoutine(state, "Mi rutina real", { id: "routine-real" });
  addRoutineDay(state, realRoutine.id, "Real", { id: "day-real" });
  const testRoutine = createRoutine(state, "Rutina de prueba", { id: "routine-test" });
  const testDay = addRoutineDay(state, testRoutine.id, "Test", { id: "day-test" });
  addExerciseToRoutineDay(state, testRoutine.id, testDay.id, "Press banca");
  const testSession = startSessionFromRoutineDay(state, testRoutine.id, testDay.id, {
    id: "session-test",
  });
  seedDemoData(state, { now: "2026-08-12T08:00:00.000Z" });

  cleanupPublishedData(state);

  assert.equal(state.training.routines.some((routine) => routine.isDemo), false);
  assert.equal(state.training.routines.some((routine) => routine.id === "routine-test"), false);
  assert.equal(state.training.sessions.some((session) => session.id === testSession.id), false);
  assert.equal(state.training.routines.some((routine) => routine.id === realRoutine.id), true);
  assert.equal(state.meta.publicCleanupVersion, 2);
  assert.equal(state.meta.demoDismissed, true);
  assert.equal(validateState(state), null);
});

test("la limpieza retira una sesión manual iniciada desde una rutina demo", () => {
  const state = createEmptyState({ now: "2026-08-12T08:00:00.000Z" });
  seedDemoData(state, { now: "2026-08-12T08:00:00.000Z" });
  const demoRoutine = state.training.routines.find((routine) => routine.isDemo);
  const demoDay = demoRoutine.days[0];
  const manualDemoSession = startSessionFromRoutineDay(state, demoRoutine.id, demoDay.id, {
    id: "manual-demo-session",
  });
  assert.equal(manualDemoSession.isDemo, undefined);

  cleanupPublishedData(state);

  assert.equal(state.training.activeSessionId, null);
  assert.equal(state.training.sessions.some((session) => session.id === manualDemoSession.id), false);
  assert.equal(state.training.exercises.some((exercise) => exercise.isDemo), false);
  assert.equal(validateState(state), null);
});

test("carga la demostración sin ocultar ni sustituir una sesión real activa", () => {
  const { state, session } = stateWithActiveSession();

  seedDemoData(state, { now: "2026-08-11T09:00:00.000Z" });

  assert.equal(state.training.activeSessionId, session.id);
  assert.equal(state.training.sessions.find((item) => item.id === session.id)?.status, "in_progress");
  assert.equal(state.training.routines.filter((routine) => routine.isDemo).length, 3);
  assert.ok(state.training.sessions.filter((item) => item.isDemo).length >= 45);
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

test("crea una rutina semanal como un bloque compartido sin duplicar ejercicios", () => {
  const state = createEmptyState();
  const routine = createRoutineWithWeekdays(state, "Push", [1, 3, 5], {
    id: "routine-weekly",
    now: "2026-08-12T08:00:00.000Z",
  });

  assert.equal(routine.days.length, 1);
  assert.equal(routine.days[0].name, "Entrenamiento");
  assert.deepEqual(routineDayWeekdays(routine.days[0]), [1, 3, 5]);

  addExerciseToRoutineDay(state, routine.id, routine.days[0].id, "Press banca", {
    exerciseId: "exercise-press",
  });
  assert.equal(routine.days.reduce((total, day) => total + day.exercises.length, 0), 1);
  assert.throws(() => createRoutineWithWeekdays(state, "Pull", [3]), /miércoles.*Push/i);
});

test("guarda un color propio en la rutina y permite cambiarlo sin tocar el historial", () => {
  const state = createEmptyState();
  const routine = createRoutineWithWeekdays(state, "Empuje", [1], {
    id: "routine-colored",
    accentColor: "red",
  });

  assert.equal(routine.accentColor, "red");
  addExerciseToRoutineDay(state, routine.id, routine.days[0].id, "Press banca", {
    exerciseId: "exercise-colored",
  });
  const session = startSessionFromRoutineDay(state, routine.id, routine.days[0].id, {
    id: "session-colored",
  });
  assert.equal(session.source.snapshot.routineAccentColor, "red");
  setRoutineAccentColor(state, routine.id, "blue", "2026-09-01T10:00:00.000Z");
  assert.equal(routine.accentColor, "blue");
  assert.equal(validateState(state), null);
  assert.throws(() => setRoutineAccentColor(state, routine.id, "inventado"), /color/i);
});

test("permite cambiar varios días de repetición en un mismo bloque", () => {
  const state = createEmptyState();
  const first = createRoutine(state, "Rutina A");
  const firstDay = addRoutineDay(state, first.id, "Full body");
  const second = createRoutine(state, "Rutina B");
  const secondDay = addRoutineDay(state, second.id, "Torso");

  setRoutineDayWeekdays(state, first.id, firstDay.id, [1, 3]);
  assert.deepEqual(routineDayWeekdays(firstDay), [1, 3]);
  assert.equal(firstDay.weekday, 1);
  assert.throws(
    () => setRoutineDayWeekday(state, second.id, secondDay.id, 3),
    /miércoles.*Rutina A.*Full body/i,
  );
  setRoutineDayWeekdays(state, first.id, firstDay.id, [5]);
  assert.deepEqual(routineDayWeekdays(firstDay), [5]);
  assert.equal(validateState(state), null);
});

test("crea una rutina de correr y calcula ritmo desde distancia y tiempo", () => {
  const state = createEmptyState({ now: "2026-09-02T08:00:00.000Z" });
  const routine = createRoutineWithWeekdays(state, "Correr suave", [3], {
    id: "routine-run",
    dayType: "cardio",
    cardioType: "run",
  });

  const day = routine.days[0];
  assert.equal(day.type, "cardio");
  assert.equal(day.cardioType, "run");
  assert.equal(day.exercises.length, 0);
  assert.equal(cardioPaceSecondsPerKm(5, 1500), 300);

  const session = startSessionFromRoutineDay(state, routine.id, day.id, {
    id: "session-run",
    now: "2026-09-02T18:00:00.000Z",
  });
  assert.equal(session.sessionType, "cardio");
  assert.equal(session.cardio.activityType, "run");
  assert.equal(session.exercises.length, 0);
  assert.equal(validateState(state), null);

  const activity = addCardioToSession(state, session.id, {
    distanceKm: 5,
    durationSeconds: 1500,
    steps: 6200,
    note: "Ritmo cómodo",
  }, { id: "cardio-run-1", now: "2026-09-02T18:25:00.000Z" });
  assert.equal(activity.paceSecondsPerKm, 300);
  const updatedActivity = addCardioToSession(state, session.id, {
    distanceKm: 5.2,
    durationSeconds: 1530,
    steps: 6400,
    note: "Últimos metros rápidos",
  }, { id: "cardio-should-not-replace-id", now: "2026-09-02T18:26:00.000Z" });
  assert.equal(updatedActivity.id, "cardio-run-1");

  completeSession(state, session.id, "2026-09-02T18:27:00.000Z");
  assert.equal(state.legacy.days["2026-09-02"].cardioMinutes, 26);
  assert.equal(state.legacy.days["2026-09-02"].steps, 6400);
  assert.equal(state.legacy.days["2026-09-02"].workouts[0].type, "cardio");
});

test("archiva una rutina sin borrar su historial de sesiones", () => {
  const state = createEmptyState({ now: "2026-09-02T08:00:00.000Z" });
  const routine = createRoutineWithWeekdays(state, "Correr", [2], { id: "routine-run" });
  const day = routine.days[0];
  addExerciseToRoutineDay(state, routine.id, day.id, "Sentadilla", { exerciseId: "squat" });
  const session = startSessionFromRoutineDay(state, routine.id, day.id, {
    id: "session-history",
    sessionExerciseIds: ["session-exercise"],
  });
  addSetToExercise(state, session.id, session.exercises[0].id, { reps: 8, loadKg: 80 });
  completeSession(state, session.id, "2026-09-02T09:00:00.000Z");

  archiveRoutine(state, routine.id, "2026-09-02T10:00:00.000Z");

  assert.equal(routine.status, "archived");
  assert.equal(state.training.sessions.length, 1);
  assert.throws(() => archiveRoutine(state, routine.id), /activa/i);
  assert.equal(validateState(state), null);
});

test("valida cardio con distancia y tiempo obligatorios", () => {
  assert.equal(validateCardioInput({ distanceKm: 5, durationSeconds: 1500 }).value.paceSecondsPerKm, 300);
  assert.match(validateCardioInput({ distanceKm: "", durationSeconds: 1500 }).error, /distancia/i);
  assert.match(validateCardioInput({ distanceKm: 5, durationSeconds: "" }).error, /tiempo/i);
  assert.match(validateCardioInput({ distanceKm: 5, durationSeconds: 1500, steps: 1.5 }).error, /pasos/i);
});

test("admite una zona cardio con actividades y métricas específicas", () => {
  assert.deepEqual(CARDIO_ACTIVITY_TYPES, [
    "run",
    "treadmill_run",
    "trail_run",
    "walk",
    "hike",
    "cycling",
    "indoor_cycling",
    "pool_swim",
    "open_water_swim",
    "elliptical",
    "rowing",
    "stair_climber",
  ]);

  assert.deepEqual(cardioDerivedMetrics("cycling", 20, 3600), {
    paceSecondsPerKm: null,
    paceSecondsPer100m: null,
    paceSecondsPer500m: null,
    averageSpeedKmh: 20,
    poolLengths: null,
  });
  assert.deepEqual(cardioDerivedMetrics("pool_swim", 1, 1800, { poolLengthM: 25 }), {
    paceSecondsPerKm: null,
    paceSecondsPer100m: 180,
    paceSecondsPer500m: null,
    averageSpeedKmh: null,
    poolLengths: 40,
  });
});

test("valida solo los campos relevantes de cada actividad cardio", () => {
  const trail = validateCardioInput({
    activityType: "trail_run",
    distanceKm: 12.5,
    durationSeconds: 4500,
    elevationGainM: 620,
    averageHeartRateBpm: 154,
    steps: 14200,
  });
  assert.equal(trail.value.elevationGainM, 620);
  assert.equal(trail.value.paceSecondsPerKm, 360);
  assert.equal(trail.value.averageHeartRateBpm, 154);

  const treadmill = validateCardioInput({
    activityType: "treadmill_run",
    distanceKm: 5,
    durationSeconds: 1500,
    inclinePercent: 3.5,
  });
  assert.equal(treadmill.value.inclinePercent, 3.5);

  const indoorBike = validateCardioInput({
    activityType: "indoor_cycling",
    distanceKm: "",
    durationSeconds: 2700,
    resistanceLevel: 12,
  });
  assert.equal(indoorBike.value.distanceKm, null);
  assert.equal(indoorBike.value.resistanceLevel, 12);
  assert.equal(indoorBike.value.averageSpeedKmh, null);

  const swim = validateCardioInput({
    activityType: "pool_swim",
    distanceKm: 1.5,
    durationSeconds: 2400,
    poolLengthM: 25,
  });
  assert.equal(swim.value.paceSecondsPer100m, 160);
  assert.equal(swim.value.poolLengths, 60);

  assert.match(validateCardioInput({ activityType: "cycling", distanceKm: "", durationSeconds: 1200 }).error, /distancia/i);
  assert.match(validateCardioInput({ activityType: "treadmill_run", distanceKm: 5, durationSeconds: 1500, inclinePercent: 80 }).error, /inclinación/i);
  assert.match(validateCardioInput({ activityType: "pool_swim", distanceKm: 1, durationSeconds: 1800, poolLengthM: 2 }).error, /piscina/i);
});

test("una rutina real puede sustituir un día ocupado solo por la demostración", () => {
  const state = createEmptyState({ now: "2026-08-12T08:00:00.000Z" });
  seedDemoData(state, { now: "2026-08-12T08:00:00.000Z" });
  const demoDay = state.training.routines
    .filter((routine) => routine.isDemo)
    .flatMap((routine) => routine.days)
    .find((day) => day.weekday !== null);
  const weekday = demoDay.weekday;

  const realRoutine = createRoutineWithWeekdays(state, "Mi rutina", [weekday]);

  assert.equal(realRoutine.days[0].weekday, weekday);
  assert.equal(routineDayWeekdays(demoDay).includes(weekday), false);
  assert.equal(validateState(state), null);
});

test("el vocabulario muscular cubre el dataset entero sin valores sueltos", () => {
  const catalog = JSON.parse(fs.readFileSync(new URL("../data/exercises.es.json", import.meta.url), "utf8"));
  const sinMapear = new Set();
  const cubiertas = new Set();

  catalog.exercises.forEach((entry) => {
    [entry.target, entry.muscleGroup, ...(entry.secondaryMuscles ?? [])].forEach((value) => {
      if (!value) return;
      const region = normalizeMuscleName(value);
      if (region) {
        cubiertas.add(region);
        return;
      }
      // "cardiovascular system" se reconoce y se descarta a propósito: el
      // cardio no pinta músculos.
      if (String(value).toLowerCase() !== "cardiovascular system") sinMapear.add(value);
    });
  });

  assert.deepEqual([...sinMapear], [], "el catálogo trae músculos que el mapa no sabe traducir");
  assert.equal(cubiertas.size, MUSCLE_REGIONS.length, "hay regiones del mapa que ningún ejercicio alcanza");
  MUSCLE_REGIONS.forEach((region) => {
    assert.ok(region.views.length, `${region.id} no se dibuja en ninguna vista`);
    assert.ok(muscleRegionLabel(region.id), `${region.id} no tiene nombre en español`);
  });
});

test("un músculo no puede ser directo y secundario a la vez", () => {
  const muscles = normalizeCatalogMuscles({
    target: "pectorals",
    muscleGroup: "chest",
    secondaryMuscles: ["triceps", "shoulders", "upper chest", "triceps"],
  });
  assert.deepEqual(muscles.direct, ["chest"]);
  assert.deepEqual(muscles.secondary, ["triceps", "shoulders"]);

  assert.deepEqual(
    normalizeCatalogMuscles({ target: "cardiovascular system", secondaryMuscles: ["calves"] }),
    { direct: [], secondary: ["calves"] },
  );
  assert.equal(sanitizeExerciseMuscles({ direct: ["inventado"], secondary: [] }), null);
  assert.deepEqual(
    sanitizeExerciseMuscles({ direct: ["chest"], secondary: ["chest", "triceps", "inventado"] }),
    { direct: ["chest"], secondary: ["triceps"] },
  );
});

test("el volumen por músculo separa trabajo directo de implicación y solo cuenta series efectivas", () => {
  const state = createEmptyState({ now: "2026-09-01T08:00:00.000Z" });
  const session = startFreeSession(state, { now: "2026-09-01T09:00:00.000Z", id: "sesion-1" });
  const press = addExerciseToSession(state, session.id, "Press de banca con barra", { now: "2026-09-01T09:01:00.000Z" });
  state.training.exercises.find((item) => item.id === press.exerciseId).muscles = {
    direct: ["chest"],
    secondary: ["triceps", "shoulders"],
  };

  addSetToExercise(state, session.id, press.id, { reps: 10, weight: 60, setType: "warmup" }, { now: "2026-09-01T09:05:00.000Z", id: "s1" });
  addSetToExercise(state, session.id, press.id, { reps: 8, weight: 80, setType: "approach" }, { now: "2026-09-01T09:10:00.000Z", id: "s2" });
  addSetToExercise(state, session.id, press.id, { reps: 6, weight: 90, setType: "effective" }, { now: "2026-09-01T09:15:00.000Z", id: "s3" });
  addSetToExercise(state, session.id, press.id, { reps: 6, weight: 90, setType: "effective" }, { now: "2026-09-01T09:20:00.000Z", id: "s4" });
  completeSession(state, session.id, "2026-09-01T10:00:00.000Z");

  const volumen = computeMuscleVolume(state, { fromIso: "2026-09-01T00:00:00.000Z" });
  assert.equal(volumen.effectiveSets, 2, "calentamiento y aproximación no son volumen");
  assert.equal(volumen.byRegion.chest.directSets, 2);
  assert.equal(volumen.byRegion.chest.secondarySets, 0);
  assert.equal(volumen.byRegion.triceps.directSets, 0);
  assert.equal(volumen.byRegion.triceps.secondarySets, 2, "el tríceps se implica pero no se entrena directo");
  assert.deepEqual(volumen.byRegion.chest.exercises, [{ name: "Press de banca con barra", sets: 2, kind: "direct" }]);
  assert.equal(volumen.unmappedSets, 0);

  const fuera = computeMuscleVolume(state, { fromIso: "2026-09-02T00:00:00.000Z" });
  assert.equal(fuera.effectiveSets, 0, "el periodo debe excluir sesiones anteriores");
});

test("una sesión sin músculos conocidos se declara en lugar de desaparecer", () => {
  const state = createEmptyState({ now: "2026-09-01T08:00:00.000Z" });
  const session = startFreeSession(state, { now: "2026-09-01T09:00:00.000Z", id: "sesion-2" });
  const propio = addExerciseToSession(state, session.id, "Invento personal", { now: "2026-09-01T09:01:00.000Z" });
  addSetToExercise(state, session.id, propio.id, { reps: 10, weight: 20, setType: "effective" }, { now: "2026-09-01T09:05:00.000Z", id: "s5" });
  completeSession(state, session.id, "2026-09-01T10:00:00.000Z");

  const volumen = computeMuscleVolume(state, {});
  assert.equal(volumen.effectiveSets, 1);
  assert.equal(volumen.unmappedSets, 1);
  assert.deepEqual(volumen.unmappedExercises, ["Invento personal"]);
  assert.equal(volumen.byRegion.chest.directSets, 0);
});

test("las series que no colorean ninguna zona se declaran, no desaparecen", () => {
  const state = createEmptyState({ now: "2026-09-01T08:00:00.000Z" });
  const session = startFreeSession(state, { now: "2026-09-01T09:00:00.000Z", id: "sesion-3" });
  const burpee = addExerciseToSession(state, session.id, "Burpee", { now: "2026-09-01T09:01:00.000Z" });
  // El dataset marca así los ejercicios de cardio: implicación, sin principal.
  state.training.exercises.find((item) => item.id === burpee.exerciseId).muscles = {
    direct: [],
    secondary: ["quads", "chest"],
  };
  addSetToExercise(state, session.id, burpee.id, { reps: 12, setType: "effective" }, { now: "2026-09-01T09:05:00.000Z", id: "s6" });
  completeSession(state, session.id, "2026-09-01T10:00:00.000Z");

  const volumen = computeMuscleVolume(state, {});
  assert.equal(volumen.effectiveSets, 1);
  assert.equal(volumen.indirectOnlySets, 1);
  assert.deepEqual(volumen.indirectOnlyExercises, ["Burpee"]);
  assert.equal(volumen.unmappedSets, 0, "sí tiene músculos, solo que ninguno principal");
  assert.equal(volumen.byRegion.quads.directSets, 0);
  assert.equal(volumen.byRegion.quads.secondarySets, 1);
});

test("el mapa por fechas incluye la sesión en curso", () => {
  const state = createEmptyState({ now: "2026-09-01T08:00:00.000Z" });
  const session = startFreeSession(state, { now: "2026-09-01T09:00:00.000Z", id: "sesion-4" });
  const sentadilla = addExerciseToSession(state, session.id, "Sentadilla con barra", { now: "2026-09-01T09:01:00.000Z" });
  state.training.exercises.find((item) => item.id === sentadilla.exerciseId).muscles = {
    direct: ["glutes"],
    secondary: ["quads"],
  };
  addSetToExercise(state, session.id, sentadilla.id, { reps: 5, weight: 100, setType: "effective" }, { now: "2026-09-01T09:10:00.000Z", id: "s7" });

  // Lo que ya has hecho hoy es trabajo hecho: el mapa semanal del Diario tiene
  // que moverse mientras entrenas, no solo al finalizar.
  const volumen = computeMuscleVolume(state, { fromIso: "2026-09-01T00:00:00.000Z" });
  assert.equal(volumen.byRegion.glutes.directSets, 1);
  assert.equal(volumen.byRegion.quads.secondarySets, 1);
});

test("la intensidad del mapa usa tramos, no un gradiente inventado", () => {
  assert.equal(muscleIntensity(0), "none");
  assert.equal(muscleIntensity(1), "low");
  assert.equal(muscleIntensity(4), "low");
  assert.equal(muscleIntensity(5), "medium");
  assert.equal(muscleIntensity(9), "medium");
  assert.equal(muscleIntensity(10), "high");
  assert.equal(muscleIntensity(40), "high");
});

test("la escala del mapa muscular es legible y coincide con la hoja de estilos", async () => {
  const { MUSCLE_RAMPS, checkRamp } = await import("../scripts/check-muscle-palette.mjs");
  const styles = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  // El color codifica una cantidad: la escala tiene que seguir siendo monótona
  // y separable con daltonismo aunque alguien "solo retoque un verde".
  Object.entries(MUSCLE_RAMPS).forEach(([nombre, pasos]) => {
    assert.deepEqual(checkRamp(nombre, pasos), [], `la escala ${nombre} dejó de ser legible`);
  });

  const bloque = (selector) => {
    const inicio = styles.indexOf(selector);
    assert.ok(inicio > -1, `no se encontró ${selector}`);
    return styles.slice(inicio, styles.indexOf("}", inicio));
  };
  const oscuro = bloque("  --muscle-body: #232c25;");
  const claro = bloque(":root[data-theme=\"light\"] {\n  --muscle-body:");
  [["none", 0], ["low", 1], ["medium", 2], ["high", 3]].forEach(([tramo, indice]) => {
    assert.ok(
      oscuro.includes(`--muscle-${tramo}: ${MUSCLE_RAMPS.oscuro[indice]};`),
      `el tramo ${tramo} oscuro de styles.css no coincide con la escala validada`,
    );
    assert.ok(
      claro.includes(`--muscle-${tramo}: ${MUSCLE_RAMPS.claro[indice]};`),
      `el tramo ${tramo} claro de styles.css no coincide con la escala validada`,
    );
  });
});
