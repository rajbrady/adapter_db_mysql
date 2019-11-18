module.exports = {
  'env': {
    'browser': true,
    'es6': true,
    'node': true,
  },
  'extends': 'airbnb-base',
  "plugins": [
    "json"
  ],
  'parserOptions': {
    'sourceType': 'module',
  },
  rules: {
    'max-len': 'warn',
    'comma-dangle': ['error', 'never'],
    'prefer-arrow-callback': 0,
    'prefer-template': 1,
    'no-param-reassign': 1,
    'prefer-destructuring': 0,
    'dot-notation': 0,
    'quote-props': 0,
    'no-await-in-loop': 1,
    'no-continue': 1
  },
};
