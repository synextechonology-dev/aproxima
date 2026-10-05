import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'design', 'supabase', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'Texto do banco é sempre texto: não use dangerouslySetInnerHTML.',
        },
      ],
    },
  },
  {
    // Rota da placa e seu teste: mantidos como vieram (usam `any` de propósito no handler da Vercel)
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['api/**/*.ts', 'tests/**/*.ts', 'vite.config.ts'],
    languageOptions: { ecmaVersion: 2023, globals: globals.node },
    rules: { '@typescript-eslint/no-explicit-any': 'off', 'no-useless-assignment': 'off' },
  },
);
