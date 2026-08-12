import {
  addExerciseToRoutineDay,
  addExerciseToSession,
  addRoutineDay,
  addSetToExercise,
  completeSession,
  cleanupPublishedData,
  createRoutineWithWeekdays,
  deleteSet,
  discardSession,
  findLastComparableExercise,
  getActiveSession,
  loadAppState,
  PUBLIC_CLEANUP_VERSION,
  moveRoutineExercise,
  normalizeExerciseName,
  parseImportPayload,
  persistState,
  removeExerciseFromRoutineDay,
  replaceSessionExerciseForToday,
  restoreLastDeletedSet,
  setSessionExerciseSkipped,
  setRoutineDayWeekday,
  startFreeSession,
  startSessionFromRoutineDay,
  updateSet,
} from "./core.js?v=26";

const defaultTargets = { calories: 2200, protein: 170, steps: 10000 };
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
let catalogResultLimit = 4;
let trainingView = "routines";
let selectedRoutineId = null;
const pendingSetSubmissions = new Set();
const restTimerStates = new Map();

function getTargets(targetState = state) {
  return { ...defaultTargets, ...(targetState.owner?.targets ?? {}) };
}

function ensureUiState(targetState) {
  targetState.owner ??= {};
  targetState.owner.profile ??= { birthDate: null, heightCm: null, weightKg: null };
  targetState.owner.targets ??= { ...defaultTargets };
  targetState.nutrition ??= { recipes: [], labels: [] };
  targetState.nutrition.recipes ??= [];
  targetState.nutrition.labels ??= [];
  targetState.meta ??= {};
  return targetState;
}

ensureUiState(state);

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
  ].join(" "));
}

function catalogSearchScore(entry, query, usedExerciseIds = new Set()) {
  const normalizedName = normalizeCatalogSearch(entry.nameEs);
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

function scheduledDayForDate(dateKey) {
  const weekday = new Date(`${dateKey}T12:00:00`).getDay();
  for (const routine of activeRoutines()) {
    const routineDay = routine.days.find((day) => day.weekday === weekday);
    if (routineDay) return { routine, routineDay };
  }
  return null;
}

function formatTimer(seconds) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, "0")}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

function timerFor(exerciseId) {
  if (!restTimerStates.has(exerciseId)) {
    restTimerStates.set(exerciseId, { duration: 60, remaining: 60, running: false, intervalId: null });
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
  const display = createElement("strong", "timer-display", "01:00");
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
  const reset = createButton("Reiniciar", "button-quiet", () => {
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

function createButton(text, className, onClick) {
  const button = createElement("button", `button ${className}`, text);
  button.type = "button";
  button.addEventListener("click", onClick);
  return button;
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

  const completedDates = new Set(state.training.sessions
    .filter((session) => session.status === "completed" && session.endedAt)
    .map((session) => dateKeyFromIso(session.endedAt)));
  const suggested = scheduledDayForDate(selectedDate);
  const dailyGoalRatios = [
    targets.steps > 0 ? Math.min(1, (Number(selectedDay.steps) || 0) / targets.steps) : null,
    targets.calories > 0 ? Math.min(1, selectedTotals.calories / targets.calories) : null,
    suggested ? (completedDates.has(selectedDate) ? 1 : 0) : null,
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
  exerciseList.replaceChildren();
  if (suggested) {
    title.textContent = `${suggested.routine.name} · ${suggested.routineDay.name}`;
    detail.textContent = `${countLabel(suggested.routineDay.exercises.length, "ejercicio")} · ${weekdayName(suggested.routineDay.weekday)}`;
    suggested.routineDay.exercises.slice().sort((a, b) => a.order - b.order).forEach((exercise) => {
      const item = createElement("li");
      item.append(createElement("span", "", `${exercise.order}. ${exercise.exerciseName}`));
      exerciseList.appendChild(item);
    });
    start.dataset.routineDay = routineDayValue(suggested.routine.id, suggested.routineDay.id);
    start.disabled = !suggested.routineDay.exercises.length || selectedDate !== today;
    start.textContent = selectedDate === today ? "Empezar entrenamiento" : "Consulta del historial";
  } else {
    title.textContent = "Día de descanso";
    detail.textContent = "No tienes ningún entrenamiento asignado a este día.";
    exerciseList.appendChild(createElement("li", "today-rest-message", "Recupera, camina o registra una sesión extra desde Entrenamiento."));
    start.dataset.routineDay = "";
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
  dateKeysForPeriod().forEach((date) => {
    const day = state.legacy.days[date] ?? { foods: [], workouts: [] };
    const totals = dayTotals(day);
    const sessions = state.training.sessions.filter(
      (session) => session.status === "completed" && dateKeyFromIso(session.endedAt) === date,
    );
    const scheduled = scheduledDayForDate(date);
    const isPast = date < today;
    const trainingStatus = sessions.length
      ? scheduled
        ? "Completado"
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
    item.append(createElement("time", "timeline-date", date), createElement("div", "timeline-content", details));
    sessions.forEach((session) => {
      item.appendChild(createElement(
        "small",
        "muted",
        `${session.source.label} · ${sessionSetCount(session)} series guardadas`,
      ));
    });
    if (day.notes) item.appendChild(createElement("small", "muted", day.notes));
    timeline.appendChild(item);
  });
  if (!timeline.children.length) {
    timeline.appendChild(createElement("li", "timeline-empty", "Todavía no hay registros. Guarda hoy tus primeras métricas."));
  }
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
    const removeButton = createButton("Borrar", "button-danger", () => {
      if (!window.confirm(`¿Borrar “${food.name}”?`)) return;
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
  $("profileName").value = state.owner.displayName ?? "";
  $("profileBirthDate").value = profile.birthDate ?? "";
  $("profileHeight").value = profile.heightCm ?? "";
  $("profileWeight").value = profile.weightKg ?? "";
  $("targetCalories").value = targets.calories;
  $("targetProtein").value = targets.protein;
  $("targetSteps").value = targets.steps;
}

function renderProgress() {
  const select = $("progressExerciseSelect");
  const previous = select.value;
  const completedExerciseIds = new Map();
  state.training.sessions
    .filter((session) => session.status === "completed")
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

  const start = periodStart();
  const points = [];
  state.training.sessions
    .filter((session) => session.status === "completed" && new Date(session.endedAt) >= start)
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

function renderExerciseChart(points) {
  const container = $("exerciseProgressChart");
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
    const scheduled = routine.days.find((day) => day.weekday === todayWeekday);
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
      .flatMap((routine) => routine.days.map((day) => [day.weekday, { routine, day }]))
      .filter(([weekday]) => weekday !== null && weekday !== undefined),
  );
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

  const remove = createButton("Quitar", "button-danger", () => {
    if (!window.confirm(
      `¿Quitar “${routineExercise.exerciseName}” de ${routineDay.name}? El historial no cambiará.`,
    )) return;
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

function createRoutineDayCard(routine, routineDay, index) {
  const card = createElement("article", "routine-day");
  const header = createElement("div", "routine-day-header");
  const title = createElement("div", "routine-day-title");
  title.append(
    createElement("span", "routine-day-icon", "◆"),
    createElement("h4", "", routineDay.name),
    createElement(
      "span",
      "weekday-badge",
      routineDay.weekday === null || routineDay.weekday === undefined
        ? "Sin asignar"
        : weekdayShort.get(routineDay.weekday),
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
  start.disabled = !routineDay.exercises.length || Boolean(getActiveSession(state));
  if (getActiveSession(state)) start.title = "Finaliza el entrenamiento en curso antes de empezar otro.";
  actions.append(start);
  header.append(title, actions);

  const list = createElement("ol", "routine-exercises");
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
        entry?.nameEs ?? exerciseInput.value,
        {
          exerciseId: entry?.id,
        },
      );
      attachCatalogMetadata(next, routineExercise.exerciseId, entry);
    }, `${entry?.nameEs ?? exerciseInput.value.trim()} añadido a ${routineDay.name}.`);
    if (saved) exerciseForm.reset();
  });

  card.append(header, list, exerciseForm);
  return card;
}

function renderRoutineManager() {
  const list = $("routineList");
  list.replaceChildren();
  const routines = activeRoutines();
  $("routineCount").textContent = countLabel(routines.length, "rutina");
  routines.forEach((routine, routineIndex) => {
    const card = createElement("button", "routine-overview-card surface");
    card.type = "button";
    card.classList.toggle("routine-card-demo", Boolean(routine.isDemo));
    const icon = createElement("span", "routine-icon", ["◆", "●", "▲", "✦"][routineIndex % 4]);
    const text = createElement("span", "routine-overview-copy");
    text.append(
      createElement("strong", "", routine.name),
      createElement("small", "", `${countLabel(routine.days.length, "día")} · ${routine.days.reduce((total, day) => total + day.exercises.length, 0)} ejercicios`),
    );
    const weekdays = createElement("span", "routine-weekday-pills");
    routine.days
      .filter((day) => day.weekday !== null && day.weekday !== undefined)
      .sort((left, right) => ((left.weekday + 6) % 7) - ((right.weekday + 6) % 7))
      .forEach((day) => weekdays.appendChild(createElement("span", "", weekdayShort.get(day.weekday))));
    text.appendChild(weekdays);
    card.append(icon, text, createElement("span", "routine-card-chevron", "›"));
    card.addEventListener("click", () => {
      selectedRoutineId = routine.id;
      renderRoutineManager();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    list.appendChild(card);
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
  $("routineOverview").hidden = Boolean(selectedRoutine);
  $("routineDetailPanel").hidden = !selectedRoutine;
  if (!selectedRoutine) return;
  $("routineDetailTitle").textContent = selectedRoutine.name;
  $("routineDetailMeta").textContent = `${countLabel(selectedRoutine.days.length, "día")} · ${selectedRoutine.days.reduce((total, day) => total + day.exercises.length, 0)} ejercicios`;
  $("routineDetailIcon").textContent = "◆";
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
        || left.nameEs.localeCompare(right.nameEs, "es")
      ))
      .slice(0, 20)
      .forEach((entry) => names.add(entry.nameEs));
  }
  options.replaceChildren();
  [...names].forEach((name) => {
    options.appendChild(new Option(name, name));
  });
}

function sessionSetCount(session) {
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

function renderSetForm(session, sessionExercise) {
  const form = createElement("form", "set-form");
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

  const setTypeLabel = createElement("label", "set-type-field");
  setTypeLabel.appendChild(document.createTextNode("Tipo de serie"));
  const setType = document.createElement("select");
  setType.name = "setType";
  setType.append(
    new Option("Efectiva", "effective"),
    new Option("Aproximación", "approach"),
    new Option("Calentamiento", "warmup"),
  );
  setTypeLabel.appendChild(setType);

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
  const columnHeadings = createElement("div", "set-form-headings full");
  columnHeadings.append(
    createElement("span", "", "Peso (kg)"),
    createElement("span", "", "Reps"),
    createElement("span", "", "RIR"),
    createElement("span", "", "Tipo"),
  );
  load.label.classList.add("set-field-load");
  reps.label.classList.add("set-field-reps");
  rir.label.classList.add("set-field-rir");
  setTypeLabel.classList.add("set-field-type");
  [load.label, reps.label, rir.label, setTypeLabel].forEach((label) => {
    label.childNodes[0]?.remove();
  });
  form.append(columnHeadings, load.label, reps.label, rir.label, setTypeLabel, note.label, actions);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const submissionKey = `${session.id}:${sessionExercise.id}`;
    const input = {
      reps: reps.input.value,
      loadKg: load.input.value,
      rir: rir.input.value,
      setType: setType.value,
      note: note.input.value,
    };
    const editingSetId = form.dataset.editingSetId;
    const saved = runOnce(submit, () => commit((next) => {
      if (editingSetId) {
        updateSet(next, session.id, sessionExercise.id, editingSetId, input);
      } else {
        addSetToExercise(next, session.id, sessionExercise.id, input);
      }
    }, editingSetId ? "Serie corregida y guardada." : "Serie guardada automáticamente."), submissionKey);
    if (saved) form.reset();
  });

  form.startEditing = (workoutSet) => {
    reps.input.value = workoutSet.reps;
    load.input.value = workoutSet.loadKg ?? "";
    rir.input.value = workoutSet.rir ?? "";
    setType.value = workoutSet.setType ?? (workoutSet.isWarmup ? "warmup" : "effective");
    note.input.value = workoutSet.note ?? "";
    form.dataset.editingSetId = workoutSet.id;
    submit.textContent = "Guardar corrección";
    cancel.hidden = false;
    reps.input.focus();
  };
  return form;
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
          ? `${countLabel(sessionExercise.sets.length, "serie")} registrada`
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
  const referenceText = reference
    ? `Última referencia (${formatDateTime(reference.date)}): ${reference.sets.map(formatSet).join(" · ")}`
    : "Sin una sesión finalizada comparable todavía.";
  titleBlock.appendChild(createElement("p", "reference", referenceText));
  header.appendChild(titleBlock);
  const statusBlock = createElement("div", "exercise-status-actions");
  statusBlock.appendChild(createElement(
    "span",
    "count-badge",
    sessionExercise.isExtra
      ? `${sessionExercise.sets.length} series`
      : countLabel(sessionExercise.sets.length, "serie"),
  ));
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
  const form = renderSetForm(session, sessionExercise);

  sessionExercise.sets.forEach((workoutSet) => {
    const row = createElement("li", "set-row");
    row.appendChild(createElement("span", "set-number set-complete", "✓"));
    const detail = document.createElement("div");
    detail.append(
      createElement("strong", "", formatSet(workoutSet)),
      createElement("small", "", workoutSet.note || "Sin nota"),
    );
    const actions = createElement("div", "item-actions");
    actions.append(
      createButton("Editar", "button-secondary", () => form.startEditing(workoutSet)),
      createButton("Borrar", "button-danger", () => {
        if (!window.confirm(`¿Borrar la serie ${workoutSet.order}? Podrás deshacerla después.`)) return;
        commit((next) => {
          deleteSet(next, session.id, sessionExercise.id, workoutSet.id);
        }, "Serie borrada. Puedes deshacerla.");
      }),
    );
    row.append(detail, actions);
    list.appendChild(row);
  });

  if (!list.children.length) {
    const empty = createElement("li", "empty-state");
    empty.textContent = "Aún no hay series. Registra la primera a la derecha.";
    list.appendChild(empty);
  }

  if (sessionExercise.status === "skipped") {
    content.append(header, createElement("p", "empty-state", "Este ejercicio se ha marcado como no realizado hoy."));
  } else {
    content.append(header, list, form, createExerciseRestTimer(sessionExercise.id));
  }
  article.append(summary, content);
  return article;
}

function renderTraining() {
  const active = getActiveSession(state);
  if (!active) trainingView = "routines";
  $("routineManager").hidden = trainingView !== "routines";
  $("activeSessionPanel").hidden = !active || trainingView !== "session";
  $("activeSessionResume").hidden = !active;
  $("startFreeSessionBtn").disabled = Boolean(active);
  $("sessionStatusBadge").textContent = active ? "Sesión en curso" : "Sin sesión activa";
  $("sessionStatusBadge").classList.toggle("active", Boolean(active));

  if (active) {
    $("activeSessionResumeTitle").textContent = active.source.label;
    $("activeSessionResumeMeta").textContent = `${sessionSetCount(active)} series guardadas · pulsa para continuar`;
    $("activeSessionTitle").textContent = active.source.label;
    $("activeSessionMeta").textContent = `Iniciada ${formatDateTime(active.startedAt)} · ${sessionSetCount(active)} series guardadas`;
    $("sessionExerciseList").replaceChildren();
    active.exercises
      .slice()
      .sort((a, b) => a.order - b.order)
      .forEach((exercise) => $("sessionExerciseList").appendChild(renderSessionExercise(active, exercise)));
    if (!active.exercises.length) {
      renderEmpty(
        $("sessionExerciseList"),
        "Añade el primer ejercicio",
        "Usa el catálogo completo o crea uno personal.",
      );
    }
  }

  $("undoBar").hidden = !state.training.undo;
  renderCatalogResults();
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
      || left.nameEs.localeCompare(right.nameEs, "es");
  });

  $("catalogCount").textContent = `${catalog.length.toLocaleString("es-ES")} ejercicios`;
  $("catalogStatus").textContent = `${matches.length.toLocaleString("es-ES")} resultados · catálogo auditado, sin imágenes ni GIF.`;
  container.replaceChildren();
  matches.slice(0, catalogResultLimit).forEach((entry) => {
    const card = createElement("article", "catalog-card");
    const text = document.createElement("div");
    text.append(
      createElement("strong", "", entry.nameEs),
      createElement(
        "small",
        "",
        `${entry.categoryEs} · ${entry.equipmentEs} · ${entry.targetEs ?? entry.target}`,
      ),
    );
    if (entry.nameLocale !== "es") {
      text.appendChild(createElement("small", "catalog-language", "Nombre original · instrucciones en español"));
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
            entry.nameEs,
            { exerciseId: entry.id },
          )
          : addExerciseToSession(
            next,
            active.id,
            entry.nameEs,
            { exerciseId: entry.id },
          );
        attachCatalogMetadata(next, sessionExercise.exerciseId, entry);
      }, replacementId
        ? `${entry.nameEs} será la alternativa solo en esta sesión.`
        : `${entry.nameEs} añadido a la sesión.`));
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

async function loadCatalog() {
  try {
    const response = await fetch("./data/exercises.es.json?v=26", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.exercises)) throw new Error("Estructura no válida");
    catalog = payload.exercises;
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

function render() {
  renderDailyDashboard();
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
  document.querySelectorAll(".tab, .panel").forEach((element) => element.classList.remove("active"));
  document.querySelector(`.tab[data-tab="${tabId}"]`)?.classList.add("active");
  $(tabId).classList.add("active");
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
document.querySelector(".brand").addEventListener("click", (event) => {
  event.preventDefault();
  showTab("diario");
});
syncTabFromHash();

$("progressExerciseSelect").addEventListener("change", renderProgress);
document.querySelectorAll(".period-tab").forEach((button) => {
  button.addEventListener("click", () => {
    diaryPeriod = button.dataset.period;
    document.querySelectorAll(".period-tab").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    renderDailyDashboard();
    renderProgress();
  });
});

$("dashboardStartWorkoutBtn").addEventListener("click", () => {
  const selected = parseRoutineDayValue($("dashboardStartWorkoutBtn").dataset.routineDay);
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
  const saved = commit(
    (next) => createRoutineWithWeekdays(next, name, weekdays),
    `Rutina ${name.trim()} creada con ${countLabel(weekdays.length, "día")}.`,
  );
  if (saved) {
    event.target.reset();
    $("createRoutineCard").open = false;
  }
});

$("routineDetailBackBtn").addEventListener("click", () => {
  selectedRoutineId = null;
  renderRoutineManager();
});

$("addRoutineDayForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!selectedRoutineId) return;
  const [weekday] = selectedWeekdays("addRoutineDayWeekdays");
  if (weekday === undefined) {
    showNotice("Selecciona un día libre para añadirlo a la rutina.", { error: true });
    return;
  }
  commit((next) => {
    const day = addRoutineDay(next, selectedRoutineId, weekdayName(weekday));
    setRoutineDayWeekday(next, selectedRoutineId, day.id, weekday);
  }, `${weekdayName(weekday)} añadido a la rutina.`);
});

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

$("backToRoutinesBtn").addEventListener("click", () => {
  trainingView = "routines";
  renderTraining();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

function confirmDiscardActiveSession() {
  const active = getActiveSession(state);
  if (!active) return;
  const savedSets = sessionSetCount(active);
  const detail = savedSets
    ? ` Se eliminarán ${countLabel(savedSets, "serie")} de esta sesión sin añadirlas al Diario.`
    : " No se añadirá nada al Diario.";
  if (!window.confirm(`¿Descartar “${active.source.label}”?${detail} Esta acción no se puede deshacer.`)) return;
  const discarded = commit((next) => discardSession(next, active.id), "Sesión descartada. Ya puedes empezar otro entrenamiento.");
  if (!discarded) return;
  stopAllRestTimers({ clear: true });
  expandedSessionExerciseId = null;
  trainingView = "routines";
  renderTraining();
}

$("discardSessionBtn").addEventListener("click", confirmDiscardActiveSession);
$("discardSessionFromRoutinesBtn").addEventListener("click", confirmDiscardActiveSession);

$("finishSessionBtn").addEventListener("click", () => {
  const active = getActiveSession(state);
  if (!active) return;
  const omittedExercises = active.exercises.filter((exercise) => exercise.status === "skipped").length;
  const untouchedExercises = active.exercises.filter((exercise) => (
    exercise.status !== "skipped" && !exercise.sets.length
  )).length;
  const warning = untouchedExercises || omittedExercises
    ? `Hay ${countLabel(untouchedExercises, "ejercicio")} sin registrar y ${countLabel(omittedExercises, "ejercicio")} omitido. `
    : "";
  if (!window.confirm(`${warning}¿Finalizar? Se guardará lo que realmente hiciste y ya no podrá editarse.`)) return;
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

$("settingsBtn").addEventListener("click", () => showTab("ajustes"));
$("settingsCloseBtn").addEventListener("click", () => showTab("diario"));

$("settingsForm").addEventListener("submit", (event) => {
  event.preventDefault();
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
  }, "Ajustes y objetivos guardados.");
  if (saved) showTab("diario");
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
  labelPreviewUrl = URL.createObjectURL(file);
  preview.src = labelPreviewUrl;
  preview.hidden = false;
});

async function compressLabelPhoto(file) {
  if (!file) return null;
  if (!file.type.startsWith("image/")) throw new Error("Selecciona una fotografía válida.");
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

$("importFile").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const imported = parseImportPayload(await file.text());
    const cleanedImport = structuredClone(imported);
    cleanupPublishedData(cleanedImport);
    const sessionCount = cleanedImport.training.sessions.length;
    const legacyDayCount = Object.keys(cleanedImport.legacy.days).length;
    const confirmed = window.confirm(
      `La copia contiene ${sessionCount} sesiones y ${legacyDayCount} días del prototipo. `
      + "Si continúas, el estado actual quedará en la copia de seguridad local. ¿Importar?",
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
