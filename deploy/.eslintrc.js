module.exports = {
  env: {
    node: true,
    es6: true,
  },
  extends: "eslint:recommended",
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
  },
  overrides: [
    {
      files: ["*.test.js"],
      env: {
        jest: true,
      },
    },
  ],
  rules: {
    "no-var": "error",
    "prefer-const": "error",
    "no-unneeded-ternary": "error",
    "prefer-arrow-callback": "error",
  },
};
