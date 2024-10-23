const functionDefinitions = [
  {
    type: "function",
    name: "generateResponse",
    description: "Generates a response based on user input.",
    parameters: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "The content of the response."
        },
        metadata: {
          type: "object",
          properties: {
            timestamp: {
              type: "string",
              description: "The time the response was generated."
            },
            responseLength: {
              type: "integer",
              description: "The length of the response in characters."
            }
          },
          required: ["timestamp", "responseLength"]
        }
      },
      required: ["content", "metadata"]
    }
  }
];

module.exports = {
  functionDefinitions
};
