import config from "@iobroker/eslint-config";

export default [
  ...config,
  {
    rules: {
      // Allow console in scripts
      "no-console": "off",
    },
  },
];
