// Import required modules using CommonJS require statements
const fs = require("fs").promises;
const path = require("path");
const componentsPerPage = require("./componentsPerPage.json");
const { readComponentDemo, readUiComponents } = require("./read");

/**
 * @typedef {Object} Component
 * @property {string} type - The type of the component (e.g., 'page', 'organism', 'molecule', 'atom').
 * @property {string} name - The name of the component.
 * @property {string} layout - The TailwindCSS layout classes for the component.
 * @property {string} description - A description of the component.
 * @property {Component[]} components - An array of child components.
 * @property {string[]} [uiComponents] - An optional array of UI component codes.
 */

/**
 * Extracts the default export name from a file string.
 *
 * @param {string} fileString - The content of the file as a string.
 * @returns {string} The name of the default exported component.
 * @throws {Error} If the default export cannot be extracted.
 */
const getComponentName = (fileString) => {
  const exportRegex = /export\s+default\s+(\w+)/;
  const match = fileString.match(exportRegex);
  if (!match || match.length < 2) {
    throw new Error("Unable to extract default export from file.");
  }
  return match[1];
};

/**
 * Flattens a hierarchical component composition into a flat map.
 *
 * @param {Component} composition - The root component composition.
 * @returns {Object.<string, Component>} A map of component names to their respective Component objects.
 */
function flattenComponents(composition) {
  const flattenedComponents = {};

  /**
   * Recursively flattens a component and its children.
   *
   * @param {Component} component - The component to flatten.
   */
  function flatten(component) {
    flattenedComponents[component.name] = component;
    component.components.forEach(flatten);
  }

  composition.components.forEach(flatten);

  return flattenedComponents;
}

/**
 * Saves component code to a specified file within a directory.
 *
 * @param {string} dirPath - The path to the directory where the file will be saved.
 * @param {string} filename - The name of the file to save.
 * @param {string} componentCode - The code content to write to the file.
 * @returns {Promise<void>} A promise that resolves when the file is successfully written.
 */
async function saveFile(dirPath, filename, componentCode) {
  const dataFilePath = path.join(dirPath, filename);
  await fs.writeFile(dataFilePath, componentCode);
}

/**
 * Checks if a file exists at the specified path.
 *
 * @param {string} filePath - The path to the file to check.
 * @returns {Promise<boolean>} A promise that resolves to `true` if the file exists, otherwise `false`.
 */
const checkIfFileExists = async (filePath) => {
  try {
    const existingFile = await fs.readFile(filePath, "utf8");
    return !!existingFile;
  } catch (err) {
    return false;
  }
};

/**
 * Parses a component composition into categorized components.
 *
 * @param {Component} composition - The root component composition.
 * @returns {Object} An object containing categorized components and the original composition.
 * @property {Component[]} atoms - Array of atomic components.
 * @property {Component[]} molecules - Array of molecular components.
 * @property {Component[]} organisms - Array of organism components.
 * @property {Component} composition - The original composition object.
 */
const parseComposition = (composition) => {
  const configurations = flattenComponents(composition);
  const components = Object.values(configurations);
  const atoms = components.filter((c) => c.type === "atom");
  const molecules = components.filter((c) => c.type === "molecule");
  const organisms = components.filter((c) => c.type === "organism");
  const parsedComposition = {
    atoms,
    molecules,
    organisms,
    composition
  };
  return parsedComposition;
};

/**
 * Generates implementation examples from an array of implementations.
 *
 * @param {Object[]} implementations - An array of implementation objects.
 * @param {string} implementations[].componentName - The name of the component.
 * @param {string} implementations[].uiComponentCode - The UI component code.
 * @param {string} implementations[].demoCode - The demo code.
 * @param {boolean} [implementations[].demoOnly] - Whether to include only the demo code.
 * @returns {string} A concatenated string of implementation examples.
 */
const getImplementationsExample = (implementations) => {
  if (implementations.length === 0) return "";
  const maxLength = 30000 / implementations.length;

  /**
   * Chooses and parses an implementation based on its length.
   *
   * @param {Object} impl - The implementation object.
   * @returns {string} The parsed implementation example.
   */
  const chooseImpl = (impl) => {
    if (impl.length.uiComponentCode + impl.length.demoCode < maxLength)
      return parseImplementation(impl);
    if (impl.length.demoCode < maxLength) return parseImplementation({ ...impl, demoOnly: true });

    return "";
  };

  const text = implementations.map(chooseImpl).filter(Boolean).join("\n");
  return text;
};

/**
 * Parses an individual implementation into a formatted string.
 *
 * @param {Object} param0 - The implementation object.
 * @param {string} param0.componentName - The name of the component.
 * @param {string} param0.uiComponentCode - The UI component code.
 * @param {string} param0.demoCode - The demo code.
 * @param {boolean} [param0.demoOnly] - Whether to include only the demo code.
 * @returns {string} The formatted implementation example.
 */
const parseImplementation = ({ componentName, uiComponentCode, demoCode, demoOnly }) => {
  if (demoOnly) {
    return `----${componentName} START----
Implementation Example:
${demoCode}
----${componentName} END----
`;
  }
  return `
----${componentName} START----
Components Code: 
${uiComponentCode}
---
Implementation Example: 
${demoCode}
----${componentName} END----
`;
};

/**
 * Retrieves the page name that a component belongs to based on the componentsPerPage mapping.
 *
 * @param {string} componentName - The name of the component.
 * @param {Object.<string, string[]>} componentsPerPage - A mapping of page names to their components.
 * @returns {string|undefined} The name of the page the component belongs to, or `undefined` if not found.
 */
function getPageName(componentName, componentsPerPage) {
  for (const [pageName, components] of Object.entries(componentsPerPage)) {
    if (components.includes(componentName)) {
      return pageName;
    }
  }
  return undefined;
}

// Create a map of all component names for quick existence checks
const componentsMap = Object.values(componentsPerPage).reduce((acc, components) => {
  components.forEach((component) => {
    acc[component] = true;
  });
  return acc;
}, {});

/**
 * Checks if a component exists within the componentsPerPage mapping.
 *
 * @param {string} componentName - The name of the component to check.
 * @returns {boolean} `true` if the component exists, otherwise `false`.
 */
const doesComponentExist = (componentName) => {
  return componentsMap[componentName];
};

/**
 * Retrieves the implementation details of a component, including UI and demo codes.
 *
 * @param {string} componentName - The name of the component.
 * @returns {Promise<Object|null>} An object containing implementation details or `null` if the component is not found.
 * @property {string} componentName - The name of the component.
 * @property {string} uiComponentCode - The UI component code.
 * @property {string} demoCode - The demo code.
 * @property {Object} length - The lengths of the UI and demo codes.
 */
const getComponentImplementation = async (componentName) => {
  const pageName = getPageName(componentName, componentsPerPage);
  if (!pageName) return null;

  const [uiComponentCode, demoCode] = await Promise.all([
    readUiComponents(pageName),
    readComponentDemo(pageName)
  ]);
  return {
    componentName,
    uiComponentCode,
    demoCode,
    length: {
      uiComponentCode: uiComponentCode.length,
      demoCode: demoCode.length
    }
  };
};

/**
 * Replaces multiple consecutive spaces with a single space in the given content.
 *
 * @param {string} content - The content string to process.
 * @returns {string} The processed content with double spaces replaced by single spaces.
 */
function replaceDoubleSpaces(content) {
  // Split the input string into lines
  const lines = content.split("\n");

  // Iterate through each line and replace double spaces with single spaces
  const processedLines = lines.map((line) => line.replace(/ {2,}/g, " "));

  // Join the processed lines back together with new lines
  const result = processedLines.join("\n");

  return result;
}

// Export all functions
module.exports = {
  getComponentName,
  flattenComponents,
  saveFile,
  checkIfFileExists,
  parseComposition,
  getImplementationsExample,
  getPageName,
  doesComponentExist,
  getComponentImplementation,
  replaceDoubleSpaces
};
