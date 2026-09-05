export const STORE_KEY = "aurum-fit-v2";
export const LEGACY_STORE_KEY = "fit-tracker-v1";
export const BACKUP_STORE_KEY = "aurum-fit-v2-backup";
export const SCHEMA_VERSION = 2;
export const PUBLIC_CLEANUP_VERSION = 2;

const MAX_EXERCISE_NAME_LENGTH = 80;
const MAX_NOTE_LENGTH = 300;
const MAX_ROUTINE_NAME_LENGTH = 80;
const MAX_DAY_NAME_LENGTH = 60;
const MIN_PLANNED_SETS = 1;
const MAX_PLANNED_SETS = 20;
const MIN_WEEKDAY = 0;
const MAX_WEEKDAY = 6;
const MAX_LABEL_PHOTO_BYTES = 15 * 1024 * 1024;
const SET_TYPES = new Set(["effective", "approach", "warmup"]);
const ACCENT_COLORS = new Set(["lime", "orange", "blue", "violet", "red", "steel"]);
const APPEARANCE_MODES = new Set(["system", "dark", "light"]);
const EFFORT_SCALES = new Set(["rir", "rpe", "none"]);
const ROUTINE_DAY_TYPES = new Set(["strength", "cardio"]);
export const CARDIO_ACTIVITY_TYPES = Object.freeze([
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
const CARDIO_TYPES = new Set(CARDIO_ACTIVITY_TYPES);
const CARDIO_DISTANCE_OPTIONAL = new Set(["indoor_cycling", "elliptical", "stair_climber"]);
const CARDIO_PACE_PER_KM_TYPES = new Set(["run", "treadmill_run", "trail_run", "walk", "hike"]);
const CARDIO_SWIM_TYPES = new Set(["pool_swim", "open_water_swim"]);
const CARDIO_SPEED_TYPES = new Set(["cycling", "indoor_cycling"]);
const CARDIO_ELEVATION_TYPES = new Set(["run", "trail_run", "walk", "hike", "cycling", "stair_climber"]);
const CARDIO_RESISTANCE_TYPES = new Set(["indoor_cycling", "elliptical", "rowing", "stair_climber"]);
const CARDIO_STEP_TYPES = new Set(["run", "treadmill_run", "trail_run", "walk", "hike"]);
const STORAGE_RECOVERY_MESSAGE =
  "No se pudo preparar el guardado local. Los datos existentes no se han borrado. "
  + "Exporta una copia y libera espacio del navegador antes de continuar.";

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function dateKeyFromIso(value) {
  return String(value).slice(0, 10);
}

function ensureLegacyDay(state, date) {
  state.legacy.days[date] ??= { foods: [], workouts: [] };
  state.legacy.days[date].foods ??= [];
  state.legacy.days[date].workouts ??= [];
  return state.legacy.days[date];
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

export function routineDayWeekdays(routineDay) {
  if (!isObject(routineDay)) return [];
  const values = Array.isArray(routineDay.weekdays)
    ? routineDay.weekdays
    : [routineDay.weekday];
  return [...new Set(values.map(Number))]
    .filter((weekday) => (
      Number.isInteger(weekday) && weekday >= MIN_WEEKDAY && weekday <= MAX_WEEKDAY
    ))
    .sort((left, right) => ((left + 6) % 7) - ((right + 6) % 7));
}

export function routineDayType(routineDay) {
  return routineDay?.type === "cardio" ? "cardio" : "strength";
}

export function cardioPaceSecondsPerKm(distanceKm, durationSeconds) {
  const distance = Number(distanceKm);
  const duration = Number(durationSeconds);
  if (!Number.isFinite(distance) || distance <= 0 || !Number.isFinite(duration) || duration <= 0) {
    return null;
  }
  return Math.round(duration / distance);
}

export function cardioDerivedMetrics(
  activityType,
  distanceKm,
  durationSeconds,
  { poolLengthM = null } = {},
) {
  const distance = Number(distanceKm);
  const duration = Number(durationSeconds);
  const hasDistance = Number.isFinite(distance) && distance > 0;
  const hasDuration = Number.isFinite(duration) && duration > 0;
  const distanceMeters = hasDistance ? distance * 1000 : null;
  const paceSecondsPerKm = CARDIO_PACE_PER_KM_TYPES.has(activityType) && hasDistance && hasDuration
    ? Math.round(duration / distance)
    : null;
  const paceSecondsPer100m = CARDIO_SWIM_TYPES.has(activityType) && hasDistance && hasDuration
    ? Math.round((duration / distanceMeters) * 100)
    : null;
  const paceSecondsPer500m = activityType === "rowing" && hasDistance && hasDuration
    ? Math.round((duration / distanceMeters) * 500)
    : null;
  const averageSpeedKmh = CARDIO_SPEED_TYPES.has(activityType) && hasDistance && hasDuration
    ? Number((distance / (duration / 3600)).toFixed(2))
    : null;
  const normalizedPoolLength = Number(poolLengthM);
  const poolLengths = activityType === "pool_swim"
    && hasDistance
    && Number.isFinite(normalizedPoolLength)
    && normalizedPoolLength > 0
    ? Number((distanceMeters / normalizedPoolLength).toFixed(1))
    : null;
  return {
    paceSecondsPerKm,
    paceSecondsPer100m,
    paceSecondsPer500m,
    averageSpeedKmh,
    poolLengths,
  };
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
      preferences: {
        accentColor: "lime",
        appearanceMode: "system",
        effortScale: "rir",
        defaultRestSeconds: 60,
        autoRestTimer: true,
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
  if (state.owner.preferences !== undefined) {
    if (!isObject(state.owner.preferences)) return "Las preferencias no son válidas.";
    if (
      state.owner.preferences.accentColor !== undefined
      && !ACCENT_COLORS.has(state.owner.preferences.accentColor)
    ) {
      return "El color de acento no es válido.";
    }
    if (
      state.owner.preferences.appearanceMode !== undefined
      && !APPEARANCE_MODES.has(state.owner.preferences.appearanceMode)
    ) {
      return "El modo de apariencia no es válido.";
    }
    if (
      state.owner.preferences.effortScale !== undefined
      && !EFFORT_SCALES.has(state.owner.preferences.effortScale)
    ) {
      return "La escala de esfuerzo no es válida.";
    }
    if (
      state.owner.preferences.autoRestTimer !== undefined
      && typeof state.owner.preferences.autoRestTimer !== "boolean"
    ) {
      return "El ajuste del temporizador automático no es válido.";
    }
    if (
      state.owner.preferences.defaultRestSeconds !== undefined
      && (
        !Number.isInteger(state.owner.preferences.defaultRestSeconds)
        || state.owner.preferences.defaultRestSeconds < 15
        || state.owner.preferences.defaultRestSeconds > 900
      )
    ) {
      return "El descanso por defecto no es válido.";
    }
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
      || (
        routine.accentColor !== undefined
        && routine.accentColor !== null
        && !ACCENT_COLORS.has(routine.accentColor)
      )
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
        || !ROUTINE_DAY_TYPES.has(routineDayType(routineDay))
        || (
          routineDay.cardioType !== undefined
          && routineDay.cardioType !== null
          && !CARDIO_TYPES.has(routineDay.cardioType)
        )
        || !Array.isArray(routineDay.exercises)
        || (
          routineDay.weekday !== undefined
          && routineDay.weekday !== null
          && (!Number.isInteger(routineDay.weekday)
            || routineDay.weekday < MIN_WEEKDAY
            || routineDay.weekday > MAX_WEEKDAY)
        )
        || (
          routineDay.weekdays !== undefined
          && (
            !Array.isArray(routineDay.weekdays)
            || routineDay.weekdays.some((weekday) => (
              !Number.isInteger(weekday) || weekday < MIN_WEEKDAY || weekday > MAX_WEEKDAY
            ))
          )
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
      for (const weekday of routineDayWeekdays(routineDay)) {
        if (assignedWeekdays.has(weekday)) {
          return "Dos rutinas activas no pueden compartir un día de la semana.";
        }
        assignedWeekdays.add(weekday);
      }
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
      || !ROUTINE_DAY_TYPES.has(session.sessionType ?? "strength")
      || !Array.isArray(session.exercises)
    ) {
      return "Hay una sesión no válida.";
    }
    if (session.sessionType === "cardio") {
      if (!isObject(session.cardio) || !CARDIO_TYPES.has(session.cardio.activityType ?? "run")) {
        return "Hay una actividad de cardio no válida.";
      }
      const cardioPending = session.status === "in_progress"
        && session.cardio.distanceKm === null
        && session.cardio.durationSeconds === null;
      if (!cardioPending) {
        const checkedCardio = validateCardioInput(session.cardio);
        if (checkedCardio.error) return "Hay una actividad de cardio no válida.";
      }
    } else if (session.cardio !== undefined && session.cardio !== null) {
      return "Una sesión de fuerza no puede contener cardio.";
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
  {
    now = new Date().toISOString(),
    id = createId("routine"),
    accentColor = null,
    dayType = "strength",
    cardioType = "run",
  } = {},
) {
  const result = validateShortName(name, "El nombre de la rutina", {
    max: MAX_ROUTINE_NAME_LENGTH,
  });
  if (result.error) throw new Error(result.error);
  if (accentColor !== null && !ACCENT_COLORS.has(accentColor)) {
    throw new Error("El color de la rutina no es válido.");
  }
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
    accentColor,
    status: "active",
    suggestedDayId: null,
    days: [],
    createdAt: now,
    updatedAt: now,
  };
  state.training.routines.push(routine);
  return routine;
}

export function createRoutineWithWeekdays(
  state,
  name,
  weekdays,
  {
    now = new Date().toISOString(),
    id = createId("routine"),
    accentColor = null,
    dayType = "strength",
    cardioType = "run",
  } = {},
) {
  if (!Array.isArray(weekdays) || !weekdays.length) {
    throw new Error("Selecciona al menos un día para la rutina.");
  }
  const normalizedWeekdays = [...new Set(weekdays.map(Number))];
  if (normalizedWeekdays.some((weekday) => (
    !Number.isInteger(weekday) || weekday < MIN_WEEKDAY || weekday > MAX_WEEKDAY
  ))) {
    throw new Error("Hay un día de la semana no válido.");
  }
  const occupied = new Map(
    state.training.routines
      .filter((routine) => routine.status === "active" && !routine.isDemo)
      .flatMap((routine) => routine.days.flatMap(
        (day) => routineDayWeekdays(day).map((weekday) => [weekday, routine.name]),
      )),
  );
  const conflict = normalizedWeekdays.find((weekday) => occupied.has(weekday));
  if (conflict !== undefined) {
    throw new Error(`El ${weekdayLabel(conflict)} ya está asignado a ${occupied.get(conflict)}.`);
  }
  state.training.routines
    .filter((routine) => routine.status === "active" && routine.isDemo)
    .forEach((routine) => routine.days.forEach((day) => {
      const remaining = routineDayWeekdays(day).filter((weekday) => !normalizedWeekdays.includes(weekday));
      if (remaining.length !== routineDayWeekdays(day).length) {
        day.weekdays = remaining;
        day.weekday = remaining[0] ?? null;
      }
    }));
  const routine = createRoutine(state, name, { now, id, accentColor });
  const sortedWeekdays = normalizedWeekdays
    .sort((left, right) => ((left + 6) % 7) - ((right + 6) % 7));
  const day = addRoutineDay(state, routine.id, sortedWeekdays.length === 1 ? weekdayLabel(sortedWeekdays[0]) : "Entrenamiento", {
    now,
    id: createId("routine-day"),
    type: dayType,
    cardioType,
  });
  setRoutineDayWeekdays(state, routine.id, day.id, sortedWeekdays, now);
  return routine;
}

export function setRoutineAccentColor(
  state,
  routineId,
  accentColor,
  now = new Date().toISOString(),
) {
  if (accentColor !== null && !ACCENT_COLORS.has(accentColor)) {
    throw new Error("El color de la rutina no es válido.");
  }
  const routine = findRoutine(state, routineId);
  routine.accentColor = accentColor;
  routine.updatedAt = now;
  return routine;
}

export function archiveRoutine(
  state,
  routineId,
  now = new Date().toISOString(),
) {
  const routine = findRoutine(state, routineId);
  routine.status = "archived";
  routine.updatedAt = now;
  return routine;
}

export function addRoutineDay(
  state,
  routineId,
  name,
  {
    now = new Date().toISOString(),
    id = createId("routine-day"),
    type = "strength",
    cardioType = "run",
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
  if (!ROUTINE_DAY_TYPES.has(type)) {
    throw new Error("El tipo de entrenamiento no es válido.");
  }
  if (type === "cardio" && !CARDIO_TYPES.has(cardioType)) {
    throw new Error("El tipo de cardio no es válido.");
  }

  const routineDay = {
    id,
    name: result.value,
    order: routine.days.length + 1,
    type,
    cardioType: type === "cardio" ? cardioType : null,
    weekday: null,
    exercises: [],
  };
  routine.days.push(routineDay);
  routine.suggestedDayId ??= routineDay.id;
  routine.updatedAt = now;
  return routineDay;
}

export function setRoutineDayWeekdays(
  state,
  routineId,
  routineDayId,
  weekdays,
  now = new Date().toISOString(),
) {
  const { routine, routineDay } = findRoutineDay(state, routineId, routineDayId);
  if (!Array.isArray(weekdays)) {
    throw new Error("Los días de repetición no son válidos.");
  }
  const values = [...new Set(weekdays.map(Number))]
    .sort((left, right) => ((left + 6) % 7) - ((right + 6) % 7));
  if (values.some((value) => (
    !Number.isInteger(value) || value < MIN_WEEKDAY || value > MAX_WEEKDAY
  ))) {
    throw new Error("Hay un día de la semana no válido.");
  }
  for (const value of values) {
    const conflict = state.training.routines
      .filter((candidate) => candidate.status === "active")
      .flatMap((candidate) => candidate.days.map((candidateDay) => ({ candidate, candidateDay })))
      .find(({ candidate, candidateDay }) => (
        routineDayWeekdays(candidateDay).includes(value)
        && !(candidate.id === routine.id && candidateDay.id === routineDay.id)
      ));
    if (!conflict) continue;
    if (conflict.candidate.isDemo && !routine.isDemo) {
      const remaining = routineDayWeekdays(conflict.candidateDay).filter((weekday) => weekday !== value);
      conflict.candidateDay.weekdays = remaining;
      conflict.candidateDay.weekday = remaining[0] ?? null;
      conflict.candidate.updatedAt = now;
    } else {
      throw new Error(
        `El ${weekdayLabel(value)} ya está asignado a ${conflict.candidate.name} · ${conflict.candidateDay.name}.`,
      );
    }
  }
  routineDay.weekdays = values;
  routineDay.weekday = values[0] ?? null;
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
  const value = weekday === "" || weekday === null || weekday === undefined
    ? null
    : Number(weekday);
  return setRoutineDayWeekdays(state, routineId, routineDayId, value === null ? [] : [value], now);
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
    plannedSets,
    repMin,
    repMax,
    note,
  } = {},
) {
  const { routine, routineDay } = findRoutineDay(state, routineId, routineDayId);
  if (routineDayType(routineDay) === "cardio") {
    throw new Error("Un día de cardio no usa ejercicios con series.");
  }
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
  const hasLegacyPlan = [plannedSets, repMin, repMax].some((value) => value !== undefined);
  if (hasLegacyPlan) {
    Object.assign(routineExercise, validateRoutineExercisePlan({ plannedSets, repMin, repMax, note }));
  }
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
    sessionType: "strength",
    status: "in_progress",
    startedAt: now,
    endedAt: null,
    cardio: null,
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
  const sessionType = routineDayType(routineDay);
  if (sessionType === "strength" && !routineDay.exercises.length) {
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
        routineAccentColor: routine.accentColor ?? null,
        routineDayType: sessionType,
        cardioType: routineDay.cardioType ?? null,
      },
    },
    sessionType,
    status: "in_progress",
    startedAt: now,
    endedAt: null,
    cardio: sessionType === "cardio"
      ? {
        id: null,
        activityType: routineDay.cardioType ?? "run",
        locationType: ["treadmill_run", "indoor_cycling", "pool_swim", "elliptical", "rowing", "stair_climber"]
          .includes(routineDay.cardioType) ? "indoor" : "outdoor",
        source: "manual",
        distanceKm: null,
        durationSeconds: null,
        paceSecondsPerKm: null,
        paceSecondsPer100m: null,
        paceSecondsPer500m: null,
        averageSpeedKmh: null,
        poolLengths: null,
        steps: null,
        elevationGainM: null,
        inclinePercent: null,
        poolLengthM: null,
        resistanceLevel: null,
        averageHeartRateBpm: null,
        caloriesKcal: null,
        cadencePerMinute: null,
        averagePowerWatts: null,
        note: "",
        completedAt: null,
        updatedAt: null,
      }
      : null,
    exercises: sessionType === "cardio"
      ? []
      : routineDay.exercises
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((routineExercise, index) => ({
        id: sessionExerciseIds[index] ?? createId("session-exercise"),
        exerciseId: routineExercise.exerciseId,
        exerciseName: routineExercise.exerciseName,
        order: index + 1,
        status: "active",
        isExtra: false,
        plannedSets: 0,
        repMin: null,
        repMax: null,
        planNote: "",
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

export function validateCardioInput(input) {
  const activityType = input.activityType ?? "run";
  if (!CARDIO_TYPES.has(activityType)) {
    return { error: "El tipo de cardio no es válido." };
  }

  const distance = optionalNumber(input.distanceKm, "La distancia", { min: 0.001, max: 1000, step: 0.001 });
  if (distance.error) return { error: distance.error };
  if (distance.value === null && !CARDIO_DISTANCE_OPTIONAL.has(activityType)) {
    return { error: "La distancia es obligatoria para esta actividad." };
  }

  const duration = optionalNumber(input.durationSeconds, "El tiempo", { min: 1, max: 7 * 24 * 60 * 60, step: 1 });
  if (duration.error) return { error: duration.error };
  if (duration.value === null) return { error: "El tiempo es obligatorio." };

  const steps = optionalNumber(input.steps, "Los pasos", { min: 0, max: 200000, step: 1 });
  if (steps.error) return { error: steps.error };
  if (steps.value !== null && !Number.isInteger(steps.value)) {
    return { error: "Los pasos deben ser un número entero." };
  }

  const elevationGain = optionalNumber(input.elevationGainM, "El desnivel positivo", { min: 0, max: 30000, step: 1 });
  if (elevationGain.error) return { error: elevationGain.error };
  const incline = optionalNumber(input.inclinePercent, "La inclinación", { min: 0, max: 40, step: 0.1 });
  if (incline.error) return { error: incline.error };
  const poolLength = optionalNumber(input.poolLengthM, "La longitud de piscina", { min: 10, max: 100, step: 0.1 });
  if (poolLength.error) return { error: poolLength.error };
  const resistance = optionalNumber(input.resistanceLevel, "La resistencia", { min: 0, max: 100, step: 0.1 });
  if (resistance.error) return { error: resistance.error };
  const averageHeartRate = optionalNumber(input.averageHeartRateBpm, "La frecuencia cardiaca media", { min: 20, max: 250, step: 1 });
  if (averageHeartRate.error) return { error: averageHeartRate.error };
  const calories = optionalNumber(input.caloriesKcal, "Las calorías", { min: 0, max: 20000, step: 1 });
  if (calories.error) return { error: calories.error };
  const cadence = optionalNumber(input.cadencePerMinute, "La cadencia", { min: 0, max: 300, step: 1 });
  if (cadence.error) return { error: cadence.error };
  const power = optionalNumber(input.averagePowerWatts, "La potencia media", { min: 0, max: 3000, step: 1 });
  if (power.error) return { error: power.error };

  const note = String(input.note ?? "").trim();
  if (note.length > MAX_NOTE_LENGTH) {
    return { error: `La nota no puede superar ${MAX_NOTE_LENGTH} caracteres.` };
  }

  const normalizedDistance = distance.value === null ? null : Number(distance.value.toFixed(3));
  const normalizedPoolLength = activityType === "pool_swim" ? poolLength.value : null;
  const derived = cardioDerivedMetrics(activityType, normalizedDistance, duration.value, {
    poolLengthM: normalizedPoolLength,
  });
  const isCyclingOrRowing = ["cycling", "indoor_cycling", "rowing"].includes(activityType);
  return {
    value: {
      activityType,
      locationType: ["treadmill_run", "indoor_cycling", "pool_swim", "elliptical", "rowing", "stair_climber"]
        .includes(activityType) ? "indoor" : "outdoor",
      source: "manual",
      distanceKm: normalizedDistance,
      durationSeconds: duration.value,
      ...derived,
      steps: CARDIO_STEP_TYPES.has(activityType) ? steps.value : null,
      elevationGainM: CARDIO_ELEVATION_TYPES.has(activityType) ? elevationGain.value : null,
      inclinePercent: activityType === "treadmill_run" ? incline.value : null,
      poolLengthM: normalizedPoolLength,
      resistanceLevel: CARDIO_RESISTANCE_TYPES.has(activityType) ? resistance.value : null,
      averageHeartRateBpm: averageHeartRate.value,
      caloriesKcal: calories.value,
      cadencePerMinute: isCyclingOrRowing ? cadence.value : null,
      averagePowerWatts: isCyclingOrRowing ? power.value : null,
      note,
    },
  };
}

export function validateLabelPhotoFile(file) {
  if (!file) return { value: null };
  if (!String(file.type ?? "").startsWith("image/")) {
    return { error: "Selecciona una fotografía válida." };
  }
  if (Number.isFinite(file.size) && file.size > MAX_LABEL_PHOTO_BYTES) {
    return { error: "La foto es demasiado grande. Recorta o reduce la imagen antes de guardarla." };
  }
  return { value: file };
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

export function addCardioToSession(
  state,
  sessionId,
  input,
  { now = new Date().toISOString(), id = createId("cardio") } = {},
) {
  const session = state.training.sessions.find((item) => item.id === sessionId);
  if (!session || session.status !== "in_progress") {
    throw new Error("No hay una sesión editable con ese identificador.");
  }
  if ((session.sessionType ?? "strength") !== "cardio") {
    throw new Error("Esta sesión no es de cardio.");
  }
  const result = validateCardioInput({
    ...input,
    activityType: session.cardio?.activityType ?? input.activityType ?? "run",
  });
  if (result.error) throw new Error(result.error);
  session.cardio = {
    id: session.cardio?.id ?? id,
    ...result.value,
    completedAt: now,
    updatedAt: now,
  };
  return session.cardio;
}

export function duplicateSet(
  state,
  sessionId,
  sessionExerciseId,
  setId,
  { now = new Date().toISOString(), id = createId("set") } = {},
) {
  const sessionExercise = findEditableSessionExercise(state, sessionId, sessionExerciseId);
  const source = sessionExercise.sets.find((item) => item.id === setId);
  if (!source) throw new Error("No se encontró la serie que quieres duplicar.");
  return addSetToExercise(state, sessionId, sessionExerciseId, {
    reps: source.reps,
    loadKg: source.loadKg,
    rir: source.rir,
    setType: source.setType ?? (source.isWarmup ? "warmup" : "effective"),
    note: source.note,
  }, { now, id });
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
  const isCardioSession = (session.sessionType ?? "strength") === "cardio";
  const completedSets = session.exercises.reduce(
    (total, exercise) => total + exercise.sets.filter((item) => item.status === "completed").length,
    0,
  );
  if (isCardioSession && !session.cardio?.completedAt) {
    throw new Error("Registra distancia y tiempo antes de finalizar el cardio.");
  }
  if (!isCardioSession && !completedSets) throw new Error("Añade al menos una serie antes de finalizar.");
  session.status = "completed";
  session.endedAt = now;
  session.durationSeconds = Math.max(
    0,
    Math.round((new Date(now).getTime() - new Date(session.startedAt).getTime()) / 1000),
  );
  if (isCardioSession) {
    const date = dateKeyFromIso(now);
    const day = ensureLegacyDay(state, date);
    const cardioMinutes = Math.round((Number(session.cardio.durationSeconds) || 0) / 60);
    const steps = Number(session.cardio.steps) || 0;
    day.cardioMinutes = (Number(day.cardioMinutes) || 0) + cardioMinutes;
    if (steps) day.steps = (Number(day.steps) || 0) + steps;
    day.workouts.push({
      type: "cardio",
      activityType: session.cardio.activityType,
      locationType: session.cardio.locationType,
      source: session.cardio.source,
      distanceKm: session.cardio.distanceKm,
      durationSeconds: session.cardio.durationSeconds,
      paceSecondsPerKm: session.cardio.paceSecondsPerKm,
      paceSecondsPer100m: session.cardio.paceSecondsPer100m,
      paceSecondsPer500m: session.cardio.paceSecondsPer500m,
      averageSpeedKmh: session.cardio.averageSpeedKmh,
      poolLengths: session.cardio.poolLengths,
      steps: session.cardio.steps,
      elevationGainM: session.cardio.elevationGainM,
      inclinePercent: session.cardio.inclinePercent,
      poolLengthM: session.cardio.poolLengthM,
      resistanceLevel: session.cardio.resistanceLevel,
      averageHeartRateBpm: session.cardio.averageHeartRateBpm,
      caloriesKcal: session.cardio.caloriesKcal,
      cadencePerMinute: session.cardio.cadencePerMinute,
      averagePowerWatts: session.cardio.averagePowerWatts,
      note: session.cardio.note,
      sessionId: session.id,
      completedAt: now,
    });
  }
  state.training.activeSessionId = null;
  state.training.undo = null;
  return session;
}

export function discardSession(state, sessionId) {
  const index = state.training.sessions.findIndex((item) => item.id === sessionId);
  const session = state.training.sessions[index];
  if (!session || session.status !== "in_progress" || state.training.activeSessionId !== sessionId) {
    throw new Error("No se encontró una sesión activa para descartar.");
  }
  state.training.sessions.splice(index, 1);
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
  state.owner.preferences ??= { accentColor: "lime", effortScale: "rir", defaultRestSeconds: 60 };
  state.owner.preferences.accentColor ??= "lime";
  state.owner.preferences.effortScale ??= "rir";
  state.owner.preferences.defaultRestSeconds ??= 60;
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

export function cleanupPublishedData(state) {
  ensureExtendedState(state);
  const removableRoutines = state.training.routines.filter(
    (routine) => (
      routine.isDemo
      || normalizeExerciseName(routine.name) === "rutina de prueba"
    ),
  );
  const removableRoutineIds = new Set(removableRoutines.map((routine) => routine.id));
  const removableRoutineDayIds = new Set(
    removableRoutines.flatMap((routine) => routine.days.map((day) => day.id)),
  );
  const removableSessionIds = new Set(
    state.training.sessions
      .filter((session) => (
        session.isDemo
        || removableRoutineIds.has(session.source?.routineId)
        || removableRoutineDayIds.has(session.source?.routineDayId)
        || normalizeExerciseName(session.source?.snapshot?.routineName) === "rutina de prueba"
      ))
      .map((session) => session.id),
  );

  if (removableSessionIds.has(state.training.activeSessionId)) {
    state.training.activeSessionId = null;
  }
  state.training.sessions = state.training.sessions.filter(
    (session) => !removableSessionIds.has(session.id),
  );
  state.training.routines = state.training.routines.filter(
    (routine) => !removableRoutineIds.has(routine.id),
  );
  removeDemoData(state);
  state.meta.demoDismissed = true;
  state.meta.publicCleanupVersion = PUBLIC_CLEANUP_VERSION;
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
      .flatMap((routine) => routine.days.flatMap((day) => routineDayWeekdays(day)))
      .filter((weekday) => weekday !== null && weekday !== undefined),
  );
  const routineSpecs = [
    {
      id: "demo-routine-push",
      name: "Demo · Empuje",
      days: [
        {
          id: "demo-day-push", name: "Entrenamiento", weekdays: [1, 4],
          exercises: [
            ["dataset-0025", "Press de banca con barra", 4, 6, 8, 70],
            ["dataset-0314", "Press inclinado con mancuernas", 3, 8, 10, 26],
            ["dataset-0426", "Press de hombro con mancuernas", 3, 8, 10, 20],
            ["dataset-0241", "Extensión de tríceps en polea", 3, 10, 12, 25],
          ],
        },
      ],
    },
    {
      id: "demo-routine-pull",
      name: "Demo · Tirón",
      days: [
        {
          id: "demo-day-pull", name: "Entrenamiento", weekdays: [2, 5],
          exercises: [
            ["dataset-2330", "Jalón al pecho en polea", 4, 8, 10, 55],
            ["dataset-0027", "Remo inclinado con barra", 4, 6, 8, 60],
            ["dataset-0180", "Remo sentado en polea baja", 3, 10, 12, 50],
            ["dataset-0294", "Curl de bíceps con mancuernas", 3, 8, 10, 12],
          ],
        },
      ],
    },
    {
      id: "demo-routine-legs",
      name: "Demo · Pierna",
      days: [
        {
          id: "demo-day-legs", name: "Entrenamiento", weekdays: [3, 6],
          exercises: [
            ["dataset-0043", "Sentadilla con barra", 4, 6, 8, 80],
            ["dataset-0085", "Peso muerto rumano con barra", 3, 8, 10, 75],
            ["dataset-0585", "Extensión de piernas en máquina", 3, 10, 12, 45],
            ["dataset-1373", "Elevación de gemelos de pie", 4, 12, 15, 50],
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
      const availableWeekdays = (daySpec.weekdays ?? [daySpec.weekday])
        .filter((weekday) => !assignedWeekdays.has(weekday));
      day.demoWeekday = availableWeekdays[0] ?? daySpec.weekday;
      if (availableWeekdays.length) {
        setRoutineDayWeekdays(state, routine.id, day.id, availableWeekdays, now);
        availableWeekdays.forEach((weekday) => assignedWeekdays.add(weekday));
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
      routineDayWeekdays(day).forEach((weekday) => {
        demoDaysByWeekday.set(weekday, { routine, day });
      });
    });
  });

  for (let offset = 60; offset >= 1; offset -= 1) {
    const date = new Date(createdAt);
    date.setHours(18, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const dateKey = demoDateKey(date);
    if (!state.legacy.days[dateKey]) {
      const variation = offset % 7;
      state.legacy.days[dateKey] = {
        isDemo: true,
        weight: Number((81.1 - (60 - offset) * 0.025).toFixed(1)),
        waist: Number((88.1 - (60 - offset) * 0.02).toFixed(1)),
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
      const load = Number(planned?.demoLoad ?? 20) + Math.floor((60 - offset) / 7) * 2.5;
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
  state.meta.publicCleanupVersion = PUBLIC_CLEANUP_VERSION;
  return state;
  } finally {
    state.training.activeSessionId = preservedActiveSessionId;
  }
}

// ---------------------------------------------------------------------------
// Mapa muscular
//
// El dataset trae tres campos de músculo con vocabularios distintos e
// incoherentes entre sí: `target` (19 valores, limpio), `secondaryMuscles`
// (40 valores, con cola de ruido) y `muscleGroup` (29 valores, con duplicados
// como "traps"/"trapezius" o "quads"/"quadriceps"). Antes de pintar nada hay
// que reducirlos a un vocabulario propio y estable, porque es el que se guarda
// en el historial y tiene que sobrevivir a futuras versiones del catálogo.
// ---------------------------------------------------------------------------

export const MUSCLE_REGIONS = Object.freeze([
  { id: "neck", labelEs: "Cuello", views: ["front", "back"] },
  { id: "traps", labelEs: "Trapecios", views: ["back"] },
  { id: "shoulders", labelEs: "Hombros", views: ["front", "back"] },
  { id: "chest", labelEs: "Pecho", views: ["front"] },
  { id: "serratus", labelEs: "Serrato", views: ["front"] },
  { id: "biceps", labelEs: "Bíceps", views: ["front"] },
  { id: "triceps", labelEs: "Tríceps", views: ["back"] },
  { id: "forearms", labelEs: "Antebrazos", views: ["front", "back"] },
  { id: "abs", labelEs: "Abdomen", views: ["front"] },
  { id: "obliques", labelEs: "Oblicuos", views: ["front"] },
  { id: "lats", labelEs: "Dorsales", views: ["back"] },
  { id: "upper_back", labelEs: "Espalda superior", views: ["back"] },
  { id: "lower_back", labelEs: "Lumbares", views: ["back"] },
  { id: "glutes", labelEs: "Glúteos", views: ["back"] },
  { id: "hip_flexors", labelEs: "Flexores de cadera", views: ["front"] },
  { id: "quads", labelEs: "Cuádriceps", views: ["front"] },
  { id: "hamstrings", labelEs: "Isquiotibiales", views: ["back"] },
  { id: "adductors", labelEs: "Aductores", views: ["front"] },
  { id: "abductors", labelEs: "Abductores", views: ["front"] },
  { id: "calves", labelEs: "Gemelos", views: ["back"] },
  { id: "tibialis", labelEs: "Tibial anterior", views: ["front"] },
]);

// Cubre los 50 valores distintos que aparecen hoy en data/exercises.es.json
// entre `target`, `secondaryMuscles` y `muscleGroup`. La prueba
// "el vocabulario muscular cubre el dataset entero" falla si el catálogo
// introduce un valor nuevo sin traducir aquí.
const MUSCLE_SYNONYMS = Object.freeze({
  neck: "neck",
  sternocleidomastoid: "neck",
  traps: "traps",
  trapezius: "traps",
  "levator scapulae": "traps",
  delts: "shoulders",
  deltoids: "shoulders",
  shoulders: "shoulders",
  "rear deltoids": "shoulders",
  "rotator cuff": "shoulders",
  pectorals: "chest",
  chest: "chest",
  "upper chest": "chest",
  "serratus anterior": "serratus",
  biceps: "biceps",
  brachialis: "biceps",
  triceps: "triceps",
  forearms: "forearms",
  "wrist flexors": "forearms",
  "wrist extensors": "forearms",
  wrists: "forearms",
  hands: "forearms",
  "grip muscles": "forearms",
  abs: "abs",
  abdominals: "abs",
  core: "abs",
  "lower abs": "abs",
  obliques: "obliques",
  lats: "lats",
  "latissimus dorsi": "lats",
  "upper back": "upper_back",
  rhomboids: "upper_back",
  back: "upper_back",
  "lower back": "lower_back",
  spine: "lower_back",
  glutes: "glutes",
  "hip flexors": "hip_flexors",
  quads: "quads",
  quadriceps: "quads",
  hamstrings: "hamstrings",
  adductors: "adductors",
  "inner thighs": "adductors",
  groin: "adductors",
  abductors: "abductors",
  calves: "calves",
  soleus: "calves",
  shins: "tibialis",
  ankles: "tibialis",
  "ankle stabilizers": "tibialis",
  feet: "tibialis",
  // El sistema cardiovascular no es una región del mapa: el cardio no pinta
  // músculos. Se reconoce para poder ignorarlo de forma explícita.
  "cardiovascular system": null,
});

const MUSCLE_REGION_IDS = new Set(MUSCLE_REGIONS.map((region) => region.id));

export function muscleRegionLabel(regionId) {
  return MUSCLE_REGIONS.find((region) => region.id === regionId)?.labelEs ?? null;
}

export function normalizeMuscleName(value) {
  if (typeof value !== "string") return null;
  const key = value.trim().toLowerCase();
  if (!key) return null;
  if (MUSCLE_REGION_IDS.has(key)) return key;
  return MUSCLE_SYNONYMS[key] ?? null;
}

// Devuelve el vocabulario propio de un ejercicio del catálogo. Un músculo nunca
// aparece a la vez como directo y secundario: si el dataset lo repite, manda el
// trabajo directo.
export function normalizeCatalogMuscles(entry) {
  if (!entry || typeof entry !== "object") return { direct: [], secondary: [] };
  const direct = [];
  const secondary = [];
  const push = (list, regionId) => {
    if (regionId && !direct.includes(regionId) && !list.includes(regionId)) list.push(regionId);
  };
  push(direct, normalizeMuscleName(entry.target));
  [entry.muscleGroup, ...(Array.isArray(entry.secondaryMuscles) ? entry.secondaryMuscles : [])]
    .forEach((value) => push(secondary, normalizeMuscleName(value)));
  return { direct, secondary };
}

export function sanitizeExerciseMuscles(muscles) {
  if (!muscles || typeof muscles !== "object") return null;
  const clean = (list) => (Array.isArray(list)
    ? [...new Set(list.filter((id) => MUSCLE_REGION_IDS.has(id)))]
    : []);
  const direct = clean(muscles.direct);
  const secondary = clean(muscles.secondary).filter((id) => !direct.includes(id));
  if (!direct.length && !secondary.length) return null;
  return { direct, secondary };
}

// ---------------------------------------------------------------------------
// Volumen por músculo
//
// Regla deliberada: el trabajo directo y la implicación secundaria NO se suman
// ni se ponderan. En el dataset "hombros" aparece como secundario en 444 de
// 1.317 ejercicios; sumarlo dejaría el mapa encendido siempre y dejaría de
// informar. Además, cualquier coeficiente de activación que inventásemos no
// tendría respaldo y convertiría el mapa en una medida médica que no es.
//
// Solo cuentan las series efectivas: calentamiento y aproximación preparan, no
// son volumen de trabajo. Es la misma regla que ya usa la gráfica de progreso.
// ---------------------------------------------------------------------------

export function emptyMuscleVolume() {
  const byRegion = {};
  MUSCLE_REGIONS.forEach((region) => {
    byRegion[region.id] = { directSets: 0, secondarySets: 0, exercises: [] };
  });
  return {
    byRegion,
    effectiveSets: 0,
    unmappedSets: 0,
    unmappedExercises: [],
    indirectOnlySets: 0,
    indirectOnlyExercises: [],
  };
}

export function computeMuscleVolume(state, { fromIso = null, toIso = null, sessionId = null } = {}) {
  const volume = emptyMuscleVolume();
  const musclesByExerciseId = new Map(
    (state?.training?.exercises ?? []).map((exercise) => [exercise.id, sanitizeExerciseMuscles(exercise.muscles)]),
  );

  (state?.training?.sessions ?? []).forEach((session) => {
    if (sessionId) {
      if (session.id !== sessionId) return;
    } else {
      // La sesión en curso también cuenta: lo que ya has hecho hoy es trabajo
      // hecho, y el mapa semanal del Diario se mueve mientras entrenas.
      if (session.status !== "completed" && session.status !== "in_progress") return;
      const stamp = session.status === "completed"
        ? (session.endedAt ?? session.startedAt)
        : session.startedAt;
      if (!stamp) return;
      if (fromIso && stamp < fromIso) return;
      if (toIso && stamp > toIso) return;
    }

    (session.exercises ?? []).forEach((sessionExercise) => {
      const effective = (sessionExercise.sets ?? []).filter((item) => (
        item.status === "completed" && (item.setType ?? "effective") === "effective"
      )).length;
      if (!effective) return;
      volume.effectiveSets += effective;

      const muscles = musclesByExerciseId.get(sessionExercise.exerciseId);
      if (!muscles) {
        volume.unmappedSets += effective;
        if (!volume.unmappedExercises.includes(sessionExercise.exerciseName)) {
          volume.unmappedExercises.push(sessionExercise.exerciseName);
        }
        return;
      }

      const note = (regionId, kind) => {
        const region = volume.byRegion[regionId];
        if (!region) return;
        region[kind === "direct" ? "directSets" : "secondarySets"] += effective;
        const existing = region.exercises.find((item) => item.name === sessionExercise.exerciseName);
        if (existing) {
          existing.sets += effective;
          if (kind === "direct") existing.kind = "direct";
        } else {
          region.exercises.push({ name: sessionExercise.exerciseName, sets: effective, kind });
        }
      };
      // Un ejercicio puede tener implicación pero ningún músculo principal
      // (el dataset marca así los 29 de cardio, entre ellos los burpees). Esas
      // series no colorean ninguna zona, así que se declaran en lugar de
      // desaparecer del recuento.
      if (!muscles.direct.length) {
        volume.indirectOnlySets += effective;
        if (!volume.indirectOnlyExercises.includes(sessionExercise.exerciseName)) {
          volume.indirectOnlyExercises.push(sessionExercise.exerciseName);
        }
      }
      muscles.direct.forEach((regionId) => note(regionId, "direct"));
      muscles.secondary.forEach((regionId) => note(regionId, "secondary"));
    });
  });

  Object.values(volume.byRegion).forEach((region) => {
    region.exercises.sort((a, b) => b.sets - a.sets || a.name.localeCompare(b.name, "es"));
  });
  return volume;
}

// Cuatro tramos, no un gradiente continuo: el objetivo es leer "esto lo tengo
// cubierto" o "esto lo estoy dejando", no comparar 7 series contra 8.
export const MUSCLE_INTENSITY_STEPS = Object.freeze([
  { id: "none", labelEs: "Sin trabajo directo", min: 0 },
  { id: "low", labelEs: "Poco volumen", min: 1 },
  { id: "medium", labelEs: "Volumen medio", min: 5 },
  { id: "high", labelEs: "Volumen alto", min: 10 },
]);

export function muscleIntensity(directSets) {
  const sets = Number(directSets) || 0;
  let current = MUSCLE_INTENSITY_STEPS[0];
  MUSCLE_INTENSITY_STEPS.forEach((step) => {
    if (sets >= step.min) current = step;
  });
  return current.id;
}
