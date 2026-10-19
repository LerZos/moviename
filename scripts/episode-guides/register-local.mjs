// CLI/test-only TypeScript bridge; Next.js supplies server-only in production.
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
export const requireLocal = createRequire(import.meta.url);
const ts = requireLocal("typescript");
const originalLoad = Module._load;
Module._load = function (request, ...args) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, ...args);
};
requireLocal.extensions[".ts"] = (module, filename) => {
  module._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
};
