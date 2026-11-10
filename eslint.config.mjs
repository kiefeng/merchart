import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "typescript-eslint";

export default [
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { project: "./tsconfig.json", sourceType: "module" },
    },
    plugins: { obsidianmd, "@typescript-eslint": tseslint.plugin },
    rules: {
      ...obsidianmd.configs.recommended.rules,
      ...tseslint.configs.recommendedTypeChecked.reduce((acc, c) => ({ ...acc, ...(c.rules ?? {}) }), {}),
    },
  },
];
