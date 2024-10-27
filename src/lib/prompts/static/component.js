// prompts/componentPrompt.js

/**
 * Generates a prompt for OpenAI to generate a React component.
 *
 * @param {Object} params - Parameters for the prompt.
 * @param {string} params.description - The user-provided description or user story.
 * @param {string} params.componentName - The name of the component to generate.
 * @param {string[]} params.dependencies - An array of UI component dependencies.
 * @param {string[]} params.implementations - An array of implementation examples.
 * @param {Object} params.componentConfiguration - The component configuration object.
 * @returns {string} The generated prompt.
 */
const generateComponentPrompt = ({
  description,
  componentName,
  dependencies,
  implementations,
  componentConfiguration
}) => {
  const depString = dependencies.length
    ? `import { ${dependencies.join(", ")} } from '@react-agent/shadcn-ui';\n`
    : "";

  const componentExample = `import React from 'react';
${depString}export interface ${componentName}Props {};

const ${componentName} = (props) => {
  return (
    {/* Your component implementation */}
  );
};

export default ${componentName};
`;

  const prompt = `
Component Name:
${componentName}
---
Dependencies:
${dependencies.join(", ")}
---
Implementations:
${implementations.join("\n")}
---
User Story: 
${description}
---
Instructions:
Import component dependencies from '@react-agent/shadcn-ui' library. e.g., import { ComponentNameOne, ComponentNameTwo } from '@react-agent/shadcn-ui';
Generate the component ${componentName}. It is part of the user story. Use the user story and the skeleton as a reference.
---
Component Composition:
${JSON.stringify(componentConfiguration)}
---
Here is a starter, continue from here:
${componentExample}
`;

  return prompt;
};

module.exports = {
  generateComponentPrompt
};
