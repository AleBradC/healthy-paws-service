import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

// Minimal Node/CommonJS globals for *.cjs files (migrations, etc.).
// We intentionally avoid pulling in the `globals` package to keep devDeps lean —
// these are the only ones our migrations actually use.
const nodeCjsGlobals = {
  exports: "writable",
  module: "writable",
  require: "readonly",
  __dirname: "readonly",
  __filename: "readonly",
  process: "readonly",
  Buffer: "readonly",
  console: "readonly",
  global: "readonly",
};

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**"],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // `declare global { namespace Express { ... } }` is the canonical way to
      // extend Express's Request type — there is no ES-module equivalent, so
      // permit `declare`-style namespaces while still flagging accidental ones.
      "@typescript-eslint/no-namespace": ["error", { allowDeclarations: true }],
    },
  },
  {
    files: ["**/*.cjs", "migrations/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: nodeCjsGlobals,
    },
  }
);
