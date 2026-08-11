export const STORE_KEY = "aurum-fit-v2";
export const LEGACY_STORE_KEY = "fit-tracker-v1";
export const BACKUP_STORE_KEY = "aurum-fit-v2-backup";
export const SCHEMA_VERSION = 2;

const MAX_EXERCISE_NAME_LENGTH = 80;
const MAX_NOTE_LENGTH = 300;
const MAX_ROUTINE_NAME_LENGTH = 80;
const MAX_DAY_NAME_LENGTH = 60;
const MIN_PLANNED_SETS = 1;
const MAX_PLANNED_SETS = 20;
const MIN_WEEKDAY = 0;
const MAX_WEEKDAY = 6;
const SET_TYPES = new Set(["effective", "approach", "warmup"]);
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
      profile: {
        birthDate: null,
        heightCm: null,
        weightKg: null,
      },
      targets: {
        calories: 2200,
        protein: 170,
        steps: 10000,
      },
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
    nutrition: {
      recipes: [],
      labels: [],
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
  if (
    state.nutrition !== undefined
    && (
      !isObject(state.nutrition)
      || !Array.isArray(state.nutrition.recipes)
      || !Array.isArray(state.nutrition.labels)
    )
  ) {
    return "El bloque de nutrición no es válido.";
  }

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
        || (
          routineDay.weekday !== undefined
          && routineDay.weekday !== null
          && (!Number.isInteger(routineDay.weekday)
            || routineDay.weekday < MIN_WEEKDAY
            || routineDay.weekday > MAX_WEEKDAY)
        )
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
          || (
            routineExercise.plannedSets !== undefined
            && (!Number.isInteger(routineExercise.plannedSets)
              || routineExercise.plannedSets < MIN_PLANNED_SETS
              || routineExercise.plannedSets > MAX_PLANNED_SETS)
          )
          || (
            routineExercise.repMin !== undefined
            && (!Number.isInteger(routineExercise.repMin) || routineExercise.repMin < 1)
          )
          || (
            routineExercise.repMax !== undefined
            && (!Number.isInteger(routineExercise.repMax) || routineExercise.repMax < 1)
          )
          || (
            Number.isInteger(routineExercise.repMin)
            && Number.isInteger(routineExercise.repMax)
            && routineExercise.repMin > routineExercise.repMax
          )
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

  const assignedWeekdays = new Set();
  for (const routine of state.training.routines) {
    if (routine.status !== "active") continue;
    for (const routineDay of routine.days) {
      if (routineDay.weekday === null || routineDay.weekday === undefined) continue;
      if (assignedWeekdays.has(routineDay.weekday)) {
        return "Dos rutinas activas no pueden compartir un día de la semana.";
      }
      assignedWeekdays.add(routineDay.weekday);
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
        || !["active", "skipped"].includes(sessionExercise.status ?? "active")
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
    weekday: null,
    exercises: [],
  };
  routine.days.push(routineDay);
  routine.suggestedDayId ??= routineDay.id;
  routine.updatedAt = now;
  return routineDay;
}

export function setRoutineDayWeekday(
  state,
  routineId,
  routineDayId,
  weekday,
  now = new Date().toISOString(),
) {
  const { routine, routineDay } = findRoutineDay(state, routineId, routineDayId);
  const value = weekday === "" || weekday === null || weekday === undefined
    ? null
    : Number(weekday);
  if (value !== null && (!Number.isInteger(value) || value < MIN_WEEKDAY || value > MAX_WEEKDAY)) {
    throw new Error("El día de la semana no es válido.");
  }
  if (value !== null) {
    const conflict = state.training.routines
      .filter((candidate) => candidate.status === "active")
      .flatMap((candidate) => candidate.days.map((candidateDay) => ({ candidate, candidateDay })))
      .find(({ candidate, candidateDay }) => (
        candidateDay.weekday === value
        && !(candidate.id === routine.id && candidateDay.id === routineDay.id)
      ));
    if (conflict) {
      throw new Error(
        `El ${weekdayLabel(value)} ya está asignado a ${conflict.candidate.name} · ${conflict.candidateDay.name}.`,
      );
    }
  }
  routineDay.weekday = value;
  routine.updatedAt = now;
  return routineDay;
}

export function weekdayLabel(value) {
  return ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][value] ?? "día";
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
    plannedSets = 3,
    repMin = 8,
    repMax = 12,
    note = "",
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
    ...validateRoutineExercisePlan({ plannedSets, repMin, repMax, note }),
  };
  routineDay.exercises.push(routineExercise);
  routine.updatedAt = now;
  return routineExercise;
}

function validateRoutineExercisePlan(input) {
  const plannedSets = Number(input.plannedSets);
  const repMin = Number(input.repMin);
  const repMax = Number(input.repMax);
  const note = String(input.note ?? "").trim();
  if (!Number.isInteger(plannedSets) || plannedSets < MIN_PLANNED_SETS || plannedSets > MAX_PLANNED_SETS) {
    throw new Error(`Las series previstas deben estar entre ${MIN_PLANNED_SETS} y ${MAX_PLANNED_SETS}.`);
  }
  if (!Number.isInteger(repMin) || !Number.isInteger(repMax) || repMin < 1 || repMax > 1000) {
    throw new Error("El rango de repeticiones debe usar enteros entre 1 y 1000.");
  }
  if (repMin > repMax) throw new Error("El mínimo de repeticiones no puede superar al máximo.");
  if (note.length > MAX_NOTE_LENGTH) {
    throw new Error(`La nota no puede superar ${MAX_NOTE_LENGTH} caracteres.`);
  }
  return { plannedSets, repMin, repMax, note };
}

export function updateRoutineExercisePlan(
  state,
  routineId,
  routineDayId,
  routineExerciseId,
  input,
  now = new Date().toISOString(),
) {
  const { routine, routineDay } = findRoutineDay(state, routineId, routineDayId);
  const routineExercise = routineDay.exercises.find((item) => item.id === routineExerciseId);
  if (!routineExercise) throw new Error("No se encontró el ejercicio de rutina.");
  Object.assign(routineExercise, validateRoutineExercisePlan(input));
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
        isExtra: false,
        plannedSets: routineExercise.plannedSets ?? 3,
        repMin: routineExercise.repMin ?? 8,
        repMax: routineExercise.repMax ?? 12,
        planNote: routineExercise.note ?? "",
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
    isExtra: true,
    plannedSets: 0,
    repMin: null,
    repMax: null,
    planNote: "",
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

  const rir = optionalNumber(input.rir, "El RIR", { min: 0, max: 5, step: 1 });
  if (rir.error) return { error: rir.error };

  const note = String(input.note ?? "").trim();
  if (note.length > MAX_NOTE_LENGTH) {
    return { error: `La nota no puede superar ${MAX_NOTE_LENGTH} caracteres.` };
  }

  const setType = input.setType ?? (input.isWarmup ? "warmup" : "effective");
  if (!SET_TYPES.has(setType)) {
    return { error: "El tipo de serie no es válido." };
  }

  return {
    value: {
      reps: repetitions.value,
      loadKg: load.value,
      rpe: rpe.value,
      rir: rir.value,
      setType,
      isWarmup: setType === "warmup",
      note,
    },
  };
}

export function setSessionExerciseSkipped(state, sessionId, sessionExerciseId, skipped = true) {
  const sessionExercise = findEditableSessionExercise(state, sessionId, sessionExerciseId);
  if (skipped && sessionExercise.sets.length) {
    throw new Error("No puedes omitir un ejercicio que ya tiene series completadas.");
  }
  sessionExercise.status = skipped ? "skipped" : "active";
  return sessionExercise;
}

export function replaceSessionExerciseForToday(
  state,
  sessionId,
  sessionExerciseId,
  name,
  { now = new Date().toISOString(), exerciseId } = {},
) {
  const sessionExercise = findEditableSessionExercise(state, sessionId, sessionExerciseId);
  if (sessionExercise.sets.length) {
    throw new Error("No puedes sustituir un ejercicio que ya tiene series completadas.");
  }
  const session = state.training.sessions.find((item) => item.id === sessionId);
  const checkedName = validateExerciseName(name);
  if (checkedName.error) throw new Error(checkedName.error);
  const normalizedName = normalizeExerciseName(checkedName.value);
  if (session.exercises.some((item) => (
    item.id !== sessionExerciseId
    && (
      (exerciseId && item.exerciseId === exerciseId)
      || normalizeExerciseName(item.exerciseName) === normalizedName
    )
  ))) {
    throw new Error("Este ejercicio ya está en la sesión.");
  }
  const replacement = findOrCreateExercise(state, name, { now, exerciseId });
  sessionExercise.substitutedFrom ??= {
    exerciseId: sessionExercise.exerciseId,
    exerciseName: sessionExercise.exerciseName,
  };
  sessionExercise.exerciseId = replacement.id;
  sessionExercise.exerciseName = replacement.name;
  sessionExercise.status = "active";
  sessionExercise.isSubstitution = true;
  return sessionExercise;
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

function demoDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function ensureExtendedState(state) {
  state.owner.profile ??= { birthDate: null, heightCm: null, weightKg: null };
  state.owner.targets ??= { calories: 2200, protein: 170, steps: 10000 };
  state.nutrition ??= { recipes: [], labels: [] };
}

export function removeDemoData(state) {
  ensureExtendedState(state);
  const demoSessionIds = new Set(
    state.training.sessions.filter((session) => session.isDemo).map((session) => session.id),
  );
  if (demoSessionIds.has(state.training.activeSessionId)) state.training.activeSessionId = null;
  state.training.sessions = state.training.sessions.filter((session) => !session.isDemo);
  state.training.routines = state.training.routines.filter((routine) => !routine.isDemo);
  Object.entries(state.legacy.days).forEach(([date, day]) => {
    if (day?.isDemo) delete state.legacy.days[date];
  });
  state.nutrition.recipes = state.nutrition.recipes.filter((recipe) => !recipe.isDemo);
  state.nutrition.labels = state.nutrition.labels.filter((label) => !label.isDemo);
  const referencedExerciseIds = new Set([
    ...state.training.routines.flatMap((routine) => (
      routine.days.flatMap((day) => day.exercises.map((exercise) => exercise.exerciseId))
    )),
    ...state.training.sessions.flatMap((session) => (
      session.exercises.map((exercise) => exercise.exerciseId)
    )),
  ]);
  state.training.exercises = state.training.exercises.filter(
    (exercise) => !exercise.isDemo || referencedExerciseIds.has(exercise.id),
  );
  state.meta.demoSeedVersion = null;
  return state;
}

export function seedDemoData(state, { now = new Date().toISOString() } = {}) {
  ensureExtendedState(state);
  removeDemoData(state);
  const preservedActiveSessionId = state.training.activeSessionId;
  state.training.activeSessionId = null;
  try {
  const createdAt = new Date(now);
  const assignedWeekdays = new Set(
    state.training.routines
      .filter((routine) => routine.status === "active")
      .flatMap((routine) => routine.days.map((day) => day.weekday))
      .filter((weekday) => weekday !== null && weekday !== undefined),
  );
  const routineSpecs = [
    {
      id: "demo-routine-push",
      name: "Demo · Empuje",
      days: [
        {
          id: "demo-day-push-a", name: "Push A", weekday: 1,
          exercises: [
            ["dataset-0025", "Press de banca con barra", 4, 6, 8, 70],
            ["dataset-0314", "Press inclinado con mancuernas", 3, 8, 10, 26],
            ["dataset-0426", "Press de hombro con mancuernas", 3, 8, 10, 20],
            ["dataset-0241", "Extensión de tríceps en polea", 3, 10, 12, 25],
          ],
        },
        {
          id: "demo-day-push-b", name: "Push B", weekday: 4,
          exercises: [
            ["dataset-0576", "Press de pecho en máquina", 4, 8, 10, 65],
            ["dataset-0308", "Aperturas con mancuernas", 3, 10, 12, 14],
            ["dataset-0334", "Elevaciones laterales con mancuernas", 4, 12, 15, 8],
            ["dataset-0241", "Extensión de tríceps en polea", 3, 10, 12, 27.5],
          ],
        },
      ],
    },
    {
      id: "demo-routine-pull",
      name: "Demo · Tirón",
      days: [
        {
          id: "demo-day-pull-a", name: "Pull A", weekday: 2,
          exercises: [
            ["dataset-2330", "Jalón al pecho en polea", 4, 8, 10, 55],
            ["dataset-0027", "Remo inclinado con barra", 4, 6, 8, 60],
            ["dataset-0180", "Remo sentado en polea baja", 3, 10, 12, 50],
            ["dataset-0294", "Curl de bíceps con mancuernas", 3, 8, 10, 12],
          ],
        },
        {
          id: "demo-day-pull-b", name: "Pull B", weekday: 5,
          exercises: [
            ["dataset-1326", "Dominadas supinas", 4, 6, 8, 0],
            ["dataset-0180", "Remo sentado en polea baja", 4, 8, 10, 52.5],
            ["dataset-0334", "Elevaciones laterales con mancuernas", 3, 12, 15, 8],
            ["dataset-0313", "Curl martillo con mancuernas", 3, 10, 12, 14],
          ],
        },
      ],
    },
    {
      id: "demo-routine-legs",
      name: "Demo · Pierna",
      days: [
        {
          id: "demo-day-legs-a", name: "Pierna A", weekday: 3,
          exercises: [
            ["dataset-0043", "Sentadilla con barra", 4, 6, 8, 80],
            ["dataset-0085", "Peso muerto rumano con barra", 3, 8, 10, 75],
            ["dataset-0585", "Extensión de piernas en máquina", 3, 10, 12, 45],
            ["dataset-1373", "Elevación de gemelos de pie", 4, 12, 15, 50],
          ],
        },
        {
          id: "demo-day-legs-b", name: "Pierna B", weekday: 6,
          exercises: [
            ["dataset-1463", "Prensa de piernas a 45°", 4, 8, 10, 140],
            ["dataset-0599", "Curl femoral sentado", 3, 10, 12, 45],
            ["dataset-1409", "Puente de glúteo con barra", 4, 8, 10, 90],
            ["dataset-1460", "Zancadas caminando", 3, 10, 12, 20],
          ],
        },
      ],
    },
  ];
  const demoDaysByWeekday = new Map();
  routineSpecs.forEach((routineSpec) => {
    const routine = createRoutine(state, routineSpec.name, { id: routineSpec.id, now });
    routine.isDemo = true;
    routineSpec.days.forEach((daySpec) => {
      const day = addRoutineDay(state, routine.id, daySpec.name, { id: daySpec.id, now });
      day.isDemo = true;
      day.demoWeekday = daySpec.weekday;
      if (!assignedWeekdays.has(daySpec.weekday)) {
        setRoutineDayWeekday(state, routine.id, day.id, daySpec.weekday, now);
        assignedWeekdays.add(daySpec.weekday);
      }
      daySpec.exercises.forEach(([exerciseId, name, plannedSets, repMin, repMax, demoLoad]) => {
        const routineExercise = addExerciseToRoutineDay(state, routine.id, day.id, name, {
          exerciseId,
          routineExerciseId: `demo-routine-exercise-${day.id}-${exerciseId}`,
          plannedSets,
          repMin,
          repMax,
          note: "Datos de ejemplo",
          now,
        });
        routineExercise.demoLoad = demoLoad;
        const localExercise = state.training.exercises.find((exercise) => exercise.id === exerciseId);
        if (localExercise) localExercise.isDemo = true;
      });
      demoDaysByWeekday.set(daySpec.weekday, { routine, day });
    });
  });

  for (let offset = 35; offset >= 1; offset -= 1) {
    const date = new Date(createdAt);
    date.setHours(18, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const dateKey = demoDateKey(date);
    if (!state.legacy.days[dateKey]) {
      const variation = offset % 7;
      state.legacy.days[dateKey] = {
        isDemo: true,
        weight: Number((80.4 - (35 - offset) * 0.025).toFixed(1)),
        waist: Number((87.2 - (35 - offset) * 0.02).toFixed(1)),
        steps: 7200 + ((offset * 683) % 6100),
        cardioMinutes: offset % 3 === 0 ? 25 : 0,
        sleep: 6 + (offset % 4),
        energy: 6 + (offset % 3),
        hunger: 4 + (offset % 4),
        shoulderPain: 0,
        notes: offset % 9 === 0 ? "Día de ejemplo: energía alta." : "",
        foods: [
          { name: "Avena con yogur y frutos rojos", meal: "Desayuno", calories: 510 + variation, protein: 34, carbs: 65, fat: 12, isDemo: true },
          { name: "Pollo con arroz y verduras", meal: "Comida", calories: 675 + variation, protein: 58, carbs: 78, fat: 14, isDemo: true },
          { name: "Salmón con patata", meal: "Cena", calories: 650 + variation, protein: 50, carbs: 52, fat: 25, isDemo: true },
        ],
        workouts: [],
      };
    }
    const scheduled = demoDaysByWeekday.get(date.getDay());
    if (!scheduled || offset % 11 === 0) continue;
    const session = startSessionFromRoutineDay(state, scheduled.routine.id, scheduled.day.id, {
      id: `demo-session-${dateKey}`,
      now: date.toISOString(),
      sessionExerciseIds: scheduled.day.exercises.map(
        (exercise) => `demo-session-exercise-${dateKey}-${exercise.exerciseId}`,
      ),
    });
    session.isDemo = true;
    session.exercises.forEach((sessionExercise, exerciseIndex) => {
      const planned = scheduled.day.exercises.find(
        (exercise) => exercise.exerciseId === sessionExercise.exerciseId,
      );
      const load = Number(planned?.demoLoad ?? 20) + Math.floor((35 - offset) / 7) * 2.5;
      if (exerciseIndex === 0 && load > 0) {
        addSetToExercise(state, session.id, sessionExercise.id, {
          reps: 5,
          loadKg: Math.max(0, load - 15),
          rir: 4,
          setType: "approach",
          note: "Aproximación de ejemplo",
        }, { id: `demo-set-${dateKey}-${exerciseIndex}-approach`, now: date.toISOString() });
      }
      const setCount = Math.min(planned?.plannedSets ?? 3, 4);
      for (let setIndex = 0; setIndex < setCount; setIndex += 1) {
        addSetToExercise(state, session.id, sessionExercise.id, {
          reps: Math.max(planned?.repMin ?? 8, (planned?.repMax ?? 10) - (setIndex % 2)),
          loadKg: load,
          rir: Math.min(3, 1 + setIndex),
          setType: "effective",
          note: setIndex === 0 ? "Serie de ejemplo" : "",
        }, { id: `demo-set-${dateKey}-${exerciseIndex}-${setIndex}`, now: date.toISOString() });
      }
    });
    const end = new Date(date);
    end.setMinutes(end.getMinutes() + 62);
    completeSession(state, session.id, end.toISOString());
  }

  const todayKey = demoDateKey(createdAt);
  if (!state.legacy.days[todayKey]) {
    state.legacy.days[todayKey] = {
      isDemo: true,
      weight: 79.6,
      waist: 86.4,
      steps: 8432,
      cardioMinutes: 0,
      sleep: 8,
      energy: 8,
      hunger: 5,
      shoulderPain: 0,
      notes: "Datos de ejemplo para visualizar la aplicación completa.",
      foods: [
        { name: "Avena con yogur y frutos rojos", meal: "Desayuno", calories: 512, protein: 38, carbs: 66, fat: 11, isDemo: true },
        { name: "Pollo con arroz y verduras", meal: "Comida", calories: 678, protein: 58, carbs: 79, fat: 14, isDemo: true },
        { name: "Salmón con patata", meal: "Cena", calories: 652, protein: 46, carbs: 55, fat: 25, isDemo: true },
      ],
      workouts: [],
    };
  }
  state.nutrition.recipes.push(
    {
      id: "demo-recipe-bolognese", isDemo: true, name: "Espaguetis boloñesa", servings: 2,
      caloriesPerServing: 562, proteinPerServing: 39, carbs: 68, fat: 15,
      ingredients: ["Pasta seca · 180 g", "Ternera magra · 200 g", "Tomate triturado · 180 g", "Cebolla y zanahoria · 120 g"],
    },
    {
      id: "demo-recipe-chicken-rice", isDemo: true, name: "Pollo con arroz y verduras", servings: 1,
      caloriesPerServing: 678, proteinPerServing: 58, carbs: 79, fat: 14,
      ingredients: ["Pechuga de pollo · 200 g", "Arroz cocido · 220 g", "Verduras · 180 g", "Aceite de oliva · 10 g"],
    },
    {
      id: "demo-recipe-oatmeal", isDemo: true, name: "Avena con yogur y frutos rojos", servings: 1,
      caloriesPerServing: 512, proteinPerServing: 38, carbs: 66, fat: 11,
      ingredients: ["Avena · 60 g", "Yogur alto en proteína · 250 g", "Frutos rojos · 100 g", "Crema de cacahuete · 15 g"],
    },
  );
  state.nutrition.labels.push(
    { id: "demo-label-yogurt", isDemo: true, name: "Yogur alto en proteína", brand: "Marca de ejemplo", calories100: 59, protein100: 10, carbs100: 4, fat100: 0.5, photoName: "etiqueta-ejemplo.jpg" },
    { id: "demo-label-pasta", isDemo: true, name: "Pasta seca", brand: "Marca de ejemplo", calories100: 350, protein100: 12, carbs100: 70, fat100: 1.5, photoName: "paquete-ejemplo.jpg" },
  );
  state.meta.demoSeedVersion = 1;
  return state;
  } finally {
    state.training.activeSessionId = preservedActiveSessionId;
  }
}
