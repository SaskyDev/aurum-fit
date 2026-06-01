const STORE_KEY = "fit-tracker-v1";
const targets = { calories: 2200, protein: 170 };

const today = new Date().toISOString().slice(0, 10);
const state = loadState();

const $ = (id) => document.getElementById(id);

function loadState() {
  const saved = localStorage.getItem(STORE_KEY);
  if (!saved) return { days: {} };
  try {
    return JSON.parse(saved);
  } catch {
    return { days: {} };
  }
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  render();
}

function getDay(date = $("entryDate").value || today) {
  state.days[date] ||= { foods: [], workouts: [] };
  return state.days[date];
}

function numberValue(id) {
  const value = $(id).value;
  return value === "" ? null : Number(value);
}

function sum(items, key) {
  return items.reduce((total, item) => total + (Number(item[key]) || 0), 0);
}

function sortedDates() {
  return Object.keys(state.days).sort((a, b) => b.localeCompare(a));
}

function lastNDays(n) {
  return sortedDates().slice(0, n);
}

function fmt(value, suffix = "") {
  return value === null || value === undefined || Number.isNaN(value) ? "—" : `${value}${suffix}`;
}

function dayTotals(day) {
  return {
    calories: sum(day.foods || [], "calories"),
    protein: sum(day.foods || [], "protein"),
    carbs: sum(day.foods || [], "carbs"),
    fat: sum(day.foods || [], "fat"),
  };
}

function setDailyForm(date) {
  const day = getDay(date);
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

function render() {
  const date = $("entryDate").value || today;
  const day = getDay(date);
  const totals = dayTotals(day);
  $("todayCalories").textContent = `${totals.calories} / ${targets.calories}`;
  $("todayProtein").textContent = `${totals.protein} / ${targets.protein} g`;

  const recent = lastNDays(7).map((dateKey) => state.days[dateKey]);
  const weights = recent.map((d) => d.weight).filter(Boolean);
  const steps = recent.map((d) => d.steps).filter(Boolean);
  $("avgWeight").textContent = weights.length ? `${(sum(weights.map((v) => ({ v })), "v") / weights.length).toFixed(1)} kg` : "Sin datos";
  $("avgSteps").textContent = steps.length ? `${Math.round(sum(steps.map((v) => ({ v })), "v") / steps.length)}` : "Sin datos";

  renderFoods(day);
  renderWorkouts(day);
  renderHistory();
  renderProgress();
}

function renderFoods(day) {
  const list = $("foodList");
  list.innerHTML = "";
  (day.foods || []).forEach((food, index) => {
    const li = document.createElement("li");
    li.innerHTML = `<div><strong>${food.name}</strong><small>${food.calories || 0} kcal · ${food.protein || 0} g proteína · ${food.carbs || 0} g HC · ${food.fat || 0} g grasa</small></div>`;
    li.appendChild(deleteButton(() => {
      day.foods.splice(index, 1);
      saveState();
    }));
    list.appendChild(li);
  });
  if (!day.foods?.length) list.innerHTML = "<li><div><strong>Sin comidas registradas</strong><small>Añade la primera comida del día.</small></div></li>";
}

function renderWorkouts(day) {
  const list = $("workoutList");
  list.innerHTML = "";
  (day.workouts || []).forEach((workout, index) => {
    const li = document.createElement("li");
    li.innerHTML = `<div><strong>${workout.exercise}</strong><small>${workout.sets} series · reps ${workout.reps} · ${fmt(workout.load, " kg")} · RPE ${fmt(workout.rpe)} ${workout.notes ? "· " + workout.notes : ""}</small></div>`;
    li.appendChild(deleteButton(() => {
      day.workouts.splice(index, 1);
      saveState();
    }));
    list.appendChild(li);
  });
  if (!day.workouts?.length) list.innerHTML = "<li><div><strong>Sin ejercicios registrados</strong><small>Añade el primer ejercicio del entreno.</small></div></li>";
}

function renderHistory() {
  const query = $("exerciseSearch").value.trim().toLowerCase();
  const list = $("exerciseHistory");
  list.innerHTML = "";
  if (!query) {
    list.innerHTML = "<li><div><strong>Busca un ejercicio</strong><small>Ejemplo: prensa, remo, jalón.</small></div></li>";
    return;
  }
  const matches = [];
  sortedDates().forEach((date) => {
    (state.days[date].workouts || []).forEach((workout) => {
      if (workout.exercise.toLowerCase().includes(query)) matches.push({ date, workout });
    });
  });
  matches.slice(0, 20).forEach(({ date, workout }) => {
    const li = document.createElement("li");
    li.innerHTML = `<div><strong>${date} · ${workout.exercise}</strong><small>${workout.sets} series · reps ${workout.reps} · ${fmt(workout.load, " kg")} · RPE ${fmt(workout.rpe)}</small></div>`;
    list.appendChild(li);
  });
  if (!matches.length) list.innerHTML = "<li><div><strong>Sin resultados</strong><small>Aún no hay registros con ese nombre.</small></div></li>";
}

function renderProgress() {
  const rows = $("progressRows");
  rows.innerHTML = "";
  lastNDays(14).forEach((date) => {
    const day = state.days[date];
    const totals = dayTotals(day);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${date}</td><td>${fmt(day.weight, " kg")}</td><td>${totals.calories}</td><td>${totals.protein} g</td><td>${fmt(day.steps)}</td>`;
    rows.appendChild(tr);
  });
  if (!rows.children.length) rows.innerHTML = "<tr><td colspan='5'>Sin datos todavía.</td></tr>";

  const seven = lastNDays(7).map((date) => state.days[date]);
  const avgCalories = average(seven.map((d) => dayTotals(d).calories).filter(Boolean));
  const avgProtein = average(seven.map((d) => dayTotals(d).protein).filter(Boolean));
  const avgStepValue = average(seven.map((d) => d.steps).filter(Boolean));
  let text = "Registra al menos 7 días para tomar mejores decisiones.";
  if (seven.length >= 4) {
    text = `Media reciente: ${Math.round(avgCalories || 0)} kcal, ${Math.round(avgProtein || 0)} g proteína y ${Math.round(avgStepValue || 0)} pasos. `;
    if (avgProtein && avgProtein < 150) text += "Prioridad: sube proteína antes de recortar más comida. ";
    if (avgCalories && avgCalories > 2400) text += "Estás por encima del margen alto; revisa aceite, pan, frutos secos y salsas. ";
    if (avgStepValue && avgStepValue < 5000) text += "Sube pasos de forma suave antes de añadir cardio intenso. ";
    if (avgCalories && avgCalories <= 2300 && avgProtein >= 150 && avgStepValue >= 5000) text += "La base va bien. Mantén una semana más antes de tocar calorías.";
  }
  $("weeklyAdvice").textContent = text;
}

function average(values) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function deleteButton(onClick) {
  const button = document.createElement("button");
  button.className = "delete";
  button.type = "button";
  button.textContent = "Borrar";
  button.addEventListener("click", onClick);
  return button;
}

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab, .panel").forEach((el) => el.classList.remove("active"));
    button.classList.add("active");
    $(button.dataset.tab).classList.add("active");
  });
});

$("entryDate").value = today;
$("entryDate").addEventListener("change", () => {
  setDailyForm($("entryDate").value);
  render();
});

$("dailyForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const day = getDay();
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
  saveState();
});

$("foodForm").addEventListener("submit", (event) => {
  event.preventDefault();
  getDay().foods.push({
    name: $("foodName").value.trim(),
    calories: numberValue("foodCalories") || 0,
    protein: numberValue("foodProtein") || 0,
    carbs: numberValue("foodCarbs") || 0,
    fat: numberValue("foodFat") || 0,
  });
  event.target.reset();
  saveState();
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

$("workoutForm").addEventListener("submit", (event) => {
  event.preventDefault();
  getDay().workouts.push({
    exercise: $("exerciseName").value.trim(),
    sets: numberValue("sets") || 0,
    reps: $("reps").value.trim(),
    load: numberValue("load"),
    rpe: numberValue("rpe"),
    notes: $("workoutNotes").value.trim(),
  });
  event.target.reset();
  saveState();
});

$("exerciseSearch").addEventListener("input", renderHistory);

$("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fit-tracker-${today}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

$("importFile").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const imported = JSON.parse(await file.text());
  state.days = imported.days || {};
  saveState();
  setDailyForm($("entryDate").value);
});

setDailyForm(today);
render();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("service-worker.js");
}
