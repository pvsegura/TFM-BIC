// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/.vite/**",
      "**/.scannerwork/**",
      "content/**",
      "infrastructure/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  // React application code (apps/web, packages/ui)
  {
    files: [
      "apps/web/src/**/*.{ts,tsx}",
      "packages/ui/src/**/*.{ts,tsx}",
      "packages/testing/src/**/*.{ts,tsx}",
    ],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },

  // packages/domain must not depend on anything external (infra, React, DB, SDKs)
  {
    files: ["packages/domain/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react",
                "react-dom",
                "fastify",
                "pg",
                "@fastify/*",
                "drizzle-orm*",
                "argon2",
              ],
              message:
                "packages/domain must not import infrastructure, React, or framework code — see docs/architecture/architecture-overview.md.",
            },
          ],
        },
      ],
    },
  },

  // packages/application depends on packages/domain and its own port interfaces only — never a
  // concrete DB driver/query builder/hashing/HTTP framework (those belong behind an adapter in
  // packages/data / apps/api). See docs/architecture/architecture-overview.md and ADR-006.
  {
    files: ["packages/application/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react",
                "react-dom",
                "fastify",
                "pg",
                "@fastify/*",
                "drizzle-orm*",
                "argon2",
              ],
              message:
                "packages/application must depend only on packages/domain and its own port interfaces — concrete infrastructure belongs in packages/data or apps/api.",
            },
          ],
        },
      ],
    },
  },

  // Config/build files: no type-aware linting, allow require-style patterns
  {
    files: [
      "**/*.config.{js,mjs,cjs,ts}",
      "**/vitest.config.ts",
      "**/vite.config.ts",
      "**/playwright.config.ts",
    ],
    extends: [tseslint.configs.disableTypeChecked],
  },

  eslintConfigPrettier,
);
