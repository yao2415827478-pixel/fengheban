const vueParser = require('vue-eslint-parser')
const vuePlugin = require('eslint-plugin-vue')
const globals = require('globals')

const sharedRules = {
  'no-undef': 'error',
  'no-redeclare': 'error',
  'no-unreachable': 'error',
  'no-dupe-keys': 'error',
  'no-dupe-args': 'error',
  'no-constant-condition': ['error', { checkLoops: false }],
  'no-unused-vars': 'off'
}

module.exports = [
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'backend/node_modules/**',
      'android/**'
    ]
  },
  {
    files: ['src/**/*.js', 'src/**/*.vue'],
    languageOptions: {
      parser: vueParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: {
      vue: vuePlugin
    },
    rules: sharedRules
  },
  {
    files: ['backend/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node
      }
    },
    rules: sharedRules
  }
]
