import { fixupConfigRules } from "@eslint/compat";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  // eslint-config-next zieht eslint-plugin-react, -import und -jsx-a11y in
  // Ständen mit, die noch die in ESLint 10 entfernten context-Methoden
  // (getFilename, getSourceCode, …) aufrufen. fixupConfigRules reicht diese
  // Methoden nach; Plugins, die sie nicht mehr brauchen, bleiben unberührt.
  // Entfällt, sobald eslint-config-next auf ESLint-10-fähige Stände wechselt.
  ...fixupConfigRules([...nextVitals, ...nextTs]),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
