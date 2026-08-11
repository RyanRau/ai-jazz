import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  // Ignore patterns
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.venv/**",
      "**/.git/**",
      "**/coverage/**",
      "**/.storybook-static/**",
      "**/*.min.js",
      "**/package-lock.json",
      // PocketBase hook/migration scripts run in PocketBase's goja VM, not Node — globals
      // like `routerAdd`, `migrate`, `Collection`, `$apis` are injected by the runtime.
      "apps/pocketbase/**",
    ],
  },
  // Base ESLint recommended rules
  eslint.configs.recommended,
  // TypeScript rules
  ...tseslint.configs.recommended,
  // React configuration
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // TypeScript specific
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      // React specific
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      ...reactHooksPlugin.configs.recommended.rules,
    },
  },
  // Storybook CSF: a story's `render` is a component, but it's a plain object
  // property so the hooks rule can't recognize it as one.
  {
    files: ["**/*.stories.{ts,tsx,js,jsx}"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
];
