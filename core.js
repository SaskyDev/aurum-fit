export const STORE_KEY = "aurum-fit-v2";
export const LEGACY_STORE_KEY = "fit-tracker-v1";
export const BACKUP_STORE_KEY = "aurum-fit-v2-backup";
export const SCHEMA_VERSION = 2;

const MAX_EXERCISE_NAME_LENGTH = 80;
const MAX_NOTE_LENGTH = 300;
const MAX_ROUTINE_NAME_LENGTH = 80;
const MAX_DAY_NAME_LENGTH = 60;
const STORAGE_RECOVERY_MESSAGE =
  "No se pudo preparar el guardado local. Los datos existentes no se han borrado. "
  + "Exporta una copia y libera espacio del navegador antes de continuar.";

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizeLegacyDays(legacyDays) {
  if (!isObject(legacyDays)) return {};
  return Object.fromEntries(
    Object.entries(legacyDays)
      .filter(([, day]) => isObject(day))
      .map(([date, day]) => [
        date,
        {
          ...copy(day),
          foods: Array.isArray(day.foods) ? copy(day.foods) : [],
          workouts: Array.isArray(day.workouts) ? copy(day.workouts) : [],
        },
      ]),
  );
}

export function createId(prefix = "id") {
  const randomPart = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${randomPart}`;
}

export function createEmptyState({ now = new Date().toISOString(), legacyDays = {} } = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    owner: {
      id: "local-user",
      displayName: "Usuario local",
    },
    legacy: {
      days: sanitizeLegacyDays(legacyDays),
    },
    training: {
      exercises: [],
      routines: [],
      sessions: [],
      activeSessionId: null,
      undo: null,
    },
    meta: {
      createdAt: now,
      updatedAt: now,
      migratedFrom: isObject(legacyDays) && Object.keys(legacyDays).length
        ? LEGACY_STORE_KEY
        : null,
    },
  };
}

export function validateState(state) {
  if (!isObject(state)) return "El contenido no es un objeto.";
  if (state.schemaVersion !== SCHEMA_VERSION) {
    return `La versión ${String(state.schemaVersion)} no es compatible con la versión ${SCHEMA_VERSION}.`;
  }
  if (!isObject(state.owner) || typeof state.owner.id !== "string") {
    return "Falta el propietario local.";
  }
  if (!isObject(state.legacy) || !isObject(state.legacy.days)) {
    return "Falta el bloque de datos del prototipo.";
  }
  if (!isObject(state.training)) return "Falta el bloque de entrenamiento.";
  if (!Array.isArray(state.training.exercises)) return "El catálogo de ejercicios no es válido.";
  if (!Array.isArray(state.training.routines)) return "Las rutinas no son válidas.";
  if (!Array.isArray(state.training.sessions)) return "Las sesiones no son válidas.";
  if (!isObject(state.meta)) return "Faltan los metadatos.";

  for (const day of Object.values(state.legacy.days)) {
    if (!isObject(day) || !Array.isArray(day.foods) || !Array.isArray(day.workouts)) {
      return "Un día del prototipo no tiene listas válidas.";
    }
  }

  for (const exercise of state.training.exercises) {
    if (
      !isObject(exercise)
      || typeof exercise.id !== "string"
      || typeof exercise.userId !== "string"
      || typeof exercise.name !== "string"
    ) {
      return "Hay un ejercicio del catálogo local no válido.";
    }
  }

  for (const routine of state.training.routines) {
    if (
      !isObject(routine)
      || typeof routine.id !== "string"
      || typeof routine.userId !== "string"
      || typeof routine.name !== "string"
      || !["active", "archived"].includes(routine.status)
      || typeof routine.createdAt !== "string"
      || typeof routine.updatedAt !== "string"
      || !Array.isArray(routine.days)
      || (
        routine.suggestedDayId !== null
        && typeof routine.suggestedDayId !== "string"
      )
    ) {
      return "Hay una rutina no válida.";
    }
    for (const routineDay of routine.days) {
      if (
        !isObject(routineDay)
        || typeof routineDay.id !== "string"
        || typeof routineDay.name !== "string"
        || !Number.isInteger(routineDay.order)
        || !Array.isArray(routineDay.exercises)
      ) {
        return "Hay un día de rutina no válido.";
      }
      for (const routineExercise of routineDay.exercises) {
        if (
          !isObject(routineExercise)
          || typeof routineExercise.id !== "string"
          || typeof routineExercise.exerciseId !== "string"
          || typeof routineExercise.exerciseName !== "string"
          || !Number.isInteger(routineExercise.order)
        ) {
          return "Hay un ejercicio de rutina no válido.";
        }
      }
    }
    if (
      routine.suggestedDayId !== null
      && !routine.days.some((routineDay) => routineDay.id === routine.suggestedDayId)
    ) {
      return "El día sugerido no pertenece a su rutina.";
    }
  }

  for (const session of state.training.sessions) {
    if (
      !isObject(session)
      || typeof session.id !== "string"
      || typeof session.userId !== "string"
      || !["in_progress", "completed"].includes(session.status)
      || typeof session.startedAt !== "string"
      || !isObject(session.source)
      || typeof session.source.type !== "string"
      || typeof session.source.label !== "string"
      || !Array.isArray(session.exercises)
    ) {
      return "Hay una sesión no válida.";
    }
    if (session.status === "completed" && typeof session.endedAt !== "string") {
      return "Una sesión finalizada no tiene fecha de fin.";
    }
    for (const sessionExercise of session.exercises) {
      if (
        !isObject(sessionExercise)
        || typeof sessionExercise.id !== "string"
        || typeof sessionExercise.exerciseId !== "string"
        || typeof sessionExercise.exerciseName !== "string"
        || !Number.isInteger(sessionExercise.order)
        || !Array.isArray(sessionExercise.sets)
      ) {
        return "Hay un ejercicio de sesión no válido.";
      }
      for (const workoutSet of sessionExercise.sets) {
        const checkedSet = validateSetInput(workoutSet);
        if (
          !isObject(workoutSet)
          || typeof workoutSet.id !== "string"
          || !Number.isInteger(workoutSet.order)
          || workoutSet.status !== "completed"
          || checkedSet.error
        ) {
          return "Hay una serie no válida.";
        }
      }
    }
  }

  if (
    state.training.activeSessionId !== null
    && (
      typeof state.training.activeSessionId !== "string"
      || !state.training.sessions.some(
        (session) => (
          session.id === state.training.activeSessionId
          && session.status === "in_progress"
        ),
      )
    )
  ) {
    return "La sesión activa no coincide con una sesión en curso.";
  }
  return null;
}

function trySetItem(storage, key, value) {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function backupCorruptValue(storage, raw, now) {
  const safeTimestamp = now.replaceAll(":", "-");
  return trySetItem(storage, `${STORE_KEY}-corrupt-${safeTimestamp}`, raw);
}

export function loadAppState(storage, now = new Date().toISOString()) {
  const notices = [];
  const currentRaw = storage.getItem(STORE_KEY);
  let canReplaceCurrent = !currentRaw;

  if (currentRaw) {
    let problemNotice;
    try {
      const current = JSON.parse(currentRaw);
      const problem = validateState(current);
      if (!problem) return { state: current, notices, persistenceAvailable: true };
      problemNotice = `Los datos v2 no eran válidos (${problem})`;
    } catch {
      problemNotice = "Los datos v2 estaban dañados";
    }

    canReplaceCurrent = backupCorruptValue(storage, currentRaw, now);
    if (canReplaceCurrent) {
      notices.push(`${problemNotice} y se conservaron aparte.`);
    } else {
      notices.push(`${problemNotice} y no se sobrescribieron. ${STORAGE_RECOVERY_MESSAGE}`);
    }
  }

  let legacyDays = {};
  const legacyRaw = storage.getItem(LEGACY_STORE_KEY);
  if (legacyRaw) {
    try {
      const legacy = JSON.parse(legacyRaw);
      if (isObject(legacy?.days)) {
        legacyDays = legacy.days;
        notices.push("Se copiaron los datos anteriores al modelo v2. La copia original sigue intacta.");
      } else {
        notices.push("El almacenamiento anterior no tenía el formato esperado y no se modificó.");
      }
    } catch {
      notices.push("El almacenamiento anterior estaba dañado y no se modificó.");
    }
  }

  const state = createEmptyState({ now, legacyDays });
  const persistenceAvailable = canReplaceCurrent
    && trySetItem(storage, STORE_KEY, JSON.stringify(state));
  if (canReplaceCurrent && !persistenceAvailable) {
    notices.push(STORAGE_RECOVERY_MESSAGE);
  }
  return { state, notices, persistenceAvailable };
}

export function persistState(storage, state, now = new Date().toISOString()) {
  const next = copy(state);
  next.meta.updatedAt = now;
  const problem = validateState(next);
  if (problem) throw new Error(`No se puede guardar: ${problem}`);

  const previous = storage.getItem(STORE_KEY);
  if (previous && !trySetItem(storage, BACKUP_STORE_KEY, previous)) {
    throw new Error(
      "No se pudo crear la copia de seguridad local. El estado anterior sigue intacto. "
      + "Exporta una copia y libera espacio del navegador.",
    );
  }
  if (!trySetItem(storage, STORE_KEY, JSON.stringify(next))) {
    throw new Error(
      "No se pudo guardar el cambio. El estado anterior sigue intacto. "
      + "Exporta una copia y libera espacio del navegador.",
    );
  }
  return next;
}

export function parseImportPayload(text, now = new Date().toISOString()) {
  let imported;
  try {
    imported = JSON.parse(text);
  } catch {
    throw new Error("El archivo no contiene JSON válido.");
  }

  if (imported?.schemaVersion === SCHEMA_VERSION) {
    const problem = validateState(imported);
    if (problem) throw new Error(`El archivo v2 no es válido: ${problem}`);
    return copy(imported);
  }

  if (isObject(imported?.days)) {
    return createEmptyState({ now, legacyDays: imported.days });
  }

  throw new Error("El archivo no es una copia compatible de Aurum Fit.");
}

export function normalizeExerciseName(name) {
  return String(name ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}

export function validateExerciseName(name) {
  const cleanName = String(name ?? "").trim().replace(/\s+/g, " ");
  if (cleanName.length < 2) return { error: "Escribe un nombre de al menos 2 caracteres." };
  if (cleanName.length > MAX_EXERCISE_NAME_LENGTH) {
    return { error: `El nombre no puede superar ${MAX_EXERCISE_NAME_LENGTH} caracteres.` };
  }
  return { value: cleanName };
}

function validateShortName(name, field, { min = 2, max }) {
  const value = String(name ?? "").trim().replace(/\s+/g, " ");
  if (value.length < min) return { error: `${field} debe tener al menos ${min} caracteres.` };
  if (value.length > max) return { error: `${field} no puede superar ${max} caracteres.` };
  return { value };
}

function findOrCreateExercise(
  state,
  name,
  { now = new Date().toISOString(), exerciseId } = {},
) {
  const result = validateExerciseName(name);
  if (result.error) throw new Error(result.error);
  const normalizedName = normalizeExerciseName(result.value);
  let exercise = state.training.exercises.find(
    (item) => (
      (exerciseId && item.id === exerciseId)
      || normalizeExerciseName(item.name) === normalizedName
    ),
  );
  if (!exercise) {
    exercise = {
      id: exerciseId ?? createId("exercise"),
      userId: state.owner.id,
      name: result.value,
      measurementType: "weight_reps",
      createdAt: now,
    };
    state.training.exercises.push(exercise);
  }
  return exercise;
}

function findRoutine(state, routineId) {
  const routine = state.training.routines.find((item) => item.id === routineId);
  if (!routine || routine.status !== "active") throw new Error("No se encontró una rutina activa.");
  return routine;
}

function findRoutineDay(state, routineId, routineDayId) {
  const routine = findRoutine(state, routineId);
  const routineDay = routine.days.find((item) => item.id === routineDayId);
  if (!routineDay) throw new Error("No se encontró el día de rutina.");
  return { routine, routineDay };
}

function recalculateOrder(items) {
  items.forEach((item, index) => {
    item.order = index + 1;
  });
}

export function createRoutine(
  state,
  name,
  { now = new Date().toISOString(), id = createId("routine") } = {},
) {
  const result = validateShortName(name, "El nombre de la rutina", {
    max: MAX_ROUTINE_NAME_LENGTH,
  });
  if (result.error) throw new Error(result.error);
  if (
    state.training.routines.some(
      (routine) => (
        routine.status === "active"
        && normalizeExerciseName(routine.name) === normalizeExerciseName(result.value)
      ),
    )
  ) {
    throw new Error("Ya existe una rutina activa con ese nombre.");
  }

  const routine = {
    id,
    userId: state.owner.id,
    name: result.value,
    status: "active",
    suggestedDayId: null,
    days: [],
    createdAt: now,
    updatedAt: now,
  };
  state.training.routines.push(routine);
  return routine;
}

export function addRoutineDay(
  state,
  routineId,
  name,
  {
    now = new Date().toISOString(),
    id = createId("routine-day"),
  } = {},
) {
  const routine = findRoutine(state, routineId);
  const result = validateShortName(name, "El nombre del día", {
    max: MAX_DAY_NAME_LENGTH,
  });
  if (result.error) throw new Error(result.error);
  if (
    routine.days.some(
      (routineDay) => (
        normalizeExerciseName(routineDay.name) === normalizeExerciseName(result.value)
      ),
    )
  ) {
    throw new Error("Ya existe un día con ese nombre en la rutina.");
  }

  const routineDay = {
    id,
    name: result.value,
    order: routine.days.length + 1,
    exercises: [],
  };
  routine.days.push(routineDay);
  routine.suggestedDayId ??= routineDay.id;
  routine.updatedAt = now;
  return routineDay;
}

export function setSuggestedRoutineDay(
  state,
  routineId,
  routineDayId,
  now = new Date().toISOString(),
) {
  const { routine } = findRoutineDay(state, routineId, routineDayId);
  routine.suggestedDayId = routineDayId;
  routine.updatedAt = now;
  return routine;
}

export function moveRoutineDay(
  state,
  routineId,
  routineDayId,
  direction,
  now = new Date().toISOString(),
) {
  const routine = findRoutine(state, routineId);
  const index = routine.days.findIndex((item) => item.id === routineDayId);
  if (index === -1) throw new Error("No se encontró el día de rutina.");
  const targetIndex = direction === "up" ? index - 1 : direction === "down" ? index + 1 : -1;
  if (targetIndex < 0 || targetIndex >= routine.days.length) {
    throw new Error("El día ya está en el límite de la rutina.");
  }
  [routine.days[index], routine.days[targetIndex]] = [
    routine.days[targetIndex],
    routine.days[index],
  ];
  recalculateOrder(routine.days);
  routine.updatedAt = now;
  return routine.days[targetIndex];
}

export function addExerciseToRoutineDay(
  state,
  routineId,
  routineDayId,
  name,
  {
    now = new Date().toISOString(),
    exerciseId,
    routineExerciseId = createId("routine-exercise"),
  } = {},
) {
  const { routine, routineDay } = findRoutineDay(state, routineId, routineDayId);
  const exercise = findOrCreateExercise(state, name, { now, exerciseId });
  if (routineDay.exercises.some((item) => item.exerciseId === exercise.id)) {
    throw new Error("Ese ejercicio ya está incluido en el día.");
  }
  const routineExercise = {
    id: routineExerciseId,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    order: routineDay.exercises.length + 1,
  };
  routineDay.exercises.push(routineExercise);
  routine.updatedAt = now;
  return routineExercise;
}

export function moveRoutineExercise(
  state,
  routineId,
  routineDayId,
  routineExerciseId,
  direction,
  now = new Date().toISOString(),
) {
  const { routine, routineDay } = findRoutineDay(state, routineId, routineDayId);
  const index = routineDay.exercises.findIndex((item) => item.id === routineExerciseId);
  if (index === -1) throw new Error("No se encontró el ejercicio de rutina.");
  const targetIndex = direction === "up" ? index - 1 : direction === "down" ? index + 1 : -1;
  if (targetIndex < 0 || targetIndex >= routineDay.exercises.length) {
    throw new Error("El ejercicio ya está en el límite del día.");
  }
  [routineDay.exercises[index], routineDay.exercises[targetIndex]] = [
    routineDay.exercises[targetIndex],
    routineDay.exercises[index],
  ];
  recalculateOrder(routineDay.exercises);
  routine.updatedAt = now;
  return routineDay.exercises[targetIndex];
}

export function removeExerciseFromRoutineDay(
  state,
  routineId,
  routineDayId,
  routineExerciseId,
  now = new Date().toISOString(),
) {
  const { routine, routineDay } = findRoutineDay(state, routineId, routineDayId);
  const index = routineDay.exercises.findIndex((item) => item.id === routineExerciseId);
  if (index === -1) throw new Error("No se encontró el ejercicio de rutina.");
  const [removed] = routineDay.exercises.splice(index, 1);
  recalculateOrder(routineDay.exercises);
  routine.updatedAt = now;
  return removed;
}

export function getActiveSession(state) {
  if (!state.training.activeSessionId) return null;
  return state.training.sessions.find(
    (session) => session.id === state.training.activeSessionId && session.status === "in_progress",
  ) ?? null;
}

export function startFreeSession(
  state,
  { now = new Date().toISOString(), id = createId("session") } = {},
) {
  const active = getActiveSession(state);
  if (active) throw new Error("Ya hay un entrenamiento en curso.");

  const session = {
    id,
    userId: state.owner.id,
    source: {
      type: "free",
      routineDayId: null,
      label: "Entrenamiento libre",
    },
    status: "in_progress",
    startedAt: now,
    endedAt: null,
    exercises: [],
  };
  state.training.sessions.push(session);
  state.training.activeSessionId = session.id;
  return session;
}

export function startSessionFromRoutineDay(
  state,
  routineId,
  routineDayId,
  {
    now = new Date().toISOString(),
    id = createId("session"),
    sessionExerciseIds = [],
  } = {},
) {
  const active = getActiveSession(state);
  if (active) throw new Error("Ya hay un entrenamiento en curso.");
  const { routine, routineDay } = findRoutineDay(state, routineId, routineDayId);
  if (!routineDay.exercises.length) {
    throw new Error("Añade al menos un ejercicio al día antes de entrenar.");
  }

  const session = {
    id,
    userId: state.owner.id,
    source: {
      type: "routine_day",
      routineId: routine.id,
      routineDayId: routineDay.id,
      label: `${routine.name} · ${routineDay.name}`,
      snapshot: {
        routineName: routine.name,
        routineDayName: routineDay.name,
      },
    },
    status: "in_progress",
    startedAt: now,
    endedAt: null,
    exercises: routineDay.exercises
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((routineExercise, index) => ({
        id: sessionExerciseIds[index] ?? createId("session-exercise"),
        exerciseId: routineExercise.exerciseId,
        exerciseName: routineExercise.exerciseName,
        order: index + 1,
        status: "active",
        sets: [],
      })),
  };
  state.training.sessions.push(session);
  state.training.activeSessionId = session.id;
  return session;
}

export function addExerciseToSession(
  state,
  sessionId,
  name,
  { now = new Date().toISOString(), exerciseId, sessionExerciseId } = {},
) {
  const session = state.training.sessions.find((item) => item.id === sessionId);
  if (!session || session.status !== "in_progress") {
    throw new Error("No hay una sesión editable con ese identificador.");
  }

  const checkedName = validateExerciseName(name);
  if (checkedName.error) throw new Error(checkedName.error);
  const normalizedName = normalizeExerciseName(checkedName.value);
  const alreadyAdded = session.exercises.some(
    (item) => (
      (exerciseId && item.exerciseId === exerciseId)
      || normalizeExerciseName(item.exerciseName) === normalizedName
    ),
  );
  if (alreadyAdded) {
    throw new Error("Este ejercicio ya está en la sesión.");
  }

  const exercise = findOrCreateExercise(state, name, { now, exerciseId });

  const sessionExercise = {
    id: sessionExerciseId ?? createId("session-exercise"),
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    order: session.exercises.length + 1,
    status: "active",
    sets: [],
  };
  session.exercises.push(sessionExercise);
  return sessionExercise;
}

function optionalNumber(rawValue, field, { min, max, step = null }) {
  if (rawValue === "" || rawValue === null || rawValue === undefined) return { value: null };
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return { error: `${field} debe ser un número.` };
  if (value < min || value > max) {
    return { error: `${field} debe estar entre ${min} y ${max}.` };
  }
  if (step && Math.abs(value / step - Math.round(value / step)) > Number.EPSILON * 10) {
    return { error: `${field} debe avanzar en pasos de ${step}.` };
  }
  return { value };
}

export function validateSetInput(input) {
  const repetitions = optionalNumber(input.reps, "Las repeticiones", { min: 1, max: 1000 });
  if (repetitions.error) return { error: repetitions.error };
  if (!Number.isInteger(repetitions.value)) {
    return { error: "Las repeticiones deben ser un número entero." };
  }

  const load = optionalNumber(input.loadKg, "El peso", { min: 0, max: 2000 });
  if (load.error) return { error: load.error };

  const rpe = optionalNumber(input.rpe, "El RPE", { min: 1, max: 10, step: 0.5 });
  if (rpe.error) return { error: rpe.error };

  const note = String(input.note ?? "").trim();
  if (note.length > MAX_NOTE_LENGTH) {
    return { error: `La nota no puede superar ${MAX_NOTE_LENGTH} caracteres.` };
  }

  return {
    value: {
      reps: repetitions.value,
      loadKg: load.value,
      rpe: rpe.value,
      isWarmup: Boolean(input.isWarmup),
      note,
    },
  };
}

function findEditableSessionExercise(state, sessionId, sessionExerciseId) {
  const session = state.training.sessions.find((item) => item.id === sessionId);
  if (!session || session.status !== "in_progress") {
    throw new Error("La sesión ya no se puede editar.");
  }
  const sessionExercise = session.exercises.find((item) => item.id === sessionExerciseId);
  if (!sessionExercise) throw new Error("No se encontró el ejercicio de la sesión.");
  return sessionExercise;
}

export function addSetToExercise(
  state,
  sessionId,
  sessionExerciseId,
  input,
  { now = new Date().toISOString(), id = createId("set") } = {},
) {
  const sessionExercise = findEditableSessionExercise(state, sessionId, sessionExerciseId);
  const result = validateSetInput(input);
  if (result.error) throw new Error(result.error);

  const workoutSet = {
    id,
    order: sessionExercise.sets.length + 1,
    status: "completed",
    ...result.value,
    completedAt: now,
    updatedAt: now,
  };
  sessionExercise.sets.push(workoutSet);
  return workoutSet;
}

export function updateSet(
  state,
  sessionId,
  sessionExerciseId,
  setId,
  input,
  { now = new Date().toISOString() } = {},
) {
  const sessionExercise = findEditableSessionExercise(state, sessionId, sessionExerciseId);
  const workoutSet = sessionExercise.sets.find((item) => item.id === setId);
  if (!workoutSet) throw new Error("No se encontró la serie.");
  const result = validateSetInput(input);
  if (result.error) throw new Error(result.error);

  Object.assign(workoutSet, result.value, { updatedAt: now });
  return workoutSet;
}

export function deleteSet(state, sessionId, sessionExerciseId, setId, now = new Date().toISOString()) {
  const sessionExercise = findEditableSessionExercise(state, sessionId, sessionExerciseId);
  const index = sessionExercise.sets.findIndex((item) => item.id === setId);
  if (index === -1) throw new Error("No se encontró la serie.");
  const [workoutSet] = sessionExercise.sets.splice(index, 1);
  sessionExercise.sets.forEach((item, position) => {
    item.order = position + 1;
  });
  state.training.undo = {
    type: "delete_set",
    sessionId,
    sessionExerciseId,
    set: workoutSet,
    originalIndex: index,
    deletedAt: now,
  };
  return workoutSet;
}

export function restoreLastDeletedSet(state) {
  const undo = state.training.undo;
  if (!undo || undo.type !== "delete_set") throw new Error("No hay una serie para recuperar.");
  const sessionExercise = findEditableSessionExercise(
    state,
    undo.sessionId,
    undo.sessionExerciseId,
  );
  const index = Math.min(undo.originalIndex, sessionExercise.sets.length);
  sessionExercise.sets.splice(index, 0, undo.set);
  sessionExercise.sets.forEach((item, position) => {
    item.order = position + 1;
  });
  state.training.undo = null;
  return undo.set;
}

export function completeSession(state, sessionId, now = new Date().toISOString()) {
  const session = state.training.sessions.find((item) => item.id === sessionId);
  if (!session || session.status !== "in_progress") {
    throw new Error("No se encontró una sesión en curso.");
  }
  const completedSets = session.exercises.reduce(
    (total, exercise) => total + exercise.sets.filter((item) => item.status === "completed").length,
    0,
  );
  if (!completedSets) throw new Error("Añade al menos una serie antes de finalizar.");
  session.status = "completed";
  session.endedAt = now;
  state.training.activeSessionId = null;
  state.training.undo = null;
  return session;
}

export function findLastComparableExercise(state, exerciseId, excludedSessionId = null) {
  const sessions = state.training.sessions
    .filter((session) => (
      session.id !== excludedSessionId
      && session.status === "completed"
      && session.exercises.some((exercise) => exercise.exerciseId === exerciseId)
    ))
    .sort((a, b) => (b.endedAt ?? b.startedAt).localeCompare(a.endedAt ?? a.startedAt));

  if (!sessions.length) return null;
  const session = sessions[0];
  const exercise = session.exercises.find((item) => item.exerciseId === exerciseId);
  return {
    sessionId: session.id,
    date: session.endedAt ?? session.startedAt,
    sets: exercise.sets.filter((item) => item.status === "completed").map(copy),
  };
}
