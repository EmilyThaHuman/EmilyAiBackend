// Import required modules using CommonJS require statements
const fs = require("fs").promises;
const path = require("path");
const {
  getComponentName,
  saveFile,
  readCodeOfPage,
  readProps,
  LOCAL_COMPONENTS_DIR,
  checkIfFileExists,
  parseComposition,
  readComponentsConfigurations,
  getComponentImplementation,
  getImplementationsExample
} = require("./utils");
const { componentGenerator } = require("./generateComponentsFromConfigurations");

/**
 * Generates a formatted string for molecule component implementations.
 *
 * @param {Object} params - The parameters for parsing molecule implementation.
 * @param {string} params.componentName - The name of the component.
 * @param {string} params.uiComponentCode - The UI component code.
 * @returns {string} A formatted string containing the component implementation.
 *
 * @example
 * const formatted = parseMoleculeImplementation({
 *   componentName: 'Header',
 *   uiComponentCode: '<Header />',
 * });
 * console.log(formatted);
 * // Output:
 * // ----Header START----
 * // Components Code:
 * // <Header />
 * // ----Header END----
 */
const parseMoleculeImplementation = ({ componentName, uiComponentCode }) => {
  return `
----${componentName} START----
Components Code: 
${uiComponentCode}
----${componentName} END----
`;
};

/**
 * Saves the composed component to the specified directory path.
 *
 * This is a higher-order function that takes a directory path and returns an asynchronous
 * function. When invoked with the necessary parameters, it generates the component code
 * using the `componentGenerator` and saves it as `index.tsx` in the specified directory.
 *
 * @param {string} dirPath - The path to the directory where the `index.tsx` file will be saved.
 * @returns {Function} An asynchronous function that takes component details and saves the composed component.
 *
 * @example
 * const saveComponent = saveComposedComponent('/path/to/dir');
 * saveComponent({
 *   componentName: 'Button',
 *   dependencies: ['Icon'],
 *   uiCompImplementations: ['<Icon />'],
 *   implementations: ['<Icon />'],
 *   componentConfiguration: { uiComponents: ['Button', 'Icon'], type: 'atom' },
 *   userStory: 'As a user, I want a button to submit the form.',
 * }).then(() => {
 *   console.log('Component saved successfully.');
 * }).catch((error) => {
 *   console.error('Error saving component:', error);
 * });
 */
const saveComposedComponent =
  (dirPath) =>
  async ({
    componentName,
    dependencies,
    uiCompImplementations,
    implementations,
    componentConfiguration,
    userStory
  }) => {
    // Create a starter component example
    const componentExample = `import React from 'react';
import { ${componentConfiguration.uiComponents.join(", ")} } from '@react-agent/shadcn-ui'
${dependencies.map((CompName) => `import ${CompName} from './${CompName}';`).join("\n")}

export interface ${componentName}Props {};

const ${componentName} = (props) => {
  return (
    {/* Your component implementation */}
  );
};

export default ${componentName};
`;

    // Create a description for the ChatBot to generate the component code
    const description = `
Component Name:
${componentName}
---
UI shadn component Dependencies (@react-agent/shadcn-ui):
${componentConfiguration.uiComponents.join(", ")}
---
UI shadn component Implementations examples:
${getImplementationsExample(uiCompImplementations)}
---
Dependencies:
${dependencies.join(", ")}
---
Implementations:
${implementations
  .map((code, ix) =>
    parseMoleculeImplementation({
      componentName: dependencies[ix],
      uiComponentCode: code
    })
  )
  .join("\n")}
---
User Story: 
${userStory}
---
Instructions:
Import component dependencies from '@react-agent/shadcn-ui' library. e.g import { ComponentNameOne, ComponentNameTwo } from '@react-agent/shadcn-ui';
Generate the component ${componentName}, It is part of the user story, use the user story and the skeleton as a reference.
---
Component Composition:
${JSON.stringify(componentConfiguration)}
---
Here is a starter, continue from here:
${componentExample}
`;

    // Generate the component code using the ChatBot
    const [componentCode] = await componentGenerator.generateComponent({
      description
    });

    if (!componentCode) {
      console.error("Unable to generate component code");
      return;
    }

    // Save the generated component code to index.tsx
    await saveFile(dirPath, "index.tsx", componentCode);
  };

/**
 * Generates composed components based on the provided type and container path.
 *
 * This function performs the following steps:
 * 1. Constructs the directory path for the container.
 * 2. Reads component configurations and the user story from the directory.
 * 3. Filters components based on the specified type.
 * 4. For each component, retrieves UI component implementations and dependencies.
 * 5. Checks if the component already exists; if not, generates and saves the composed component.
 *
 * @param {string} type - The type of components to generate (e.g., 'organism', 'molecule').
 * @returns {Function} An asynchronous function that takes a container path and generates composed components.
 *
 * @example
 * generateComposedComponent('organism')('components/Header').then(() => {
 *   console.log('Composed components generated successfully.');
 * }).catch((error) => {
 *   console.error('Error generating composed components:', error);
 * });
 */
const generateComposedComponent = (type) => async (containerPath) => {
  const dir = LOCAL_COMPONENTS_DIR;
  const dirPath = path.join(dir, containerPath);

  // Read component configurations from the directory
  const configurations = await readComponentsConfigurations(dirPath);

  // Read the user story from the directory
  const userStory = await readUserStory(dirPath);

  // Filter components based on the specified type
  const components = configurations.filter((config) => config.type === type);

  /**
   * Generates a single component based on its configuration.
   *
   * @param {Component} component - The component configuration object.
   * @returns {Promise<void>} A promise that resolves when the component is generated and saved.
   */
  const generateComponent = async (component) => {
    // Retrieve UI component implementations
    const uiCompImplementations = await Promise.all(
      component.uiComponents.map(getComponentImplementation)
    );

    // Parse the component composition to get dependencies
    const treeFlat = parseComposition(component);
    const dependencies = type === "organism" ? treeFlat.molecules : treeFlat.organisms;
    const dependenciesNames = dependencies.map((c) => c.name);

    // Determine the directory for the component
    const componentDir = path.join(dirPath, type === "organism" ? component.name : "");

    // Retrieve implementations for dependencies
    const moleculeImplementations = await Promise.all(
      dependenciesNames.map(readMoleculeComponent(componentDir))
    );

    // Create the component directory if it doesn't exist
    await fs.mkdir(componentDir, { recursive: true });

    // Check if the component already exists
    const existingComponent = await checkIfFileExists(path.join(componentDir, "index.tsx"));
    if (existingComponent) {
      console.log(`generateComposedComponent: skipping Component ${component.name} already exists`);
      return;
    } else {
      console.log(`generateComposedComponent: generating Component ${component.name}`);
    }

    // Save the composed component
    await saveComposedComponent(componentDir)({
      componentName: component.name,
      dependencies: dependenciesNames,
      implementations: moleculeImplementations,
      uiCompImplementations: uiCompImplementations.filter((i) => i),
      componentConfiguration: component,
      userStory
    });
    console.log(`generateComposedComponent: ${component.name} saved`);
  };

  // Generate all filtered components in parallel
  await Promise.all(components.map(generateComponent));
};

// Export all functions using CommonJS module exports
module.exports = {
  parseMoleculeImplementation,
  saveComposedComponent,
  generateComposedComponent
};
