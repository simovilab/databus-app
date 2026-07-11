// Scoped env for Cypress specs + support files: the root config only
// enables `node`, so the mocha globals (describe/it/beforeEach) are enabled
// here and the Cypress-specific globals (cy, Cypress) are declared
// explicitly (the `cypress` env would need eslint-plugin-cypress, which
// isn't a dependency). Keeps the root .eslintrc.cjs untouched.
module.exports = {
  root: true,
  env: {
    node: true,
    mocha: true,
  },
  globals: {
    cy: 'readonly',
    Cypress: 'readonly',
  },
};
