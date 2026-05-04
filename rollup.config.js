import deckyPlugin from "@decky/rollup";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Wichtig für Umgebungen, die den Prozess-CWD beim Node-Aufruf umbiegen.
process.chdir(__dirname);

// ── Build flags ────────────────────────────────────────────────────────────
const SHOW_BUILD_DATE = true;
// ──────────────────────────────────────────────────────────────────────────

function buildFlags(flags) {
  const entries = Object.entries(flags).map(([k, v]) => [k, JSON.stringify(v)]);
  return {
    name: "build-flags",
    transform(code) {
      let out = code;
      for (const [key, val] of entries) out = out.replaceAll(key, val);
      return out !== code ? { code: out, map: null } : null;
    },
  };
}

export default deckyPlugin({
  plugins: [
    buildFlags({
      __SHOW_BUILD_DATE__: SHOW_BUILD_DATE,
      __BUILD_DATE__: new Date().toUTCString(),
    }),
  ],
});
