// Import required modules using CommonJS require statements
const path = require("path");
const {
  flattenComponents,
  saveFile,
  readComponentsComposition,
  LOCAL_COMPONENTS_DIR,
  doesComponentExist,
  readComponentsConfigurations
} = require("./utils");
const { ReactComponentPicker } = require("./generative");

/**
 * Instance of ReactComponentPicker used to pick UI components based on user stories.
 * @type {ReactComponentPicker}
 */
const componentsPickerGenerator = new ReactComponentPicker();

/**
 * Generates component configurations based on component compositions within a specified container path.
 *
 * This function performs the following steps:
 * 1. Constructs the directory path for the container.
 * 2. Reads the component composition from the directory.
 * 3. Checks if a configuration already exists; if so, skips generation.
 * 4. Flattens the component composition to extract individual components.
 * 5. Filters out components of type 'atom'.
 * 6. For each remaining component, picks UI components based on the user story and existing dependencies.
 * 7. Saves the generated configurations to `components.json` in the specified directory.
 *
 * @param {string} containerPath - The relative path to the container within `LOCAL_COMPONENTS_DIR`.
 * @returns {Promise<void>} A promise that resolves when the configurations are generated and saved.
 *
 * @example
 * generateComponentsConfigurations('components/Header')
 *   .then(() => {
 *     console.log('Component configurations generated successfully.');
 *   })
 *   .catch((error) => {
 *     console.error('Error generating component configurations:', error);
 *   });
 */
const generateComponentsConfigurations = async (containerPath) => {
  const dir = LOCAL_COMPONENTS_DIR;
  const dirPath = path.join(dir, containerPath);

  // Read the component composition from the directory
  const composition = await readComponentsComposition(dirPath);

  try {
    // Check if a configuration already exists
    const configuration = await readComponentsConfigurations(dirPath);
    if (configuration) {
      console.log("generateComponentsConfigurations: skipping - configuration already exists");
      return;
    }
  } catch (e) {
    console.log("generateComponentsConfigurations: generating configuration");
  }

  // Flatten the component composition to extract individual components
  const configurations = flattenComponents(composition);

  // Filter out components of type 'atom'
  const components = Object.values(configurations).filter((c) => c.type !== "atom");

  /**
   * Retrieves the full configuration for a component by picking UI components based on the user story.
   *
   * @param {Object} component - The component configuration object.
   * @param {string} component.name - The name of the component.
   * @param {string} component.type - The type of the component (e.g., 'molecule', 'organism').
   * @param {string[]} component.uiComponents - An array of UI component names required by this component.
   * @returns {Promise<Object>} The updated component configuration with existing UI components.
   *
   * @example
   * const fullConfig = await getFullConfigurations({
   *   name: 'Button',
   *   type: 'molecule',
   *   uiComponents: ['Icon'],
   * });
   * console.log(fullConfig);
   * // Output:
   * // { name: 'Button', type: 'molecule', uiComponents: ['Icon'] }
   */
  const getFullConfigurations = async (component) => {
    try {
      // Pick UI components based on the component description
      const uiComponents = await componentsPickerGenerator.pickComponents({
        description: JSON.stringify(component)
      });

      // Filter out non-existing components
      const existingComponents = uiComponents.filter(doesComponentExist);

      // Return the updated component configuration
      return { ...component, uiComponents: existingComponents };
    } catch (e) {
      console.error(e);
      return component;
    }
  };

  // Generate full configurations for all components and the page configuration
  const componentsConfigurations = await Promise.all([
    ...components.map(getFullConfigurations),
    getFullConfigurations(composition) // Page configuration
  ]);

  // Save the generated configurations to components.json
  await saveFile(dirPath, "components.json", JSON.stringify(componentsConfigurations, null, 2));
  console.log("generateComponentsConfigurations: configuration saved");
};

// Export all functions using CommonJS module exports
module.exports = {
  generateComponentsConfigurations
};
