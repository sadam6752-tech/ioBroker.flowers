"use strict";

const path = require("node:path");
const { tests } = require("@iobroker/testing");

// Run package tests
tests.packageFiles(path.join(__dirname, "../.."), {
  // Files that must exist
  requiredFiles: [
    "main.js",
    "io-package.json",
    "package.json",
    "LICENSE",
    "README.md",
    "admin/jsonConfig.json",
  ],
});
