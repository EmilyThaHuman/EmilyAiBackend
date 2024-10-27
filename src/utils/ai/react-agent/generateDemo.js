// Import required modules using CommonJS require statements
const fs = require("fs").promises;
const path = require("path");
const {
  getComponentName,
  saveFile,
  readCodeOfPage,
  readProps,
  LOCAL_COMPONENTS_DIR,
  checkIfFileExists
} = require("./utils");
const { ReactComponentGenerator } = require("./generative");

/**
 * Instance of ReactComponentGenerator to generate component implementations.
 * @type {ReactComponentGenerator}
 */
const componentGenerator = new ReactComponentGenerator();

/**
 * Generates a demo file for a specified component based on the user story.
 *
 * This function performs the following steps:
 * 1. Constructs the directory path for the component.
 * 2. Reads the component implementation from `index.tsx`.
 * 3. Extracts the component name from the implementation code.
 * 4. Checks if a demo file (`demo.tsx`) already exists.
 * 5. If the demo does not exist, creates a starter demo component.
 * 6. Gathers all props related to the component.
 * 7. Generates a description for the ChatBot to create the demo.
 * 8. Invokes the ChatBot to generate the demo component code.
 * 9. Saves the generated demo code to `demo.tsx`.
 *
 * @param {string} containerPath - The relative path to the component within `LOCAL_COMPONENTS_DIR`.
 * @returns {Promise<void>} A promise that resolves when the demo is generated and saved.
 *
 * @example
 * // Usage Example:
 * generateDemo('components/Button').then(() => {
 *   console.log('Demo generated successfully.');
 * }).catch((error) => {
 *   console.error('Error generating demo:', error);
 * });
 */
const generateDemo = async (containerPath) => {
  const dirPath = path.join(LOCAL_COMPONENTS_DIR, containerPath);

  // Read the implementation code from index.tsx
  const implementatioCode = await fs.readFile(`${dirPath}/index.tsx`, "utf8");

  // Extract the component name from the implementation code
  const componentName = getComponentName(implementatioCode);

  // Check if the demo.tsx file already exists
  const existingComponent = await checkIfFileExists(`${dirPath}/demo.tsx`);
  if (existingComponent) {
    console.log(`generateDemo: ${componentName} demo already exists`);
    return;
  }

  // Create a starter demo component example
  const componentExample = `import React from 'react';
import ${componentName} from './index';

const ${componentName}Demo = () => {
  return (
    {/* Your component implementation */}
  );
};

export default ${componentName}Demo;
  `;

  // Gather all props related to the component
  const allProps = await readCodeOfPage(containerPath).then((res) =>
    res.map((c) => readProps(c.code)).join("\n")
  );

  // Create a description for the ChatBot to generate the demo component
  const description = `
Create a demo for the component.
---
Here are the dependency props for the component:
${allProps}
${readProps(implementatioCode)}
---
Here is the component implementation:
${implementatioCode}
---
Here is a starter component, continue from here:
${componentExample}
---
Make sure the component does not receive any props as an input.
  `;

  // Generate the component code using the ChatBot
  const [componentCode] = await componentGenerator.generateComponent({
    description
  });

  if (!componentCode) {
    console.error("Unable to generate component code");
    return;
  }

  // Save the generated demo code to demo.tsx
  await saveFile(dirPath, "demo.tsx", componentCode);
  console.log(`generateDemo: ${componentName} demo saved`);
};

// Export all functions using CommonJS module exports
module.exports = {
  componentGenerator,
  generateDemo
};
