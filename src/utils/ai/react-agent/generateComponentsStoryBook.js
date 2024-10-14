// Import required modules using CommonJS require statements
const fs = require("fs").promises;
const path = require("path");
const { checkIfFileExists, getComponentName, readCodeOfPage, saveFile } = require("./utils");
const { ReactComponentStoryBookGenerator } = require("./generative");

/**
 * Instance of ReactComponentStoryBookGenerator to generate Storybook files.
 * @type {ReactComponentStoryBookGenerator}
 */
const storyBookGenerator = new ReactComponentStoryBookGenerator();

/**
 * Generates and saves a Storybook file for a given component.
 *
 * This is a higher-order function that takes a directory path and returns an asynchronous
 * function. When invoked with the necessary parameters, it generates the Storybook code
 * using the `storyBookGenerator` and saves it as `<componentName>.stories.tsx` in the specified directory.
 *
 * @param {string} dirPath - The path to the directory where the Storybook file will be saved.
 * @returns {Function} An asynchronous function that takes an object containing `code` and `componentName`.
 *
 * @example
 * const saveStoryBook = saveComponentStoryBook('/path/to/dir');
 * saveStoryBook({
 *   code: '<Button />',
 *   componentName: 'Button',
 * }).then(() => {
 *   console.log('Storybook saved successfully.');
 * }).catch((error) => {
 *   console.error('Error saving Storybook:', error);
 * });
 */
const saveComponentStoryBook =
  (dirPath) =>
  async ({ code = "", componentName = "" }) => {
    // Starter Storybook component example
    const componentExample = `import React from 'react';
import { Story, Meta } from '@storybook/react';
import ${componentName}, { ${componentName}Props } from './index';

export default {
 title: 'Components/${componentName}',
 component: ${componentName},
 argTypes: {},
} as Meta;

const Template: Story<${componentName}Props> = (args) => <OverviewCard {...args} />;

export const Default = Template.bind({});
Default.args = {};`;

    // Description to guide the ChatBot in generating the Storybook file
    const description = `
Create a storybook for the component.
---
Here is the component implementation:
${code}
---
Here is a starter component, continue from here:
${componentExample}
    `;

    // Generate the Storybook code using the ChatBot
    const storyCode = await storyBookGenerator.generateComponentStoryBook({
      description
    });

    if (!storyCode) {
      console.error("Unable to generate storybook code");
      return;
    }

    // Save the generated Storybook code to <componentName>.stories.tsx
    await saveFile(dirPath, `${componentName}.stories.tsx`, storyCode);
  };

/**
 * Generates Storybook files for all components of a specified type within a container path.
 *
 * This function performs the following steps:
 * 1. Reads the component codes from the specified container path.
 * 2. Extracts component names and their corresponding folder paths.
 * 3. For each component, checks if a Storybook file already exists.
 * 4. If not, generates and saves a new Storybook file using `saveComponentStoryBook`.
 *
 * @param {string} type - The type of components to generate Storybook files for (e.g., 'organism', 'molecule').
 * @returns {Function} An asynchronous function that takes a `containerPath` and generates Storybook files.
 *
 * @example
 * generateComponentsStoryBook('organism')('components/Header').then(() => {
 *   console.log('Storybook files generated successfully.');
 * }).catch((error) => {
 *   console.error('Error generating Storybook files:', error);
 * });
 */
const generateComponentsStoryBook = (type) => async (containerPath) => {
  // Read all component codes from the container path
  const code = await readCodeOfPage(containerPath);

  /**
   * Extracts the component name and its folder path from the provided file information.
   *
   * @param {Object} param0 - The file information object.
   * @param {string} param0.fileName - The file name with path.
   * @param {string} param0.code - The component code.
   * @returns {Object} An object containing the folder path and component name.
   *
   * @example
   * const result = getComponentNameAndContainerPath({
   *   fileName: 'components/Button/index.tsx',
   *   code: 'export default function Button() { ... }',
   * });
   * console.log(result);
   * // Output: { folder: 'components/Button', name: 'Button' }
   */
  const getComponentNameAndContainerPath = ({ fileName, code }) => {
    const name = getComponentName(code);
    const folder = fileName.split("/").slice(0, -1).join("/");
    return { folder, name };
  };

  // Map each component code to its metadata
  const meta = code.map((c) => ({
    code: c.code,
    ...getComponentNameAndContainerPath(c)
  }));

  /**
   * Generates and saves a Storybook file for a single component.
   *
   * @param {Object} component - The component metadata.
   * @param {string} component.folder - The folder path of the component.
   * @param {string} component.name - The name of the component.
   * @param {string} component.code - The implementation code of the component.
   * @returns {Promise<void>} A promise that resolves when the Storybook file is generated and saved.
   *
   * @example
   * generateStoryBook({
   *   folder: 'components/Button',
   *   name: 'Button',
   *   code: 'export default function Button() { ... }',
   * });
   */
  const generateStoryBook = async (
    component = {
      folder: null,
      name: "",
      code: ""
    }
  ) => {
    // Check if the Storybook file already exists
    const existingComponent = await checkIfFileExists(
      path.join(component.folder, `${component.name}.stories.tsx`)
    );
    if (existingComponent) {
      console.log(
        `generateComponentsStoryBook: skipping - Component ${component.name} storybook already exists`
      );
      return;
    } else {
      console.log(`generateComponentsStoryBook: generating Component ${component.name} storybook`);
    }

    // Generate and save the Storybook file
    await saveComponentStoryBook(component.folder)({
      componentName: component.name,
      code: component.code
    });
    console.log(`generateStoryBook: ${component.name} storybook saved`);
  };

  // Generate Storybook files for all components in parallel
  await Promise.all(meta.map(generateStoryBook));
};

// Export all functions using CommonJS module exports
module.exports = {
  saveComponentStoryBook,
  generateComponentsStoryBook
};
