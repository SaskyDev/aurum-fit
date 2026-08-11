import fs from "node:fs";
import path from "node:path";

const sourceFile = process.argv[2];
const sourceCommit = process.argv[3];
const outputFile = process.argv[4] ?? "data/exercises.es.json";

if (!sourceFile || !sourceCommit) {
  throw new Error(
    "Uso: node scripts/import-exercise-catalog.mjs <exercises.json> <commit> [salida]",
  );
}

const curatedNames = new Map([
  ["0025", "Press de banca con barra"],
  ["0314", "Press inclinado con mancuernas"],
  ["0576", "Press de pecho en máquina"],
  ["0308", "Aperturas con mancuernas"],
  ["0043", "Sentadilla con barra"],
  ["0032", "Peso muerto con barra"],
  ["0085", "Peso muerto rumano con barra"],
  ["1463", "Prensa de piernas a 45°"],
  ["0585", "Extensión de piernas en máquina"],
  ["0599", "Curl femoral sentado"],
  ["1409", "Puente de glúteo con barra"],
  ["1460", "Zancadas caminando"],
  ["0027", "Remo inclinado con barra"],
  ["2330", "Jalón al pecho en polea"],
  ["0180", "Remo sentado en polea baja"],
  ["1326", "Dominadas supinas"],
  ["0426", "Press de hombro con mancuernas"],
  ["0334", "Elevaciones laterales con mancuernas"],
  ["0294", "Curl de bíceps con mancuernas"],
  ["0313", "Curl martillo con mancuernas"],
  ["0241", "Extensión de tríceps en polea"],
  ["1373", "Elevación de gemelos de pie"],
  ["0276", "Dead bug"],
]);

const excludedRecords = [
  {
    sourceId: "3211",
    nameEs: "Flexiones con apoyo de rodillas",
    reason: "Las instrucciones empiezan arrodilladas pero después indican extender las piernas y apoyar las puntas de los pies; describen otra variante y se excluyen hasta revisión de la fuente.",
  },
];

const categoryTranslations = {
  back: "Espalda",
  cardio: "Cardio",
  chest: "Pecho",
  "lower arms": "Antebrazos",
  "lower legs": "Pierna inferior",
  neck: "Cuello",
  shoulders: "Hombros",
  "upper arms": "Brazos",
  "upper legs": "Piernas",
  waist: "Core",
};

const equipmentTranslations = {
  assisted: "Asistido",
  band: "Banda",
  barbell: "Barra",
  "body weight": "Peso corporal",
  "bosu ball": "Bosu",
  cable: "Polea",
  dumbbell: "Mancuernas",
  "elliptical machine": "Elíptica",
  "ez barbell": "Barra EZ",
  hammer: "Martillo",
  kettlebell: "Kettlebell",
  "leverage machine": "Máquina",
  "medicine ball": "Balón medicinal",
  "olympic barbell": "Barra olímpica",
  "resistance band": "Banda de resistencia",
  roller: "Rodillo",
  rope: "Cuerda",
  "skierg machine": "Máquina SkiErg",
  "sled machine": "Prensa/máquina de trineo",
  "smith machine": "Máquina Smith",
  "stability ball": "Fitball",
  "stationary bike": "Bicicleta estática",
  "stepmill machine": "Máquina de escaleras",
  tire: "Neumático",
  "trap bar": "Barra hexagonal",
  "upper body ergometer": "Ergómetro de tren superior",
  weighted: "Lastrado",
  "wheel roller": "Rueda abdominal",
};

const muscleTranslations = {
  abductors: "Abductores",
  abs: "Abdominales",
  adductors: "Aductores",
  biceps: "Bíceps",
  calves: "Gemelos",
  "cardiovascular system": "Sistema cardiovascular",
  delts: "Deltoides",
  forearms: "Antebrazos",
  glutes: "Glúteos",
  hamstrings: "Isquiotibiales",
  lats: "Dorsales",
  "levator scapulae": "Elevador de la escápula",
  pectorals: "Pectorales",
  quads: "Cuádriceps",
  "serratus anterior": "Serrato anterior",
  spine: "Columna",
  traps: "Trapecios",
  triceps: "Tríceps",
  "upper back": "Espalda superior",
};

const preferredDuplicateIds = new Set(["0576"]);

function normalize(value) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

const source = JSON.parse(fs.readFileSync(sourceFile, "utf8"));
if (!Array.isArray(source)) throw new Error("El origen debe ser un array JSON.");

for (const excluded of excludedRecords) {
  const exercise = source.find((candidate) => candidate.id === excluded.sourceId);
  if (!exercise) throw new Error(`No existe el ejercicio excluido ${excluded.sourceId}.`);
}

const ids = new Set();
const duplicateNames = new Map();
for (const exercise of source) {
  if (ids.has(exercise.id)) throw new Error(`ID duplicado: ${exercise.id}`);
  ids.add(exercise.id);
  const key = [
    normalize(exercise.name),
    normalize(exercise.category),
    normalize(exercise.equipment),
    normalize(exercise.target),
  ].join("|");
  const matches = duplicateNames.get(key) ?? [];
  matches.push(exercise.id);
  duplicateNames.set(key, matches);
}

const exactDuplicateGroups = [...duplicateNames.entries()]
  .filter(([, duplicateIds]) => duplicateIds.length > 1)
  .map(([key, duplicateIds]) => ({ key, ids: duplicateIds }));

const duplicateExclusions = exactDuplicateGroups.flatMap(({ key, ids: duplicateIds }) => {
  const preferred = duplicateIds.find((id) => preferredDuplicateIds.has(id))
    ?? duplicateIds.slice().sort()[0];
  return duplicateIds
    .filter((id) => id !== preferred)
    .map((sourceId) => ({ sourceId, duplicateOf: preferred, key }));
});
const excludedIds = new Set([
  ...excludedRecords.map((record) => record.sourceId),
  ...duplicateExclusions.map((record) => record.sourceId),
]);

for (const sourceId of curatedNames.keys()) {
  if (!source.some((candidate) => candidate.id === sourceId)) {
    throw new Error(`No existe el ejercicio curado ${sourceId}.`);
  }
  if (excludedIds.has(sourceId)) {
    throw new Error(`El ejercicio curado ${sourceId} quedó excluido por la política.`);
  }
}

const selected = source.filter((exercise) => !excludedIds.has(exercise.id)).map((exercise) => {
  if (!exercise.instructions?.es) {
    throw new Error(`Faltan instrucciones en español para ${exercise.id}.`);
  }
  const curatedName = curatedNames.get(exercise.id);
  const categoryEs = categoryTranslations[exercise.category] ?? exercise.category;
  const equipmentEs = equipmentTranslations[exercise.equipment] ?? exercise.equipment;
  const targetEs = muscleTranslations[exercise.target] ?? exercise.target;
  const muscleGroupEs = muscleTranslations[exercise.muscle_group] ?? exercise.muscle_group;

  return {
    id: `dataset-${exercise.id}`,
    sourceId: exercise.id,
    nameEs: curatedName ?? exercise.name,
    nameLocale: curatedName ? "es" : "en",
    nameOriginal: exercise.name,
    category: exercise.category,
    categoryEs,
    bodyPart: exercise.body_part,
    equipment: exercise.equipment,
    equipmentEs,
    target: exercise.target,
    targetEs,
    muscleGroup: exercise.muscle_group,
    muscleGroupEs,
    secondaryMuscles: exercise.secondary_muscles,
    searchAliasesEs: [...new Set([categoryEs, equipmentEs, targetEs, muscleGroupEs])],
    instructionsEs: exercise.instructions.es,
    instructionStepsEs: exercise.instruction_steps?.es ?? [],
    measurementType: "weight_reps",
    reviewStatus: "pending_professional_review",
    source: {
      repository: "https://github.com/hasaneyldrm/exercises-dataset",
      commit: sourceCommit,
      license: "MIT",
    },
  };
});

const payload = {
  schemaVersion: 1,
  source: {
    repository: "https://github.com/hasaneyldrm/exercises-dataset",
    commit: sourceCommit,
    license: "MIT",
    copyright: "Copyright (c) 2026 Hasan Emir Yıldırım",
  },
  policy: {
    selection: "Catálogo completo del commit auditado, sin duplicados exactos ni registros excluidos.",
    excludedRecords,
    duplicateExclusions,
    excludedFields: ["image", "gif_url", "media_id", "attribution"],
    naming: "Los nombres españoles curados se conservan; el resto usa el nombre original inglés hasta su revisión.",
    instructionsReview: "pending_professional_review",
  },
  audit: {
    sourceRecords: source.length,
    uniqueIds: ids.size,
    exactDuplicateGroups: exactDuplicateGroups.length,
  },
  exercises: selected,
};

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, `${JSON.stringify(payload, null, 2)}\n`);

console.log(
  `Generados ${selected.length} ejercicios de ${source.length}; `
  + `${duplicateExclusions.length} duplicados exactos y ${excludedRecords.length} registros excluidos. `
  + "Sin campos multimedia.",
);
