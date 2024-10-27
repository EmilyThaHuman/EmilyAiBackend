// Import required modules using CommonJS require statements
const { generateSkeletonCompositionFromStory } = require("./generateSkeletonCompositionFromStory");
const { generateComponentsConfigurations } = require("./generateComponentsConfigurations");
const { generateComponentsFromConfigurations } = require("./generateComponentsFromConfigurations");
const { generateComposedComponent } = require("./generateComposedComponent");
const { generateDemo } = require("./generateDemo");
// const { generateComponentsStoryBook } = require('./generateComponentsStoryBook');

/**
 * Step 1: Generate skeleton composition from user story.
 * @type {Function}
 */
const step1 = generateSkeletonCompositionFromStory;

/**
 * Step 2: Generate component configurations.
 * @type {Function}
 */
const step2 = generateComponentsConfigurations;

/**
 * Step 3: Generate components based on configurations.
 * @type {Function}
 */
const step3 = generateComponentsFromConfigurations;

/**
 * Step 4: Generate composed components of type 'organism'.
 * @type {Function}
 */
const step4 = generateComposedComponent("organism");

/**
 * Step 5: Generate composed components of type 'page'.
 * @type {Function}
 */
const step5 = generateComposedComponent("page");

/**
 * Step 6: Generate demo components.
 * @type {Function}
 */
const step6 = generateDemo;
// const step7 = generateComponentsStoryBook;

/**
 * Executes the full flow of generating components by sequentially performing each step.
 *
 * @param {string} containerPath - The relative path to the container within `LOCAL_COMPONENTS_DIR`.
 * @returns {Promise<void>} A promise that resolves when all steps are completed.
 *
 * @example
 * fullFlow('components/Button')
 *   .then(() => {
 *     console.log('Full flow executed successfully.');
 *   })
 *   .catch((error) => {
 *     console.error('Error executing full flow:', error);
 *   });
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
 *
 * This function logs the start and end of the generation process and handles any errors that occur.
 *
 * @returns {Promise<void>} A promise that resolves when the component generation process is complete.
 *
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
