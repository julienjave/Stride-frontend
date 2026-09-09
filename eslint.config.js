import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import oxlint from 'eslint-plugin-oxlint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      // recommendedTypeChecked (not the plain "recommended" the scaffold
      // picked) additionally uses TypeScript's real type checker, not just
      // syntax — this is what catches things like calling a method on a
      // value typed as possibly undefined. Real cost: linting gets slower,
      // since it now has to build an actual TS program instead of just
      // parsing syntax tree-by-tree.
      ...tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      // Type-aware rules need to know which tsconfig governs each file.
      // projectService (typescript-eslint's newer, recommended mechanism,
      // replacing the older manual `project: ['./tsconfig.json']` array)
      // auto-detects the right tsconfig per file — important here since we
      // have three of them (app vs. node) covering different files.
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // shadcn's generated components routinely export a cva() variants
    // function alongside the component itself (e.g. Button + buttonVariants)
    // — this is an accepted, intentional pattern in code we don't hand-author
    // or control the shape of, so we only downgrade this rule to a warning
    // for files we don't own. It stays a hard error everywhere else (our
    // own feature components), where the same pattern is more likely a
    // real oversight worth catching, not an intentional trade-off.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'warn',
    },
  },
  oxlint.configs['flat/recommended'],
])
