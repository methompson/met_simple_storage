module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  settings: {
    "import/resolver": {
      "typescript": {
        "alwaysTryTypes": true,
        "project": "./tsconfig.json"
      }
    }
  },
  plugins: [
    '@typescript-eslint/eslint-plugin',
    'unused-imports',
    'import',
  ],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'plugin:import/recommended'
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  ignorePatterns: ['.eslintrc.js', 'jest.config.*'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-empty-interface': 'warn',
    // '@typescript-eslint/indent': [
    //   'error',
    //   2,
    //   {
    //     'SwitchCase': 1,
    //     'FunctionExpression': 1,
    //   }
    // ],
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
      }
    ],
    '@typescript-eslint/no-empty-function': [
      'off'
    ],
    indent: 'off',
    'no-unused-vars': 'off',
    'no-empty-function': 'off',
    'max-classes-per-file': 'off',
    strict: 'off',
    camelcase: 'off',
    'no-console': 'off',
    'import/no-extraneous-dependencies': 'off',
    'no-underscore-dangle': 'off',
    'no-multi-spaces': [
      'error',
      {
        'ignoreEOLComments': false,
      }
    ],
    'no-multiple-empty-lines': [
      'error',
      {
        'max': 1,
        'maxEOF': 1,
        'maxBOF': 0,
      }
    ],
    'no-trailing-spaces': 'error',
    'brace-style': [
      'error',
      '1tbs',
    ],
    semi: 'error',
    'arrow-body-style': [
      'error',
      'as-needed',
    ],
    'arrow-parens': [
      'error',
      'always',
    ],
    'no-empty': [
      'error',
      {
        'allowEmptyCatch': true,
      }
    ],
    'max-len': [
      "warn",
      {
        'ignoreStrings': true,
        'code': 120,
        'comments': 120,
      },
    ],
    'no-restricted-syntax': 0,
    'class-methods-use-this': 'off',
    'no-continue': 'off',
    'no-plusplus': 'off',
    quotes: [
      'warn',
      'single',
    ],
    'import/no-named-as-default-member': 'off',
    'prettier/prettier': 'warn',
  },
};
