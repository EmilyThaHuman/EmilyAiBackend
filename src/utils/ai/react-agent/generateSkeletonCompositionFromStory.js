// Import required modules using CommonJS require statements
const path = require("path");
const {
  readUserStory,
  LOCAL_COMPONENTS_DIR,
  saveFile,
  readComponentsComposition
} = require("./utils");
const { ReactPageCompositionGenerator } = require("./generative");

/**
 * Creates an instance of ReactPageCompositionGenerator to generate component compositions.
 * @type {ReactPageCompositionGenerator}
 */
const pageCompositor = new ReactPageCompositionGenerator();

/**
 * Saves the skeleton composition based on the user story to the specified directory.
 *
 * This is a higher-order function that takes a directory path and returns an asynchronous
 * function which, when called with a user story, generates a composition and saves it as
 * a JSON file in the given directory.
 *
 * @param {string} dirPath - The path to the directory where the composition.json file will be saved.
 * @returns {Function} An asynchronous function that takes a user story string and saves the composition.
 *
 * @example
 * // Usage Example:
 * const saveComposition = saveSkeletonComposition('/path/to/dir');
 * saveComposition('As a user, I want to be able to...');
 */
const saveSkeletonComposition = (dirPath) => async (userStory) => {
  const description = `
    ---
    User Story: 
    ${userStory}
    `;
  const composition = await pageCompositor.generateComposition({
    description
  });

  await saveFile(dirPath, "composition.json", JSON.stringify(composition, null, 2));
};

/**
 * Generates a skeleton composition from a user story and saves it to the specified container path.
 *
 * This function reads the user story from the given container path, checks if a composition
 * already exists, and if not, generates and saves a new composition based on the user story.
 *
 * @param {string} containerPath - The path relative to LOCAL_COMPONENTS_DIR where the user story is located.
 * @returns {Promise<void>} A promise that resolves when the composition is generated and saved.
 *
 * @example
 * Example 1: Generates a composition for the Button component
 * generateSkeletonCompositionFromStory('components/Button');
 */
const generateSkeletonCompositionFromStory = async (containerPath) => {
  const dir = LOCAL_COMPONENTS_DIR;
  const dirPath = path.join(dir, containerPath);
  const userStory = await readUserStory(dirPath);
  try {
    const composition = await readComponentsComposition(dirPath);
    if (composition) {
      console.log("generateSkeletonCompositionFromStory: skipping - composition already exists");
      return;
    }
  } catch (e) {
    console.log("generateSkeletonCompositionFromStory: generating configuration");
  }

  await saveSkeletonComposition(dirPath)(userStory);
  console.log("generateSkeletonCompositionFromStory: composition saved");
};

// Export all functions using CommonJS module exports
module.exports = {
  saveSkeletonComposition,
  generateSkeletonCompositionFromStory
};
