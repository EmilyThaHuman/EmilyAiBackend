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

/**
 * Creates a prompt for the OpenAI API based on the input and output languages and the input code.
 *
 * @param {string} inputLanguage - The language of the input code or description (e.g., 'JavaScript', 'Natural Language').
 * @param {string} outputLanguage - The desired language for the output code or description.
 * @param {string} inputCode - The code snippet or natural language description to translate.
 * @returns {string} - The constructed prompt.
 */
const createPrompt = (inputLanguage, outputLanguage, inputCode) => {
  const codeExample = `for (let i = 0; i < 10; i++) {
  console.log(i);
}`;
  const naturalLanguageExample = 'Print the numbers 0 to 9.';

  if (inputLanguage === 'Natural Language') {
    return `// Translate the following natural language description into ${outputLanguage} code.

// Example:

// Natural language:
// ${naturalLanguageExample}

// ${outputLanguage} code:
${codeExample}

// Natural language:
${inputCode}

// ${outputLanguage} code (no \`\`\`):`;
  } else if (outputLanguage === 'Natural Language') {
    return `// Translate the following ${inputLanguage} code into plain English that the average adult could understand.
// Respond as bullet points starting with "-".

// Example:

// ${inputLanguage} code:
${codeExample}

// Natural language:
// - ${naturalLanguageExample}

// ${inputLanguage} code:
${inputCode}

// Natural language:`;
  } else {
    const translatedCodeExample = `for i in range(10):
  print(i)`;

    return `// Translate the following ${inputLanguage} code into ${outputLanguage} code.

// Example:

// ${inputLanguage} code:
${codeExample}

// ${outputLanguage} code:
${translatedCodeExample}

// ${inputLanguage} code:
${inputCode}

// ${outputLanguage} code (no \`\`\`):`;
  }
};


module.exports = {
  generateComponentPrompt
};
