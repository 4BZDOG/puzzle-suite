// =============================================================
// eslint.config.js — flat config (ESLint 9+)
//
// Three code areas, three environments:
//   • Frontend  (root + ai/core/import-export/license/pdf/renderers/ui/workers)
//                → browser ES modules
//   • Server    (server/**)                → Node.js CommonJS
//   • Tooling   (this file, build scripts) → Node.js ES modules
//
// Rules are tuned to catch real defects (undefined references, bad imports,
// unreachable code) without drowning the existing codebase in stylistic noise.
// =============================================================

const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    // Never lint generated or vendored output.
    {
        ignores: [
            'bundle.js',
            'node_modules/**',
            'server/node_modules/**',
            'server/*.db',
        ],
    },

    // ── Frontend: browser ES modules ────────────────────────────────────────
    {
        files: [
            'main.js',
            'ai/**/*.js',
            'core/**/*.js',
            'import-export/**/*.js',
            'license/**/*.js',
            'pdf/**/*.js',
            'renderers/**/*.js',
            'ui/**/*.js',
            'workers/**/*.js',
        ],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.worker,
            },
        },
        rules: {
            ...js.configs.recommended.rules,
            // Unused vars are worth knowing about but shouldn't fail the build
            // on a leading-underscore convention or caught-error placeholders.
            'no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrors: 'none',
            }],
            'no-empty': ['error', { allowEmptyCatch: true }],
        },
    },

    // ── Server: Node.js CommonJS ────────────────────────────────────────────
    {
        files: ['server/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                ...globals.node,
            },
        },
        rules: {
            ...js.configs.recommended.rules,
            'no-unused-vars': ['warn', {
                argsIgnorePattern: '^_|^(req|res|next)$',
                varsIgnorePattern: '^_',
                caughtErrors: 'none',
            }],
            'no-empty': ['error', { allowEmptyCatch: true }],
        },
    },

    // ── Tooling: Node.js ES/CommonJS config files ───────────────────────────
    {
        files: ['eslint.config.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: { ...globals.node },
        },
        rules: {
            ...js.configs.recommended.rules,
        },
    },
];
