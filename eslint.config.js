import ts from 'typescript-eslint'
export default ts.config(
  { ignores: ['dist/**', 'test-results/**', 'playwright-report/**', '.test-edge/**', '.pnpm-store/**'] },
  ...ts.configs.recommended,
  { files: ['**/*.ts', '**/*.tsx'], rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } }
)
