// Import required modules using CommonJS require statements
const fs = require("fs").promises;
const path = require("path");
const {
  getComponentName,
  saveFile,
  readCodeOfPage,
  readComponentsConfigurations,
  readUserStory,
  LOCAL_COMPONENTS_DIR,
  getImplementationsExample,
  checkIfFileExists
} = require("./utils");
const { ReactComponentGenerator } = require("./generative");

/**
 * Instance of ReactComponentGenerator to generate component implementations.
 * @type {ReactComponentGenerator}
 */
const componentGenerator = new ReactComponentGenerator();

/**
 * Generates and saves a React component based on the provided description.
 *
 * This is a higher-order function that takes a directory path and returns an asynchronous
 * function. When invoked with the necessary parameters, it generates the component code
 * using the `componentGenerator` and saves it as `index.tsx` in the specified directory.
 *
 * @param {string} dirPath - The path to the directory where the `index.tsx` file will be saved.
 * @returns {Function} An asynchronous function that takes an object containing component details.
 *
 * @example
 * const saveComp = saveComponent('/path/to/dir');
 * saveComp({
 *   componentName: 'Button',
 *   dependencies: ['Icon'],
 *   implementations: ['<Icon />'],
 *   componentConfiguration: { uiComponents: ['Button', 'Icon'], type: 'atom' },
 *   userStory: 'As a user, I want a button to submit the form.',
 * }).then(() => {
 *   console.log('Component saved successfully.');
 * }).catch((error) => {
 *   console.error('Error saving component:', error);
 * });
 */
const saveComponent =
  (dirPath) =>
  async ({ componentName, dependencies, implementations, componentConfiguration, userStory }) => {
    // Create a string of dependency imports if there are any
    const depString = dependencies.length
      ? `import { ${dependencies.join(", ")} } from '@react-agent/shadcn-ui';\n`
      : "";

    // Starter component example to guide the ChatBot
    const componentExample = `import React from 'react';
${depString}export interface ${componentName}Props {};

const ${componentName} = (props) => {
  return (
    {/* Your component implementation */}
  );
};

export default ${componentName};
`;

    // Description to guide the ChatBot in generating the component code
    const description = `
Component Name:
${componentName}
---
Dependencies:
${dependencies.join(", ")}
---
Implementations:
${getImplementationsExample(implementations)}
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
 * Generates React components based on their configurations within a specified container path.
 *
 * This function performs the following steps:
 * 1. Constructs the directory path for the container.
 * 2. Reads component configurations and the user story from the directory.
 * 3. Filters components based on the specified type (e.g., 'molecule').
 * 4. For each component, retrieves UI component implementations and dependencies.
 * 5. Checks if the component already exists; if not, generates and saves the composed component.
 *
 * @param {string} type - The type of components to generate (e.g., 'molecule', 'organism').
 * @returns {Function} An asynchronous function that takes a `containerPath` and generates components.
 *
 * @example
 * generateComponentsFromConfigurations('molecule')('components/Button')
 *   .then(() => {
 *     console.log('Components generated successfully.');
 *   })
 *   .catch((error) => {
 *     console.error('Error generating components:', error);
 *   });
 */
const generateComponentsFromConfigurations = async (type) => async (containerPath) => {
  const dir = LOCAL_COMPONENTS_DIR;
  const dirPath = path.join(dir, containerPath);

  // Read component configurations from the directory
  const configurations = await readComponentsConfigurations(dirPath);

  // Read the user story from the directory
  const userStory = await readUserStory(dirPath);

  // Filter components based on the specified type
  const components = configurations.filter((config) => config.type === type);

  /**
   * Generates and saves a single component based on its configuration.
   *
   * @param {Component} component - The component configuration object.
   * @returns {Promise<void>} A promise that resolves when the component is generated and saved.
   *
   * @example
   * generateComponent({
   *   name: 'Button',
   *   uiComponents: ['Icon'],
   *   type: 'molecule',
   * }).then(() => {
   *   console.log('Component generated successfully.');
   * }).catch((error) => {
   *   console.error('Error generating component:', error);
   * });
   */
  const generateComponent = async (component) => {
    // Retrieve UI component implementations
    const implementations = await Promise.all(
      component.uiComponents.map(getComponentImplementation)
    );

    // Find the parent component if applicable (e.g., organism containing molecules)
    const parentComponent = configurations
      .filter((config) => config.type === "organism")
      .find((c) =>
        parseComposition(c)
          .molecules.map((c) => c.name)
          .includes(component.name)
      );

    // Determine the directory for the component
    const componentDir = path.join(dirPath, parentComponent?.name || "", component.name);

    // Create the component directory if it doesn't exist
    await fs.mkdir(componentDir, { recursive: true });

    // Check if the component already exists
    const existingComponent = await checkIfFileExists(path.join(componentDir, "index.tsx"));
    if (existingComponent) {
      console.log(`generateComponent: skipping - Component ${component.name} already exists`);
      return;
    } else {
      console.log(`generateComponent: generating Component ${component.name}`);
    }

    // Save the composed component using the saveComponent function
    await saveComponent(componentDir)({
      componentName: component.name,
      dependencies: component.uiComponents,
      implementations: implementations.filter((i) => i),
      componentConfiguration: component,
      userStory
    });
    console.log(`generateComponent: ${component.name} saved`);
  };

  // Generate all filtered components in parallel
  await Promise.all(components.map(generateComponent));
};

// Export all functions using CommonJS module exports
module.exports = {
  componentGenerator,
  saveComponent,
  generateComponentsFromConfigurations
};
