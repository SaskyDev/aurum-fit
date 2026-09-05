import {
  CARDIO_ACTIVITY_TYPES,
  MUSCLE_INTENSITY_STEPS,
  MUSCLE_REGIONS,
  addExerciseToRoutineDay,
  addExerciseToSession,
  addCardioToSession,
  addRoutineDay,
  archiveRoutine,
  addSetToExercise,
  cardioDerivedMetrics,
  completeSession,
  cleanupPublishedData,
  computeMuscleVolume,
  createRoutineWithWeekdays,
  deleteSet,
  duplicateSet,
  discardSession,
  findLastComparableExercise,
  getActiveSession,
  loadAppState,
  PUBLIC_CLEANUP_VERSION,
  moveRoutineExercise,
  muscleIntensity,
  muscleRegionLabel,
  normalizeCatalogMuscles,
  normalizeExerciseName,
  parseImportPayload,
  persistState,
  removeDemoData,
  removeExerciseFromRoutineDay,
  replaceSessionExerciseForToday,
  restoreLastDeletedSet,
  routineDayType,
  routineDayWeekdays,
  seedDemoData,
  setSessionExerciseSkipped,
  setRoutineDayWeekday,
  setRoutineDayWeekdays,
  setRoutineAccentColor,
  startFreeSession,
  startSessionFromRoutineDay,
  updateSet,
  validateLabelPhotoFile,
} from "./core.js?v=58";

const defaultTargets = { calories: 2200, protein: 170, steps: 10000 };
const defaultPreferences = {
  accentColor: "lime",
  appearanceMode: "system",
  effortScale: "rir",
  defaultRestSeconds: 60,
  autoRestTimer: true,
};
const appearanceLabels = { system: "Automático", dark: "Oscuro", light: "Claro" };
const accentLabels = {
  lime: "Lima",
  orange: "Naranja",
  blue: "Azul",
  violet: "Violeta",
  red: "Rojo",
  steel: "Acero",
};
const accentPalettes = {
  lime: { accent: "#c7f464", accentStrong: "#a7df2f", success: "#b7ef57", rgb: "199, 244, 100" },
  orange: { accent: "#ff9f1c", accentStrong: "#f97316", success: "#fbbf24", rgb: "255, 159, 28" },
  blue: { accent: "#38bdf8", accentStrong: "#0ea5e9", success: "#7dd3fc", rgb: "56, 189, 248" },
  violet: { accent: "#a78bfa", accentStrong: "#8b5cf6", success: "#c4b5fd", rgb: "167, 139, 250" },
  red: { accent: "#fb7185", accentStrong: "#f43f5e", success: "#fda4af", rgb: "251, 113, 133" },
  steel: { accent: "#e5e7eb", accentStrong: "#cbd5e1", success: "#f8fafc", rgb: "229, 231, 235" },
};
const lightAccentPalettes = {
  lime: { accent: "#587a00", accentStrong: "#426100", success: "#467000", rgb: "88, 122, 0" },
  orange: { accent: "#b84c00", accentStrong: "#963d00", success: "#a84a00", rgb: "184, 76, 0" },
  blue: { accent: "#0077a8", accentStrong: "#005f88", success: "#006b97", rgb: "0, 119, 168" },
  violet: { accent: "#6d43c0", accentStrong: "#5833a4", success: "#6540ae", rgb: "109, 67, 192" },
  red: { accent: "#bd3551", accentStrong: "#9f2942", success: "#ac304a", rgb: "189, 53, 81" },
  steel: { accent: "#475569", accentStrong: "#334155", success: "#3f4d60", rgb: "71, 85, 105" },
};
const cardioActivityCatalog = [
  { type: "run", label: "Correr", family: "A pie", icon: "cardio-run", metric: "pace", fields: ["distance", "steps", "elevation", "heartRate", "calories"], help: "Distancia y tiempo; calculamos tu ritmo medio." },
  { type: "treadmill_run", label: "Correr en cinta", family: "A pie", icon: "cardio-treadmill", metric: "pace", fields: ["distance", "steps", "incline", "heartRate", "calories"], help: "Añade la inclinación media si la conoces." },
  { type: "trail_run", label: "Carrera de montaña", family: "Montaña", icon: "cardio-trail", metric: "pace", fields: ["distance", "steps", "elevation", "heartRate", "calories"], help: "El desnivel positivo queda separado del ritmo." },
  { type: "walk", label: "Andar", family: "A pie", icon: "cardio-walk", metric: "pace", fields: ["distance", "steps", "elevation", "heartRate", "calories"], help: "Registra únicamente los pasos de esta actividad." },
  { type: "hike", label: "Senderismo", family: "Montaña", icon: "cardio-hike", metric: "pace", fields: ["distance", "steps", "elevation", "heartRate", "calories"], help: "Distancia, tiempo y desnivel para comparar rutas." },
  { type: "cycling", label: "Bici exterior", family: "Bici", icon: "cardio-bike", metric: "speed", fields: ["distance", "elevation", "cadence", "power", "heartRate", "calories"], help: "Calculamos velocidad media, no ritmo por kilómetro." },
  { type: "indoor_cycling", label: "Bici estática", family: "Bici", icon: "cardio-spin", metric: "speed", distanceOptional: true, fields: ["distance", "resistance", "cadence", "power", "heartRate", "calories"], help: "Solo el tiempo es obligatorio; distancia y resistencia son opcionales." },
  { type: "pool_swim", label: "Piscina", family: "Agua", icon: "cardio-pool", metric: "swim", distanceUnit: "m", fields: ["distance", "pool", "heartRate", "calories"], help: "Calculamos ritmo por 100 m y largos según la piscina." },
  { type: "open_water_swim", label: "Aguas abiertas", family: "Agua", icon: "cardio-open-water", metric: "swim", distanceUnit: "m", fields: ["distance", "heartRate", "calories"], help: "Distancia y tiempo; el GPS llegará con la app móvil." },
  { type: "elliptical", label: "Elíptica", family: "Máquinas", icon: "cardio-elliptical", metric: "time", distanceOptional: true, fields: ["distance", "resistance", "heartRate", "calories"], help: "El tiempo manda; añade distancia o nivel solo si la máquina los muestra." },
  { type: "rowing", label: "Remo", family: "Máquinas", icon: "cardio-row", metric: "rowing", fields: ["distance", "resistance", "cadence", "power", "heartRate", "calories"], help: "Calculamos el ritmo estándar por 500 m." },
  { type: "stair_climber", label: "Escaladora", family: "Máquinas", icon: "cardio-stairs", metric: "time", distanceOptional: true, fields: ["resistance", "elevation", "heartRate", "calories"], help: "Tiempo, nivel y metros ascendidos si la máquina los ofrece." },
].filter((activity) => CARDIO_ACTIVITY_TYPES.includes(activity.type));
const cardioActivityByType = new Map(cardioActivityCatalog.map((activity) => [activity.type, activity]));
const $ = (id) => document.getElementById(id);

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const today = localDateKey();
const loadResult = loadAppState(localStorage);
let state = loadResult.state;
let catalog = [];
let diaryPeriod = "total";
let replacementTargetExerciseId = null;
let expandedSessionExerciseId = null;
const exerciseViewStates = new Map();
let catalogResultLimit = 4;
let trainingView = "routines";
let selectedRoutineId = null;
let routinePlannerView = "calendar";
let plannerMonthDate = new Date(today + "T12:00:00");
let selectedPlannedWorkout = null;
let settingsView = "menu";
const pendingSetSubmissions = new Set();
const restTimerStates = new Map();
const noticeTimers = new Map();
let sessionElapsedIntervalId = null;
let navAnimationTimer = null;

function getTargets(targetState = state) {
  return { ...defaultTargets, ...(targetState.owner?.targets ?? {}) };
}

function getPreferences(targetState = state) {
  return { ...defaultPreferences, ...(targetState.owner?.preferences ?? {}) };
}

function ensureUiState(targetState) {
  targetState.owner ??= {};
  targetState.owner.profile ??= { birthDate: null, heightCm: null, weightKg: null };
  targetState.owner.targets ??= { ...defaultTargets };
  targetState.owner.preferences ??= { ...defaultPreferences };
  targetState.owner.preferences.accentColor ??= defaultPreferences.accentColor;
  targetState.owner.preferences.appearanceMode ??= defaultPreferences.appearanceMode;
  targetState.owner.preferences.effortScale ??= defaultPreferences.effortScale;
  targetState.owner.preferences.defaultRestSeconds ??= defaultPreferences.defaultRestSeconds;
  targetState.owner.preferences.autoRestTimer ??= defaultPreferences.autoRestTimer;
  targetState.nutrition ??= { recipes: [], labels: [] };
  targetState.nutrition.recipes ??= [];
  targetState.nutrition.labels ??= [];
  targetState.meta ??= {};
  return targetState;
}

ensureUiState(state);

const darkModeMedia = window.matchMedia("(prefers-color-scheme: dark)");

function applyThemePreferences(targetState = state) {
  const preferences = getPreferences(targetState);
  const root = document.documentElement;
  const appearanceMode = appearanceLabels[preferences.appearanceMode]
    ? preferences.appearanceMode
    : defaultPreferences.appearanceMode;
  const resolvedTheme = appearanceMode === "system"
    ? (darkModeMedia.matches ? "dark" : "light")
    : appearanceMode;
  const themePalettes = resolvedTheme === "light" ? lightAccentPalettes : accentPalettes;
  const palette = themePalettes[preferences.accentColor] ?? themePalettes.lime;
  root.dataset.accent = preferences.accentColor;
  root.dataset.themePreference = appearanceMode;
  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
  root.style.setProperty("--accent", palette.accent);
  root.style.setProperty("--accent-strong", palette.accentStrong);
  root.style.setProperty("--success", palette.success);
  root.style.setProperty("--accent-rgb", palette.rgb);
  root.style.setProperty("--on-accent", resolvedTheme === "light" ? "#ffffff" : "#0b0f0d");
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content",
    resolvedTheme === "dark" ? "#080b09" : "#f3f5f0",
  );
}

applyThemePreferences(state);
darkModeMedia.addEventListener?.("change", () => {
  if (getPreferences().appearanceMode === "system") applyThemePreferences(state);
});

function setSettingsView(view = "menu") {
  settingsView = ["menu", "profile", "goals", "appearance", "workout", "data"].includes(view)
    ? view
    : "menu";
  document.querySelectorAll("[data-settings-view]").forEach((element) => {
    const active = element.dataset.settingsView === settingsView;
    element.hidden = !active;
    element.classList.toggle("active", active);
  });
  const titles = {
    menu: "Ajustes",
    profile: "Perfil",
    goals: "Objetivos",
    appearance: "Apariencia",
    workout: "Entrenamiento",
    data: "Datos y copias",
  };
  $("settingsPageTitle").textContent = titles[settingsView] ?? "Ajustes";
  $("settingsSaveBtn").hidden = !["profile", "goals", "appearance", "workout"].includes(settingsView);
  $("settingsCloseBtn").setAttribute(
    "aria-label",
    settingsView === "menu" ? "Volver al diario" : "Volver a ajustes",
  );
}

if (state.meta.publicCleanupVersion !== PUBLIC_CLEANUP_VERSION) {
  try {
    const cleaned = structuredClone(state);
    cleanupPublishedData(cleaned);
    state = persistState(localStorage, cleaned);
    loadResult.notices.push(
      "Se retiraron los datos de demostración y las rutinas identificadas exactamente como pruebas. Tus registros reales se conservaron.",
    );
  } catch (error) {
    console.warn("No se pudo completar la limpieza segura de datos ficticios.", error);
    loadResult.notices.push(
      "No se pudo retirar la demostración automáticamente. Tus datos existentes no se modificaron.",
    );
  }
}

function showNotice(message, { error = false, area = "trainingNotice" } = {}) {
  const notice = $(area);
  notice.textContent = message;
  notice.classList.toggle("error", error);
  notice.hidden = false;
  if (noticeTimers.has(area)) window.clearTimeout(noticeTimers.get(area));
  const timerId = window.setTimeout(() => {
    if (notice.textContent === message) notice.hidden = true;
    noticeTimers.delete(area);
  }, 4200);
  noticeTimers.set(area, timerId);
}

function commit(change, successMessage = "Guardado automáticamente.") {
  try {
    const next = structuredClone(state);
    change(next);
    state = persistState(localStorage, next);
    render();
    if (successMessage) showNotice(successMessage);
    return true;
  } catch (error) {
    showNotice(error.message || "No se pudo guardar el cambio.", { error: true });
    return false;
  }
}

function getLegacyDay(date = $("entryDate").value || today, create = false, targetState = state) {
  const days = targetState.legacy.days;
  if (!days[date] && create) days[date] = { foods: [], workouts: [] };
  return days[date] ?? { foods: [], workouts: [] };
}

function numberValue(id) {
  const raw = $(id).value;
  return raw === "" ? null : Number(raw);
}

function normalizeCatalogSearch(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es");
}

const catalogNameTranslations = [
  [/\bclose[- ]grip\b/g, "agarre cerrado"],
  [/\bwide[- ]grip\b/g, "agarre amplio"],
  [/\breverse[- ]grip\b/g, "agarre inverso"],
  [/\bone[- ]arm\b/g, "unilateral"],
  [/\bsingle[- ]leg\b/g, "unilateral de una pierna"],
  [/\bone[- ]leg\b/g, "unilateral de una pierna"],
  [/\bbent[- ]over\b/g, "inclinado"],
  [/\bseated\b/g, "sentado"],
  [/\bstanding\b/g, "de pie"],
  [/\bkneeling\b/g, "arrodillado"],
  [/\blying\b/g, "tumbado"],
  [/\bdecline\b/g, "declinado"],
  [/\bincline\b/g, "inclinado"],
  [/\boverhead\b/g, "por encima de la cabeza"],
  [/\bfront\b/g, "frontal"],
  [/\brear\b/g, "posterior"],
  [/\blateral\b/g, "lateral"],
  [/\bbench press\b/g, "press de banca"],
  [/\bchest press\b/g, "press de pecho"],
  [/\bshoulder press\b/g, "press de hombro"],
  [/\bmilitary press\b/g, "press militar"],
  [/\btriceps extension\b/g, "extensión de tríceps"],
  [/\btricep extension\b/g, "extensión de tríceps"],
  [/\btriceps pushdown\b/g, "extensión de tríceps"],
  [/\btricep pushdown\b/g, "extensión de tríceps"],
  [/\bbiceps curl\b/g, "curl de bíceps"],
  [/\bconcentration curl\b/g, "curl de concentración"],
  [/\bhammer curl\b/g, "curl martillo"],
  [/\bpreacher curl\b/g, "curl predicador"],
  [/\breverse curl\b/g, "curl inverso"],
  [/\bstanding curl\b/g, "curl de pie"],
  [/\bseated row\b/g, "remo sentado"],
  [/\bhigh row\b/g, "remo alto"],
  [/\blow row\b/g, "remo bajo"],
  [/\brear delt row\b/g, "remo posterior"],
  [/\brow\b/g, "remo"],
  [/\bpulldown\b/g, "jalón"],
  [/\bpull[- ]up\b/g, "dominadas"],
  [/\bchin[- ]up\b/g, "dominadas supinas"],
  [/\bpush[- ]up\b/g, "flexiones"],
  [/\bchest fly\b/g, "aperturas de pecho"],
  [/\bfly\b/g, "aperturas"],
  [/\bfront squat\b/g, "sentadilla frontal"],
  [/\bback squat\b/g, "sentadilla trasera"],
  [/\bsplit squat\b/g, "sentadilla dividida"],
  [/\bsquat\b/g, "sentadilla"],
  [/\bdeadlift\b/g, "peso muerto"],
  [/\bgood morning\b/g, "buenos días"],
  [/\blunge\b/g, "zancada"],
  [/\bcalf raise\b/g, "elevación de gemelos"],
  [/\bleg raise\b/g, "elevación de piernas"],
  [/\bleg curl\b/g, "curl femoral"],
  [/\bleg extension\b/g, "extensión de piernas"],
  [/\bhip thrust\b/g, "empuje de cadera"],
  [/\bglute bridge\b/g, "puente de glúteo"],
  [/\bglute kickback\b/g, "patada de glúteo"],
  [/\bpullover\b/g, "pullover"],
  [/\bshoulder raise\b/g, "elevación de hombros"],
  [/\bside bend\b/g, "inclinación lateral"],
  [/\bair bike\b/g, "bicicleta de aire"],
  [/\bankle circles\b/g, "círculos de tobillo"],
  [/\bheel touchers\b/g, "toques de talón"],
  [/\blateral raise\b/g, "elevación lateral"],
  [/\bfront raise\b/g, "elevación frontal"],
  [/\bcrunch\b/g, "abdominal"],
  [/\bsit[- ]up\b/g, "abdominal completo"],
  [/\bplank\b/g, "plancha"],
  [/\bstretch\b/g, "estiramiento"],
  [/\bjump\b/g, "salto"],
  [/\bstep[- ]up\b/g, "subida al banco"],
  [/\bshrug\b/g, "encogimiento"],
  [/\bwrist curl\b/g, "curl de muñeca"],
  [/\bbarbell\b/g, "con barra"],
  [/\bdumbbell\b/g, "con mancuerna"],
  [/\bcable\b/g, "en polea"],
  [/\bband\b/g, "con banda"],
  [/\bbodyweight\b/g, "con peso corporal"],
  [/\blever\b/g, "en máquina"],
  [/\bassisted\b/g, "asistido"],
  [/\bexercise ball\b/g, "fitball"],
  [/\bstability ball\b/g, "fitball"],
  [/\bmale\b|\bfemale\b/g, ""],
];

function translatedCatalogName(entry) {
  if (entry.nameLocale === "es") return entry.nameEs;
  let value = normalizeCatalogSearch(entry.nameOriginal);
  let equipmentSuffix = "";
  const equipment = value.match(/^(barbell|dumbbell|cable|band|bodyweight|lever)\s+/);
  if (equipment) {
    equipmentSuffix = {
      barbell: "con barra",
      dumbbell: "con mancuerna",
      cable: "en polea",
      band: "con banda",
      bodyweight: "con peso corporal",
      lever: "en máquina",
    }[equipment[1]];
    value = value.slice(equipment[0].length);
  }
  catalogNameTranslations.forEach(([pattern, replacement]) => {
    value = value.replace(pattern, replacement);
  });
  value = value
    .replace(/^(inclinado|declinado) (press de (banca|pecho)|remo)/, "$2 $1")
    .replace(/^(por encima de la cabeza) (press de hombro|press militar)/, "$2 $1")
    .replace(/^(de pie|sentado|arrodillado|tumbado) (unilateral )?(remo|jalón|curl|press|extensión|elevación)/, "$3 $2$1")
    .replace(/^(unilateral )?(elevación|press|extensión|curl) /, "$2 $1")
    .replace(/^unilateral (remo|jalón|curl|press|extensión|elevación)/, "$1 unilateral")
    .replace(/^unilateral de una pierna (elevación|sentadilla|peso muerto)/, "$1 unilateral de una pierna")
    .replace(/^asistido (.+)$/, "$1 asistido")
    .replace(/\s+/g, " ")
    .replace(/\s+([,)])/g, "$1")
    .trim();
  return `${value}${equipmentSuffix ? ` ${equipmentSuffix}` : ""}`
    .replace(/^./, (character) => character.toLocaleUpperCase("es"));
}

function catalogDerivedAliases(entry) {
  const source = normalizeCatalogSearch(`${entry.nameEs} ${entry.nameOriginal}`);
  const aliases = [];
  if (/\b(row|remo)\b/.test(source)) aliases.push("remo");
  if (/\b(pulldown|jalon)\b/.test(source)) aliases.push("jalon", "jalón");
  if (/\b(one arm|one-arm|unilateral)\b/.test(source)) {
    aliases.push("unilateral", "una mano", "un brazo");
  }
  return aliases;
}

function catalogSearchText(entry) {
  return normalizeCatalogSearch([
    entry.nameEs,
    entry.nameOriginal,
    entry.categoryEs,
    entry.equipmentEs,
    entry.target,
    entry.targetEs,
    entry.muscleGroup,
    entry.muscleGroupEs,
    ...(entry.searchAliasesEs ?? []),
    ...(entry.secondaryMuscles ?? []),
    ...catalogDerivedAliases(entry),
  ].join(" "));
}

function catalogSearchScore(entry, query, usedExerciseIds = new Set()) {
  const normalizedName = normalizeCatalogSearch(translatedCatalogName(entry));
  const normalizedOriginal = normalizeCatalogSearch(entry.nameOriginal);
  const normalizedTarget = normalizeCatalogSearch(entry.targetEs ?? entry.target);
  const normalizedMuscleGroup = normalizeCatalogSearch(entry.muscleGroupEs ?? entry.muscleGroup);
  let value = usedExerciseIds.has(entry.id) ? 100 : 0;
  if (query && (normalizedName === query || normalizedOriginal === query)) value += 80;
  else if (query && (normalizedName.startsWith(query) || normalizedOriginal.startsWith(query))) value += 50;
  else if (query && (normalizedName.includes(query) || normalizedOriginal.includes(query))) value += 25;
  if (query && normalizedTarget === query) value += 40;
  else if (query && normalizedTarget.includes(query)) value += 20;
  if (query && normalizedMuscleGroup.includes(query)) value += 15;
  if (entry.nameLocale === "es") value += 30;
  return value;
}

function sum(items, key) {
  return items.reduce((total, item) => total + (Number(item?.[key]) || 0), 0);
}

function sortedLegacyDates() {
  return Object.keys(state.legacy.days).sort((a, b) => b.localeCompare(a));
}

function lastNLegacyDates(count) {
  return sortedLegacyDates().slice(0, count);
}

function formatValue(value, suffix = "") {
  return value === null || value === undefined || Number.isNaN(value) ? "—" : `${value}${suffix}`;
}

function formatDateTime(value) {
  if (!value) return "Fecha desconocida";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function dateKeyFromIso(value) {
  return localDateKey(new Date(value));
}

function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

function formatShortDate(dateKey) {
  if (dateKey === today) return "Hoy";
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date(`${dateKey}T12:00:00`));
}

function periodStart(period = diaryPeriod) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  if (period === "day") return date;
  if (period === "week") {
    const mondayOffset = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - mondayOffset);
    return date;
  }
  if (period === "month") {
    date.setDate(1);
    return date;
  }
  const candidates = [
    ...Object.keys(state.legacy.days).map((key) => new Date(`${key}T00:00:00`)),
    ...state.training.sessions
      .filter((session) => session.status === "completed" && session.endedAt)
      .map((session) => new Date(session.endedAt)),
  ].filter((dateValue) => !Number.isNaN(dateValue.getTime()));
  if (!candidates.length) return date;
  const first = new Date(Math.min(...candidates.map((item) => item.getTime())));
  first.setHours(0, 0, 0, 0);
  return first;
}

function dateKeysForPeriod(period = diaryPeriod) {
  const start = periodStart(period);
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const dates = [];
  for (const cursor = new Date(end); cursor >= start; cursor.setDate(cursor.getDate() - 1)) {
    dates.push(localDateKey(cursor));
  }
  return dates;
}

function sessionsInDiaryPeriod(period = diaryPeriod) {
  const start = periodStart(period);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return state.training.sessions.filter((session) => (
    session.status === "completed"
    && session.endedAt
    && new Date(session.endedAt) >= start
    && new Date(session.endedAt) <= end
  ));
}

function scheduledDayForDate(dateKey) {
  const weekday = new Date(`${dateKey}T12:00:00`).getDay();
  for (const routine of activeRoutines()) {
    const routineDay = routine.days.find((day) => routineDayWeekdays(day).includes(weekday));
    if (routineDay) return { routine, routineDay };
  }
  return null;
}

function plannedWorkoutStatus(dateKey, scheduled) {
  if (!scheduled) return "rest";
  const completed = state.training.sessions.some((session) => sessionMatchesScheduledDay(
    session,
    scheduled,
    dateKey,
    { completedOnly: true },
  ));
  if (completed) return "completed";
  return dateKey < today ? "missed" : "planned";
}

function upcomingScheduledWorkouts(limit = 6, horizonDays = 45) {
  const workouts = [];
  for (let offset = 0; offset <= horizonDays && workouts.length < limit; offset += 1) {
    const date = addDays(today, offset);
    const scheduled = scheduledDayForDate(date);
    if (!scheduled) continue;
    workouts.push({
      date,
      ...scheduled,
      status: plannedWorkoutStatus(date, scheduled),
    });
  }
  return workouts;
}

function formatTimer(seconds) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, "0")}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

function formatWorkoutDuration(seconds) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function parseDurationInput(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw) * 60;
  const parts = raw.split(":").map((part) => Number(part));
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => !Number.isInteger(part) || part < 0)) {
    return NaN;
  }
  const [hours, minutes, seconds] = parts.length === 3 ? parts : [0, parts[0], parts[1]];
  if (minutes > 59 || seconds > 59) return NaN;
  return (hours * 3600) + (minutes * 60) + seconds;
}

function formatPace(secondsPerKm) {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return "--:-- / km";
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")} / km`;
}

function formatPaceForUnit(seconds, unit) {
  if (!Number.isFinite(seconds) || seconds <= 0) return `--:-- / ${unit}`;
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")} / ${unit}`;
}

function cardioActivityDefinition(activityType) {
  return cardioActivityByType.get(activityType) ?? cardioActivityByType.get("run");
}

function cardioPrimaryResult(cardio) {
  const definition = cardioActivityDefinition(cardio?.activityType);
  if (!cardio?.durationSeconds) return { label: "Tiempo", value: "Sin registrar" };
  if (definition.metric === "speed") {
    return {
      label: "Velocidad media",
      value: cardio.averageSpeedKmh ? `${cardio.averageSpeedKmh.toLocaleString("es-ES")} km/h` : "Sin distancia",
    };
  }
  if (definition.metric === "swim") {
    return { label: "Ritmo medio", value: formatPaceForUnit(cardio.paceSecondsPer100m, "100 m") };
  }
  if (definition.metric === "rowing") {
    return { label: "Ritmo medio", value: formatPaceForUnit(cardio.paceSecondsPer500m, "500 m") };
  }
  if (definition.metric === "time") {
    return { label: "Tiempo activo", value: formatWorkoutDuration(cardio.durationSeconds) };
  }
  return { label: "Ritmo medio", value: formatPace(cardio.paceSecondsPerKm) };
}

function cardioSummary(cardio) {
  const definition = cardioActivityDefinition(cardio?.activityType);
  if (!cardio?.completedAt) return `${definition.label} · sin datos registrados`;
  const distance = cardio.distanceKm
    ? definition.distanceUnit === "m"
      ? `${Math.round(cardio.distanceKm * 1000).toLocaleString("es-ES")} m`
      : `${cardio.distanceKm.toLocaleString("es-ES")} km`
    : null;
  return [definition.label, distance, formatWorkoutDuration(cardio.durationSeconds), cardioPrimaryResult(cardio).value]
    .filter(Boolean)
    .join(" · ");
}

function sessionElapsedSeconds(session, now = Date.now()) {
  return Math.max(0, Math.round((now - new Date(session.startedAt).getTime()) / 1000));
}

function timerFor(exerciseId) {
  if (!restTimerStates.has(exerciseId)) {
    // El descanso por defecto de Ajustes es el punto de partida. Cada ejercicio
    // puede desviarse con sus botones, y esa desviación se conserva mientras
    // dure la sesión.
    const duration = state.owner.preferences?.defaultRestSeconds
      ?? defaultPreferences.defaultRestSeconds;
    restTimerStates.set(exerciseId, { duration, remaining: duration, running: false, intervalId: null });
  }
  return restTimerStates.get(exerciseId);
}

function stopExerciseTimer(exerciseId) {
  const timer = timerFor(exerciseId);
  if (timer.intervalId !== null) window.clearInterval(timer.intervalId);
  timer.intervalId = null;
  timer.running = false;
}

function stopAllRestTimers({ clear = false } = {}) {
  [...restTimerStates.keys()].forEach(stopExerciseTimer);
  if (clear) restTimerStates.clear();
}

function renderExerciseTimer(exerciseId) {
  const timer = timerFor(exerciseId);
  const root = document.querySelector(`[data-rest-timer="${exerciseId}"]`);
  if (!root) return;
  const display = root.querySelector("[data-rest-display]");
  const toggle = root.querySelector("[data-rest-toggle]");
  const reset = root.querySelector("[data-rest-reset]");
  display.textContent = formatTimer(timer.remaining);
  display.classList.toggle("timer-running", timer.running);
  toggle.textContent = timer.running ? "Pausar" : "Iniciar";
  reset.disabled = timer.remaining === timer.duration && !timer.running;
  root.querySelectorAll("[data-rest-seconds]").forEach((button) => {
    button.classList.toggle("selected", Number(button.dataset.restSeconds) === timer.duration);
  });
}

function toggleExerciseTimer(exerciseId) {
  const timer = timerFor(exerciseId);
  if (timer.running) {
    stopExerciseTimer(exerciseId);
    renderExerciseTimer(exerciseId);
    return;
  }
  [...restTimerStates.keys()].filter((id) => id !== exerciseId).forEach(stopExerciseTimer);
  if (timer.remaining <= 0) timer.remaining = timer.duration;
  timer.running = true;
  timer.intervalId = window.setInterval(() => {
    timer.remaining -= 1;
    if (timer.remaining <= 0) {
      timer.remaining = 0;
      stopExerciseTimer(exerciseId);
      showNotice("Descanso terminado.", { area: "trainingNotice" });
    }
    renderExerciseTimer(exerciseId);
  }, 1000);
  renderExerciseTimer(exerciseId);
}

// Guardar una serie arranca el descanso solo. Es el gesto que más fricción
// quita durante el entrenamiento y no registra nada por su cuenta, así que no
// choca con la regla de que nada se dé por hecho sin confirmarlo.
//
// Corregir una serie ya guardada NO lo arranca: ahí no acabas de entrenar,
// estás arreglando un número.
function autoRestTimerEnabled() {
  return (state.owner.preferences?.autoRestTimer ?? defaultPreferences.autoRestTimer) !== false;
}

function startRestAfterSet(exerciseId) {
  stopExerciseTimer(exerciseId);
  const timer = timerFor(exerciseId);
  timer.remaining = timer.duration;
  toggleExerciseTimer(exerciseId);
}

function setExerciseTimerDuration(exerciseId, seconds) {
  stopExerciseTimer(exerciseId);
  const timer = timerFor(exerciseId);
  timer.duration = seconds;
  timer.remaining = seconds;
  renderExerciseTimer(exerciseId);
}

function createExerciseRestTimer(exerciseId) {
  const root = createElement("section", "exercise-rest-timer");
  root.dataset.restTimer = exerciseId;
  const heading = createElement("div", "exercise-timer-heading");
  const label = createElement("span", "eyebrow", "Descanso de este ejercicio");
  const display = createElement("strong", "timer-display", formatTimer(timerFor(exerciseId).duration));
  display.dataset.restDisplay = "";
  heading.append(label, display);
  const controls = createElement("div", "timer-controls compact-timer-controls");
  [[30, "30 s"], [60, "1 min"], [120, "2 min"], [180, "3 min"]].forEach(([seconds, text]) => {
    const button = createButton(text, "button-secondary timer-preset", () => {
      setExerciseTimerDuration(exerciseId, seconds);
    });
    button.dataset.restSeconds = String(seconds);
    controls.appendChild(button);
  });
  const toggle = createButton("Iniciar", "button-accent", () => toggleExerciseTimer(exerciseId));
  toggle.dataset.restToggle = "";
  const reset = createButton("Reiniciar", "button-quiet timer-reset-button", () => {
    stopExerciseTimer(exerciseId);
    const timer = timerFor(exerciseId);
    timer.remaining = timer.duration;
    renderExerciseTimer(exerciseId);
  });
  reset.dataset.restReset = "";
  const custom = createButton("+ Personalizar", "button-secondary timer-custom-button", () => {
    editor.hidden = !editor.hidden;
    if (!editor.hidden) minutes.focus();
  });
  const editor = createElement("form", "custom-timer-form");
  editor.hidden = true;
  const minutes = document.createElement("input");
  minutes.type = "number";
  minutes.min = "0";
  minutes.max = "59";
  minutes.step = "1";
  minutes.value = "1";
  minutes.inputMode = "numeric";
  minutes.setAttribute("aria-label", "Minutos de descanso personalizados");
  const separator = createElement("span", "", ":");
  const seconds = document.createElement("input");
  seconds.type = "number";
  seconds.min = "0";
  seconds.max = "59";
  seconds.step = "1";
  seconds.value = "0";
  seconds.inputMode = "numeric";
  seconds.setAttribute("aria-label", "Segundos de descanso personalizados");
  const apply = createElement("button", "button button-accent", "Aplicar");
  apply.type = "submit";
  editor.append(minutes, separator, seconds, apply);
  editor.addEventListener("submit", (event) => {
    event.preventDefault();
    const minuteValue = Number(minutes.value);
    const secondValue = Number(seconds.value);
    const duration = minuteValue * 60 + secondValue;
    if (!Number.isInteger(minuteValue) || !Number.isInteger(secondValue)
      || minuteValue < 0 || minuteValue > 59 || secondValue < 0 || secondValue > 59
      || duration < 1 || duration > 3599) {
      showNotice("El descanso personalizado debe estar entre 00:01 y 59:59.", { error: true });
      return;
    }
    setExerciseTimerDuration(exerciseId, duration);
    editor.hidden = true;
    showNotice(`Descanso personalizado: ${formatTimer(duration)}.`);
  });
  controls.append(custom, toggle, reset);
  root.append(heading, controls);
  root.appendChild(editor);
  window.requestAnimationFrame(() => renderExerciseTimer(exerciseId));
  return root;
}

function dayTotals(day) {
  return {
    calories: sum(day.foods || [], "calories"),
    protein: sum(day.foods || [], "protein"),
    carbs: sum(day.foods || [], "carbs"),
    fat: sum(day.foods || [], "fat"),
  };
}

function createElement(tag, className = "", text = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function createIcon(name, className = "ui-icon") {
  const namespace = "http://www.w3.org/2000/svg";
  const icon = document.createElementNS(namespace, "svg");
  icon.setAttribute("class", className);
  icon.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(namespace, "use");
  use.setAttribute("href", `assets/icons.svg#${name}`);
  icon.appendChild(use);
  return icon;
}

function createMuscleIcon(group) {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  svg.setAttribute("class", `muscle-icon muscle-icon-${group}`);
  svg.setAttribute("viewBox", "0 0 48 48");
  svg.setAttribute("aria-hidden", "true");
  const addPath = (d) => {
    const path = document.createElementNS(namespace, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  };
  const paths = {
    lower: [
      "M20 7c3 5 4 10 2 17l-5 17c-.4 1.5-2.2 2.1-3.5 1.2-1-.7-1.4-1.9-1.1-3.1l4.4-16.4c1.2-4.6.5-8.9-2.2-12.9z",
      "M28 7c-3 5-4 10-2 17l5 17c.4 1.5 2.2 2.1 3.5 1.2 1-.7 1.4-1.9 1.1-3.1l-4.4-16.4c-1.2-4.6-.5-8.9 2.2-12.9z",
    ],
    push: [
      "M9 20c2-8 7-12 15-12s13 4 15 12c-4-3-8-4-15-4S13 17 9 20z",
      "M10 22c4-3 8-4 14-4s10 1 14 4c-1 8-5 13-14 13S11 30 10 22z",
    ],
    pull: [
      "M24 7c9 0 15 5 17 14-5-4-10-6-17-6S12 17 7 21C9 12 15 7 24 7z",
      "M12 24c4 2 8 3 12 3s8-1 12-3c-2 8-6 13-12 16-6-3-10-8-12-16z",
    ],
    arms: [
      "M15 15c6-7 15-7 21-1-3 1-6 3-8 6-3 4-6 8-12 9-4 .7-7-3-5-7 1-2 2-4 4-7z",
      "M21 30c5 0 9-3 12-7 3 5 1 12-6 15-5 2-10-.4-11-5z",
    ],
    full: [
      "M24 6a7 7 0 0 1 7 7 7 7 0 0 1-14 0 7 7 0 0 1 7-7z",
      "M12 40c1-13 5-21 12-21s11 8 12 21c-7-3-17-3-24 0z",
    ],
    cardio: [
      "M25 8c4 0 7 3 7 7s-3 7-7 7-7-3-7-7 3-7 7-7z",
      "M18 24l8 3 5 6 6 1c2 .3 3 2 2.6 3.8-.3 1.5-1.7 2.5-3.2 2.2l-7.6-1.4-5.1-6.1-4.6 6.8c-.9 1.3-2.7 1.7-4 .8-1.3-.9-1.7-2.6-.8-4l6.8-10.1z",
      "M17 24l-5 3-3.2 5.5c-.8 1.4-2.6 1.9-4 .9-1.4-.8-1.8-2.6-1-4l3.9-6.5 7.2-4z",
    ],
  };
  (paths[group] ?? paths.full).forEach(addPath);
  return svg;
}

function createButton(text, className, onClick) {
  const button = createElement("button", `button ${className}`, text);
  button.type = "button";
  button.addEventListener("click", onClick);
  return button;
}

function confirmDialog(message, {
  title = "Confirmar acción",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    const previouslyFocused = document.activeElement;
    let settled = false;

    const overlay = createElement("div", "dialog-overlay");
    const box = createElement("div", "dialog-box");
    box.setAttribute("role", "alertdialog");
    box.setAttribute("aria-modal", "true");
    const titleId = `dialogTitle-${Date.now()}`;
    const messageId = `dialogMessage-${Date.now()}`;
    box.setAttribute("aria-labelledby", titleId);
    box.setAttribute("aria-describedby", messageId);

    const titleEl = createElement("h3", "dialog-title", title);
    titleEl.id = titleId;
    const messageEl = createElement("p", "dialog-message", message);
    messageEl.id = messageId;

    function settle(result) {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", handleKeydown, true);
      overlay.remove();
      document.body.classList.remove("overlay-open");
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
      resolve(result);
    }

    const cancelBtn = createButton(cancelLabel, "button-secondary", () => settle(false));
    const confirmBtn = createButton(confirmLabel, danger ? "button-danger" : "button-primary", () => settle(true));
    const actions = createElement("div", "dialog-actions");
    actions.append(cancelBtn, confirmBtn);

    box.append(titleEl, messageEl, actions);
    overlay.appendChild(box);

    function handleKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        settle(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [cancelBtn, confirmBtn];
      const currentIndex = focusable.indexOf(document.activeElement);
      event.preventDefault();
      const step = event.shiftKey ? -1 : 1;
      const nextIndex = (currentIndex + step + focusable.length) % focusable.length;
      focusable[nextIndex].focus();
    }

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) settle(false);
    });

    document.addEventListener("keydown", handleKeydown, true);
    document.body.appendChild(overlay);
    document.body.classList.add("overlay-open");
    confirmBtn.focus();
  });
}

function runOnce(control, action, key = null) {
  if (control.disabled || control.dataset.pending === "true" || (key && pendingSetSubmissions.has(key))) {
    return false;
  }
  if (key) pendingSetSubmissions.add(key);
  control.dataset.pending = "true";
  control.disabled = true;
  const result = action();
  window.setTimeout(() => {
    delete control.dataset.pending;
    control.disabled = false;
    if (key) pendingSetSubmissions.delete(key);
  }, 500);
  return result;
}

function renderEmpty(container, title, detail) {
  const item = createElement("div", "empty-state");
  const strong = createElement("strong", "", title);
  const paragraph = createElement("p", "", detail);
  item.append(strong, paragraph);
  container.replaceChildren(item);
}

function createLogItem(title, detail, actions = []) {
  const item = document.createElement("li");
  const copyBlock = document.createElement("div");
  copyBlock.append(
    createElement("strong", "", title),
    createElement("small", "", detail),
  );
  item.appendChild(copyBlock);
  if (actions.length) {
    const actionBlock = createElement("div", "item-actions");
    actionBlock.append(...actions);
    item.appendChild(actionBlock);
  }
  return item;
}

function setDailyForm(date) {
  const day = getLegacyDay(date);
  $("weight").value = day.weight ?? "";
  $("waist").value = day.waist ?? "";
  $("steps").value = day.steps ?? "";
  $("cardioMinutes").value = day.cardioMinutes ?? "";
  $("sleep").value = day.sleep ?? "";
  $("energy").value = day.energy ?? "";
  $("hunger").value = day.hunger ?? "";
  $("shoulderPain").value = day.shoulderPain ?? "";
  $("notes").value = day.notes ?? "";
}

function sessionMatchesScheduledDay(session, scheduled, date, { completedOnly = false } = {}) {
  if (!session || !scheduled || session.source?.type !== "routine_day") return false;
  if (completedOnly && session.status !== "completed") return false;
  const sessionDate = session.status === "completed"
    ? dateKeyFromIso(session.endedAt)
    : dateKeyFromIso(session.startedAt);
  return sessionDate === date
    && session.source.routineId === scheduled.routine.id
    && session.source.routineDayId === scheduled.routineDay.id;
}

function renderDailyDashboard() {
  const selectedDate = $("entryDate").value || today;
  const selectedDay = getLegacyDay(selectedDate);
  const selectedTotals = dayTotals(selectedDay);
  const targets = getTargets();
  const selectedDateValue = new Date(`${selectedDate}T12:00:00`);
  $("diaryDateTitle").textContent = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(selectedDateValue);

  const suggested = scheduledDayForDate(selectedDate);
  const completedScheduledSession = suggested
    ? state.training.sessions.find((session) => sessionMatchesScheduledDay(
      session,
      suggested,
      selectedDate,
      { completedOnly: true },
    ))
    : null;
  const dailyGoalRatios = [
    targets.steps > 0 ? Math.min(1, (Number(selectedDay.steps) || 0) / targets.steps) : null,
    targets.calories > 0 ? Math.min(1, selectedTotals.calories / targets.calories) : null,
    suggested ? (completedScheduledSession ? 1 : 0) : null,
  ].filter((ratio) => ratio !== null);
  const dailyProgress = dailyGoalRatios.length
    ? Math.round((dailyGoalRatios.reduce((total, ratio) => total + ratio, 0) / dailyGoalRatios.length) * 100)
    : 0;
  $("weeklyRing").style.setProperty("--ring-progress", String(dailyProgress));
  $("weeklyRingValue").textContent = `${dailyProgress}%`;
  const completedGoals = dailyGoalRatios.filter((ratio) => ratio >= 1).length;
  $("dailyGoalCount").textContent = `${completedGoals} de ${dailyGoalRatios.length} objetivos`;
  const title = $("dashboardWorkoutTitle");
  const detail = $("dashboardWorkoutDetail");
  const start = $("dashboardStartWorkoutBtn");
  const exerciseList = $("dashboardWorkoutExercises");
  const todayPlanCard = $("todayPlanCard");
  applyRoutineVisualClasses(todayPlanCard, suggested?.routine ?? null);
  todayPlanCard.classList.toggle("color-panel-blue", !suggested);
  exerciseList.replaceChildren();
  if (suggested) {
    title.textContent = `${suggested.routine.name} · ${suggested.routineDay.name}`;
    const isCardioPlan = routineDayType(suggested.routineDay) === "cardio";
    detail.textContent = isCardioPlan
      ? `${cardioActivityDefinition(suggested.routineDay.cardioType).label} · ${weekdayName(new Date(`${selectedDate}T12:00:00`).getDay())}`
      : `${countLabel(suggested.routineDay.exercises.length, "ejercicio")} · ${weekdayName(new Date(`${selectedDate}T12:00:00`).getDay())}`;
    if (isCardioPlan) {
      const cardioDefinition = cardioActivityDefinition(suggested.routineDay.cardioType);
      exerciseList.appendChild(createElement("li", "today-rest-message", cardioDefinition.help));
    } else {
      suggested.routineDay.exercises.slice().sort((a, b) => a.order - b.order).forEach((exercise) => {
        const item = createElement("li");
        item.append(createElement("span", "", `${exercise.order}. ${exercise.exerciseName}`));
        exerciseList.appendChild(item);
      });
    }
    start.dataset.routineDay = routineDayValue(suggested.routine.id, suggested.routineDay.id);
    start.dataset.date = selectedDate;
    const activeSession = getActiveSession(state);
    const activeScheduledSession = sessionMatchesScheduledDay(activeSession, suggested, selectedDate);
    if (selectedDate !== today) {
      start.dataset.action = "review";
      start.disabled = false;
      start.textContent = "Ver resumen del día";
    } else if (activeScheduledSession) {
      start.dataset.action = "continue";
      start.disabled = false;
      start.textContent = "Continuar entrenamiento";
    } else if (completedScheduledSession) {
      start.dataset.action = "review";
      start.disabled = false;
      start.textContent = "Ver entrenamiento completado";
    } else if (activeSession) {
      start.dataset.action = "";
      start.disabled = true;
      start.textContent = "Termina el entrenamiento en curso";
    } else {
      start.dataset.action = "start";
      start.disabled = !isCardioPlan && !suggested.routineDay.exercises.length;
      start.textContent = "Empezar entrenamiento";
    }
  } else {
    title.textContent = "Día de descanso";
    detail.textContent = "No tienes ningún entrenamiento asignado a este día.";
    exerciseList.appendChild(createElement("li", "today-rest-message", "Recupera, camina o registra una sesión extra desde Entrenamiento."));
    start.dataset.routineDay = "";
    start.dataset.action = "";
    start.dataset.date = selectedDate;
    start.disabled = true;
    start.textContent = "Sin entrenamiento planificado";
  }

  const steps = Number(selectedDay.steps) || 0;
  const cardio = Number(selectedDay.cardioMinutes) || 0;
  $("dashboardActivityValue").textContent = `${steps.toLocaleString("es-ES")} / ${targets.steps.toLocaleString("es-ES")} pasos`;
  $("dashboardStepsProgress").max = targets.steps || 1;
  $("dashboardStepsProgress").value = steps;
  $("dashboardActivityDetail").textContent = cardio
    ? `${cardio} min de cardio · registro manual.`
    : "Sin cardio registrado · datos manuales por ahora.";
  $("dashboardNutritionValue").textContent = `${selectedTotals.calories.toLocaleString("es-ES")} / ${targets.calories.toLocaleString("es-ES")} kcal`;
  $("dashboardCaloriesProgress").max = targets.calories || 1;
  $("dashboardCaloriesProgress").value = selectedTotals.calories;
  const remainingCalories = targets.calories - selectedTotals.calories;
  $("dashboardNutritionDetail").textContent = remainingCalories > 0
    ? `Quedan ${remainingCalories.toLocaleString("es-ES")} kcal para el objetivo del día.`
    : remainingCalories === 0
      ? "Objetivo diario de calorías alcanzado."
      : `${Math.abs(remainingCalories).toLocaleString("es-ES")} kcal por encima del objetivo.`;

  const timeline = $("dailyTimeline");
  timeline.replaceChildren();
  $("diaryPeriodSummary").textContent = {
    total: "Desde el inicio",
    month: "Este mes",
    week: "Esta semana",
    day: "Hoy",
  }[diaryPeriod] ?? "Periodo seleccionado";
  dateKeysForPeriod().forEach((date) => {
    const day = state.legacy.days[date] ?? { foods: [], workouts: [] };
    const totals = dayTotals(day);
    const sessions = state.training.sessions.filter(
      (session) => session.status === "completed" && dateKeyFromIso(session.endedAt) === date,
    );
    const scheduled = scheduledDayForDate(date);
    const completedScheduled = scheduled && sessions.some((session) => (
      sessionMatchesScheduledDay(session, scheduled, date, { completedOnly: true })
    ));
    const isPast = date < today;
    const trainingStatus = sessions.length
      ? scheduled
        ? completedScheduled ? "Completado" : "Extra · plan pendiente"
        : "Extra"
      : scheduled
        ? isPast ? "No realizado" : "Planificado"
        : "Descanso";
    const details = [
      `${Number(day.steps) || 0} / ${targets.steps} pasos`,
      `${totals.calories} / ${targets.calories} kcal`,
      scheduled ? `${scheduled.routineDay.name}: ${trainingStatus}` : trainingStatus,
    ].join(" · ");
    const item = createElement("li", "timeline-item");
    item.classList.add(`timeline-${trainingStatus.toLocaleLowerCase("es").replace(/\s+/g, "-")}`);
    const openDay = createElement("button", "timeline-open");
    openDay.type = "button";
    openDay.setAttribute("aria-label", `Abrir el resumen completo del ${date}`);
    openDay.append(createElement("time", "timeline-date", date), createElement("div", "timeline-content", details));
    sessions.forEach((session) => {
      const isCardioSession = (session.sessionType ?? "strength") === "cardio";
      openDay.appendChild(createElement(
        "small",
        "muted",
        isCardioSession
          ? `${session.source.label} · ${cardioSummary(session.cardio)}`
          : `${session.source.label} · ${countLabel(sessionSetCount(session), "serie")} guardadas`,
      ));
    });
    if (day.notes) openDay.appendChild(createElement("small", "muted", day.notes));
    openDay.appendChild(createElement("span", "timeline-chevron", "›"));
    openDay.addEventListener("click", () => openDailyDetail(date));
    item.appendChild(openDay);
    timeline.appendChild(item);
  });
  if (!timeline.children.length) {
    timeline.appendChild(createElement("li", "timeline-empty", "Todavía no hay registros. Guarda hoy tus primeras métricas."));
  }
}

function createDayDetailSection(title, tone = null) {
  const section = createElement(
    "section",
    `day-detail-section${tone ? ` day-detail-section-${tone}` : ""}`,
  );
  section.appendChild(createElement("h3", "", title));
  return section;
}

function createDayMetric(label, value) {
  const item = createElement("article", "day-detail-metric");
  item.append(createElement("small", "", label), createElement("strong", "", value));
  return item;
}

function openDailyDetail(date) {
  const day = state.legacy.days[date] ?? { foods: [], workouts: [] };
  const totals = dayTotals(day);
  const targets = getTargets();
  const sessions = state.training.sessions
    .filter((session) => session.status === "completed" && dateKeyFromIso(session.endedAt) === date)
    .sort((left, right) => right.endedAt.localeCompare(left.endedAt));
  const scheduled = scheduledDayForDate(date);
  const dateValue = new Date(`${date}T12:00:00`);
  $("dailyDetailTitle").textContent = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dateValue);

  const content = $("dailyDetailContent");
  content.replaceChildren();
  const metrics = createDayDetailSection("Resumen del día");
  const metricGrid = createElement("div", "day-detail-metrics");
  metricGrid.append(
    createDayMetric("Pasos", `${(Number(day.steps) || 0).toLocaleString("es-ES")} / ${targets.steps.toLocaleString("es-ES")}`),
    createDayMetric("Calorías", `${totals.calories.toLocaleString("es-ES")} / ${targets.calories.toLocaleString("es-ES")} kcal`),
    createDayMetric("Proteína", `${totals.protein.toLocaleString("es-ES")} / ${targets.protein.toLocaleString("es-ES")} g`),
    createDayMetric("Cardio", `${Number(day.cardioMinutes) || 0} min`),
    createDayMetric("Peso", day.weight !== null && day.weight !== undefined ? `${day.weight} kg` : "Sin registrar"),
    createDayMetric("Cintura", day.waist !== null && day.waist !== undefined ? `${day.waist} cm` : "Sin registrar"),
    createDayMetric("Sueño", day.sleep ? `${day.sleep} / 10` : "Sin registrar"),
    createDayMetric("Energía", day.energy ? `${day.energy} / 10` : "Sin registrar"),
  );
  metrics.appendChild(metricGrid);
  if (day.notes) metrics.appendChild(createElement("p", "day-detail-note", day.notes));
  content.appendChild(metrics);

  const nutrition = createDayDetailSection("Nutrición registrada", "nutrition");
  const macroSummary = createElement("p", "muted", `${totals.calories} kcal · ${totals.protein} g proteína · ${totals.carbs} g carbohidratos · ${totals.fat} g grasas`);
  nutrition.appendChild(macroSummary);
  const foods = createElement("ul", "day-detail-list");
  (day.foods ?? []).forEach((food) => foods.appendChild(createLogItem(
    food.name,
    `${Number(food.calories) || 0} kcal · ${Number(food.protein) || 0} g proteína · ${Number(food.carbs) || 0} g HC · ${Number(food.fat) || 0} g grasa`,
  )));
  if (!foods.children.length) foods.appendChild(createElement("li", "muted", "No se registraron comidas este día."));
  nutrition.appendChild(foods);
  content.appendChild(nutrition);

  const training = createDayDetailSection("Entrenamiento", "training");
  training.appendChild(createElement(
    "p",
    "muted",
    scheduled
      ? `Planificado: ${scheduled.routine.name} · ${scheduled.routineDay.name}`
      : "No había una rutina asignada a este día.",
  ));
  if (!sessions.length) {
    training.appendChild(createElement("p", "day-detail-empty", "No se finalizó ningún entrenamiento este día."));
  }
  sessions.forEach((session) => {
    const sessionCard = createElement("article", "day-session-card");
    const durationText = session.durationSeconds
      ? ` · ${formatWorkoutDuration(session.durationSeconds)} de entreno`
      : "";
    const isCardioSession = (session.sessionType ?? "strength") === "cardio";
    sessionCard.append(
      createElement("h4", "", session.source.label),
      createElement(
        "small",
        "muted",
        isCardioSession
          ? `${formatDateTime(session.endedAt)} · ${cardioSummary(session.cardio)}${session.cardio?.steps ? ` · ${session.cardio.steps.toLocaleString("es-ES")} pasos` : ""}${durationText}`
          : `${formatDateTime(session.endedAt)} · ${sessionSetCount(session)} series${durationText}`,
      ),
    );
    if (isCardioSession) {
      if (session.cardio?.note) sessionCard.appendChild(createElement("p", "day-detail-note", session.cardio.note));
      training.appendChild(sessionCard);
      return;
    }
    session.exercises.slice().sort((a, b) => a.order - b.order).forEach((exercise) => {
      const exerciseBlock = createElement("section", "day-session-exercise");
      exerciseBlock.appendChild(createElement(
        "strong",
        "",
        exercise.status === "skipped" ? `${exercise.exerciseName} · no realizado` : exercise.exerciseName,
      ));
      const sets = createElement("ol", "day-set-list");
      exercise.sets.slice().sort((a, b) => a.order - b.order).forEach((workoutSet) => {
        const set = createElement("li", "day-set-row");
        set.append(
          createElement("span", "set-number", String(workoutSet.order)),
          createElement("span", "", formatSet(workoutSet)),
        );
        if (workoutSet.note) set.appendChild(createElement("small", "muted", workoutSet.note));
        sets.appendChild(set);
      });
      if (!sets.children.length && exercise.status !== "skipped") {
        sets.appendChild(createElement("li", "muted", "Sin series registradas."));
      }
      exerciseBlock.appendChild(sets);
      sessionCard.appendChild(exerciseBlock);
    });
    training.appendChild(sessionCard);
  });
  content.appendChild(training);
  $("dailyDetailPanel").hidden = false;
  document.body.classList.add("overlay-open");
  $("dailyDetailCloseBtn").focus();
}

function closeDailyDetail() {
  $("dailyDetailPanel").hidden = true;
  document.body.classList.remove("overlay-open");
}

function renderFoods() {
  const day = getLegacyDay();
  const totals = dayTotals(day);
  const targets = getTargets();
  $("nutritionCaloriesValue").textContent = totals.calories.toLocaleString("es-ES");
  $("nutritionCaloriesValue").nextElementSibling.textContent = `/ ${targets.calories.toLocaleString("es-ES")} kcal`;
  $("nutritionProteinValue").textContent = `${totals.protein} / ${targets.protein} g`;
  $("nutritionCarbsValue").textContent = `${totals.carbs} g`;
  $("nutritionFatValue").textContent = `${totals.fat} g`;
  $("nutritionProteinProgress").value = totals.protein;
  $("nutritionProteinProgress").max = targets.protein || 1;
  $("nutritionCarbsProgress").value = totals.carbs;
  $("nutritionFatProgress").value = totals.fat;
  const list = $("foodList");
  list.replaceChildren();

  (day.foods || []).forEach((food, index) => {
    const removeButton = createButton("Borrar", "button-danger", async () => {
      if (!(await confirmDialog(`¿Borrar “${food.name}”?`, { title: "Borrar comida", confirmLabel: "Borrar", danger: true }))) return;
      commit((next) => {
        getLegacyDay(undefined, true, next).foods.splice(index, 1);
      }, "Comida borrada.");
    });
    list.appendChild(createLogItem(
      String(food.name ?? "Sin nombre"),
      `${Number(food.calories) || 0} kcal · ${Number(food.protein) || 0} g proteína · ${Number(food.carbs) || 0} g HC · ${Number(food.fat) || 0} g grasa`,
      [removeButton],
    ));
  });

  if (!list.children.length) {
    list.appendChild(createLogItem("Sin comidas registradas", "Añade la primera comida del día."));
  }
}

function renderNutritionLibrary() {
  ensureUiState(state);
  const recipes = state.nutrition.recipes;
  const labels = state.nutrition.labels;
  $("recipeCount").textContent = countLabel(recipes.length, "receta");
  $("labelCount").textContent = countLabel(labels.length, "etiqueta");
  const recipeList = $("recipeList");
  recipeList.replaceChildren();
  recipes.forEach((recipe) => {
    const card = createElement("article", "nutrition-library-card");
    const heading = createElement("div", "nutrition-library-heading");
    heading.append(
      createElement("strong", "", recipe.name),
      createElement("span", "count-badge", `${recipe.caloriesPerServing ?? recipe.calories ?? 0} kcal`),
    );
    const ingredients = createElement("ul", "ingredient-list");
    (recipe.ingredients ?? []).forEach((ingredient) => {
      ingredients.appendChild(createElement(
        "li",
        "",
        typeof ingredient === "string" ? ingredient : `${ingredient.name} · ${ingredient.grams} g`,
      ));
    });
    const add = createButton("+ Añadir al día", "button-accent recipe-add-button", () => {
      commit((next) => {
        getLegacyDay(undefined, true, next).foods.push({
          name: recipe.name,
          calories: Number(recipe.caloriesPerServing ?? recipe.calories) || 0,
          protein: Number(recipe.proteinPerServing ?? recipe.protein) || 0,
          carbs: Number(recipe.carbs) || 0,
          fat: Number(recipe.fat) || 0,
          recipeId: recipe.id,
        });
      }, `${recipe.name} añadido al diario.`);
    });
    card.append(heading, ingredients, add);
    recipeList.appendChild(card);
  });
  if (!recipeList.children.length) renderEmpty(recipeList, "Todavía no hay recetas", "Las recetas calculadas por ingredientes aparecerán aquí.");

  const labelList = $("labelList");
  labelList.replaceChildren();
  labels.forEach((label) => {
    const card = createElement("article", "nutrition-library-card label-card");
    const heading = createElement("div", "nutrition-library-heading");
    heading.append(
      createElement("strong", "", label.product ?? label.name),
      createElement("span", "count-badge", label.brand || "Sin marca"),
    );
    card.append(heading);
    if (label.photoDataUrl) {
      const image = document.createElement("img");
      image.className = "saved-label-photo";
      image.src = label.photoDataUrl;
      image.alt = `Etiqueta de ${label.product ?? label.name}`;
      card.appendChild(image);
    }
    card.append(
      createElement("p", "label-values", `${label.caloriesPer100g ?? label.calories100 ?? 0} kcal · ${label.proteinPer100g ?? label.protein100 ?? 0} g proteína · ${label.carbsPer100g ?? label.carbs100 ?? 0} g HC · ${label.fatPer100g ?? label.fat100 ?? 0} g grasa / 100 g`),
      createElement("small", "muted", label.photoName ? `Foto de referencia: ${label.photoName}` : "Sin foto de referencia"),
    );
    labelList.appendChild(card);
  });
  if (!labelList.children.length) renderEmpty(labelList, "Todavía no hay etiquetas", "Guarda cada producto con su marca y los valores del envase.");
}

function renderSettings() {
  ensureUiState(state);
  const profile = state.owner.profile;
  const targets = getTargets();
  const preferences = getPreferences();
  $("profileName").value = state.owner.displayName ?? "";
  $("profileBirthDate").value = profile.birthDate ?? "";
  $("profileHeight").value = profile.heightCm ?? "";
  $("profileWeight").value = profile.weightKg ?? "";
  $("targetCalories").value = targets.calories;
  $("targetProtein").value = targets.protein;
  $("targetSteps").value = targets.steps;
  $("defaultRestSeconds").value = preferences.defaultRestSeconds;
  $("autoRestTimer").checked = preferences.autoRestTimer !== false;
  $("effortScale").value = preferences.effortScale;
  document.querySelectorAll('input[name="accentColor"]').forEach((input) => {
    input.checked = input.value === preferences.accentColor;
  });
  document.querySelectorAll('input[name="appearanceMode"]').forEach((input) => {
    input.checked = input.value === preferences.appearanceMode;
  });
  $("settingsProfileSummary").textContent = state.owner.displayName?.trim() || "Usuario local";
  $("settingsGoalsSummary").textContent =
    `${targets.calories.toLocaleString("es-ES")} kcal · ${targets.protein.toLocaleString("es-ES")} g proteína · ${targets.steps.toLocaleString("es-ES")} pasos`;
  $("settingsAppearanceSummary").textContent =
    `${appearanceLabels[preferences.appearanceMode] ?? "Automático"} · ${accentLabels[preferences.accentColor] ?? "Lima"}`;
  $("settingsWorkoutSummary").textContent =
    `${preferences.effortScale === "none" ? "Sin escala" : preferences.effortScale.toUpperCase()} · ${preferences.defaultRestSeconds} s`
    + `${preferences.autoRestTimer === false ? "" : " · timer automático"}`;
  const demoSessions = state.training.sessions.filter((session) => session.isDemo).length;
  const demoDays = Object.values(state.legacy.days).filter((day) => day?.isDemo).length;
  $("demoDataSummary").textContent = demoSessions || demoDays
    ? `Demo activa: ${demoDays.toLocaleString("es-ES")} días y ${demoSessions.toLocaleString("es-ES")} entrenamientos ficticios.`
    : "Carga una historia ficticia para revisar Diario, progreso, rutinas y nutrición sin esperar semanas.";
  setSettingsView(settingsView);
}

function renderProgress() {
  const select = $("progressExerciseSelect");
  const previous = select.value;
  const completedExerciseIds = new Map();
  const periodSessions = sessionsInDiaryPeriod();
  periodSessions
    .forEach((session) => session.exercises.forEach((exercise) => {
      if (exercise.sets.some((workoutSet) => (workoutSet.setType ?? (workoutSet.isWarmup ? "warmup" : "effective")) === "effective")) {
        completedExerciseIds.set(exercise.exerciseId, exercise.exerciseName);
      }
    }));
  select.replaceChildren();
  [...completedExerciseIds.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], "es"))
    .forEach(([id, name]) => select.appendChild(new Option(name, id)));
  if (!select.children.length) select.appendChild(new Option("Sin ejercicios finalizados", ""));
  select.value = completedExerciseIds.has(previous) ? previous : select.options[0]?.value ?? "";

  const points = [];
  periodSessions
    .sort((a, b) => a.endedAt.localeCompare(b.endedAt))
    .forEach((session) => {
      const exercise = session.exercises.find((item) => item.exerciseId === select.value);
      if (!exercise) return;
      const effectiveSets = exercise.sets.filter(
        (workoutSet) => (workoutSet.setType ?? (workoutSet.isWarmup ? "warmup" : "effective")) === "effective",
      );
      if (!effectiveSets.length) return;
      const best = effectiveSets.slice().sort((a, b) => (
        (Number(b.loadKg) || 0) - (Number(a.loadKg) || 0)
        || (Number(b.reps) || 0) - (Number(a.reps) || 0)
      ))[0];
      points.push({
        date: session.endedAt,
        load: Number(best.loadKg) || 0,
        reps: Number(best.reps) || 0,
        rir: best.rir,
      });
    });

  const rows = $("exerciseProgressRows");
  rows.replaceChildren();
  points.slice().reverse().forEach((point) => {
    const row = document.createElement("tr");
    [
      formatDateTime(point.date),
      `${point.load} kg`,
      String(point.reps),
      formatValue(point.rir),
    ].forEach((value) => row.appendChild(createElement("td", "", value)));
    rows.appendChild(row);
  });
  if (!rows.children.length) {
    const row = document.createElement("tr");
    const cell = createElement("td", "", "No hay series efectivas en este periodo.");
    cell.colSpan = 4;
    row.appendChild(cell);
    rows.appendChild(row);
  }
  renderExerciseChart(points);
}

function renderExerciseChart(points, container = $("exerciseProgressChart")) {
  container.replaceChildren();
  if (!points.length) {
    renderEmpty(container, "Sin datos comparables", "Finaliza una sesión con al menos una serie efectiva.");
    return;
  }
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  svg.setAttribute("viewBox", "0 0 720 260");
  svg.setAttribute("aria-hidden", "true");
  const width = 620;
  const height = 180;
  const left = 50;
  const top = 28;
  const maxLoad = Math.max(...points.map((point) => point.load), 1);
  const maxReps = Math.max(...points.map((point) => point.reps), 1);
  const x = (index) => left + (points.length === 1 ? width / 2 : (index / (points.length - 1)) * width);
  const y = (value, max) => top + height - (value / max) * height;
  for (let step = 0; step <= 4; step += 1) {
    const line = document.createElementNS(namespace, "line");
    const lineY = top + (height / 4) * step;
    line.setAttribute("x1", String(left));
    line.setAttribute("x2", String(left + width));
    line.setAttribute("y1", String(lineY));
    line.setAttribute("y2", String(lineY));
    line.setAttribute("class", "chart-grid-line");
    svg.appendChild(line);
  }
  const addSeries = (key, max, className) => {
    const polyline = document.createElementNS(namespace, "polyline");
    polyline.setAttribute(
      "points",
      points.map((point, index) => `${x(index)},${y(point[key], max)}`).join(" "),
    );
    polyline.setAttribute("class", className);
    svg.appendChild(polyline);
    points.forEach((point, index) => {
      const circle = document.createElementNS(namespace, "circle");
      circle.setAttribute("cx", String(x(index)));
      circle.setAttribute("cy", String(y(point[key], max)));
      circle.setAttribute("r", "5");
      circle.setAttribute("class", `${className}-point`);
      svg.appendChild(circle);
    });
  };
  addSeries("load", maxLoad, "chart-load-line");
  addSeries("reps", maxReps, "chart-reps-line");
  container.appendChild(svg);
  container.setAttribute(
    "aria-label",
    `${points.length} entrenamientos. Último registro: ${points.at(-1).load} kg y ${points.at(-1).reps} repeticiones.`,
  );
}

function catalogEntryForName(name) {
  const normalized = normalizeExerciseName(name);
  return catalog.find((entry) => (
    normalizeExerciseName(entry.nameEs) === normalized
    || normalizeExerciseName(translatedCatalogName(entry)) === normalized
    || normalizeExerciseName(entry.nameOriginal) === normalized
  )) ?? null;
}

function attachCatalogMetadata(targetState, exerciseId, entry) {
  if (!entry) return;
  const exercise = targetState.training.exercises.find((item) => item.id === exerciseId);
  if (!exercise) return;
  exercise.source = {
    type: "dataset",
    sourceId: entry.sourceId,
    repository: entry.source.repository,
    commit: entry.source.commit,
    license: entry.source.license,
    reviewStatus: entry.reviewStatus,
  };
  exercise.category = entry.category;
  exercise.equipment = entry.equipment;
  // El mapa muscular lee el historial, y el historial tiene que poder leerse
  // sin conexión y sin catálogo. Por eso los músculos se copian al ejercicio
  // en el momento de añadirlo, en lugar de volver a cruzarlos al pintar.
  const muscles = normalizeCatalogMuscles(entry);
  if (muscles.direct.length || muscles.secondary.length) exercise.muscles = muscles;
}

function routineDayValue(routineId, routineDayId) {
  return `${routineId}::${routineDayId}`;
}

function parseRoutineDayValue(value) {
  const [routineId, routineDayId] = String(value).split("::");
  return routineId && routineDayId ? { routineId, routineDayId } : null;
}

function countLabel(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function activeRoutines() {
  return state.training.routines.filter((routine) => routine.status === "active");
}

function suggestedRoutineDay() {
  const todayWeekday = new Date().getDay();
  for (const routine of activeRoutines()) {
    const scheduled = routine.days.find((day) => routineDayWeekdays(day).includes(todayWeekday));
    if (scheduled) return { routine, routineDay: scheduled };
  }
  for (const routine of activeRoutines()) {
    const routineDay = routine.days.find((day) => day.id === routine.suggestedDayId);
    if (routineDay) return { routine, routineDay };
  }
  return null;
}

const weekdayOptions = [
  { value: "1", label: "Lunes" },
  { value: "2", label: "Martes" },
  { value: "3", label: "Miércoles" },
  { value: "4", label: "Jueves" },
  { value: "5", label: "Viernes" },
  { value: "6", label: "Sábado" },
  { value: "0", label: "Domingo" },
];

const weekdayShort = new Map([
  [1, "Lun"], [2, "Mar"], [3, "Mié"], [4, "Jue"], [5, "Vie"], [6, "Sáb"], [0, "Dom"],
]);

function createWeekdaySelector({ name, selected = [], disabled = [], single = false }) {
  const fragment = document.createDocumentFragment();
  weekdayOptions.forEach(({ value, label }) => {
    const weekday = Number(value);
    const wrapper = createElement("label", "weekday-choice");
    const input = document.createElement("input");
    input.type = single ? "radio" : "checkbox";
    input.name = name;
    input.value = value;
    input.checked = selected.includes(weekday);
    input.disabled = disabled.includes(weekday);
    const visual = createElement("span", "", weekdayShort.get(weekday));
    visual.title = input.disabled ? `${label}: ocupado` : label;
    wrapper.append(input, visual);
    fragment.appendChild(wrapper);
  });
  return fragment;
}

function selectedWeekdays(containerId) {
  return [...$(containerId).querySelectorAll("input:checked")].map((input) => Number(input.value));
}

function renderCardioActivityPicker() {
  const options = $("cardioActivityOptions");
  options.replaceChildren();
  cardioActivityCatalog.forEach((activity, index) => {
    const label = createElement("label", "cardio-activity-choice");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "cardioActivityType";
    input.value = activity.type;
    input.checked = index === 0;
    const card = createElement("span", "cardio-activity-choice-card");
    const icon = createElement("i", "cardio-activity-glyph");
    icon.appendChild(createIcon(activity.icon));
    card.append(icon, createElement("span", "cardio-activity-choice-copy"));
    card.querySelector(".cardio-activity-choice-copy").append(
      createElement("strong", "", activity.label),
      createElement("small", "", activity.family),
    );
    input.addEventListener("change", () => {
      if (!input.checked) return;
      $("cardioActivityHelp").textContent = activity.help;
      if (!$("routineName").value.trim() || $("routineName").dataset.cardioSuggestion === "true") {
        $("routineName").value = activity.label;
        $("routineName").dataset.cardioSuggestion = "true";
      }
    });
    label.append(input, card);
    options.appendChild(label);
  });

  const select = $("addRoutineCardioType");
  select.replaceChildren(...cardioActivityCatalog.map((activity) => {
    const option = document.createElement("option");
    option.value = activity.type;
    option.textContent = activity.label;
    return option;
  }));
}

function syncNewRoutineCardioVisibility() {
  const isCardio = document.querySelector('input[name="routineDayType"]:checked')?.value === "cardio";
  $("cardioActivityPicker").hidden = !isCardio;
  if (isCardio) {
    const selected = document.querySelector('input[name="cardioActivityType"]:checked');
    selected?.dispatchEvent(new Event("change"));
  }
}

function syncAddRoutineCardioVisibility() {
  $("addRoutineCardioTypeLabel").hidden = $("addRoutineDayType").value !== "cardio";
}

function renderNewRoutineWeekdays() {
  const occupied = [...weekdayAssignments({ includeDemo: false }).keys()];
  $("newRoutineWeekdays").replaceChildren(createWeekdaySelector({
    name: "new-routine-weekdays",
    disabled: occupied,
  }));
}

function weekdayName(value) {
  return weekdayOptions.find((option) => option.value === String(value))?.label ?? "Sin asignar";
}

function weekdayAssignments({ includeDemo = true } = {}) {
  return new Map(
    activeRoutines()
      .filter((routine) => includeDemo || !routine.isDemo)
      .flatMap((routine) => routine.days.flatMap(
        (day) => routineDayWeekdays(day).map((weekday) => [weekday, { routine, day }]),
      )),
  );
}

function routineScheduledWeekdayCount(routine) {
  return new Set(routine.days.flatMap((day) => routineDayWeekdays(day))).size;
}

function routineExerciseCount(routine) {
  return routine.days.reduce((total, day) => total + day.exercises.length, 0);
}

function routineActivityCount(routine) {
  return routine.days.reduce((total, day) => total + (routineDayType(day) === "cardio" ? 1 : day.exercises.length), 0);
}

function routineTheme(routine) {
  if (routine.days.some((day) => routineDayType(day) === "cardio")) {
    return { group: "cardio", label: "Cardio", title: "Resistencia" };
  }
  const text = normalizeCatalogSearch([
    routine.name,
    ...routine.days.map((day) => day.name),
    ...routine.days.flatMap((day) => day.exercises.map((exercise) => exercise.exerciseName)),
  ].join(" "));
  const matchers = [
    {
      group: "cardio",
      label: "Cardio",
      title: "Resistencia",
      words: ["cardio", "correr", "carrera", "run", "running", "caminar", "andar", "walk"],
    },
    {
      group: "lower",
      label: "Lower",
      title: "Pierna",
      words: ["pierna", "lower", "leg", "sentadilla", "prensa", "femoral", "gemelo", "peso muerto", "hip thrust"],
    },
    {
      group: "push",
      label: "Push",
      title: "Pecho",
      words: ["pecho", "chest", "push", "press banca", "press de banca", "hombro", "triceps", "apertura"],
    },
    {
      group: "pull",
      label: "Pull",
      title: "Espalda",
      words: ["espalda", "back", "pull", "remo", "jalon", "dominada", "biceps"],
    },
    {
      group: "arms",
      label: "Arms",
      title: "Brazos",
      words: ["brazo", "arms", "biceps", "triceps", "curl"],
    },
  ];
  return matchers.find((matcher) => matcher.words.some((word) => text.includes(normalizeCatalogSearch(word)))) ?? {
    group: "full",
    label: "Full",
    title: "Full Body",
  };
}

function routineAccentName(routine) {
  if (Object.hasOwn(accentPalettes, routine.accentColor)) return routine.accentColor;
  if (routine.days.some((day) => routineDayType(day) === "cardio")) return "orange";
  const name = normalizeCatalogSearch(routine.name);
  if (["empuje", "push", "pecho", "chest"].some((word) => name.includes(word))) return "red";
  if (["tiron", "pull", "espalda", "back"].some((word) => name.includes(word))) return "blue";
  if (["pierna", "legs", "lower"].some((word) => name.includes(word))) return "lime";
  if (["cardio", "correr", "carrera", "run", "running", "caminar"].some((word) => name.includes(word))) return "orange";
  if (["brazo", "arms", "biceps", "triceps"].some((word) => name.includes(word))) return "violet";
  if (["full", "cuerpo completo"].some((word) => name.includes(word))) return "orange";
  const fallbackColors = ["orange", "violet", "blue", "lime", "red"];
  const stableText = String(routine.id || routine.name || "rutina");
  const hash = [...stableText].reduce((total, character) => total + character.charCodeAt(0), 0);
  return fallbackColors[hash % fallbackColors.length];
}

function routineVisualClasses(routine) {
  const theme = routineTheme(routine);
  return `routine-theme-${theme.group} routine-accent-${routineAccentName(routine)}`;
}

function applyRoutineVisualClasses(element, routine) {
  [...element.classList]
    .filter((className) => className.startsWith("routine-theme-") || className.startsWith("routine-accent-"))
    .forEach((className) => element.classList.remove(className));
  if (routine) element.classList.add(...routineVisualClasses(routine).split(" "));
}

function routineForSession(session) {
  if (!session || session.source?.type !== "routine_day") return null;
  const current = state.training.routines.find((routine) => routine.id === session.source.routineId);
  if (current) return current;
  return {
    id: session.source.routineId ?? session.id,
    name: session.source.snapshot?.routineName ?? session.source.label,
    accentColor: session.source.snapshot?.routineAccentColor ?? null,
    days: [{
      name: session.source.snapshot?.routineDayName ?? session.source.label,
      exercises: session.exercises ?? [],
    }],
  };
}

function routineEstimatedSets(routine) {
  return routine.days.reduce((total, day) => total + day.exercises.length * 3, 0);
}

function routineEstimatedMinutes(routine) {
  return Math.max(30, routineExerciseCount(routine) * 9);
}

function createRoutineSpotlight(routine) {
  const theme = routineTheme(routine);
  const cardioDay = routine.days.find((day) => routineDayType(day) === "cardio");
  const card = createElement("article", `routine-spotlight ${routineVisualClasses(routine)}`);
  const tag = createElement("span", "routine-focus-tag", theme.label);
  const title = createElement("h3", "", routine.name);
  const stats = createElement("div", "routine-focus-stats");
  const spotlightStats = cardioDay
    ? [
      [cardioActivityDefinition(cardioDay.cardioType).label, "Actividad"],
      ["Manual", "Origen"],
      ["En sesión", "Duración"],
    ]
    : [
      [routineExerciseCount(routine), "Ejercicios"],
      [routineEstimatedSets(routine), "Sets"],
      [`${routineEstimatedMinutes(routine)}m`, "Duración"],
    ];
  spotlightStats.forEach(([value, label]) => {
    const item = createElement("span", "");
    item.append(createElement("strong", "", String(value)), createElement("small", "", label));
    stats.appendChild(item);
  });
  card.append(tag, createMuscleIcon(theme.group), title, stats);
  return card;
}

function renderRoutinePlannerTabs() {
  document.querySelectorAll("[data-routine-planner-view]").forEach((button) => {
    const active = button.dataset.routinePlannerView === routinePlannerView;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll("[data-routine-planner-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.routinePlannerPanel !== routinePlannerView;
  });
}

function renderRoutineCalendar() {
  renderRoutinePlannerTabs();
  const monthDate = new Date(plannerMonthDate);
  monthDate.setDate(1);
  $("routineCalendarYear").textContent = String(monthDate.getFullYear());
  $("routineCalendarMonth").textContent = new Intl.DateTimeFormat("es-ES", { month: "long" }).format(monthDate);
  const grid = $("routineCalendarGrid");
  grid.replaceChildren();
  const firstOffset = (monthDate.getDay() + 6) % 7;
  const cursor = new Date(monthDate);
  cursor.setDate(cursor.getDate() - firstOffset);
  for (let index = 0; index < 42; index += 1) {
    const key = localDateKey(cursor);
    const scheduled = scheduledDayForDate(key);
    const status = plannedWorkoutStatus(key, scheduled);
    const routineClasses = scheduled ? routineVisualClasses(scheduled.routine) : "";
    const button = createElement(
      "button",
      `calendar-day calendar-day-${status}${routineClasses ? ` ${routineClasses}` : ""}`,
    );
    button.type = "button";
    button.classList.toggle("muted-month", cursor.getMonth() !== monthDate.getMonth());
    button.classList.toggle("today", key === today);
    button.disabled = !scheduled;
    button.setAttribute("aria-label", scheduled
      ? `${formatShortDate(key)}: ${scheduled.routine.name}`
      : `${formatShortDate(key)}: sin entrenamiento`);
    button.appendChild(createElement("strong", "", String(cursor.getDate())));
    if (scheduled) button.appendChild(createElement("span", `status-dot status-dot-${status}`));
    button.addEventListener("click", () => openPlannedWorkout(key));
    grid.appendChild(button);
    cursor.setDate(cursor.getDate() + 1);
  }

  const monthEndDate = new Date(monthDate);
  monthEndDate.setMonth(monthEndDate.getMonth() + 1, 0);
  const monthEnd = localDateKey(monthEndDate);
  const scheduledDates = [];
  for (const scan = new Date(monthDate); localDateKey(scan) <= monthEnd; scan.setDate(scan.getDate() + 1)) {
    const date = localDateKey(scan);
    const scheduled = scheduledDayForDate(date);
    if (scheduled) scheduledDates.push({ date, scheduled, status: plannedWorkoutStatus(date, scheduled) });
  }
  $("plannedCompletedCount").textContent = String(scheduledDates.filter((item) => item.status === "completed").length);
  $("plannedMissedCount").textContent = String(scheduledDates.filter((item) => item.status === "missed").length);
  $("plannedPendingCount").textContent = String(scheduledDates.filter((item) => item.status === "planned").length);

  const upcomingList = $("upcomingWorkoutList");
  upcomingList.replaceChildren();
  upcomingScheduledWorkouts().forEach(({ date, routine, routineDay, status }) => {
    const card = createElement("button", `upcoming-workout-card ${routineVisualClasses(routine)} upcoming-${status}`);
    card.type = "button";
    card.append(
      createElement("span", `upcoming-accent status-dot-${status}`),
      createElement("span", "upcoming-copy", ""),
      createElement("span", "routine-card-chevron", "›"),
    );
    const copy = card.querySelector(".upcoming-copy");
    copy.append(
      createElement("small", "", formatShortDate(date)),
      createElement("strong", "", routine.name),
    );
    card.addEventListener("click", () => openPlannedWorkout(date));
    upcomingList.appendChild(card);
  });
  if (!upcomingList.children.length) {
    renderEmpty(upcomingList, "Sin próximos entrenos", "Asigna días a una rutina desde Biblioteca.");
  }
}

function openPlannedWorkout(dateKey) {
  const scheduled = scheduledDayForDate(dateKey);
  if (!scheduled) return;
  selectedPlannedWorkout = { date: dateKey, ...scheduled };
  selectedRoutineId = null;
  renderRoutineManager();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderPlannedWorkoutPanel() {
  const panel = $("plannedWorkoutPanel");
  panel.hidden = !selectedPlannedWorkout;
  if (!selectedPlannedWorkout) return;
  const { date, routine, routineDay } = selectedPlannedWorkout;
  const status = plannedWorkoutStatus(date, { routine, routineDay });
  $("plannedWorkoutDate").textContent = formatShortDate(date);
  $("plannedWorkoutTitle").textContent = routine.name;
  $("plannedWorkoutMeta").textContent = routineDayType(routineDay) === "cardio"
    ? `${cardioActivityDefinition(routineDay.cardioType).label} planificado · registro manual`
    : `${countLabel(routineDay.exercises.length, "ejercicio")} planificado · ${routineTheme(routine).label}`;
  const spotlight = createRoutineSpotlight({
    ...routine,
    name: routine.name,
    days: [{ ...routineDay }],
  });
  spotlight.classList.add(`planned-status-${status}`);
  $("plannedWorkoutSpotlight").replaceChildren(spotlight);
  $("plannedWorkoutOpenBtn").onclick = () => {
    selectedRoutineId = routine.id;
    selectedPlannedWorkout = null;
    routinePlannerView = "library";
    renderRoutineManager();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
}

function createRoutineExerciseRow(routine, routineDay, routineExercise, index) {
  const row = createElement("li", "routine-exercise-row");
  row.appendChild(createElement("span", "routine-order", String(routineExercise.order)));
  const summary = createElement("div", "routine-exercise-summary");
  summary.appendChild(createElement("strong", "", routineExercise.exerciseName));
  row.appendChild(summary);
  const actions = createElement("div", "order-actions");
  const moveUp = createButton("↑", "button-secondary", () => {
    commit(
      (next) => moveRoutineExercise(
        next,
        routine.id,
        routineDay.id,
        routineExercise.id,
        "up",
      ),
      "Orden del ejercicio actualizado.",
    );
  });
  moveUp.title = "Subir ejercicio";
  moveUp.setAttribute("aria-label", `Subir ${routineExercise.exerciseName}`);
  moveUp.disabled = index === 0;

  const moveDown = createButton("↓", "button-secondary", () => {
    commit(
      (next) => moveRoutineExercise(
        next,
        routine.id,
        routineDay.id,
        routineExercise.id,
        "down",
      ),
      "Orden del ejercicio actualizado.",
    );
  });
  moveDown.title = "Bajar ejercicio";
  moveDown.setAttribute("aria-label", `Bajar ${routineExercise.exerciseName}`);
  moveDown.disabled = index === routineDay.exercises.length - 1;

  const remove = createButton("Quitar", "button-danger", async () => {
    if (!(await confirmDialog(
      `¿Quitar “${routineExercise.exerciseName}” de ${routineDay.name}? El historial no cambiará.`,
      { title: "Quitar ejercicio", confirmLabel: "Quitar", danger: true },
    ))) return;
    commit(
      (next) => removeExerciseFromRoutineDay(
        next,
        routine.id,
        routineDay.id,
        routineExercise.id,
      ),
      "Ejercicio quitado de la rutina. El historial permanece intacto.",
    );
  });
  actions.append(moveUp, moveDown, remove);
  row.appendChild(actions);
  return row;
}

function createRoutineDayWeekdayEditor(routine, routineDay) {
  const wrapper = createElement("div", "routine-day-weekdays");
  wrapper.appendChild(createElement("small", "", "Días de repetición · pulsa para activar o quitar"));
  const choices = createElement("div", "routine-day-weekday-buttons");
  const assignments = weekdayAssignments();
  const selectedWeekdays = routineDayWeekdays(routineDay);
  weekdayOptions.forEach(({ value, label }) => {
    const weekday = Number(value);
    const assignment = assignments.get(weekday);
    const selected = selectedWeekdays.includes(weekday);
    const occupiedByOther = Boolean(assignment)
      && !(assignment.routine.id === routine.id && assignment.day.id === routineDay.id);
    const button = createElement("button", "routine-weekday-toggle", weekdayShort.get(weekday));
    button.type = "button";
    button.title = occupiedByOther ? `${label}: ocupado por ${assignment.routine.name}` : label;
    button.disabled = occupiedByOther;
    button.setAttribute("aria-pressed", String(selected));
    button.addEventListener("click", () => commit(
      (next) => {
        const current = routineDayWeekdays(
          next.training.routines
            .find((item) => item.id === routine.id)
            ?.days.find((day) => day.id === routineDay.id),
        );
        const updated = selected
          ? current.filter((item) => item !== weekday)
          : [...current, weekday];
        setRoutineDayWeekdays(next, routine.id, routineDay.id, updated);
      },
      selected ? `${label} eliminado de esta rutina.` : `${label} asignado a esta rutina.`,
    ));
    choices.appendChild(button);
  });
  wrapper.appendChild(choices);
  return wrapper;
}

function createRoutineDayCard(routine, routineDay, index) {
  const card = createElement("article", "routine-day");
  const isCardioDay = routineDayType(routineDay) === "cardio";
  const cardioDefinition = isCardioDay ? cardioActivityDefinition(routineDay.cardioType) : null;
  const header = createElement("div", "routine-day-header");
  const title = createElement("div", "routine-day-title");
  const dayIcon = createElement("span", "routine-day-icon", isCardioDay ? "" : "◆");
  if (isCardioDay) dayIcon.appendChild(createIcon(cardioDefinition.icon));
  title.append(
    dayIcon,
    createElement("h4", "", routineDay.name),
    createElement("span", "weekday-badge", isCardioDay ? cardioDefinition.label : "Fuerza"),
    createElement(
      "span",
      "weekday-badge",
      !routineDayWeekdays(routineDay).length
        ? "Sin asignar"
        : routineDayWeekdays(routineDay).map((weekday) => weekdayShort.get(weekday)).join(" · "),
    ),
  );
  const actions = createElement("div", "order-actions");
  const start = createButton("Empezar", "button-accent", () => {
    trainingView = "session";
    const started = commit(
      (next) => startSessionFromRoutineDay(next, routine.id, routineDay.id),
      `${routineDay.name} iniciado. El plan se ha copiado a la sesión de hoy.`,
    );
    if (!started) trainingView = "routines";
  });
  start.disabled = (!isCardioDay && !routineDay.exercises.length) || Boolean(getActiveSession(state));
  if (getActiveSession(state)) start.title = "Finaliza el entrenamiento en curso antes de empezar otro.";
  actions.append(start);
  header.append(title, actions);

  const list = createElement("ol", "routine-exercises");
  if (isCardioDay) {
    const item = createElement("li", "routine-cardio-summary");
    item.append(
      createElement("strong", "", cardioDefinition.label),
      createElement("small", "muted", cardioDefinition.help),
    );
    list.appendChild(item);
  } else {
    routineDay.exercises
    .slice()
    .sort((a, b) => a.order - b.order)
    .forEach((exercise, exerciseIndex) => {
      list.appendChild(createRoutineExerciseRow(
        routine,
        routineDay,
        exercise,
        exerciseIndex,
      ));
    });
  }
  if (!list.children.length) {
    const empty = createElement("li", "empty-state");
    empty.textContent = "Sin ejercicios. Añade uno para poder iniciar este día.";
    list.appendChild(empty);
  }

  const exerciseForm = createElement("form", "routine-exercise-form");
  const exerciseInput = document.createElement("input");
  exerciseInput.type = "text";
  exerciseInput.minLength = 2;
  exerciseInput.maxLength = 80;
  exerciseInput.required = true;
  exerciseInput.setAttribute("list", "routineExerciseOptions");
  exerciseInput.placeholder = "Buscar o crear ejercicio";
  exerciseInput.setAttribute("aria-label", `Ejercicio para ${routineDay.name}`);
  exerciseInput.addEventListener("input", () => renderRoutineExerciseOptions(exerciseInput.value));
  const addExerciseButton = createElement(
    "button",
    "button button-secondary",
    "Añadir ejercicio",
  );
  addExerciseButton.type = "submit";
  exerciseForm.append(exerciseInput, addExerciseButton);
  exerciseForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const entry = catalogEntryForName(exerciseInput.value);
    const saved = commit((next) => {
      const routineExercise = addExerciseToRoutineDay(
        next,
        routine.id,
        routineDay.id,
        entry ? translatedCatalogName(entry) : exerciseInput.value,
        {
          exerciseId: entry?.id,
        },
      );
      attachCatalogMetadata(next, routineExercise.exerciseId, entry);
    }, `${entry ? translatedCatalogName(entry) : exerciseInput.value.trim()} añadido a ${routineDay.name}.`);
    if (saved) exerciseForm.reset();
  });

  card.append(header, createRoutineDayWeekdayEditor(routine, routineDay), list);
  if (!isCardioDay) card.appendChild(exerciseForm);
  return card;
}

function attachRoutineSwipe(row, foreground) {
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let dragging = false;
  let pointerId = null;
  let suppressClickUntil = 0;
  const deleteWidth = 118;

  const close = () => {
    row.classList.remove("routine-swipe-open", "routine-swiping");
    foreground.style.transform = "";
  };
  const open = () => {
    row.classList.add("routine-swipe-open");
    row.classList.remove("routine-swiping");
    foreground.style.transform = `translateX(-${deleteWidth}px)`;
  };
  const finish = () => {
    if (!dragging) return;
    dragging = false;
    if (pointerId !== null) foreground.releasePointerCapture?.(pointerId);
    pointerId = null;
    if (Math.abs(currentX) > 8) suppressClickUntil = Date.now() + 280;
    if (currentX < -62) open();
    else close();
  };

  foreground.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    if (row.classList.contains("routine-swipe-open")) {
      close();
      suppressClickUntil = Date.now() + 180;
      return;
    }
    startX = event.clientX;
    startY = event.clientY;
    currentX = 0;
    dragging = true;
    pointerId = event.pointerId;
    foreground.setPointerCapture?.(event.pointerId);
  });
  foreground.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 12) {
      dragging = false;
      pointerId = null;
      close();
      return;
    }
    currentX = Math.max(-deleteWidth, Math.min(0, deltaX));
    row.classList.toggle("routine-swiping", currentX < -8);
    foreground.style.transform = `translateX(${currentX}px)`;
  });
  foreground.addEventListener("pointerup", finish);
  foreground.addEventListener("pointercancel", () => {
    dragging = false;
    pointerId = null;
    close();
  });
  foreground.addEventListener("click", (event) => {
    if (Date.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
}

function renderRoutineManager() {
  const list = $("routineList");
  list.replaceChildren();
  const routines = activeRoutines();
  $("routineCount").textContent = countLabel(routines.length, "rutina");
  renderRoutineCalendar();
  routines.forEach((routine, routineIndex) => {
    const theme = routineTheme(routine);
    const swipeRow = createElement("article", "routine-swipe-row");
    const remove = createElement("button", "routine-swipe-delete", "Eliminar");
    remove.type = "button";
    remove.setAttribute("aria-label", `Eliminar rutina ${routine.name}`);
    remove.addEventListener("click", async () => {
      if (!(await confirmDialog(
        `¿Eliminar “${routine.name}” del plan? La rutina dejará de aparecer en el plan, pero tu historial y diario se conservarán.`,
        { title: "Eliminar rutina", confirmLabel: "Eliminar", danger: true },
      ))) return;
      commit(
        (next) => archiveRoutine(next, routine.id),
        `Rutina ${routine.name} eliminada del plan. Tu historial se conserva.`,
      );
    });
    const card = createElement("button", `routine-overview-card surface ${routineVisualClasses(routine)}`);
    card.type = "button";
    card.classList.toggle("routine-card-demo", Boolean(routine.isDemo));
    const icon = createElement("span", `routine-icon routine-icon-tone-${(routineIndex % 3) + 1}`);
    icon.appendChild(createMuscleIcon(theme.group));
    const text = createElement("span", "routine-overview-copy");
    text.appendChild(createElement("span", "routine-focus-tag", theme.label));
    text.append(
      createElement("strong", "", routine.name),
      createElement(
        "small",
        "",
        `${countLabel(routineScheduledWeekdayCount(routine), "día")} · ${countLabel(routineActivityCount(routine), "actividad", "actividades")}`,
      ),
    );
    const weekdays = createElement("span", "routine-weekday-pills");
    [...new Set(routine.days.flatMap((day) => routineDayWeekdays(day)))]
      .sort((left, right) => ((left + 6) % 7) - ((right + 6) % 7))
      .forEach((weekday) => weekdays.appendChild(createElement("span", "", weekdayShort.get(weekday))));
    text.appendChild(weekdays);
    card.append(icon, text, createElement("span", "routine-card-chevron", "›"));
    card.addEventListener("click", () => {
      selectedRoutineId = routine.id;
      renderRoutineManager();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    swipeRow.append(remove, card);
    attachRoutineSwipe(swipeRow, card);
    list.appendChild(swipeRow);
  });

  if (!routines.length) {
    renderEmpty(
      list,
      "Aún no hay rutinas",
      "Crea una rutina pequeña y añade sus días en orden.",
    );
  }
  renderNewRoutineWeekdays();

  const selectedRoutine = routines.find((routine) => routine.id === selectedRoutineId);
  $("routineOverview").hidden = Boolean(selectedRoutine || selectedPlannedWorkout);
  $("routineDetailPanel").hidden = !selectedRoutine;
  renderPlannedWorkoutPanel();
  if (!selectedRoutine) return;
  $("plannedWorkoutPanel").hidden = true;
  $("routineDetailTitle").textContent = selectedRoutine.name;
  $("routineDetailMeta").textContent = `${countLabel(routineScheduledWeekdayCount(selectedRoutine), "día")} · ${countLabel(routineActivityCount(selectedRoutine), "actividad", "actividades")}`;
  $("routineSpotlight").replaceChildren(createRoutineSpotlight(selectedRoutine));
  document.querySelectorAll('input[name="selectedRoutineAccentColor"]').forEach((input) => {
    input.checked = input.value === (selectedRoutine.accentColor ?? "auto");
  });
  const detailDays = $("routineDetailDays");
  detailDays.replaceChildren();
  selectedRoutine.days
    .slice()
    .sort((left, right) => left.order - right.order)
    .forEach((routineDay, index) => detailDays.appendChild(createRoutineDayCard(selectedRoutine, routineDay, index)));
  if (!detailDays.children.length) renderEmpty(detailDays, "Añade el primer día", "Selecciona abajo uno de los días disponibles.");
  const occupied = [...weekdayAssignments({ includeDemo: Boolean(selectedRoutine.isDemo) }).keys()];
  $("addRoutineDayWeekdays").replaceChildren(createWeekdaySelector({
    name: "add-routine-day-weekday",
    disabled: occupied,
    single: true,
  }));
}

function renderRoutineExerciseOptions(query = "") {
  const options = $("routineExerciseOptions");
  const normalizedQuery = normalizeCatalogSearch(query);
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const usedExerciseIds = new Set(state.training.exercises.map((exercise) => exercise.id));
  const names = new Set(state.training.exercises.map((exercise) => exercise.name));
  if (normalizedQuery.length >= 2) {
    catalog
      .filter((entry) => queryTokens.every((token) => catalogSearchText(entry).includes(token)))
      .sort((left, right) => (
        catalogSearchScore(right, normalizedQuery, usedExerciseIds)
        - catalogSearchScore(left, normalizedQuery, usedExerciseIds)
        || translatedCatalogName(left).localeCompare(translatedCatalogName(right), "es")
      ))
      .slice(0, 20)
      .forEach((entry) => names.add(translatedCatalogName(entry)));
  }
  options.replaceChildren();
  [...names].forEach((name) => {
    options.appendChild(new Option(name, name));
  });
}

function sessionSetCount(session) {
  if ((session?.sessionType ?? "strength") === "cardio") return session.cardio?.completedAt ? 1 : 0;
  return session.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
}

function formatSet(workoutSet) {
  const parts = [`${workoutSet.reps} rep${workoutSet.reps === 1 ? "" : "s"}`];
  if (workoutSet.loadKg !== null) parts.push(`${workoutSet.loadKg} kg`);
  if (workoutSet.rir !== null && workoutSet.rir !== undefined) {
    parts.push(`RIR ${workoutSet.rir}`);
  } else if (workoutSet.rpe !== null && workoutSet.rpe !== undefined) {
    parts.push(`RPE ${workoutSet.rpe}`);
  }
  const type = workoutSet.setType ?? (workoutSet.isWarmup ? "warmup" : "effective");
  if (type === "warmup") parts.push("calentamiento");
  if (type === "approach") parts.push("aproximación");
  if (type === "effective") parts.push("efectiva");
  return parts.join(" · ");
}

function setTypeText(workoutSetOrType) {
  const type = typeof workoutSetOrType === "string"
    ? workoutSetOrType
    : workoutSetOrType?.setType ?? (workoutSetOrType?.isWarmup ? "warmup" : "effective");
  if (type === "warmup") return "Calent.";
  if (type === "approach") return "Aprox.";
  return "Efectiva";
}

function setTypeClass(workoutSetOrType) {
  const type = typeof workoutSetOrType === "string"
    ? workoutSetOrType
    : workoutSetOrType?.setType ?? (workoutSetOrType?.isWarmup ? "warmup" : "effective");
  return `set-type-${type}`;
}

function exerciseSource(exerciseId) {
  return state.training.exercises.find((exercise) => exercise.id === exerciseId)?.source ?? null;
}

function makeSetField(labelText, name, options = {}) {
  const label = createElement("label", options.full ? "full" : "");
  label.appendChild(document.createTextNode(labelText));
  const input = document.createElement(options.multiline ? "textarea" : "input");
  input.name = name;
  if (!options.multiline) input.type = options.type ?? "number";
  if (options.inputMode) input.inputMode = options.inputMode;
  if (options.min !== undefined) input.min = String(options.min);
  if (options.max !== undefined) input.max = String(options.max);
  if (options.step !== undefined) input.step = String(options.step);
  if (options.maxLength !== undefined) input.maxLength = options.maxLength;
  if (options.placeholder) input.placeholder = options.placeholder;
  label.appendChild(input);
  return { label, input };
}

function formatHintValue(value) {
  return value === null || value === undefined || value === "" ? "" : String(value);
}

function setInputHints(reference, order) {
  const referenceSets = reference?.sets?.slice().sort((a, b) => a.order - b.order) ?? [];
  const fallback = referenceSets.at(-1);
  const matched = referenceSets[Math.max(0, order - 1)] ?? fallback;
  return {
    load: formatHintValue(matched?.loadKg),
    reps: formatHintValue(matched?.reps),
    rir: formatHintValue(matched?.rir),
  };
}

function applySetInputHints(reference, order, { load, reps, rir }) {
  const hints = setInputHints(reference, order);
  load.placeholder = hints.load;
  reps.placeholder = hints.reps;
  rir.placeholder = hints.rir;
}

function stepLoadValue(input, delta) {
  const rawBase = input.value === "" ? input.placeholder : input.value;
  const base = Number(rawBase);
  const next = Math.max(0, (Number.isFinite(base) ? base : 0) + delta);
  input.value = String(Math.round(next * 2) / 2);
  input.focus();
}

function renderSetForm(session, sessionExercise, reference) {
  const form = createElement("form", "set-form");
  form.setAttribute("aria-label", "Registrar serie. Última referencia usada como guía visual si existe.");
  form.noValidate = true;
  const reps = makeSetField("Repeticiones", "reps", {
    min: 1,
    max: 1000,
    step: 1,
    inputMode: "numeric",
  });
  reps.input.required = true;
  const load = makeSetField("Peso (kg)", "loadKg", {
    min: 0,
    max: 2000,
    step: 0.5,
    inputMode: "decimal",
  });
  const rir = makeSetField("RIR opcional", "rir", {
    min: 0,
    max: 5,
    step: 1,
    inputMode: "numeric",
  });
  const note = makeSetField("Nota opcional", "note", {
    type: "text",
    maxLength: 300,
    full: true,
    placeholder: "Técnica, agarre o contexto",
  });

  const setTypeGroup = createElement("fieldset", "set-type-field set-type-options");
  const setTypeLegend = createElement("legend", "", "Tipo");
  setTypeGroup.appendChild(setTypeLegend);
  const setTypeInputs = new Map();
  [
    ["effective", "Efectiva", "Efectiva"],
    ["approach", "Aprox.", "Aproximación"],
    ["warmup", "Calent.", "Calentamiento"],
  ].forEach(([value, label, fullLabel], index) => {
    const option = createElement("label", `set-type-option ${setTypeClass(value)}`);
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "setType";
    input.value = value;
    input.checked = index === 0;
    const labelSpan = createElement("span", "", label);
    labelSpan.dataset.fullLabel = fullLabel;
    option.append(input, labelSpan);
    setTypeInputs.set(value, input);
    setTypeGroup.appendChild(option);
  });

  const actions = createElement("div", "form-actions full");
  const submit = createElement("button", "button button-accent set-check-button", "✓ Completar serie");
  submit.type = "submit";
  const cancel = createButton("Cancelar edición", "button-link", () => {
    form.reset();
    form.dataset.editingSetId = "";
    submit.textContent = "✓ Completar serie";
    cancel.hidden = true;
  });
  cancel.hidden = true;
  actions.append(submit, cancel);
  const loadStepper = createElement("div", "load-stepper");
  const loadDown = createElement("button", "load-stepper-button", "−");
  loadDown.type = "button";
  loadDown.setAttribute("aria-label", "Bajar peso 0,5 kg");
  loadDown.addEventListener("click", () => stepLoadValue(load.input, -0.5));
  const loadUp = createElement("button", "load-stepper-button", "+");
  loadUp.type = "button";
  loadUp.setAttribute("aria-label", "Subir peso 0,5 kg");
  loadUp.addEventListener("click", () => stepLoadValue(load.input, 0.5));
  loadStepper.append(loadDown, load.input, loadUp);
  const columnHeadings = createElement("div", "set-form-headings");
  columnHeadings.append(
    createElement("span", "", "Set"),
    createElement("span", "", "Peso (kg)"),
    createElement("span", "", "Reps"),
    createElement("span", "", "RIR"),
    createElement("span", "", "Tipo"),
  );
  const newSetNumber = createElement("span", "set-number set-form-number", String(sessionExercise.sets.length + 1));
  load.label.classList.add("set-field-load");
  reps.label.classList.add("set-field-reps");
  rir.label.classList.add("set-field-rir");
  load.label.replaceChildren(createElement("span", "set-field-label", "Peso · kg"), loadStepper);
  reps.label.replaceChildren(createElement("span", "set-field-label", "Reps"), reps.input);
  rir.label.replaceChildren(createElement("span", "set-field-label", "RIR"), rir.input);
  applySetInputHints(reference, sessionExercise.sets.length + 1, {
    load: load.input,
    reps: reps.input,
    rir: rir.input,
  });
  const error = createElement("p", "set-form-error full");
  error.hidden = true;
  form.append(columnHeadings, newSetNumber, load.label, reps.label, rir.label, setTypeGroup, note.label, error, actions);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    error.hidden = true;
    error.textContent = "";
    rir.input.classList.remove("field-error");
    if (rir.input.value !== "" && Number(rir.input.value) > 5) {
      if (Number(rir.input.value) <= 10) {
        rir.input.value = "5";
        showNotice("RIR máximo permitido: 5. Lo he ajustado a 5.", { error: true });
      } else {
        rir.input.classList.add("field-error");
        error.textContent = "El RIR debe estar entre 0 y 5. Si no lo sabes, déjalo vacío.";
        error.hidden = false;
        showNotice(error.textContent, { error: true });
        return;
      }
    }
    const submissionKey = `${session.id}:${sessionExercise.id}`;
    const input = {
      reps: reps.input.value,
      loadKg: load.input.value,
      rir: rir.input.value,
      setType: form.elements.setType.value,
      note: note.input.value,
    };
    const editingSetId = form.dataset.editingSetId;
    const restSeconds = timerFor(sessionExercise.id).duration;
    const successMessage = editingSetId
      ? "Serie corregida y guardada."
      : (autoRestTimerEnabled()
        ? `Serie guardada. Descanso de ${formatTimer(restSeconds)} en marcha.`
        : "Serie guardada automáticamente.");
    const saved = runOnce(submit, () => commit((next) => {
      if (editingSetId) {
        updateSet(next, session.id, sessionExercise.id, editingSetId, input);
      } else {
        addSetToExercise(next, session.id, sessionExercise.id, input);
      }
    }, successMessage), submissionKey);
    if (saved) {
      form.reset();
      if (!editingSetId && autoRestTimerEnabled()) startRestAfterSet(sessionExercise.id);
    }
  });

  form.startEditing = (workoutSet) => {
    applySetInputHints(reference, workoutSet.order, {
      load: load.input,
      reps: reps.input,
      rir: rir.input,
    });
    reps.input.value = workoutSet.reps;
    load.input.value = workoutSet.loadKg ?? "";
    rir.input.value = workoutSet.rir ?? "";
    const selectedType = workoutSet.setType ?? (workoutSet.isWarmup ? "warmup" : "effective");
    (setTypeInputs.get(selectedType) ?? setTypeInputs.get("effective")).checked = true;
    note.input.value = workoutSet.note ?? "";
    form.dataset.editingSetId = workoutSet.id;
    submit.textContent = "Guardar corrección";
    cancel.hidden = false;
    reps.input.focus();
  };
  return form;
}

function attachSetSwipe(row, foreground, { onDuplicate, onDelete }) {
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let dragging = false;
  let pointerId = null;
  const reset = () => {
    row.classList.remove("swiping-left", "swiping-right");
    foreground.style.transform = "";
  };
  const finish = () => {
    if (!dragging) return;
    dragging = false;
    if (pointerId !== null) foreground.releasePointerCapture?.(pointerId);
    pointerId = null;
    if (currentX > 86) onDuplicate();
    if (currentX < -86) onDelete();
    reset();
  };
  foreground.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button")) return;
    startX = event.clientX;
    startY = event.clientY;
    currentX = 0;
    dragging = true;
    pointerId = event.pointerId;
    foreground.setPointerCapture?.(event.pointerId);
  });
  foreground.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 12) {
      reset();
      dragging = false;
      pointerId = null;
      return;
    }
    currentX = Math.max(-112, Math.min(112, deltaX));
    row.classList.toggle("swiping-right", currentX > 12);
    row.classList.toggle("swiping-left", currentX < -12);
    foreground.style.transform = `translateX(${currentX}px)`;
  });
  foreground.addEventListener("pointerup", finish);
  foreground.addEventListener("pointercancel", () => {
    dragging = false;
    pointerId = null;
    reset();
  });
}

function createLastReferenceCard(reference) {
  const card = createElement("aside", "reference-card");
  card.setAttribute("aria-label", "Última referencia del ejercicio");
  card.appendChild(createElement("span", "reference-card-label", "Última referencia"));
  if (!reference) {
    card.appendChild(createElement("p", "muted", "Sin una sesión finalizada comparable todavía."));
    return card;
  }
  card.appendChild(createElement("strong", "", formatDateTime(reference.date)));
  const list = createElement("ol", "reference-list");
  reference.sets.slice().sort((a, b) => a.order - b.order).forEach((workoutSet) => {
    const item = createElement("li", "reference-list-item");
    item.append(
      createElement("span", "set-number", String(workoutSet.order)),
      createElement("span", "", formatSet(workoutSet)),
    );
    list.appendChild(item);
  });
  if (!list.children.length) {
    list.appendChild(createElement("li", "muted", "La sesión anterior no tenía series completadas."));
  }
  card.appendChild(list);
  return card;
}

function completedExerciseHistory(exerciseId) {
  return state.training.sessions
    .filter((session) => session.status === "completed" && session.endedAt)
    .map((session) => ({
      session,
      exercise: session.exercises.find((item) => item.exerciseId === exerciseId),
    }))
    .filter(({ exercise }) => Boolean(exercise))
    .sort((left, right) => right.session.endedAt.localeCompare(left.session.endedAt));
}

function exerciseProgressPoints(exerciseId) {
  return completedExerciseHistory(exerciseId)
    .slice()
    .reverse()
    .flatMap(({ session, exercise }) => {
      const effectiveSets = exercise.sets.filter(
        (workoutSet) => (workoutSet.setType ?? (workoutSet.isWarmup ? "warmup" : "effective")) === "effective",
      );
      if (!effectiveSets.length) return [];
      const best = effectiveSets.slice().sort((left, right) => (
        (Number(right.loadKg) || 0) - (Number(left.loadKg) || 0)
        || (Number(right.reps) || 0) - (Number(left.reps) || 0)
      ))[0];
      return [{
        date: session.endedAt,
        load: Number(best.loadKg) || 0,
        reps: Number(best.reps) || 0,
        rir: best.rir,
      }];
    });
}

function createExerciseHistoryPanel(sessionExercise) {
  const panel = createElement("section", "exercise-view-panel exercise-history-panel");
  panel.dataset.exerciseView = "history";
  const history = completedExerciseHistory(sessionExercise.exerciseId);
  panel.appendChild(createElement("p", "exercise-panel-intro", "Todas tus sesiones anteriores, sin modificar el histórico."));
  history.forEach(({ session, exercise }) => {
    const card = createElement("article", "exercise-history-session");
    card.append(
      createElement("strong", "", formatDateTime(session.endedAt)),
      createElement("small", "muted", `${session.source.label} · ${countLabel(exercise.sets.length, "serie")}`),
    );
    const sets = createElement("ol", "exercise-history-sets");
    exercise.sets.slice().sort((a, b) => a.order - b.order).forEach((workoutSet) => {
      const row = createElement("li", "exercise-history-set");
      row.append(
        createElement("span", "set-number", String(workoutSet.order)),
        createElement("span", "", formatSet(workoutSet)),
      );
      if (workoutSet.note) row.appendChild(createElement("small", "muted", workoutSet.note));
      sets.appendChild(row);
    });
    if (!sets.children.length) sets.appendChild(createElement("li", "muted", "Sin series registradas."));
    card.appendChild(sets);
    panel.appendChild(card);
  });
  if (!history.length) {
    panel.appendChild(createElement("p", "day-detail-empty", "Todavía no hay entrenamientos anteriores para este ejercicio."));
  }
  return panel;
}

function createExerciseProgressPanel(sessionExercise) {
  const panel = createElement("section", "exercise-view-panel exercise-progress-panel");
  panel.dataset.exerciseView = "progress";
  panel.appendChild(createElement("p", "exercise-panel-intro", "Mejor serie efectiva de cada entrenamiento: peso y repeticiones."));
  const legend = createElement("div", "chart-legend exercise-chart-legend");
  legend.setAttribute("aria-hidden", "true");
  legend.append(
    createElement("span", "legend-load", "Peso levantado (kg)"),
    createElement("span", "legend-reps", "Repeticiones"),
  );
  panel.appendChild(legend);
  const chart = createElement("div", "exercise-chart exercise-inline-chart");
  chart.setAttribute("role", "img");
  chart.setAttribute("aria-label", `Progreso de ${sessionExercise.exerciseName}: línea verde peso en kilos, línea naranja repeticiones.`);
  panel.appendChild(chart);
  renderExerciseChart(exerciseProgressPoints(sessionExercise.exerciseId), chart);
  return panel;
}

function activateExerciseView(article, sessionExerciseId, view) {
  exerciseViewStates.set(sessionExerciseId, view);
  article.querySelectorAll("[data-exercise-view-button]").forEach((button) => {
    const active = button.dataset.exerciseViewButton === view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  article.querySelectorAll("[data-exercise-view]").forEach((panel) => {
    panel.hidden = panel.dataset.exerciseView !== view;
  });
}

function renderSessionExercise(session, sessionExercise) {
  const article = createElement("details", "session-exercise");
  article.dataset.sessionExerciseId = sessionExercise.id;
  article.open = expandedSessionExerciseId
    ? expandedSessionExerciseId === sessionExercise.id
    : session.exercises.find((exercise) => exercise.status !== "skipped")?.id === sessionExercise.id;
  if (article.open) expandedSessionExerciseId = sessionExercise.id;
  article.classList.toggle("session-exercise-skipped", sessionExercise.status === "skipped");
  article.classList.toggle("session-exercise-extra", Boolean(sessionExercise.isExtra));
  const summary = createElement("summary", "session-exercise-summary");
  const summaryText = createElement("div");
  summaryText.append(
    createElement("strong", "", sessionExercise.exerciseName),
    createElement(
      "small",
      "",
      sessionExercise.isExtra
        ? "Extra solo hoy"
        : sessionExercise.sets.length
          ? `${countLabel(sessionExercise.sets.length, "serie")} registrada${sessionExercise.sets.length === 1 ? "" : "s"}`
          : "Pulsa para registrar la primera serie",
    ),
  );
  const summaryStatus = createElement(
    "span",
    "exercise-summary-status",
    sessionExercise.status === "skipped"
      ? "Omitido"
      : sessionExercise.sets.length
        ? `✓ ${sessionExercise.sets.length}`
        : "Abrir",
  );
  summary.append(summaryText, summaryStatus);
  article.addEventListener("toggle", () => {
    if (!article.open) return;
    expandedSessionExerciseId = sessionExercise.id;
    [...restTimerStates.keys()]
      .filter((exerciseId) => exerciseId !== sessionExercise.id)
      .forEach(stopExerciseTimer);
    document.querySelectorAll(".session-exercise[open]").forEach((other) => {
      if (other !== article) other.open = false;
    });
  });
  const header = createElement("div", "exercise-header");
  const titleBlock = document.createElement("div");
  const source = exerciseSource(sessionExercise.exerciseId);
  titleBlock.appendChild(createElement(
    "span",
    "exercise-source",
    sessionExercise.isSubstitution
      ? `Alternativa solo hoy · antes: ${sessionExercise.substitutedFrom?.exerciseName ?? "otro ejercicio"}`
      : source?.type === "dataset" ? "Catálogo auditado · revisión pendiente" : "Ejercicio personal",
  ));
  titleBlock.appendChild(createElement("h3", "", sessionExercise.exerciseName));
  titleBlock.appendChild(createElement(
    "p",
    "exercise-plan",
    sessionExercise.isExtra ? "Ejercicio extra · solo hoy" : "Registra únicamente lo que hagas hoy",
  ));
  if (sessionExercise.planNote) titleBlock.appendChild(createElement("p", "muted", sessionExercise.planNote));

  const reference = findLastComparableExercise(state, sessionExercise.exerciseId, session.id);
  titleBlock.appendChild(createLastReferenceCard(reference));
  header.appendChild(titleBlock);
  const statusBlock = createElement("div", "exercise-status-actions");
  statusBlock.appendChild(createElement("span", "count-badge", countLabel(sessionExercise.sets.length, "serie")));
  if (!sessionExercise.isExtra && !sessionExercise.sets.length) {
    if (sessionExercise.status === "skipped") {
      statusBlock.appendChild(createButton(
        "Volver a incluir hoy",
        "button-secondary",
        () => commit(
          (next) => setSessionExerciseSkipped(next, session.id, sessionExercise.id, false),
          "Ejercicio incluido de nuevo en el entrenamiento de hoy.",
        ),
      ));
    } else {
      const exceptionMenu = createElement("details", "exercise-exception-menu");
      const exceptionSummary = createElement(
        "summary",
        "exercise-exception-summary",
        "¿No puedes realizar este ejercicio hoy?",
      );
      const exceptionActions = createElement("div", "exercise-exception-actions");
      const alternative = createButton("Elegir una alternativa para hoy", "button-secondary", () => {
        replacementTargetExerciseId = sessionExercise.id;
        $("catalogSearch").value = "";
        const picker = document.querySelector(".exercise-picker");
        picker.open = true;
        renderCatalogResults();
        window.requestAnimationFrame(() => $("catalogSearch").focus());
        showNotice(
          `Busca una alternativa para ${sessionExercise.exerciseName}. La rutina original no cambiará.`,
        );
      });
      const notPerformed = createButton("Marcar como no realizado", "button-quiet", () => commit(
        (next) => setSessionExerciseSkipped(next, session.id, sessionExercise.id, true),
        "Ejercicio marcado como no realizado hoy. La rutina original no ha cambiado.",
      ));
      exceptionActions.append(
        createElement("p", "muted", "Estas opciones solo afectan al entrenamiento de hoy."),
        alternative,
        notPerformed,
      );
      exceptionMenu.append(exceptionSummary, exceptionActions);
      statusBlock.appendChild(exceptionMenu);
    }
  }
  header.appendChild(statusBlock);

  const content = createElement("div", "set-area");
  const list = createElement("ol", "set-list");
  const form = renderSetForm(session, sessionExercise, reference);

  sessionExercise.sets.forEach((workoutSet) => {
    const duplicateCurrentSet = () => commit(
      (next) => duplicateSet(next, session.id, sessionExercise.id, workoutSet.id),
      `Serie ${workoutSet.order} duplicada con los mismos valores.`,
    );
    const deleteCurrentSet = async () => {
      if (!(await confirmDialog(`¿Borrar la serie ${workoutSet.order}? Podrás deshacerla después.`, { title: "Borrar serie", confirmLabel: "Borrar", danger: true }))) return;
      commit((next) => {
        deleteSet(next, session.id, sessionExercise.id, workoutSet.id);
      }, "Serie borrada. Puedes deshacerla.");
    };
    const row = createElement("li", "set-row swipe-set-row");
    row.append(
      createElement("span", "set-swipe-action set-swipe-duplicate", "Duplicar"),
      createElement("span", "set-swipe-action set-swipe-delete", "Borrar"),
    );
    const foreground = createElement("div", "set-row-content");
    foreground.appendChild(createElement("span", "set-number set-complete", String(workoutSet.order)));
    const loadCell = createElement("strong", "set-cell set-load", workoutSet.loadKg === null ? "—" : `${workoutSet.loadKg} kg`);
    loadCell.dataset.label = "Peso";
    const repsCell = createElement("span", "set-cell set-reps", `${workoutSet.reps}`);
    repsCell.dataset.label = "Reps";
    const rirCell = createElement("span", "set-cell set-rir", workoutSet.rir ?? "—");
    rirCell.dataset.label = "RIR";
    foreground.append(loadCell, repsCell, rirCell);
    foreground.appendChild(createElement("span", `set-type-badge ${setTypeClass(workoutSet)}`, setTypeText(workoutSet)));
    const actions = createElement("div", "item-actions set-row-actions");
    actions.append(
      createButton("Duplicar", "button-quiet", duplicateCurrentSet),
      createButton("Editar", "button-secondary", () => form.startEditing(workoutSet)),
      createButton("Borrar", "button-danger", deleteCurrentSet),
    );
    foreground.appendChild(actions);
    if (workoutSet.note) foreground.appendChild(createElement("small", "set-row-note", workoutSet.note));
    row.appendChild(foreground);
    attachSetSwipe(row, foreground, { onDuplicate: duplicateCurrentSet, onDelete: deleteCurrentSet });
    list.appendChild(row);
  });

  if (!list.children.length) {
    const empty = createElement("li", "empty-state");
    empty.textContent = "Aún no hay series. Registra la primera en el formulario inferior.";
    list.appendChild(empty);
  }

  const viewTabs = createElement("div", "exercise-view-tabs");
  viewTabs.setAttribute("role", "tablist");
  [["history", "Historial"], ["current", "Actual"], ["progress", "Progreso"]].forEach(([view, label]) => {
    const button = createElement("button", "exercise-view-tab", label);
    button.type = "button";
    button.dataset.exerciseViewButton = view;
    button.setAttribute("role", "tab");
    button.addEventListener("click", () => activateExerciseView(article, sessionExercise.id, view));
    viewTabs.appendChild(button);
  });
  const historyPanel = createExerciseHistoryPanel(sessionExercise);
  const currentPanel = createElement("section", "exercise-view-panel exercise-current-panel");
  currentPanel.dataset.exerciseView = "current";
  const progressPanel = createExerciseProgressPanel(sessionExercise);
  if (sessionExercise.status === "skipped") {
    content.append(header, createElement("p", "empty-state", "Este ejercicio se ha marcado como no realizado hoy."));
  } else {
    content.append(header, list, form, createExerciseRestTimer(sessionExercise.id));
  }
  currentPanel.appendChild(content);
  article.append(summary, viewTabs, historyPanel, currentPanel, progressPanel);
  window.requestAnimationFrame(() => activateExerciseView(
    article,
    sessionExercise.id,
    exerciseViewStates.get(sessionExercise.id) ?? "current",
  ));
  return article;
}

function renderTraining() {
  const active = getActiveSession(state);
  const activeRoutine = routineForSession(active);
  if (!active) trainingView = "routines";
  applyRoutineVisualClasses($("activeSessionPanel"), activeRoutine);
  applyRoutineVisualClasses($("activeSessionResume"), activeRoutine);
  $("routineManager").hidden = trainingView !== "routines";
  $("activeSessionPanel").hidden = !active || trainingView !== "session";
  $("activeSessionResume").hidden = !active;
  $("startFreeSessionBtn").disabled = Boolean(active);

  if (active) {
    const isCardioSession = (active.sessionType ?? "strength") === "cardio";
    $("activeSessionResumeTitle").textContent = active.source.label;
    $("activeSessionResumeMeta").textContent = isCardioSession
      ? `${cardioSummary(active.cardio)} · pulsa para continuar`
      : `${countLabel(sessionSetCount(active), "serie")} guardadas · pulsa para continuar`;
    $("activeSessionTitle").textContent = active.source.label;
    $("activeSessionMeta").textContent = isCardioSession
      ? `Iniciada ${formatDateTime(active.startedAt)} · ${cardioSummary(active.cardio)}`
      : `Iniciada ${formatDateTime(active.startedAt)} · ${countLabel(sessionSetCount(active), "serie")} guardadas`;
    $("sessionExerciseList").replaceChildren();
    $("sessionExerciseList").hidden = isCardioSession;
    $("cardioSessionForm").hidden = !isCardioSession || trainingView !== "session";
    document.querySelector(".exercise-picker").hidden = isCardioSession;
    if (isCardioSession) {
      setCardioForm(active);
      updateCardioPacePreview();
    }
    if (!isCardioSession) active.exercises
      .slice()
      .sort((a, b) => a.order - b.order)
      .forEach((exercise) => $("sessionExerciseList").appendChild(renderSessionExercise(active, exercise)));
    if (!isCardioSession && !active.exercises.length) {
      renderEmpty(
        $("sessionExerciseList"),
        "Añade el primer ejercicio",
        "Usa el catálogo completo o crea uno personal.",
      );
    }
  } else {
    $("sessionExerciseList").hidden = false;
    $("cardioSessionForm").hidden = true;
    document.querySelector(".exercise-picker").hidden = false;
  }

  $("undoBar").hidden = !state.training.undo;
  renderCatalogResults();
  updateActiveSessionElapsed();
}

function setCardioForm(session) {
  const cardio = session.cardio ?? {};
  const definition = cardioActivityDefinition(cardio.activityType);
  syncCardioMetricFields(definition);
  $("cardioDistanceKm").value = cardio.distanceKm === null || cardio.distanceKm === undefined
    ? ""
    : definition.distanceUnit === "m"
      ? Math.round(cardio.distanceKm * 1000)
      : cardio.distanceKm;
  $("cardioDuration").value = cardio.durationSeconds ? formatWorkoutDuration(cardio.durationSeconds) : "";
  $("cardioSteps").value = cardio.steps ?? "";
  $("cardioElevationGainM").value = cardio.elevationGainM ?? "";
  $("cardioInclinePercent").value = cardio.inclinePercent ?? "";
  $("cardioPoolLengthM").value = cardio.poolLengthM ?? "";
  $("cardioResistanceLevel").value = cardio.resistanceLevel ?? "";
  $("cardioCadencePerMinute").value = cardio.cadencePerMinute ?? "";
  $("cardioAveragePowerWatts").value = cardio.averagePowerWatts ?? "";
  $("cardioAverageHeartRateBpm").value = cardio.averageHeartRateBpm ?? "";
  $("cardioCaloriesKcal").value = cardio.caloriesKcal ?? "";
  $("cardioNote").value = cardio.note ?? "";
  renderCardioHistory(definition.type);
}

function syncCardioMetricFields(definition) {
  $("cardioSessionFamily").textContent = `${definition.family} · registro manual`;
  $("cardioSessionType").textContent = definition.label;
  $("cardioSessionHint").textContent = definition.help;
  $("cardioDistanceLabel").textContent = definition.distanceOptional ? "Distancia opcional" : "Distancia";
  $("cardioDistanceUnit").textContent = definition.distanceUnit ?? "km";
  $("cardioDistanceKm").placeholder = definition.distanceUnit === "m" ? "1000" : "5.00";
  $("cardioDistanceKm").required = !definition.distanceOptional;
  $("cardioCadenceUnit").textContent = definition.type === "rowing" ? "paladas/min" : "rpm";
  document.querySelectorAll("[data-cardio-field]").forEach((field) => {
    field.hidden = !definition.fields.includes(field.dataset.cardioField);
  });
}

function cardioDistanceFromForm(definition) {
  const enteredDistance = numberValue("cardioDistanceKm");
  if (enteredDistance === null) return null;
  return definition.distanceUnit === "m" ? enteredDistance / 1000 : enteredDistance;
}

function updateCardioPacePreview() {
  const active = getActiveSession(state);
  const definition = cardioActivityDefinition(active?.cardio?.activityType);
  const distance = cardioDistanceFromForm(definition);
  const duration = parseDurationInput($("cardioDuration").value);
  const derived = cardioDerivedMetrics(definition.type, distance, duration, {
    poolLengthM: numberValue("cardioPoolLengthM"),
  });
  const primary = $("cardioPacePreview");
  const primaryLabel = primary.querySelector("small");
  const primaryValue = primary.querySelector("strong");
  const secondary = $("cardioSecondaryPreview");
  const secondaryLabel = secondary.querySelector("small");
  const secondaryValue = secondary.querySelector("strong");
  secondary.hidden = true;

  if (!Number.isFinite(duration) || duration <= 0 || (!definition.distanceOptional && !(distance > 0))) {
    primaryLabel.textContent = definition.distanceOptional ? "Tiempo" : "Resultado automático";
    primaryValue.textContent = definition.distanceOptional ? "Introduce el tiempo" : "Completa distancia y tiempo";
    return;
  }
  if (definition.metric === "speed") {
    primaryLabel.textContent = "Velocidad media";
    primaryValue.textContent = derived.averageSpeedKmh ? `${derived.averageSpeedKmh.toLocaleString("es-ES")} km/h` : "Añade distancia si la conoces";
  } else if (definition.metric === "swim") {
    primaryLabel.textContent = "Ritmo medio";
    primaryValue.textContent = formatPaceForUnit(derived.paceSecondsPer100m, "100 m");
  } else if (definition.metric === "rowing") {
    primaryLabel.textContent = "Ritmo medio";
    primaryValue.textContent = formatPaceForUnit(derived.paceSecondsPer500m, "500 m");
  } else if (definition.metric === "time") {
    primaryLabel.textContent = "Tiempo activo";
    primaryValue.textContent = formatWorkoutDuration(duration);
  } else {
    primaryLabel.textContent = "Ritmo medio";
    primaryValue.textContent = formatPace(derived.paceSecondsPerKm);
  }
  if (derived.poolLengths) {
    secondary.hidden = false;
    secondaryLabel.textContent = "Largos calculados";
    secondaryValue.textContent = `${derived.poolLengths.toLocaleString("es-ES")} largos`;
  }
}

function renderCardioHistory(activityType) {
  const definition = cardioActivityDefinition(activityType);
  const sessions = state.training.sessions
    .filter((session) => (
      session.status === "completed"
      && session.sessionType === "cardio"
      && session.cardio?.activityType === definition.type
    ))
    .sort((left, right) => new Date(right.endedAt) - new Date(left.endedAt));
  const stats = $("cardioProgressStats");
  const history = $("cardioRecentHistory");
  stats.replaceChildren();
  history.replaceChildren();
  const totalDistanceKm = sessions.reduce((total, session) => total + (Number(session.cardio.distanceKm) || 0), 0);
  const totalSeconds = sessions.reduce((total, session) => total + (Number(session.cardio.durationSeconds) || 0), 0);
  const distanceText = definition.distanceUnit === "m"
    ? `${Math.round(totalDistanceKm * 1000).toLocaleString("es-ES")} m`
    : `${Number(totalDistanceKm.toFixed(2)).toLocaleString("es-ES")} km`;
  [
    [sessions.length, "Sesiones"],
    [distanceText, "Distancia"],
    [formatWorkoutDuration(totalSeconds), "Tiempo"],
  ].forEach(([value, label]) => {
    const item = createElement("span", "");
    item.append(createElement("strong", "", String(value)), createElement("small", "", label));
    stats.appendChild(item);
  });
  sessions.slice(0, 5).forEach((session) => {
    const item = createElement("li", "");
    item.append(
      createElement("time", "", formatDateTime(session.endedAt)),
      createElement("strong", "", cardioSummary(session.cardio)),
    );
    history.appendChild(item);
  });
  if (!sessions.length) {
    const empty = createElement("li", "empty-state", "Tu primera actividad aparecerá aquí cuando la finalices.");
    history.appendChild(empty);
  }
}

function updateActiveSessionElapsed() {
  const active = getActiveSession(state);
  const element = $("activeSessionElapsed");
  if (!active || trainingView !== "session") {
    element.textContent = "";
    if (sessionElapsedIntervalId) {
      window.clearInterval(sessionElapsedIntervalId);
      sessionElapsedIntervalId = null;
    }
    return;
  }
  element.textContent = `Tiempo total · ${formatWorkoutDuration(sessionElapsedSeconds(active))}`;
  if (!sessionElapsedIntervalId) {
    sessionElapsedIntervalId = window.setInterval(updateActiveSessionElapsed, 1000);
  }
}

function renderCatalogFilters() {
  const categorySelect = $("catalogCategory");
  const equipmentSelect = $("catalogEquipment");
  const targetSelect = $("catalogTarget");
  const selectedCategory = categorySelect.value;
  const selectedEquipment = equipmentSelect.value;
  const selectedTarget = targetSelect.value;
  categorySelect.replaceChildren(new Option("Todas", ""));
  equipmentSelect.replaceChildren(new Option("Todos", ""));
  targetSelect.replaceChildren(new Option("Todos", ""));
  [...new Set(catalog.map((entry) => entry.categoryEs))].sort().forEach((value) => {
    categorySelect.appendChild(new Option(value, value));
  });
  [...new Set(catalog.map((entry) => entry.equipmentEs))].sort().forEach((value) => {
    equipmentSelect.appendChild(new Option(value, value));
  });
  [...new Set(catalog.map((entry) => entry.targetEs ?? entry.target))].sort().forEach((value) => {
    targetSelect.appendChild(new Option(value, value));
  });
  categorySelect.value = selectedCategory;
  equipmentSelect.value = selectedEquipment;
  targetSelect.value = selectedTarget;
}

function renderCatalogResults() {
  const container = $("catalogResults");
  const resultActions = $("catalogResultActions");
  resultActions.replaceChildren();
  $("cancelReplacementBtn").hidden = !replacementTargetExerciseId;
  if (!catalog.length) {
    renderEmpty(container, "Catálogo no disponible", "Puedes seguir creando ejercicios personales.");
    $("catalogCount").textContent = "0 ejercicios";
    return;
  }

  const query = normalizeCatalogSearch($("catalogSearch").value);
  const queryTokens = query.split(/\s+/).filter(Boolean);
  const category = $("catalogCategory").value;
  const equipment = $("catalogEquipment").value;
  const target = $("catalogTarget").value;
  if (!queryTokens.length && !category && !equipment && !target) {
    $("catalogCount").textContent = `${catalog.length.toLocaleString("es-ES")} disponibles`;
    $("catalogStatus").textContent = replacementTargetExerciseId
      ? "Modo alternativa: elige un ejercicio; la rutina original no cambiará."
      : "Busca por nombre, músculo o equipo para ver una selección breve.";
    renderEmpty(
      container,
      replacementTargetExerciseId ? "Busca una alternativa" : "Busca tu ejercicio",
      "No mostramos todo el catálogo de golpe para evitar una lista abrumadora.",
    );
    return;
  }
  const usedExerciseIds = new Set(state.training.exercises.map((exercise) => exercise.id));
  const matches = catalog.filter((entry) => {
    const normalizedSearchable = catalogSearchText(entry);
    return (!queryTokens.length || queryTokens.every((token) => normalizedSearchable.includes(token)))
      && (!category || entry.categoryEs === category)
      && (!equipment || entry.equipmentEs === equipment)
      && (!target || (entry.targetEs ?? entry.target) === target);
  }).sort((left, right) => {
    return catalogSearchScore(right, query, usedExerciseIds)
      - catalogSearchScore(left, query, usedExerciseIds)
      || translatedCatalogName(left).localeCompare(translatedCatalogName(right), "es");
  });

  $("catalogCount").textContent = `${catalog.length.toLocaleString("es-ES")} ejercicios`;
  $("catalogStatus").textContent = `${matches.length.toLocaleString("es-ES")} resultados · catálogo auditado, sin imágenes ni GIF.`;
  container.replaceChildren();
  matches.slice(0, catalogResultLimit).forEach((entry) => {
    const card = createElement("article", "catalog-card");
    const text = document.createElement("div");
    text.append(
      createElement("strong", "", translatedCatalogName(entry)),
      createElement(
        "small",
        "",
        `${entry.categoryEs} · ${entry.equipmentEs} · ${entry.targetEs ?? entry.target}`,
      ),
    );
    if (entry.nameLocale !== "es") {
      text.appendChild(createElement("small", "catalog-language", `Nombre original: ${entry.nameOriginal}`));
    }
    if (entry.reviewStatus === "pending_professional_review") {
      text.appendChild(createElement("small", "catalog-review-pending", "Sin revisión profesional todavía"));
    }
    const active = getActiveSession(state);
    const add = createButton(replacementTargetExerciseId ? "Elegir alternativa" : "Añadir", "button-secondary", () => {
      if (!active) return;
      const replacementId = replacementTargetExerciseId;
      const saved = runOnce(add, () => commit((next) => {
        const sessionExercise = replacementId
          ? replaceSessionExerciseForToday(
            next,
            active.id,
            replacementId,
            translatedCatalogName(entry),
            { exerciseId: entry.id },
          )
          : addExerciseToSession(
            next,
            active.id,
            translatedCatalogName(entry),
            { exerciseId: entry.id },
          );
        attachCatalogMetadata(next, sessionExercise.exerciseId, entry);
      }, replacementId
        ? `${translatedCatalogName(entry)} será la alternativa solo en esta sesión.`
        : `${translatedCatalogName(entry)} añadido a la sesión.`));
      if (saved && replacementId) {
        replacementTargetExerciseId = null;
        renderCatalogResults();
      }
    });
    add.disabled = !active;

    const details = document.createElement("details");
    details.className = "catalog-instructions";
    const summary = createElement("summary", "", "Ver indicaciones en español");
    const instructions = createElement(
      "p",
      "",
      entry.instructionsEs || "No hay indicaciones disponibles.",
    );
    const warning = createElement(
      "small",
      "",
      "Texto del dataset pendiente de revisión profesional. No es consejo médico.",
    );
    details.append(summary, instructions, warning);
    card.append(text, add, details);
    container.appendChild(card);
  });

  if (!container.children.length) {
    renderEmpty(container, "Sin coincidencias", "Prueba otro término o crea un ejercicio personal.");
  } else if (matches.length > catalogResultLimit) {
    const remaining = matches.length - catalogResultLimit;
    resultActions.append(
      createButton(`Ver ${Math.min(4, remaining)} más`, "button-secondary", () => {
        catalogResultLimit += 4;
        renderCatalogResults();
      }),
      createButton(`Ver todos (${matches.length.toLocaleString("es-ES")})`, "button-quiet", () => {
        catalogResultLimit = matches.length;
        renderCatalogResults();
      }),
    );
  }
}

// Los ejercicios guardados antes de que existiera el mapa no llevan músculos.
// En cuanto el catálogo está disponible se rellenan una sola vez, para que el
// historial que ya tienes cuente desde el primer día. Los ejercicios propios
// que no estén en el catálogo se quedan sin músculos a propósito: es mejor un
// hueco declarado que una asignación inventada.
function backfillExerciseMuscles() {
  if (!catalog.length) return;
  const porSourceId = new Map(catalog.map((entry) => [entry.sourceId, entry]));
  const asignaciones = new Map();
  state.training.exercises.forEach((exercise) => {
    if (exercise.muscles) return;
    const entry = (exercise.source?.sourceId && porSourceId.get(exercise.source.sourceId))
      || catalogEntryForName(exercise.name);
    if (!entry) return;
    const muscles = normalizeCatalogMuscles(entry);
    if (muscles.direct.length || muscles.secondary.length) asignaciones.set(exercise.id, muscles);
  });
  if (!asignaciones.size) return;
  commit((next) => {
    next.training.exercises.forEach((exercise) => {
      const muscles = asignaciones.get(exercise.id);
      if (muscles && !exercise.muscles) exercise.muscles = muscles;
    });
  }, null);
}

async function loadCatalog() {
  try {
    const response = await fetch("./data/exercises.es.json?v=58", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.exercises)) throw new Error("Estructura no válida");
    catalog = payload.exercises;
    backfillExerciseMuscles();
    renderCatalogFilters();
    renderCatalogResults();
    renderRoutineExerciseOptions();
    renderRoutineManager();
  } catch {
    catalog = [];
    renderCatalogResults();
    showNotice(
      "El catálogo no pudo cargarse. Los ejercicios personales siguen disponibles.",
      { error: true },
    );
  }
}

// ---------------------------------------------------------------------------
// Mapa muscular
//
// Cuerpo estilizado, no lámina anatómica: se declara como diagrama para no
// prometer una precisión de activación que no tenemos. La geometría sale de un
// esqueleto de articulaciones (scripts/generate-muscle-map.mjs), así que el
// músculo y la silueta no pueden desalinearse al retocar una postura.
// ---------------------------------------------------------------------------

const BODY_VIEWBOX = "0 0 150 280";

const BODY_SILHOUETTE = [
  "M75 4L82 7L87 14L88 24L85 33L80 39L75 41L70 39L65 33L62 24L63 14L68 7Z",
  "M75 39L85 44L96 51L105 60L108 72L104 88L99 98L96 118L97 132L100 146L95 162L85 170L75 172L65 170L55 162L50 146L53 132L54 118L51 98L46 88L42 72L45 60L54 51L65 44Z",
  "M46 74L55 80L51 116L38 120L36 96L39 78Z",
  "M104 74L95 80L99 116L112 120L114 96L111 78Z",
  "M38 120L51 118L46 150L41 174L28 172L30 146Z",
  "M112 120L99 118L104 150L109 174L122 172L120 146Z",
  "M28 172L41 174L40 188L42 198L37 199L35 190L34 200L29 200L28 190L25 197L21 194L22 182Z",
  "M122 172L109 174L110 188L108 198L113 199L115 190L116 200L121 200L122 190L125 197L129 194L128 182Z",
  "M55 164L75 168L75 214L70 222L59 222L50 196L51 172Z",
  "M95 164L75 168L75 214L80 222L91 222L100 196L99 172Z",
  "M59 222L70 222L70 242L68 260L59 260L56 242Z",
  "M91 222L80 222L80 242L82 260L91 260L94 242Z",
  "M59 258L68 258L71 268L62 273L50 273L51 264Z",
  "M91 258L82 258L79 268L88 273L100 273L99 264Z",
];

const MUSCLE_SHAPES = {
  front: {
    neck: [
      "M68 38L72 40L74 52L70 53L66 46Z",
      "M82 38L78 40L76 52L80 53L84 46Z",
    ],
    traps: [
      "M66 42L74 46L74 55L55 60L50 55Z",
      "M84 42L76 46L76 55L95 60L100 55Z",
    ],
    shoulders: [
      "M54 55L46 58L41 68L41 82L48 88L54 78L56 64Z",
      "M96 55L104 58L109 68L109 82L102 88L96 78L94 64Z",
    ],
    chest: [
      "M56 61L74 58L74 72L55 75Z",
      "M55 75L74 72L74 88L64 92L54 85L52 78Z",
      "M94 61L76 58L76 72L95 75Z",
      "M95 75L76 72L76 88L86 92L96 85L98 78Z",
    ],
    serratus: [
      "M53 88L60 92L58 98L52 94Z",
      "M54 99L61 102L59 108L53 105Z",
      "M97 88L90 92L92 98L98 94Z",
      "M96 99L89 102L91 108L97 105Z",
    ],
    abs: [
      "M63 92L74 92L74 102L64 102Z",
      "M64.2 103L74 103L74 113L65.2 113Z",
      "M65.4 114L74 114L74 124L66.4 124Z",
      "M66.6 125L74 125L74 136L67.6 136Z",
      "M87 92L76 92L76 102L86 102Z",
      "M85.8 103L76 103L76 113L84.8 113Z",
      "M84.6 114L76 114L76 124L83.6 124Z",
      "M83.4 125L76 125L76 136L82.4 136Z",
    ],
    obliques: [
      "M57 96L64 100L64 128L59 136L54 118Z",
      "M93 96L86 100L86 128L91 136L96 118Z",
    ],
    biceps: [
      "M43 78L53 82L49 112L41 114L39 94Z",
      "M107 78L97 82L101 112L109 114L111 94Z",
    ],
    forearms: [
      "M34 124L46 126L42 150L33 148Z",
      "M32 150L42 152L39 172L30 170Z",
      "M116 124L104 126L108 150L117 148Z",
      "M118 150L108 152L111 172L120 170Z",
    ],
    hip_flexors: [
      "M63 146L74 148L74 162L65 160Z",
      "M87 146L76 148L76 162L85 160Z",
    ],
    abductors: [
      "M56 156L63 159L62 176L55 170Z",
      "M94 156L87 159L88 176L95 170Z",
    ],
    quads: [
      "M54 166L65 166L64 210L59 218L52 194Z",
      "M66 166L73 170L72 214L65 213Z",
      "M70 194L75 196L74 220L69 217Z",
      "M96 166L85 166L86 210L91 218L98 194Z",
      "M84 166L77 170L78 214L85 213Z",
      "M80 194L75 196L76 220L81 217Z",
    ],
    adductors: [
      "M71 168L75 170L75 196L69 192Z",
      "M79 168L75 170L75 196L81 192Z",
    ],
    tibialis: [
      "M62 230L69 232L68 256L62 256Z",
      "M88 230L81 232L82 256L88 256Z",
    ],
  },
  back: {
    neck: [
      "M67 38L75 39L75 52L67 52Z",
      "M83 38L75 39L75 52L83 52Z",
    ],
    traps: [
      "M66 42L75 45L75 62L54 60L50 54Z",
      "M54 62L75 64L75 84L57 80Z",
      "M84 42L75 45L75 62L96 60L100 54Z",
      "M96 62L75 64L75 84L93 80Z",
    ],
    shoulders: [
      "M54 55L46 58L41 68L41 82L48 88L54 78L56 64Z",
      "M96 55L104 58L109 68L109 82L102 88L96 78L94 64Z",
    ],
    upper_back: [
      "M58 82L74 84L74 98L59 96Z",
      "M92 82L76 84L76 98L91 96Z",
    ],
    lats: [
      "M52 80L64 92L65 116L58 130L49 108L48 88Z",
      "M98 80L86 92L85 116L92 130L101 108L102 88Z",
    ],
    lower_back: [
      "M64 110L74 112L74 136L65 134Z",
      "M86 110L76 112L76 136L85 134Z",
    ],
    triceps: [
      "M37 78L47 82L44 114L36 112L35 92Z",
      "M113 78L103 82L106 114L114 112L115 92Z",
    ],
    forearms: [
      "M34 124L46 126L42 150L33 148Z",
      "M32 150L42 152L39 172L30 170Z",
      "M116 124L104 126L108 150L117 148Z",
      "M118 150L108 152L111 172L120 170Z",
    ],
    glutes: [
      "M57 144L74 148L74 170L63 176L54 164Z",
      "M93 144L76 148L76 170L87 176L96 164Z",
    ],
    hamstrings: [
      "M54 172L63 172L62 212L57 220L51 198Z",
      "M64 172L73 176L72 216L64 214Z",
      "M96 172L87 172L88 212L93 220L99 198Z",
      "M86 172L77 176L78 216L86 214Z",
    ],
    calves: [
      "M59 228L66 230L65 250L60 248Z",
      "M67 230L72 230L71 250L66 250Z",
      "M62 252L70 252L69 262L63 262Z",
      "M91 228L84 230L85 250L90 248Z",
      "M83 230L78 230L79 250L84 250Z",
      "M88 252L80 252L81 262L87 262Z",
    ],
  },
};

const SVG_NS = "http://www.w3.org/2000/svg";

let muscleMapPeriod = "week";

function muscleShapeElement(d) {
  const element = document.createElementNS(SVG_NS, "path");
  element.setAttribute("d", d);
  return element;
}

function renderMuscleFigure(view, volume) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", BODY_VIEWBOX);
  svg.setAttribute("class", "muscle-figure");
  svg.setAttribute("role", "img");

  BODY_SILHOUETTE.forEach((d) => {
    const element = muscleShapeElement(d);
    element.setAttribute("class", "muscle-body");
    svg.appendChild(element);
  });

  const trabajados = [];
  Object.entries(MUSCLE_SHAPES[view]).forEach(([regionId, shapes]) => {
    const region = volume.byRegion[regionId] ?? { directSets: 0, secondarySets: 0 };
    const intensity = muscleIntensity(region.directSets);
    const onlySecondary = intensity === "none" && region.secondarySets > 0;
    if (intensity !== "none") trabajados.push(`${muscleRegionLabel(regionId)} (${region.directSets})`);
    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("class", `muscle-region intensity-${intensity}${onlySecondary ? " only-secondary" : ""}`);
    group.dataset.region = regionId;
    shapes.forEach((d) => group.appendChild(muscleShapeElement(d)));
    const title = document.createElementNS(SVG_NS, "title");
    title.textContent = `${muscleRegionLabel(regionId)}: ${region.directSets} series directas, ${region.secondarySets} con implicación`;
    group.appendChild(title);
    svg.appendChild(group);
  });

  const viewLabel = view === "front" ? "Vista frontal" : "Vista posterior";
  svg.setAttribute(
    "aria-label",
    trabajados.length
      ? `${viewLabel}. Trabajo directo en ${trabajados.join(", ")}.`
      : `${viewLabel}. Sin trabajo directo registrado en este periodo.`,
  );
  return svg;
}

function muscleMapRange() {
  if (muscleMapPeriod === "session") {
    const active = getActiveSession(state);
    if (active) return { sessionId: active.id, label: "Sesión en curso" };
    const last = [...state.training.sessions]
      .filter((session) => session.status === "completed" && session.endedAt)
      .sort((a, b) => b.endedAt.localeCompare(a.endedAt))[0];
    return last
      ? { sessionId: last.id, label: "Última sesión" }
      : { sessionId: "sin-sesiones", label: "Última sesión" };
  }
  const start = periodStart(muscleMapPeriod);
  return {
    fromIso: start.toISOString(),
    label: muscleMapPeriod === "week" ? "Esta semana" : "Este mes",
  };
}

function renderMuscleMap() {
  const figures = $("muscleMapFigures");
  if (!figures) return;
  const range = muscleMapRange();
  const volume = computeMuscleVolume(state, range);

  document.querySelectorAll("[data-muscle-period]").forEach((button) => {
    button.classList.toggle("active", button.dataset.musclePeriod === muscleMapPeriod);
    button.setAttribute("aria-pressed", String(button.dataset.musclePeriod === muscleMapPeriod));
  });

  figures.replaceChildren(
    renderMuscleFigure("front", volume),
    renderMuscleFigure("back", volume),
  );

  const conTrabajo = MUSCLE_REGIONS.filter((region) => volume.byRegion[region.id].directSets > 0);
  $("muscleMapSummary").textContent = volume.effectiveSets
    ? `${range.label} · ${volume.effectiveSets} series efectivas en ${conTrabajo.length} de ${MUSCLE_REGIONS.length} zonas`
    : `${range.label} · sin series efectivas todavía`;

  const legend = $("muscleMapLegend");
  const titulo = document.createElement("li");
  titulo.className = "muscle-legend-title";
  titulo.append(createElement("small", "", "Series directas:"));
  legend.replaceChildren(titulo, ...MUSCLE_INTENSITY_STEPS.map((step) => {
    const item = document.createElement("li");
    item.className = `muscle-legend-item intensity-${step.id}`;
    const swatch = createElement("span", "muscle-legend-swatch");
    swatch.setAttribute("aria-hidden", "true");
    const siguiente = MUSCLE_INTENSITY_STEPS[MUSCLE_INTENSITY_STEPS.indexOf(step) + 1];
    const detail = step.id === "none"
      ? "0"
      : `${step.min}${siguiente ? `-${siguiente.min - 1}` : "+"}`;
    item.append(swatch, createElement("small", "", detail));
    item.title = step.labelEs;
    return item;
  }));
  const implicacion = document.createElement("li");
  implicacion.className = "muscle-legend-item";
  const trama = createElement("span", "muscle-legend-swatch swatch-secondary");
  trama.setAttribute("aria-hidden", "true");
  implicacion.append(trama, createElement("small", "", "Solo implicación"));
  legend.appendChild(implicacion);

  const rows = $("muscleMapRows");
  const filas = MUSCLE_REGIONS
    .map((region) => ({ region, data: volume.byRegion[region.id] }))
    .filter((item) => item.data.directSets > 0 || item.data.secondarySets > 0)
    .sort((a, b) => (
      b.data.directSets - a.data.directSets
      || b.data.secondarySets - a.data.secondarySets
      || a.region.labelEs.localeCompare(b.region.labelEs, "es")
    ));
  if (!filas.length) {
    const empty = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.className = "muted";
    cell.textContent = "Registra series efectivas para ver la cobertura.";
    empty.appendChild(cell);
    rows.replaceChildren(empty);
  } else {
    rows.replaceChildren(...filas.map(({ region, data }) => {
      const row = document.createElement("tr");
      const nombre = document.createElement("th");
      nombre.scope = "row";
      nombre.textContent = region.labelEs;
      const directas = document.createElement("td");
      directas.textContent = String(data.directSets);
      const secundarias = document.createElement("td");
      secundarias.textContent = String(data.secondarySets);
      row.append(nombre, directas, secundarias);
      return row;
    }));
  }

  const aviso = $("muscleMapDisclaimer");
  const sinMusculos = volume.unmappedSets
    ? ` ${volume.unmappedSets} series no se reparten porque sus ejercicios no tienen músculos asignados: ${volume.unmappedExercises.slice(0, 3).join(", ")}.`
    : "";
  const sinPrincipal = volume.indirectOnlySets
    ? ` ${volume.indirectOnlySets} series no colorean ninguna zona porque su ejercicio no tiene músculo principal: ${volume.indirectOnlyExercises.slice(0, 3).join(", ")}.`
    : "";
  aviso.textContent = "Cuenta tus series efectivas por zona. No mide activación muscular ni sustituye una valoración profesional."
    + sinMusculos + sinPrincipal;
}

function render() {
  applyThemePreferences();
  renderDailyDashboard();
  renderMuscleMap();
  renderFoods();
  renderNutritionLibrary();
  renderProgress();
  renderRoutineExerciseOptions();
  renderRoutineManager();
  renderTraining();
  renderSettings();
}

const tabIds = new Set([
  ...[...document.querySelectorAll(".tab")].map((button) => button.dataset.tab),
  "ajustes",
]);

function showTab(tabId, { updateUrl = true } = {}) {
  if (!tabIds.has(tabId)) return;
  const tabs = [...document.querySelectorAll(".tab")];
  const tabIndex = tabs.findIndex((button) => button.dataset.tab === tabId);
  const tabsNav = document.querySelector(".tabs");
  const previousIndex = Number(tabsNav?.dataset.activeIndex ?? tabIndex);
  document.querySelectorAll(".tab, .panel").forEach((element) => element.classList.remove("active"));
  document.querySelector(`.tab[data-tab="${tabId}"]`)?.classList.add("active");
  tabs.forEach((button) => {
    if (button.dataset.tab === tabId) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  $(tabId).classList.add("active");
  if (tabsNav) {
    tabsNav.classList.remove("is-switching");
    if (tabIndex >= 0) {
      const directionMultiplier = tabIndex < previousIndex ? -1 : 1;
      tabsNav.style.setProperty("--previous-tab-index", previousIndex);
      tabsNav.style.setProperty("--active-tab-index", tabIndex);
      tabsNav.style.setProperty("--nav-direction", directionMultiplier);
      tabsNav.dataset.activeIndex = String(tabIndex);
      tabsNav.dataset.hasActiveTab = "true";
      tabsNav.dataset.direction = tabIndex < previousIndex ? "backward" : "forward";
      if (tabIndex !== previousIndex) {
        void tabsNav.offsetWidth;
        tabsNav.classList.add("is-switching");
        window.clearTimeout(navAnimationTimer);
        navAnimationTimer = window.setTimeout(() => {
          tabsNav.classList.remove("is-switching");
        }, 760);
      }
    } else {
      tabsNav.dataset.hasActiveTab = "false";
    }
  }
  if (updateUrl && window.location.hash !== `#${tabId}`) {
    window.history.pushState({}, "", `#${tabId}`);
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function syncTabFromHash() {
  showTab(window.location.hash.slice(1) || "diario", { updateUrl: false });
}

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => showTab(button.dataset.tab));
});
window.addEventListener("hashchange", syncTabFromHash);
document.querySelector(".brand")?.addEventListener("click", (event) => {
  event.preventDefault();
  showTab("diario");
});
syncTabFromHash();

$("progressExerciseSelect").addEventListener("change", renderProgress);
// Los selectores se acotan a su propio grupo: el Diario y el mapa muscular
// tienen periodos independientes y comparten la clase .period-tab.
document.querySelectorAll("[data-period]").forEach((button) => {
  button.addEventListener("click", () => {
    diaryPeriod = button.dataset.period;
    document.querySelectorAll("[data-period]").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    renderDailyDashboard();
    renderProgress();
  });
});

document.querySelectorAll("[data-muscle-period]").forEach((button) => {
  button.addEventListener("click", () => {
    muscleMapPeriod = button.dataset.musclePeriod;
    renderMuscleMap();
  });
});

$("dashboardStartWorkoutBtn").addEventListener("click", () => {
  const button = $("dashboardStartWorkoutBtn");
  if (button.dataset.action === "review") {
    openDailyDetail(button.dataset.date || today);
    return;
  }
  if (button.dataset.action === "continue") {
    trainingView = "session";
    showTab("entreno");
    renderTraining();
    return;
  }
  const selected = parseRoutineDayValue(button.dataset.routineDay);
  if (!selected) return;
  const started = commit(
    (next) => startSessionFromRoutineDay(next, selected.routineId, selected.routineDayId),
    "Entrenamiento de hoy iniciado. La rutina original queda intacta.",
  );
  if (started) {
    trainingView = "session";
    showTab("entreno");
    renderTraining();
  }
});

$("entryDate").value = today;
$("entryDate").addEventListener("change", () => {
  setDailyForm($("entryDate").value);
  render();
});

$("dailyDetailCloseBtn").addEventListener("click", closeDailyDetail);
$("dailyDetailPanel").addEventListener("click", (event) => {
  if (event.target === $("dailyDetailPanel")) closeDailyDetail();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("dailyDetailPanel").hidden) closeDailyDetail();
});

$("dailyForm").addEventListener("submit", (event) => {
  event.preventDefault();
  commit((next) => {
    const day = getLegacyDay(undefined, true, next);
    Object.assign(day, {
      weight: numberValue("weight"),
      waist: numberValue("waist"),
      steps: numberValue("steps"),
      cardioMinutes: numberValue("cardioMinutes"),
      sleep: numberValue("sleep"),
      energy: numberValue("energy"),
      hunger: numberValue("hunger"),
      shoulderPain: numberValue("shoulderPain"),
      notes: $("notes").value.trim(),
    });
  }, "Registro diario guardado.");
});

document.querySelectorAll("[data-routine-planner-view]").forEach((button) => {
  button.addEventListener("click", () => {
    routinePlannerView = button.dataset.routinePlannerView;
    selectedPlannedWorkout = null;
    renderRoutineManager();
  });
});

$("prevPlannerMonthBtn").addEventListener("click", () => {
  plannerMonthDate.setMonth(plannerMonthDate.getMonth() - 1, 1);
  renderRoutineManager();
});

$("nextPlannerMonthBtn").addEventListener("click", () => {
  plannerMonthDate.setMonth(plannerMonthDate.getMonth() + 1, 1);
  renderRoutineManager();
});

$("editPlanBtn").addEventListener("click", () => {
  routinePlannerView = "library";
  renderRoutineManager();
});

$("plannedWorkoutBackBtn").addEventListener("click", () => {
  selectedPlannedWorkout = null;
  routinePlannerView = "calendar";
  renderRoutineManager();
});

$("plannedExtraWorkoutBtn").addEventListener("click", () => {
  selectedPlannedWorkout = null;
  selectedRoutineId = null;
  routinePlannerView = "library";
  renderRoutineManager();
  $("startFreeSessionBtn").scrollIntoView({ behavior: "smooth", block: "center" });
  $("startFreeSessionBtn").focus({ preventScroll: true });
  showNotice("Entrenamiento libre listo: puedes empezar y añadir ejercicios solo para esta sesión.");
});

$("foodForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = $("foodName").value.trim();
  if (!name) return;
  const saved = commit((next) => {
    getLegacyDay(undefined, true, next).foods.push({
      name,
      calories: numberValue("foodCalories") || 0,
      protein: numberValue("foodProtein") || 0,
      carbs: numberValue("foodCarbs") || 0,
      fat: numberValue("foodFat") || 0,
    });
  }, "Comida añadida al prototipo.");
  if (saved) event.target.reset();
});

document.querySelectorAll("[data-food]").forEach((button) => {
  button.addEventListener("click", () => {
    $("foodName").value = button.dataset.food;
    $("foodCalories").value = button.dataset.calories;
    $("foodProtein").value = button.dataset.protein;
    $("foodCarbs").value = button.dataset.carbs;
    $("foodFat").value = button.dataset.fat;
  });
});

$("createRoutineForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = $("routineName").value;
  const weekdays = selectedWeekdays("newRoutineWeekdays");
  const selectedColor = document.querySelector('input[name="routineAccentColor"]:checked')?.value ?? "auto";
  const selectedType = document.querySelector('input[name="routineDayType"]:checked')?.value ?? "strength";
  const selectedCardioType = document.querySelector('input[name="cardioActivityType"]:checked')?.value ?? "run";
  const saved = commit(
    (next) => createRoutineWithWeekdays(next, name, weekdays, {
      accentColor: selectedColor === "auto" ? null : selectedColor,
      dayType: selectedType,
      cardioType: selectedType === "cardio" ? selectedCardioType : "run",
    }),
    `Rutina ${name.trim()} creada con ${countLabel(weekdays.length, "día")}.`,
  );
  if (saved) {
    routinePlannerView = "library";
    event.target.reset();
    delete $("routineName").dataset.cardioSuggestion;
    syncNewRoutineCardioVisibility();
    $("createRoutineCard").open = false;
  }
});

document.querySelectorAll('input[name="routineDayType"]').forEach((input) => {
  input.addEventListener("change", syncNewRoutineCardioVisibility);
});

$("routineName").addEventListener("input", () => {
  delete $("routineName").dataset.cardioSuggestion;
});

document.querySelectorAll('input[name="selectedRoutineAccentColor"]').forEach((input) => {
  input.addEventListener("change", () => {
    if (!input.checked || !selectedRoutineId) return;
    const color = input.value === "auto" ? null : input.value;
    commit(
      (next) => setRoutineAccentColor(next, selectedRoutineId, color),
      color ? `Color de la rutina cambiado a ${accentLabels[color]}.` : "Color automático activado.",
    );
  });
});

$("routineDetailBackBtn").addEventListener("click", () => {
  selectedRoutineId = null;
  selectedPlannedWorkout = null;
  routinePlannerView = "library";
  renderRoutineManager();
});

$("addRoutineDayForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!selectedRoutineId) return;
  const [weekday] = selectedWeekdays("addRoutineDayWeekdays");
  if (weekday === undefined) {
    showNotice("Selecciona un día libre para crear una variante en esta rutina.", { error: true });
    return;
  }
  commit((next) => {
    const type = $("addRoutineDayType").value === "cardio" ? "cardio" : "strength";
    const cardioType = type === "cardio" ? $("addRoutineCardioType").value : "run";
    const day = addRoutineDay(next, selectedRoutineId, weekdayName(weekday), { type, cardioType });
    setRoutineDayWeekday(next, selectedRoutineId, day.id, weekday);
  }, `Variante para ${weekdayName(weekday)} creada dentro de la rutina.`);
});

$("addRoutineDayType").addEventListener("change", syncAddRoutineCardioVisibility);

$("startFreeSessionBtn").addEventListener("click", (event) => {
  trainingView = "session";
  const started = runOnce(
    event.currentTarget,
    () => commit((next) => startFreeSession(next), "Entrenamiento iniciado y guardado."),
  );
  if (!started) trainingView = "routines";
});

$("continueSessionBtn").addEventListener("click", () => {
  trainingView = "session";
  renderTraining();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

["cardioDistanceKm", "cardioDuration", "cardioPoolLengthM"].forEach((id) => {
  $(id).addEventListener("input", updateCardioPacePreview);
});

$("cardioSessionForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const active = getActiveSession(state);
  if (!active) return;
  const definition = cardioActivityDefinition(active.cardio?.activityType);
  const durationSeconds = parseDurationInput($("cardioDuration").value);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    showNotice("Introduce el tiempo como mm:ss, por ejemplo 25:00.", { error: true });
    return;
  }
  commit((next) => addCardioToSession(next, active.id, {
    activityType: definition.type,
    distanceKm: cardioDistanceFromForm(definition),
    durationSeconds,
    steps: numberValue("cardioSteps"),
    elevationGainM: numberValue("cardioElevationGainM"),
    inclinePercent: numberValue("cardioInclinePercent"),
    poolLengthM: numberValue("cardioPoolLengthM"),
    resistanceLevel: numberValue("cardioResistanceLevel"),
    cadencePerMinute: numberValue("cardioCadencePerMinute"),
    averagePowerWatts: numberValue("cardioAveragePowerWatts"),
    averageHeartRateBpm: numberValue("cardioAverageHeartRateBpm"),
    caloriesKcal: numberValue("cardioCaloriesKcal"),
    note: $("cardioNote").value,
  }), `Actividad de ${definition.label.toLowerCase()} guardada. Las métricas derivadas se calcularon automáticamente.`);
});

$("backToRoutinesBtn").addEventListener("click", () => {
  trainingView = "routines";
  renderTraining();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

async function confirmDiscardActiveSession() {
  const active = getActiveSession(state);
  if (!active) return;
  const savedSets = sessionSetCount(active);
  const detail = (active.sessionType ?? "strength") === "cardio"
    ? active.cardio?.completedAt
      ? " Se eliminará el cardio registrado sin añadirlo al Diario."
      : " No se añadirá nada al Diario."
    : savedSets
    ? ` Se eliminarán ${countLabel(savedSets, "serie")} de esta sesión sin añadirlas al Diario.`
    : " No se añadirá nada al Diario.";
  if (!(await confirmDialog(`¿Descartar “${active.source.label}”?${detail} Esta acción no se puede deshacer.`, { title: "Descartar sesión", confirmLabel: "Descartar", danger: true }))) return;
  const discarded = commit((next) => discardSession(next, active.id), "Sesión descartada. Ya puedes empezar otro entrenamiento.");
  if (!discarded) return;
  stopAllRestTimers({ clear: true });
  expandedSessionExerciseId = null;
  trainingView = "routines";
  renderTraining();
}

$("discardSessionBtn").addEventListener("click", confirmDiscardActiveSession);
$("discardSessionFromRoutinesBtn").addEventListener("click", confirmDiscardActiveSession);

$("finishSessionBtn").addEventListener("click", async () => {
  const active = getActiveSession(state);
  if (!active) return;
  const omittedExercises = active.exercises.filter((exercise) => exercise.status === "skipped").length;
  const untouchedExercises = active.exercises.filter((exercise) => (
    exercise.status !== "skipped" && !exercise.sets.length
  )).length;
  const warning = untouchedExercises || omittedExercises
    ? `Hay ${countLabel(untouchedExercises, "ejercicio")} sin registrar y ${countLabel(omittedExercises, "ejercicio")} omitido. `
    : "";
  if (!(await confirmDialog(`${warning}¿Finalizar? Se guardará lo que realmente hiciste y ya no podrá editarse.`, { title: "Finalizar entrenamiento", confirmLabel: "Finalizar" }))) return;
  commit((next) => completeSession(next, active.id), "Entrenamiento finalizado.");
  stopAllRestTimers({ clear: true });
  expandedSessionExerciseId = null;
});

$("addExerciseForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const active = getActiveSession(state);
  if (!active) return;
  const name = $("newExerciseName").value;
  const replacementId = replacementTargetExerciseId;
  const saved = commit((next) => {
    if (replacementId) {
      replaceSessionExerciseForToday(next, active.id, replacementId, name);
    } else {
      addExerciseToSession(next, active.id, name);
    }
  }, replacementId ? "Alternativa guardada solo para esta sesión." : "Ejercicio personal añadido.");
  if (saved) {
    replacementTargetExerciseId = null;
    event.target.reset();
    renderCatalogResults();
  }
});

$("cancelReplacementBtn").addEventListener("click", () => {
  replacementTargetExerciseId = null;
  renderCatalogResults();
  showNotice("Alternativa cancelada.");
});

$("undoSetBtn").addEventListener("click", () => {
  commit((next) => restoreLastDeletedSet(next), "Serie recuperada.");
});

["catalogSearch", "catalogCategory", "catalogEquipment", "catalogTarget"].forEach((id) => {
  $(id).addEventListener(id === "catalogSearch" ? "input" : "change", () => {
    catalogResultLimit = 4;
    renderCatalogResults();
  });
});

$("settingsBtn").addEventListener("click", () => {
  setSettingsView("menu");
  showTab("ajustes");
});
$("settingsCloseBtn").addEventListener("click", () => {
  if (settingsView === "menu") {
    showTab("diario");
    return;
  }
  setSettingsView("menu");
});

document.querySelectorAll("[data-open-settings]").forEach((button) => {
  button.addEventListener("click", () => {
    setSettingsView(button.dataset.openSettings);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

$("settingsForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const selectedAccent = document.querySelector('input[name="accentColor"]:checked')?.value
    ?? defaultPreferences.accentColor;
  const selectedAppearance = document.querySelector('input[name="appearanceMode"]:checked')?.value
    ?? defaultPreferences.appearanceMode;
  const saved = commit((next) => {
    ensureUiState(next);
    next.owner.displayName = $("profileName").value.trim();
    next.owner.profile = {
      birthDate: $("profileBirthDate").value || null,
      heightCm: numberValue("profileHeight"),
      weightKg: numberValue("profileWeight"),
    };
    next.owner.targets = {
      calories: numberValue("targetCalories") || defaultTargets.calories,
      protein: numberValue("targetProtein") ?? defaultTargets.protein,
      steps: numberValue("targetSteps") ?? defaultTargets.steps,
    };
    next.owner.preferences = {
      accentColor: selectedAccent,
      appearanceMode: selectedAppearance,
      effortScale: $("effortScale").value || defaultPreferences.effortScale,
      defaultRestSeconds: numberValue("defaultRestSeconds") || defaultPreferences.defaultRestSeconds,
      autoRestTimer: $("autoRestTimer").checked,
    };
  }, "Ajustes y objetivos guardados.");
  if (saved) setSettingsView("menu");
});

document.querySelectorAll('input[name="accentColor"]').forEach((input) => {
  input.addEventListener("change", () => {
    applyThemePreferences({
      ...state,
      owner: {
        ...state.owner,
        preferences: { ...getPreferences(), accentColor: input.value },
      },
    });
  });
});

document.querySelectorAll('input[name="appearanceMode"]').forEach((input) => {
  input.addEventListener("change", () => {
    applyThemePreferences({
      ...state,
      owner: {
        ...state.owner,
        preferences: { ...getPreferences(), appearanceMode: input.value },
      },
    });
  });
});

let labelPreviewUrl = null;
$("labelPhoto").addEventListener("change", (event) => {
  if (labelPreviewUrl) URL.revokeObjectURL(labelPreviewUrl);
  const file = event.target.files[0];
  const preview = $("labelPhotoPreview");
  if (!file) {
    preview.hidden = true;
    preview.removeAttribute("src");
    labelPreviewUrl = null;
    return;
  }
  const validation = validateLabelPhotoFile(file);
  if (validation.error) {
    event.target.value = "";
    preview.hidden = true;
    preview.removeAttribute("src");
    labelPreviewUrl = null;
    showNotice(validation.error, { error: true, area: "appNotice" });
    return;
  }
  labelPreviewUrl = URL.createObjectURL(file);
  preview.src = labelPreviewUrl;
  preview.hidden = false;
});

async function compressLabelPhoto(file) {
  if (!file) return null;
  const validation = validateLabelPhotoFile(file);
  if (validation.error) throw new Error(validation.error);
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = document.createElement("img");
    image.src = objectUrl;
    await image.decode();
    const maximumSide = 900;
    const scale = Math.min(1, maximumSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", .72));
    if (!blob) throw new Error("No se pudo preparar la foto.");
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(reader.result), { once: true });
      reader.addEventListener("error", () => reject(new Error("No se pudo leer la foto.")), { once: true });
      reader.readAsDataURL(blob);
    });
    if (String(dataUrl).length > 900000) {
      throw new Error("La foto sigue siendo demasiado grande. Acércate a la etiqueta y recórtala antes de guardarla.");
    }
    return String(dataUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

$("labelForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const photo = $("labelPhoto").files[0];
  let photoDataUrl = null;
  try {
    photoDataUrl = await compressLabelPhoto(photo);
  } catch (error) {
    showNotice(error.message, { error: true, area: "appNotice" });
    return;
  }
  const saved = commit((next) => {
    ensureUiState(next);
    next.nutrition.labels.push({
      id: `label-${Date.now().toString(36)}`,
      product: $("labelProduct").value.trim(),
      brand: $("labelBrand").value.trim(),
      caloriesPer100g: numberValue("labelCalories") || 0,
      proteinPer100g: numberValue("labelProtein") || 0,
      carbsPer100g: numberValue("labelCarbs") || 0,
      fatPer100g: numberValue("labelFat") || 0,
      photoName: photo?.name ?? null,
      photoDataUrl,
      createdAt: new Date().toISOString(),
    });
  }, "Etiqueta guardada con los valores específicos de esa marca.");
  if (saved) {
    event.target.reset();
    $("labelPhotoPreview").hidden = true;
    if (labelPreviewUrl) URL.revokeObjectURL(labelPreviewUrl);
    labelPreviewUrl = null;
  }
});

$("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `aurum-fit-v2-${today}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

$("importBtn").addEventListener("click", () => $("importFile").click());

$("loadDemoDataBtn").addEventListener("click", async () => {
  const confirmed = await confirmDialog(
    "Se añadirán rutinas, entrenamientos, días y comidas ficticias de los últimos 2 meses. "
    + "Tus datos reales se conservan y podrás quitar la demo después. ¿Cargar demo?",
    { title: "Cargar demo", confirmLabel: "Cargar demo" },
  );
  if (!confirmed) return;
  const saved = commit((next) => {
    seedDemoData(next, { now: new Date().toISOString() });
  }, "");
  if (saved) {
    setSettingsView("menu");
    showTab("diario");
    showNotice("Demo de 2 meses cargada. Tus datos reales siguen separados.", { area: "appNotice" });
  }
});

$("removeDemoDataBtn").addEventListener("click", async () => {
  const confirmed = await confirmDialog(
    "Se quitarán solo las rutinas, sesiones, días y alimentos marcados como demo. "
    + "Tus datos reales no se borrarán. ¿Quitar demo?",
    { title: "Quitar demo", confirmLabel: "Quitar demo", danger: true },
  );
  if (!confirmed) return;
  const saved = commit((next) => {
    removeDemoData(next);
  }, "");
  if (saved) {
    showNotice("Datos demo retirados. Los datos reales se han conservado.", { area: "appNotice" });
  }
});

$("importFile").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const imported = parseImportPayload(await file.text());
    const cleanedImport = structuredClone(imported);
    cleanupPublishedData(cleanedImport);
    const sessionCount = cleanedImport.training.sessions.length;
    const legacyDayCount = Object.keys(cleanedImport.legacy.days).length;
    const confirmed = await confirmDialog(
      `La copia contiene ${sessionCount} sesiones y ${legacyDayCount} días del prototipo. `
      + "Si continúas, el estado actual quedará en la copia de seguridad local. ¿Importar?",
      { title: "Importar copia", confirmLabel: "Importar" },
    );
    if (!confirmed) return;
    state = persistState(localStorage, cleanedImport);
    setDailyForm($("entryDate").value);
    render();
    showNotice("Copia importada. El estado anterior se conserva como respaldo.", { area: "appNotice" });
  } catch (error) {
    showNotice(error.message || "No se pudo importar la copia.", {
      error: true,
      area: "appNotice",
    });
  } finally {
    event.target.value = "";
  }
});

renderCardioActivityPicker();
syncNewRoutineCardioVisibility();
syncAddRoutineCardioVisibility();
setDailyForm(today);
render();
loadCatalog();

if (loadResult.notices.length) {
  showNotice(loadResult.notices.join(" "), {
    error: loadResult.persistenceAvailable === false,
    area: "appNotice",
  });
}

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  let reloadingForServiceWorker = false;
  const reportServiceWorkerUpdateFailure = (error) => {
    const networkFailure = ["TypeError", "NetworkError"].includes(error?.name);
    if (navigator.serviceWorker.controller && networkFailure) {
      fetch("service-worker.js", { cache: "no-store" })
        .then(() => console.error("No se pudo actualizar el service worker.", error))
        .catch(() => {});
      return;
    }
    console.error("No se pudo actualizar el service worker.", error);
  };
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadingForServiceWorker) return;
    reloadingForServiceWorker = true;
    window.location.reload();
  });
  navigator.serviceWorker.register("service-worker.js")
    .then((registration) => registration.update())
    .catch(reportServiceWorkerUpdateFailure);
}
