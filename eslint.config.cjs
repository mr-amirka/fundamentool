const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const stylistic = require('@stylistic/eslint-plugin');
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'coverage-tmp/**', 'docs/**'],
  },
  {
    // ESLint 9+ включает эту проверку по умолчанию (в ESLint 8/legacy её не было) —
    // выключено, чтобы не расходиться с поведением, на которое рассчитан код.
    linterOptions: { reportUnusedDisableDirectives: false },
  },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.commonjs,
        ...globals.es2017,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      '@stylistic': stylistic,
    },
    rules: {
      ...tseslint.configs.recommended.rules,

      // coding.md §6.2: переменные объявляются с плейсхолдер-значением до цикла/
      // условного присваивания (стабильная V8 hidden class на горячем пути) — эта
      // новая в eslint:recommended проверка считает начальное значение «неиспользуемым»,
      // не понимая, что оно намеренно перезаписывается ниже. Ложные срабатывания
      // системны по всему коду (переменные-аккумуляторы циклов), не единичный случай.
      'no-useless-assignment': 'off',

      // coding.md: `x && y()` / `x && (a, b)` (в т.ч. с comma-expression внутри
      // скобок) как терсовый условный вызов на горячем пути — намеренный идиом
      // лаборатории по всему коду, не «неиспользуемое выражение». allowShortCircuit
      // не покрывает вложенный comma-expression, поэтому правило выключено целиком.
      '@typescript-eslint/no-unused-expressions': 'off',

      // TS-функции с overload-декларациями (`function f(a): X; function f(a): Y;
      // function f(a) {...}`) — валидный TS, но базовый (не TS-aware) no-redeclare
      // из eslint:recommended ошибочно считает это переопределением.
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'error',

      // TypeScript уже проверяет неопределённые идентификаторы на этапе компиляции —
      // no-undef даёт ложные срабатывания на TS-специфичном синтаксисе (стандартная
      // рекомендация typescript-eslint: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-am-using-a-rule-from-eslint-core-and-it-doesnt-work-correctly-with-typescript)
      'no-undef': 'off',

      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // не пункт coding.md — низкоуровневая библиотека осознанно использует any на generic hot-path
      '@typescript-eslint/no-explicit-any': 'warn',

      // §6.1 coding.md — arguments вместо rest на горячем пути (без Array-аллокации)
      'prefer-rest-params': 'off',
      'prefer-spread': 'off',

      // §6.7 — каждый элемент на своей строке
      '@stylistic/indent': ['error', 2, { SwitchCase: 1 }],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/object-curly-newline': ['error', {
        ObjectExpression:  { minProperties: 1 },
        ObjectPattern:     { minProperties: 1 },
        ImportDeclaration: { minProperties: 1 },
        ExportDeclaration: { minProperties: 1 },
      }],
      '@stylistic/object-property-newline': ['error', { allowAllPropertiesOnSameLine: false }],
      '@stylistic/function-paren-newline':  ['error', { minItems: 3 }],
      '@stylistic/array-bracket-newline':   ['error', { minItems: 3 }],
      '@stylistic/array-element-newline':   ['error', { minItems: 3 }],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],

      // §6.8 — if/else/for/while всегда с блоком {}
      curly: ['error', 'all'],
      '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: false }],
    },
  },
  {
    // Jest-паттерн: require() внутри теста даёт свежий экземпляр модуля
    // (изоляция module-level кешей/состояния между тестами) — не покрыто coding.md
    files: ['tests/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      // тесты намеренно захватывают `this` в переменную, чтобы проверить
      // на что был забинжен контекст (bind/defer/withResult) — не алиас удобства
      '@typescript-eslint/no-this-alias': 'off',
    },
  },
];
