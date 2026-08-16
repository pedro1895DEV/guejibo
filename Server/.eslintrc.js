module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2021: true
  },
  parserOptions: {
    ecmaVersion: 'latest'
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-undef': 'error',
    'no-constant-condition': 'warn',
    'no-unreachable': 'error',
    'no-duplicate-case': 'error',
    'eqeqeq': ['warn', 'smart'],
    'no-var': 'warn',
    'prefer-const': 'warn',
    'no-throw-literal': 'error'
  }
};
