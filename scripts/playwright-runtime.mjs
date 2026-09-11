// Resuelve Playwright sin atarlo a una máquina concreta.
//
// Los dos guiones de QA llevaban escrita la ruta del caché de Codex en el Mac
// de Alex (`/Users/alex/.cache/codex-runtimes/...`). En cualquier otro sitio
// fallaban en el import, y el README manda ejecutarlos.
//
// Playwright no es dependencia del proyecto —aquí no hay dependencias de
// ejecución— así que se busca donde suele estar y, si no aparece, se dice qué
// hacer en vez de reventar con un ERR_MODULE_NOT_FOUND.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// El paquete se sirve como ESM (index.mjs) y como CommonJS (index.js). Por el
// segundo camino `chromium` llega dentro de `default`, y devolverlo sin mirar
// daba un "Cannot read properties of undefined (reading 'launch')" tres líneas
// más tarde, que no dice nada de lo que pasa.
async function intentar(especificador) {
  const modulo = await import(especificador);
  const chromium = modulo.chromium ?? modulo.default?.chromium;
  if (!chromium) throw new Error("el módulo no exporta chromium");
  return chromium;
}

export async function loadChromium() {
  const intentos = [];
  const candidatos = process.env.PLAYWRIGHT_MODULE
    ? [process.env.PLAYWRIGHT_MODULE]
    : [];

  for (const especificador of ["playwright", "playwright-core"]) {
    candidatos.push(especificador);
    try {
      candidatos.push(require.resolve(especificador));
    } catch {
      // Sin resolver por require tampoco pasa nada: quedan los otros caminos.
    }
  }

  for (const candidato of candidatos) {
    try {
      return await intentar(candidato);
    } catch (error) {
      intentos.push(`${candidato}: ${error.message}`);
    }
  }

  throw new Error([
    "No se encontró Playwright, que estos guiones de QA necesitan.",
    "",
    "  npm install --no-save playwright && npx playwright install chromium",
    "",
    "O, si ya lo tienes en otro sitio, apunta a su index.mjs:",
    "",
    "  PLAYWRIGHT_MODULE=/ruta/a/playwright/index.mjs node scripts/qa-guided-browser.mjs",
    "",
    `Intentos: ${intentos.join(" · ")}`,
  ].join("\n"));
}
