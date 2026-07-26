import {
  addExerciseToRoutineDay,
  addExerciseToSession,
  addRoutineDay,
  addSetToExercise,
  completeSession,
  createRoutine,
  deleteSet,
  findLastComparableExercise,
  getActiveSession,
  loadAppState,
  moveRoutineDay,
  moveRoutineExercise,
  normalizeExerciseName,
  parseImportPayload,
  persistState,
  removeExerciseFromRoutineDay,
  restoreLastDeletedSet,
  setSuggestedRoutineDay,
  startFreeSession,
  startSessionFromRoutineDay,
  updateSet,
} from "./core.js?v=10";

const targets = { calories: 2200, protein: 170 };
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

function runOnce(control, action) {
  if (control.disabled || control.dataset.pending === "true") return false;
  control.dataset.pending = "true";
  control.disabled = true;
  const result = action();
  window.setTimeout(() => {
    delete control.dataset.pending;
    control.disabled = false;
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

function renderSummary() {
  const day = getLegacyDay();
  const totals = dayTotals(day);
  $("todayCalories").textContent = String(totals.calories);
  $("todayProtein").textContent = `${totals.protein} g`;

  const recent = lastNLegacyDates(7).map((date) => state.legacy.days[date]);
  const weights = recent.map((entry) => entry.weight).filter((value) => Number.isFinite(Number(value)));
  const steps = recent.map((entry) => entry.steps).filter((value) => Number.isFinite(Number(value)));
  $("avgWeight").textContent = weights.length
    ? `${(weights.reduce((total, value) => total + Number(value), 0) / weights.length).toFixed(1)} kg`
    : "—";
  $("avgSteps").textContent = steps.length
    ? String(Math.round(steps.reduce((total, value) => total + Number(value), 0) / steps.length))
    : "—";
}

function renderFoods() {
  const day = getLegacyDay();
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

function renderLegacyHistory() {
  const query = $("exerciseSearch").value.trim().toLocaleLowerCase("es");
  const list = $("exerciseHistory");
  list.replaceChildren();
  if (!query) {
    list.appendChild(createLogItem("Busca un ejercicio", "Consulta aquí los registros agregados del prototipo anterior."));
    return;
  }

  const matches = [];
  sortedLegacyDates().forEach((date) => {
    (state.legacy.days[date]?.workouts || []).forEach((workout) => {
      if (String(workout.exercise ?? "").toLocaleLowerCase("es").includes(query)) {
        matches.push({ date, workout });
      }
    });
  });

  matches.slice(0, 20).forEach(({ date, workout }) => {
    list.appendChild(createLogItem(
      `${date} · ${String(workout.exercise ?? "Sin nombre")}`,
      `${workout.sets ?? 0} series · reps ${String(workout.reps ?? "—")} · ${formatValue(workout.load, " kg")} · RPE ${formatValue(workout.rpe)}`,
    ));
  });
  if (!list.children.length) {
    list.appendChild(createLogItem("Sin resultados", "No hay registros antiguos con ese nombre."));
  }
}

function renderProgress() {
  const rows = $("progressRows");
  rows.replaceChildren();
  lastNLegacyDates(14).forEach((date) => {
    const day = state.legacy.days[date];
    const totals = dayTotals(day);
    const row = document.createElement("tr");
    [
      date,
      formatValue(day.weight, " kg"),
      String(totals.calories),
      `${totals.protein} g`,
      formatValue(day.steps),
    ].forEach((value) => {
      row.appendChild(createElement("td", "", value));
    });
    rows.appendChild(row);
  });
  if (!rows.children.length) {
    const row = document.createElement("tr");
    const cell = createElement("td", "", "Sin datos todavía.");
    cell.colSpan = 5;
    row.appendChild(cell);
    rows.appendChild(row);
  }

  const count = lastNLegacyDates(14).length;
  $("weeklyAdvice").textContent = count
    ? `Hay ${count} fechas registradas en el prototipo. Son registros disponibles, no necesariamente ${count} días naturales consecutivos.`
    : "Aún no hay datos suficientes para describir una tendencia.";
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
  for (const routine of activeRoutines()) {
    const routineDay = routine.days.find((day) => day.id === routine.suggestedDayId);
    if (routineDay) return { routine, routineDay };
  }
  return null;
}

function renderSessionChoices() {
  const suggested = suggestedRoutineDay();
  const routines = activeRoutines();
  const suggestedReady = Boolean(suggested?.routineDay.exercises.length);
  $("suggestedDayTitle").textContent = suggested
    ? `${suggested.routine.name} · ${suggested.routineDay.name}`
    : routines.length
      ? "Añade el primer día"
      : "Crea una rutina primero";
  $("suggestedDayDetail").textContent = suggested
    ? suggestedReady
      ? `${countLabel(suggested.routineDay.exercises.length, "ejercicio")} ${
        suggested.routineDay.exercises.length === 1 ? "preparado" : "preparados"
      }.`
      : "Añade al menos un ejercicio antes de empezar."
    : routines.length
      ? "El primer día creado quedará sugerido automáticamente."
      : "Crea una rutina pequeña para preparar tu entrenamiento.";
  $("startSuggestedDayBtn").disabled = !suggestedReady;
  $("startSuggestedDayBtn").dataset.routineDay = suggested
    ? routineDayValue(suggested.routine.id, suggested.routineDay.id)
    : "";

  const select = $("routineDaySelect");
  const previousValue = select.value;
  select.replaceChildren();
  activeRoutines().forEach((routine) => {
    routine.days
      .slice()
      .sort((a, b) => a.order - b.order)
      .forEach((routineDay) => {
        const option = new Option(
          `${routine.name} · ${routineDay.name} (${countLabel(routineDay.exercises.length, "ejercicio")})`,
          routineDayValue(routine.id, routineDay.id),
        );
        option.disabled = !routineDay.exercises.length;
        select.appendChild(option);
      });
  });
  if (!select.children.length) {
    select.appendChild(new Option("Sin días disponibles", ""));
  }
  if ([...select.options].some((option) => option.value === previousValue && !option.disabled)) {
    select.value = previousValue;
  } else {
    const firstAvailable = [...select.options].find((option) => option.value && !option.disabled);
    select.value = firstAvailable?.value ?? "";
  }
  $("startSelectedDayBtn").disabled = !select.value;
}

function createRoutineExerciseRow(routine, routineDay, routineExercise, index) {
  const row = createElement("li", "routine-exercise-row");
  row.appendChild(createElement("span", "routine-order", String(routineExercise.order)));
  row.appendChild(createElement("strong", "", routineExercise.exerciseName));
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
  title.appendChild(createElement("h4", "", `${routineDay.order}. ${routineDay.name}`));
  if (routine.suggestedDayId === routineDay.id) {
    title.appendChild(createElement("span", "suggested-badge", "Sugerido"));
  }
  const actions = createElement("div", "order-actions");

  const suggest = createButton("Sugerir", "button-secondary", () => {
    commit(
      (next) => setSuggestedRoutineDay(next, routine.id, routineDay.id),
      `${routineDay.name} es ahora el día sugerido.`,
    );
  });
  suggest.disabled = routine.suggestedDayId === routineDay.id;

  const up = createButton("↑", "button-secondary", () => {
    commit(
      (next) => moveRoutineDay(next, routine.id, routineDay.id, "up"),
      "Orden de los días actualizado.",
    );
  });
  up.title = "Subir día";
  up.setAttribute("aria-label", `Subir ${routineDay.name}`);
  up.disabled = index === 0;

  const down = createButton("↓", "button-secondary", () => {
    commit(
      (next) => moveRoutineDay(next, routine.id, routineDay.id, "down"),
      "Orden de los días actualizado.",
    );
  });
  down.title = "Bajar día";
  down.setAttribute("aria-label", `Bajar ${routineDay.name}`);
  down.disabled = index === routine.days.length - 1;
  actions.append(suggest, up, down);
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
        { exerciseId: entry?.id },
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
  activeRoutines().forEach((routine) => {
    const card = createElement("article", "routine-card");
    const header = createElement("div", "routine-header");
    const title = document.createElement("div");
    title.append(
      createElement("span", "exercise-source", "Rutina local"),
      createElement("h3", "", routine.name),
      createElement("p", "muted", `${countLabel(routine.days.length, "día")} · editable sin cambiar el historial`),
    );
    header.appendChild(title);

    const dayList = createElement("div", "routine-day-list");
    routine.days
      .slice()
      .sort((a, b) => a.order - b.order)
      .forEach((routineDay, index) => {
        dayList.appendChild(createRoutineDayCard(routine, routineDay, index));
      });
    if (!routine.days.length) {
      renderEmpty(dayList, "Crea el primer día", "Por ejemplo: Torso, Pierna o Día A.");
    }

    const dayForm = createElement("form", "routine-day-form");
    const dayInput = document.createElement("input");
    dayInput.type = "text";
    dayInput.minLength = 2;
    dayInput.maxLength = 60;
    dayInput.required = true;
    dayInput.placeholder = "Nombre del día";
    dayInput.setAttribute("aria-label", `Nuevo día para ${routine.name}`);
    const addDayButton = createElement("button", "button button-primary", "Añadir día");
    addDayButton.type = "submit";
    dayForm.append(dayInput, addDayButton);
    dayForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const saved = commit(
        (next) => addRoutineDay(next, routine.id, dayInput.value),
        `Día ${dayInput.value.trim()} añadido.`,
      );
      if (saved) dayForm.reset();
    });

    card.append(header, dayList, dayForm);
    list.appendChild(card);
  });

  if (!list.children.length) {
    renderEmpty(
      list,
      "Aún no hay rutinas",
      "Crea una rutina pequeña y añade sus días en orden.",
    );
  }
  renderSessionChoices();
}

function renderRoutineExerciseOptions() {
  const options = $("routineExerciseOptions");
  const names = new Set([
    ...catalog.map((entry) => entry.nameEs),
    ...state.training.exercises.map((exercise) => exercise.name),
  ]);
  options.replaceChildren();
  [...names].sort((a, b) => a.localeCompare(b, "es")).forEach((name) => {
    options.appendChild(new Option(name, name));
  });
}

function sessionSetCount(session) {
  return session.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
}

function formatSet(workoutSet) {
  const parts = [`${workoutSet.reps} rep${workoutSet.reps === 1 ? "" : "s"}`];
  if (workoutSet.loadKg !== null) parts.push(`${workoutSet.loadKg} kg`);
  if (workoutSet.rpe !== null) parts.push(`RPE ${workoutSet.rpe}`);
  if (workoutSet.isWarmup) parts.push("calentamiento");
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
    placeholder: "10",
  });
  reps.input.required = true;
  const load = makeSetField("Peso (kg)", "loadKg", {
    min: 0,
    max: 2000,
    step: 0.5,
    inputMode: "decimal",
    placeholder: "60",
  });
  const rpe = makeSetField("RPE opcional", "rpe", {
    min: 1,
    max: 10,
    step: 0.5,
    inputMode: "decimal",
    placeholder: "7",
  });
  const note = makeSetField("Nota opcional", "note", {
    type: "text",
    maxLength: 300,
    full: true,
    placeholder: "Técnica, agarre o contexto",
  });

  const warmupLabel = createElement("label", "checkbox");
  const warmup = document.createElement("input");
  warmup.type = "checkbox";
  warmup.name = "isWarmup";
  warmupLabel.append(warmup, document.createTextNode(" Calentamiento"));

  const actions = createElement("div", "form-actions full");
  const submit = createElement("button", "button button-accent", "Guardar serie");
  submit.type = "submit";
  const cancel = createButton("Cancelar edición", "button-link", () => {
    form.reset();
    form.dataset.editingSetId = "";
    submit.textContent = "Guardar serie";
    cancel.hidden = true;
  });
  cancel.hidden = true;
  actions.append(submit, cancel);
  form.append(reps.label, load.label, rpe.label, warmupLabel, note.label, actions);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = {
      reps: reps.input.value,
      loadKg: load.input.value,
      rpe: rpe.input.value,
      isWarmup: warmup.checked,
      note: note.input.value,
    };
    const editingSetId = form.dataset.editingSetId;
    const saved = runOnce(submit, () => commit((next) => {
      if (editingSetId) {
        updateSet(next, session.id, sessionExercise.id, editingSetId, input);
      } else {
        addSetToExercise(next, session.id, sessionExercise.id, input);
      }
    }, editingSetId ? "Serie corregida y guardada." : "Serie guardada automáticamente."));
    if (saved) form.reset();
  });

  form.startEditing = (workoutSet) => {
    reps.input.value = workoutSet.reps;
    load.input.value = workoutSet.loadKg ?? "";
    rpe.input.value = workoutSet.rpe ?? "";
    warmup.checked = workoutSet.isWarmup;
    note.input.value = workoutSet.note ?? "";
    form.dataset.editingSetId = workoutSet.id;
    submit.textContent = "Guardar corrección";
    cancel.hidden = false;
    reps.input.focus();
  };
  return form;
}

function renderSessionExercise(session, sessionExercise) {
  const article = createElement("article", "session-exercise");
  const header = createElement("div", "exercise-header");
  const titleBlock = document.createElement("div");
  const source = exerciseSource(sessionExercise.exerciseId);
  titleBlock.appendChild(createElement(
    "span",
    "exercise-source",
    source?.type === "dataset" ? "Catálogo auditado · revisión pendiente" : "Ejercicio personal",
  ));
  titleBlock.appendChild(createElement("h3", "", sessionExercise.exerciseName));

  const reference = findLastComparableExercise(state, sessionExercise.exerciseId, session.id);
  const referenceText = reference
    ? `Última referencia (${formatDateTime(reference.date)}): ${reference.sets.map(formatSet).join(" · ")}`
    : "Sin una sesión finalizada comparable todavía.";
  titleBlock.appendChild(createElement("p", "reference", referenceText));
  header.appendChild(titleBlock);
  header.appendChild(createElement("span", "count-badge", `${sessionExercise.sets.length} series`));

  const content = createElement("div", "set-area");
  const list = createElement("ol", "set-list");
  const form = renderSetForm(session, sessionExercise);

  sessionExercise.sets.forEach((workoutSet) => {
    const row = createElement("li", "set-row");
    row.appendChild(createElement("span", "set-number", String(workoutSet.order)));
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

  content.append(list, form);
  article.append(header, content);
  return article;
}

function renderCompletedSessions() {
  const list = $("completedSessionList");
  list.replaceChildren();
  state.training.sessions
    .filter((session) => session.status === "completed")
    .sort((a, b) => b.endedAt.localeCompare(a.endedAt))
    .slice(0, 5)
    .forEach((session) => {
      list.appendChild(createLogItem(
        `${formatDateTime(session.endedAt)} · ${session.source.label}`,
        `${session.exercises.length} ejercicios · ${sessionSetCount(session)} series completadas`,
      ));
    });
  if (!list.children.length) {
    list.appendChild(createLogItem("Sin sesiones finalizadas", "Tu primer resumen aparecerá aquí."));
  }
}

function renderTraining() {
  const active = getActiveSession(state);
  $("sessionStarter").hidden = Boolean(active);
  $("routineManager").hidden = Boolean(active);
  $("activeSessionPanel").hidden = !active;
  $("sessionStatusBadge").textContent = active ? "Sesión en curso" : "Sin sesión activa";
  $("sessionStatusBadge").classList.toggle("active", Boolean(active));

  if (active) {
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
        "Usa el catálogo inicial o crea uno personal.",
      );
    }
  }

  $("undoBar").hidden = !state.training.undo;
  renderCompletedSessions();
  renderCatalogResults();
}

function renderCatalogFilters() {
  const categorySelect = $("catalogCategory");
  const equipmentSelect = $("catalogEquipment");
  const selectedCategory = categorySelect.value;
  const selectedEquipment = equipmentSelect.value;
  categorySelect.replaceChildren(new Option("Todas", ""));
  equipmentSelect.replaceChildren(new Option("Todos", ""));
  [...new Set(catalog.map((entry) => entry.categoryEs))].sort().forEach((value) => {
    categorySelect.appendChild(new Option(value, value));
  });
  [...new Set(catalog.map((entry) => entry.equipmentEs))].sort().forEach((value) => {
    equipmentSelect.appendChild(new Option(value, value));
  });
  categorySelect.value = selectedCategory;
  equipmentSelect.value = selectedEquipment;
}

function renderCatalogResults() {
  const container = $("catalogResults");
  if (!catalog.length) {
    renderEmpty(container, "Catálogo no disponible", "Puedes seguir creando ejercicios personales.");
    $("catalogCount").textContent = "0 ejercicios";
    return;
  }

  const query = normalizeCatalogSearch($("catalogSearch").value);
  const queryTokens = query.split(/\s+/).filter(Boolean);
  const category = $("catalogCategory").value;
  const equipment = $("catalogEquipment").value;
  const matches = catalog.filter((entry) => {
    const searchable = [
      entry.nameEs,
      entry.nameOriginal,
      entry.categoryEs,
      entry.equipmentEs,
      entry.target,
    ].join(" ");
    const normalizedSearchable = normalizeCatalogSearch(searchable);
    return (!queryTokens.length || queryTokens.every((token) => normalizedSearchable.includes(token)))
      && (!category || entry.categoryEs === category)
      && (!equipment || entry.equipmentEs === equipment);
  });

  $("catalogCount").textContent = `${catalog.length} ejercicios`;
  $("catalogStatus").textContent = `${matches.length} resultados · muestra curada, sin imágenes ni GIF.`;
  container.replaceChildren();
  matches.slice(0, 12).forEach((entry) => {
    const card = createElement("article", "catalog-card");
    const text = document.createElement("div");
    text.append(
      createElement("strong", "", entry.nameEs),
      createElement("small", "", `${entry.categoryEs} · ${entry.equipmentEs}`),
    );
    const active = getActiveSession(state);
    const add = createButton("Añadir", "button-secondary", () => {
      if (!active) return;
      runOnce(add, () => commit((next) => {
        const sessionExercise = addExerciseToSession(
          next,
          active.id,
          entry.nameEs,
          { exerciseId: entry.id },
        );
        attachCatalogMetadata(next, sessionExercise.exerciseId, entry);
      }, `${entry.nameEs} añadido a la sesión.`));
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
  }
}

async function loadCatalog() {
  try {
    const response = await fetch("./data/exercises.es.json", { cache: "no-cache" });
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
  renderSummary();
  renderFoods();
  renderLegacyHistory();
  renderProgress();
  renderRoutineExerciseOptions();
  renderRoutineManager();
  renderTraining();
}

const tabIds = new Set([...document.querySelectorAll(".tab")].map((button) => button.dataset.tab));

function showTab(tabId, { updateUrl = true } = {}) {
  if (!tabIds.has(tabId)) return;
  document.querySelectorAll(".tab, .panel").forEach((element) => element.classList.remove("active"));
  document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add("active");
  $(tabId).classList.add("active");
  if (updateUrl && window.location.hash !== `#${tabId}`) {
    window.history.pushState({}, "", `#${tabId}`);
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function syncTabFromHash() {
  showTab(window.location.hash.slice(1) || "entreno", { updateUrl: false });
}

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => showTab(button.dataset.tab));
});
window.addEventListener("hashchange", syncTabFromHash);
document.querySelector(".brand").addEventListener("click", (event) => {
  event.preventDefault();
  showTab("entreno");
});
syncTabFromHash();

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

$("exerciseSearch").addEventListener("input", renderLegacyHistory);

$("createRoutineForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = $("routineName").value;
  const saved = commit(
    (next) => createRoutine(next, name),
    `Rutina ${name.trim()} creada. Añade ahora su primer día.`,
  );
  if (saved) event.target.reset();
});

$("startSuggestedDayBtn").addEventListener("click", (event) => {
  const selected = parseRoutineDayValue($("startSuggestedDayBtn").dataset.routineDay);
  if (!selected) return;
  runOnce(event.currentTarget, () => commit(
    (next) => startSessionFromRoutineDay(
      next,
      selected.routineId,
      selected.routineDayId,
    ),
    "Día sugerido iniciado. La sesión ya contiene una copia del plan.",
  ));
});

$("routineDaySelect").addEventListener("change", () => {
  $("startSelectedDayBtn").disabled = !$("routineDaySelect").value;
});

$("startSelectedDayBtn").addEventListener("click", (event) => {
  const selected = parseRoutineDayValue($("routineDaySelect").value);
  if (!selected) return;
  runOnce(event.currentTarget, () => commit(
    (next) => startSessionFromRoutineDay(
      next,
      selected.routineId,
      selected.routineDayId,
    ),
    "Día elegido iniciado. La sesión ya contiene una copia del plan.",
  ));
});

$("startFreeSessionBtn").addEventListener("click", (event) => {
  runOnce(
    event.currentTarget,
    () => commit((next) => startFreeSession(next), "Entrenamiento iniciado y guardado."),
  );
});

$("finishSessionBtn").addEventListener("click", () => {
  const active = getActiveSession(state);
  if (!active) return;
  if (!window.confirm("¿Finalizar este entrenamiento? Pasará al historial y dejará de ser editable.")) return;
  commit((next) => completeSession(next, active.id), "Entrenamiento finalizado.");
});

$("addExerciseForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const active = getActiveSession(state);
  if (!active) return;
  const name = $("newExerciseName").value;
  const saved = commit((next) => {
    addExerciseToSession(next, active.id, name);
  }, "Ejercicio personal añadido.");
  if (saved) event.target.reset();
});

$("undoSetBtn").addEventListener("click", () => {
  commit((next) => restoreLastDeletedSet(next), "Serie recuperada.");
});

["catalogSearch", "catalogCategory", "catalogEquipment"].forEach((id) => {
  $(id).addEventListener(id === "catalogSearch" ? "input" : "change", renderCatalogResults);
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
    const sessionCount = imported.training.sessions.length;
    const legacyDayCount = Object.keys(imported.legacy.days).length;
    const confirmed = window.confirm(
      `La copia contiene ${sessionCount} sesiones y ${legacyDayCount} días del prototipo. `
      + "Si continúas, el estado actual quedará en la copia de seguridad local. ¿Importar?",
    );
    if (!confirmed) return;
    state = persistState(localStorage, imported);
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
  const swReloadKey = "aurum-fit-sw-reloaded-v10";
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (sessionStorage.getItem(swReloadKey)) return;
    sessionStorage.setItem(swReloadKey, "true");
    window.location.reload();
  });
  navigator.serviceWorker.register("service-worker.js").then((registration) => registration.update());
}
