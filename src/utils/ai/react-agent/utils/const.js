// Import required modules using CommonJS require statements
const path = require("path");

/**
 * The root directory of the project.
 * Joins the current directory (`__dirname`) with four parent directories.
 *
 * @type {string}
 */
const rootDir = path.join(__dirname, "..", "..", "..", "..");

/**
 * Directory path for UI components.
 *
 * This constant resolves to the path specified by the `UI_COMPONENTS_DIR` environment variable.
 * If the environment variable is not set, it defaults to the specified path within the project structure.
 *
 * @type {string}
 */
const UI_COMPONENTS_DIR =
  process.env.UI_COMPONENTS_DIR || path.join(rootDir, "/frontend/shadcn-ui/src/components/ui");

/**
 * Directory path for Demo components.
 *
 * This constant resolves to the path specified by the `DEMO_COMPONENTS_DIR` environment variable.
 * If the environment variable is not set, it defaults to the specified path within the project structure.
 *
 * @type {string}
 */
const DEMO_COMPONENTS_DIR =
  process.env.DEMO_COMPONENTS_DIR ||
  path.join(rootDir, "/frontend/shadcn-ui/src/components/examples");

/**
 * Directory path for Local components.
 *
 * This constant resolves to the path specified by the `LOCAL_COMPONENTS_DIR` environment variable.
 * If the environment variable is not set, it defaults to the specified path within the project structure.
 *
 * @type {string}
 */
const LOCAL_COMPONENTS_DIR =
  process.env.LOCAL_COMPONENTS_DIR || path.join(rootDir, "/frontend/main/src/react-agent");

// Export all constants using CommonJS module exports
module.exports = {
  UI_COMPONENTS_DIR,
  DEMO_COMPONENTS_DIR,
  LOCAL_COMPONENTS_DIR
};
