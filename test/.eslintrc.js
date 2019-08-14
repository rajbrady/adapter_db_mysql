module.exports = {
  env: {
    mocha: true,
  },
  globals: {
    // Pronghorn globals.
    log: true,
  },
  rules: {
    // Mocha preference for describe context.
    'prefer-arrow-callback': 'off',
    'func-names': 'off',
    // We want to isolate dependencies.
    'global-require': 'off',
  },
};
