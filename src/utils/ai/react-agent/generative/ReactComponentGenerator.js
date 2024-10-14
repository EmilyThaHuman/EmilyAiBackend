// Import required modules using CommonJS require statements
const { ChatBot } = require("../utils");

/**
 * An example of a TypeScript React Functional Component.
 * @type {string}
 */
const componentExample = `
\`\`\`tsx
import React from 'react';
import { ComponentNameOne, ComponentNameTwo } from '@react-agent/shadcn-ui'

export interface ComponentNameProps {
  {/* Your interface implementation */}
}

const ComponentName = (props: ComponentNameProps) => {
  return (
    {/* Your component implementation */}
  );
};

export default ComponentName;
\`\`\`
`;

/**
 * The prompt used to generate React components using the ChatBot.
 * @type {string}
 */
const GENERATE_FORM_PROMPT = `
Act as a Frontend Developer.
Create Typescript React Functional Component based on the description.
Make sure it is beautiful and easy to use.
Make sure it covers all the use cases and states.
---

Return Example:
${componentExample}
---
Instructions:
Make sure it's a working code, don't assume that I'm going to change or implement anything.
Assume I have React Typescript setup in my project.
Don't use any external libraries but @react-agent/shadcn-ui which is interal library, recharts for charts.
---
Return Type:
return a React component, written in Typescript, using Tailwind CSS.
return the code inside tsx/typescript markdown \`\`\`tsx <Your Code Here> \`\`\`.
`;

/**
 * Class responsible for generating React components using a ChatBot.
 */
class ReactComponentGenerator {
  /**
   * Creates an instance of ReactComponentGenerator.
   */
  constructor() {
    this.model = "gpt-4";
    // this.model = 'gpt-3.5-turbo';
    this.chatbot = new ChatBot(this.model);
  }

  /**
   * Generates a React component based on the provided description.
   *
   * @param {Object} params - The parameters for generating the component.
   * @param {string} params.description - The description of the component to generate.
   * @returns {Promise<string[]>} An array of generated React component code snippets.
   */
  async generateComponent({ description }) {
    const messages = [
      { role: "system", content: GENERATE_FORM_PROMPT },
      { role: "user", content: description },
      {
        role: "user",
        content:
          "Generate a React component in typescript based on the above description (last message), make sure to return your code inside a tsx/typescript markdown ```tsx <Your Code Here> ```"
      },
      {
        role: "user",
        content: `---
          Instructions:
          Make sure it's a working code, don't assume that I'm going to change or implement anything.
          Assume I have React Typescript setup in my project.
          Don't use any external libraries but @react-agent/shadcn-ui which is interal library, recharts for charts.
          ---
          Return Type:
          return a React component, written in Typescript, using Tailwind CSS.
          return the code inside tsx/typescript markdown \`\`\`tsx <Your Code Here> \`\`\`.`
      }
    ];

    const response = await this.chatbot.getTypescriptResponse(messages);

    return response;
  }
}

// Export the ReactComponentGenerator class
module.exports = {
  ReactComponentGenerator
};
