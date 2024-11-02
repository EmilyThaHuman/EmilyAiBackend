// Import required modules using CommonJS require statements
const { generateSkeletonCompositionFromStory } = require("./generateSkeletonCompositionFromStory");
const { generateComponentsConfigurations } = require("./generateComponentsConfigurations");
const { generateComponentsFromConfigurations } = require("./generateComponentsFromConfigurations");
const { generateComposedComponent } = require("./generateComposedComponent");
const { generateDemo } = require("./generateDemo");
// const { generateComponentsStoryBook } = require('./generateComponentsStoryBook');

/**
 * Step 1: Generate skeleton composition from user story.
 * ---------------------------------------------
 * -- Overview --
 *  This function reads the user story from the given container path, checks if a composition already exists, and if not, generates and saves a new composition based on the user story.
 * -- Steps --
 * 1. Reads the user story from the given container path.
 * 2. Checks if a composition already exists.
 * 3. If a composition does not exist, generates a new composition based on the user story.
 * 4. Saves the generated composition to the specified directory path.
 *  -- Output, Type, and Return --
 * @param {string} containerPath - The path relative to LOCAL_COMPONENTS_DIR where the user story is located
 * @returns {Promise<Object>} - Skeleton composition object.
 * @type {Function}
 * @example
 * const skeletonComposition = await generateSkeletonCompositionFromStory(containerPath);
 */
const step1 = generateSkeletonCompositionFromStory;

/**
 * Step 2: Generate component configurations.
 * ---------------------------------------------
 *  -- Overview --
 * This function generates component configurations based on component compositions within a specified container path.
 *  -- Steps --
 * 1. Constructs the directory path for the container.
 * 2. Reads the component composition from the directory.
 * 3. Checks if a configuration already exists; if so, skips generation.
 * 4. Flattens the component composition to extract individual components.
 * 5. Filters out components of type 'atom'.
 * 6. For each remaining component, picks UI components based on the user story and existing dependencies.
 * 7. Saves the generated configurations to `components.json` in the specified directory.
 *  -- Output, Type, and Return --
 * @param {string} containerPath - The path relative to LOCAL_COMPONENTS_DIR where the component compositions are located
 * @returns {Promise<void>} - No return value.
 * @type {Function}
 * @example
 */
const step2 = generateComponentsConfigurations;

/**
 * Step 3: Generate components based on configurations.
 * ---------------------------------------------------------
 * -- Overview --
 * This function generates components based on the provided configurations.
 * -- Steps --
 * 1. Constructs the directory path for the container.
 * 2. Reads component configurations and the user story from the directory.
 * 3. Filters components based on the specified type.
 * 4. For each component, retrieves UI component implementations and dependencies.
 * 5. Checks if the component already exists; if not, generates and saves the composed component.
 *  -- Output, Type, and Return --
 * @param {string} type - The type of components to generate (e.g., 'molecule', 'organism').
 * @type {Function}
 * ---------------------------------------------------------
 * @example
 * generateComponentsFromConfigurations('molecule')('components/Header').then(() => {
 *   console.log('Components generated successfully.');
 * }).catch((error) => {
 *   console.error('Error generating components:', error);
 * });
 */
const step3 = generateComponentsFromConfigurations;

/**
 * Step 4: Generate composed components of type 'organism'.
 * ---------------------------------------------------------
 *  -- Overview --
 * This function generates composed components of type 'organism' based on the provided container path.
 *  -- Steps --
 * 1. Constructs the directory path for the container.
 * 2. Reads component configurations and the user story from the directory.
 * 3. Filters components based on the specified type.
 * 4. For each component, retrieves UI component implementations and dependencies.
 * 5. Checks if the component already exists; if not, generates and saves the composed component.
 *  -- Output, Type, and Return --
 * @param {string} type - The type of components to generate (e.g., 'molecule', 'organism').
 * @returns {Function} An asynchronous function that takes a container path and generates composed components.
 * @type {Function}
 * ---------------------------------------------------------
 * @example
 * generateComposedComponent('organism')('components/Header').then(() => {
 *   console.log('Composed components generated successfully.');
 * }).catch((error) => {
 *   console.error('Error generating composed components:', error);
 * });
 */
const step4 = generateComposedComponent("organism");

/**
 * Step 5: Generate composed components of type 'page'.
 * --------------------------------------------------
 *  -- Overview --
 * This function generates composed components of type 'page' based on the provided container
 *  -- Steps --
 * 1. Constructs the directory path for the container.
 * 2. Reads component configurations and the user story from the directory.
 * 3. Filters components based on the specified type.
 * 4. For each component, retrieves UI component implementations and dependencies.
 * 5. Checks if the component already exists; if not, generates and saves the composed component.
 *  -- Output, Type, and Return --
 * @param {string} type - The type of components to generate (e.g., 'molecule', 'organism').
 * @type {Function}
 * ---------------------------------------------------------
 * @example
 * generateComposedComponent('page')('components/Header').then(() => {
 *   console.log('Composed components generated successfully.');
 * }).catch((error) => {
 *   console.error('Error generating composed components:', error);
 * });
 */
const step5 = generateComposedComponent("page");

/**
 * Step 6: Generate demo components.
 * --------------------------------------------------
 *  -- Overview --
 * This function generates a demo file for a specified component based on the user story
 *  -- Steps --
 * 1. Constructs the directory path for the component.
 * 2. Reads the component implementation from `index.tsx`.
 * 3. Extracts the component name from the implementation code.
 * 4. Checks if a demo file (`demo.tsx`) already exists.
 * 5. If the demo does not exist, creates a starter demo component.
 * 6. Gathers all props related to the component.
 * 7. Generates a description for the ChatBot to create the demo.
 * 8. Invokes the ChatBot to generate the demo component code.
 * 9. Saves the generated demo code to `demo.tsx`.
 * -- Output, Type, and Return --
 * @param {string} type - The type of components to generate (e.g., 'molecule', 'organism').
 * @type {Function}
 * ---------------------------------------------------------
 * @example
 * generateDemo('molecule')('components/Button').then(() => {
 *   console.log('Demo generated successfully.');
 * }).catch((error) => {
 *   console.error('Error generating demo:', error);
 * });
 */
const step6 = generateDemo;
// const step7 = generateComponentsStoryBook;

/**
 * Executes the full flow of generating components by sequentially performing each step.
 * -------------------------------------------------------------------------------------
 * -- Overview --
 * This function orchestrates the entire process of generating components by executing each step in sequence.
 * -- Steps --
 * 1. Verifies the skeleton of the container using `JsonSkeleton`.
 * 2. Generates components based on the container's configuration.
 * 3. Generates composed components based on the container's configuration.
 * 4. Generates demo components based on the container's configuration.
 * -- Output, Type, and Return --
 *  @param {string} containerPath - The relative path to the container within `LOCAL_COMPONENTS_DIR`.
 * @returns {Promise<void>} A promise that resolves when all steps are completed.
 * @type {Function}
 * -------------------------------------------------------------
 * @example
 * fullFlow('components/Button')
 *   .then(() => {
 *     console.log('Full flow executed successfully.');
 *   })
 *   .catch((error) => {
 *     console.error('Error executing full flow:', error);
 *   });
 *
 */
const fullFlow = async (containerPath) => {
  await step1(containerPath); // Advised manual step: Verify skeleton with <JsonSkeleton json={jsonComposition} /> before proceeding
  await step2(containerPath); // Advised manual step: Verify uiComponents, make sure they fit the skeleton and user story
  await step3(containerPath); // Advised manual step: Verify components, delete components and re-generate them if needed
  await step4(containerPath); // Advised manual step: Verify components, delete components and re-generate them if needed
  await step5(containerPath); // Advised manual step: Verify components, delete components and re-generate them if needed
  await step6(containerPath);
  // await step7(containerPath);
};

/**
 * The container path for which components are to be generated.
 * @type {string}
 */
const CONTAINER_PATH = "AnalyticsDashboard";

/**
 * Initiates the component generation process by executing the full flow.
 * ----------------------------------------------------------------------
 * -- Overview --
 * This function logs the start and end of the generation process and handles any errors that occur.
 * -- Steps --
 * 1. Logs the start of the component generation process.
 * 2. Executes the full flow of generating components.
 * 3. Logs the end of the component generation process.
 * -- Output, Type, and Return --
 * @type {Function}
 * @returns {Promise<void>} A promise that resolves when the component generation process is complete.
 * ---------------------------------------------------------
 * @example
 * generateComponents()
 *   .then(() => {
 *     console.log('Components generated successfully.');
 *   })
 *   .catch((error) => {
 *     console.error('Error generating components:', error);
 *   });
 */
const generateComponents = async () => {
  console.log("generateComponents start");
  await fullFlow(CONTAINER_PATH);
  console.log("generateComponents end");
};

// Export the generateComponents function using CommonJS module exports
module.exports = {
  generateComponents
};
