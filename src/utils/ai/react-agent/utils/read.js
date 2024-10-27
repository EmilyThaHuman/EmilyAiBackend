// Import required modules using CommonJS require statements
const fs = require("fs").promises;
const path = require("path");
const { UI_COMPONENTS_DIR, DEMO_COMPONENTS_DIR, LOCAL_COMPONENTS_DIR } = require("./const");
const { Component, replaceDoubleSpaces } = require("./helpers");

/**
 * Reads the user story from a specified directory.
 *
 * This function reads the `user-story.md` file from the given directory path and returns its content as a string.
 *
 * @param {string} dirPath - The path to the directory containing the `user-story.md` file.
 * @returns {Promise<string>} A promise that resolves to the content of the user story.
 *
 * @example
 * readUserStory('/path/to/component')
 *   .then((story) => {
 *     console.log('User Story:', story);
 *   })
 *   .catch((error) => {
 *     console.error('Error reading user story:', error);
 *   });
 */
const readUserStory = async (dirPath) => {
  const userStoryFilePath = path.join(dirPath, "user-story.md");
  const userStory = await fs.readFile(userStoryFilePath, "utf8");
  return userStory;
};

/**
 * Reads the components configurations from a specified directory.
 *
 * This function reads the `components.json` file from the given directory path, parses it as JSON, and returns the configuration array.
 *
 * @param {string} dirPath - The path to the directory containing the `components.json` file.
 * @returns {Promise<Component[]>} A promise that resolves to an array of component configurations.
 *
 * @example
 * readComponentsConfigurations('/path/to/component')
 *   .then((configurations) => {
 *     console.log('Component Configurations:', configurations);
 *   })
 *   .catch((error) => {
 *     console.error('Error reading component configurations:', error);
 *   });
 */
const readComponentsConfigurations = async (dirPath) => {
  const configurationFilePath = path.join(dirPath, "components.json");
  const configurationCode = await fs.readFile(configurationFilePath, "utf8");
  const configuration = JSON.parse(configurationCode);
  return configuration;
};

/**
 * Reads the components composition from a specified directory.
 *
 * This function reads the `composition.json` file from the given directory path, parses it as JSON, and returns the composition object.
 *
 * @param {string} dirPath - The path to the directory containing the `composition.json` file.
 * @returns {Promise<Object>} A promise that resolves to the components composition object.
 *
 * @example
 * readComponentsComposition('/path/to/component')
 *   .then((composition) => {
 *     console.log('Components Composition:', composition);
 *   })
 *   .catch((error) => {
 *     console.error('Error reading components composition:', error);
 *   });
 */
const readComponentsComposition = async (dirPath) => {
  const compositionFilePath = path.join(dirPath, "composition.json");
  const compositionCode = await fs.readFile(compositionFilePath, "utf8");
  const composition = JSON.parse(compositionCode);
  return composition;
};

/**
 * Reads the UI component code for a specified component name.
 *
 * This function reads the `.tsx` file corresponding to the given component name from the `UI_COMPONENTS_DIR` and returns its content as a string.
 *
 * @param {string} componentName - The name of the UI component to read.
 * @returns {Promise<string>} A promise that resolves to the UI component code.
 *
 * @example
 * readUiComponents('Button')
 *   .then((code) => {
 *     console.log('UI Component Code:', code);
 *   })
 *   .catch((error) => {
 *     console.error('Error reading UI component:', error);
 *   });
 */
const readUiComponents = async (componentName) => {
  const componentFilePath = path.join(UI_COMPONENTS_DIR, `${componentName}.tsx`);
  const componentCode = await fs.readFile(componentFilePath, "utf8");
  return componentCode;
};

/**
 * Reads the demo code for a specified component name.
 *
 * This function reads the `demo.tsx` file for the given component name from the `DEMO_COMPONENTS_DIR` and returns its content as a string.
 *
 * @param {string} componentName - The name of the component for which to read the demo.
 * @returns {Promise<string>} A promise that resolves to the demo component code.
 *
 * @example
 * readComponentDemo('Button')
 *   .then((demoCode) => {
 *     console.log('Component Demo Code:', demoCode);
 *   })
 *   .catch((error) => {
 *     console.error('Error reading component demo:', error);
 *   });
 */
const readComponentDemo = async (componentName) => {
  const demoFilePath = path.join(DEMO_COMPONENTS_DIR, componentName, "demo.tsx");
  const demoCode = await fs.readFile(demoFilePath, "utf8");
  return demoCode;
};

/**
 * Creates a function to read the implementation code of a molecule component.
 *
 * This higher-order function takes a `containerPath` and returns an asynchronous function that reads the `index.tsx` file for a given component name within that container.
 *
 * @param {string} containerPath - The path to the container directory containing the molecule components.
 * @returns {Function} An asynchronous function that takes a `componentName` and returns its implementation code.
 *
 * @example
 * const readMolecule = readMoleculeComponent('/path/to/container');
 * readMolecule('Header')
 *   .then((code) => {
 *     console.log('Molecule Component Code:', code);
 *   })
 *   .catch((error) => {
 *     console.error('Error reading molecule component:', error);
 *   });
 */
const readMoleculeComponent = (containerPath) => async (componentName) => {
  const componentFilePath = path.join(containerPath, componentName, "index.tsx");
  const componentCode = await fs.readFile(componentFilePath, "utf8");
  return componentCode;
};

/**
 * Recursively reads all file paths within a specified directory.
 *
 * This function traverses the directory tree starting from `dirPath` and returns an array of all file paths.
 *
 * @param {string} dirPath - The root directory path to start reading files from.
 * @returns {Promise<string[]>} A promise that resolves to an array of file paths.
 *
 * @example
 * readFilesRecursively('/path/to/directory')
 *   .then((filePaths) => {
 *     console.log('File Paths:', filePaths);
 *   })
 *   .catch((error) => {
 *     console.error('Error reading files recursively:', error);
 *   });
 */
const readFilesRecursively = async (dirPath) => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const fileNames = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      fileNames.push(...(await readFilesRecursively(fullPath)));
    } else if (entry.isFile()) {
      fileNames.push(fullPath);
    }
  }

  return fileNames;
};

/**
 * Extracts the exported interface from a component's TypeScript code.
 *
 * This function slices the component code string to extract the portion between "export interface" and "const".
 *
 * @param {string} componentCode - The TypeScript code of the component.
 * @returns {string} The extracted interface code.
 *
 * @example
 * const interfaceCode = readProps('export interface ButtonProps { ... } const Button = () => { ... }');
 * console.log(interfaceCode);
 * // Output:
 * // export interface ButtonProps { ... }
 */
const readProps = (componentCode) => {
  const exportStart = componentCode.indexOf("export interface");
  const exportEnd = componentCode.indexOf("const");
  const slice = componentCode.slice(exportStart, exportEnd);
  return slice;
};

/**
 * Reads the code of all components within a specified container path.
 *
 * This function performs the following steps:
 * 1. Constructs the directory path by joining `LOCAL_COMPONENTS_DIR` with `containerPath`.
 * 2. Recursively reads all `.tsx` files within the directory, excluding `stories.tsx` files.
 * 3. Reads the content of each component file and replaces double spaces.
 * 4. Returns an array of objects containing file names and their corresponding code.
 *
 * @param {string} containerPath - The relative path to the container within `LOCAL_COMPONENTS_DIR`.
 * @returns {Promise<Object[]>} A promise that resolves to an array of objects with `fileName` and `code`.
 *
 * @example
 * readCodeOfPage('components/Button')
 *   .then((components) => {
 *     components.forEach(({ fileName, code }) => {
 *       console.log(`Component: ${fileName}\nCode:\n${code}`);
 *     });
 *   })
 *   .catch((error) => {
 *     console.error('Error reading code of page:', error);
 *   });
 */
const readCodeOfPage = async (containerPath) => {
  const dir = path.join(LOCAL_COMPONENTS_DIR, containerPath);
  const fileNames = await readFilesRecursively(dir);

  const componentsPaths = fileNames
    .filter((f) => !f.endsWith("stories.tsx"))
    .filter((f) => f.endsWith(".tsx"));
  const code = await Promise.all(
    componentsPaths.map(async (f) => {
      const componentCode = await fs.readFile(f, "utf8");
      return { fileName: f, code: replaceDoubleSpaces(componentCode) };
    })
  );

  return code;
};

/**
 * Exports all utility functions for external usage.
 */
module.exports = {
  readUserStory,
  readComponentsConfigurations,
  readComponentsComposition,
  readUiComponents,
  readComponentDemo,
  readMoleculeComponent,
  readFilesRecursively,
  readProps,
  readCodeOfPage
};
