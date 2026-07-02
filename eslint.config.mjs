import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

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
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-namespace": ["error", { allowDeclarations: true }],
    },
  },
  {
    files: ["**/*.cjs", "migrations/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: nodeCjsGlobals,
    },
  },
);
