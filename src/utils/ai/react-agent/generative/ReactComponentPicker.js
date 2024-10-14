// Import required modules using CommonJS require statements
const { ChatBot } = require("../utils");
const componentsPerPage = require("../utils/componentsPerPage.json");

/**
 * An array of component names used in the application.
 * @type {string[]}
 */
const componentsResponse = [
  "Typography",
  "Button",
  "Dialog",
  "DialogContent",
  "DialogDescription",
  "DialogFooter",
  "DialogHeader",
  "DialogTitle",
  "DialogTrigger"
];

/**
 * Formats the components per page into a structured string.
 * @type {string}
 */
const formatedComponents = `${Object.entries(componentsPerPage)
  .map(([key, value]) => {
    return `-Page-${key}-Start-
Components: [${value.map((component) => `"${component}"`).join(",")}]
-Page-${key}-End-
`;
  })
  .join("")}`;

/**
 * An example response in JSON format.
 * @type {string}
 */
const pageResultExample = `
\`\`\`json
${JSON.stringify(componentsResponse)}
\`\`\`
`;

/**
 * The prompt used to generate component selections using the ChatBot.
 * @type {string}
 */
const GENERATE_FORM_PROMPT = `
Act as a Frontend Developer.
I have a skeleton of a component, I want to to take this skeleton and help me generate a real implementation of this component with my design system.
I want you to use the design system to generate the real implementation from this skeleton.
---

Steps:
1. Choose the needed UI components from the design system (list will be provided below).
2. Return an array with the UI components names from the list I gave you. Return it in JSON format, as shown in the example below.
---
Response Example:
${pageResultExample}
---
Design System Components Molecules List:
${formatedComponents}
---
Return Type:
return a valid JSON format that I can use programmatically, copy paste your WHOLE RESPONSE in JSON.parse method.
DON'T ask for any additional information, just return a valid JSON
DON'T return any other information but the JSON response, no starting text, no ending text, just return one valid JSON
`;

/**
 * Class responsible for picking React components using a ChatBot.
 */
class ReactComponentPicker {
  /**
   * Creates an instance of ReactComponentPicker.
   */
  constructor() {
    this.model = "gpt-3.5-turbo";
    // this.model = 'gpt-4';
    this.chatbot = new ChatBot(this.model);
  }

  /**
   * Picks UI components based on the provided description.
   *
   * @param {Object} params - The parameters for picking components.
   * @param {string} params.description - The description of the component skeleton.
   * @returns {Promise<Object>} The selected components as a JSON object.
   */
  async pickComponents({ description }) {
    const messages = [
      {
        role: "system",
        content: `Act as a Frontend Developer.
I have a skeleton of a component, I want to to take this skeleton and help me generate a real implementation of this component with my design system.
I want you to use the design system to generate the real implementation from this skeleton.`
      },
      { role: "user", content: description },
      { role: "system", content: GENERATE_FORM_PROMPT }
    ];

    const response = await this.chatbot.getJsonResponse(messages);

    return response;
  }
}

// Export the ReactComponentPicker class
module.exports = {
  ReactComponentPicker
};
