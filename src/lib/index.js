const filesExports = require("./files");
const modelsExports = require("./models");
const presetsExports = require("./presets");
const promptsExports = require("./prompts");
const toolsExports = require("./functions");
const templatesExports = require("./templates");
const lib = {
  files: filesExports,
  models: modelsExports,
  presets: presetsExports,
  prompts: promptsExports,
  tools: toolsExports,
  templates: templatesExports
};
const allLib = {
  ...filesExports,
  ...modelsExports,
  ...presetsExports,
  ...promptsExports,
  ...toolsExports,
  ...templatesExports
};

module.exports.files = filesExports;
module.exports.models = modelsExports;
module.exports.presets = presetsExports;
module.exports.prompts = promptsExports;
module.exports.tools = toolsExports;
module.exports.templates = templatesExports;
module.exports.lib = {
  ...lib.files,
  ...lib.tools,
  ...lib.models,
  ...lib.presets,
  ...lib.prompts,
  ...lib.templates
};

module.exports.default = {
  ...require("./files"),
  ...require("./functions"),
  ...require("./models"),
  ...require("./presets"),
  ...require("./prompts"),
  ...require("./templates")
};
