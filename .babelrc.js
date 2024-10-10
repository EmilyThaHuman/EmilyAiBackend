const path = require("path");
const JSON5 = require("json5");
const fs = require("fs");

const jsConfigPath = path.resolve(__dirname, "./jsconfig.json");
const jsConfigContent = fs.readFileSync(jsConfigPath, "utf8");
const jsConfig = JSON5.parse(jsConfigContent);

const alias = {};

for (const key in jsConfig.compilerOptions.paths) {
  const pathKey = key.replace("/*", "");
  const pathValue = jsConfig.compilerOptions.paths[key][0].replace("/*", "");
  alias[pathKey] = path.resolve(__dirname, pathValue);
}

module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        targets: {
          node: "current"
        }
      }
    ]
  ],
  plugins: [
    [
      "module-resolver",
      {
        root: [path.resolve(__dirname, "src")],
        alias: alias
      }
    ],
    "@babel/plugin-transform-runtime",
    "@babel/plugin-proposal-class-properties"
  ],
  env: {
    test: {
      presets: ["@babel/preset-env"],
      plugins: ["@babel/plugin-transform-runtime"]
    }
  }
};
