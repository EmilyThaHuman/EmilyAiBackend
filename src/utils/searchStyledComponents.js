const searchStyledComponents = async (query) => {
  try {
    const response = await fetch("https://api.example.com/llm-search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.LLM_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query })
    });
    const data = await response.json();
    const formattedData = {
      type: "styled-components",
      results: data.results.map((result) => ({
        title: result.title,
        description: result.description,
        example: result.example,
        link: result.link
      }))
    };
    return JSON.stringify(formattedData, null, 2);
  } catch (error) {
    console.error("Error searching for styled components:", error);
    return JSON.stringify({ error: "Failed to search for styled components" });
  }
};

const searchStyledComponentsTool = {
  type: "function",
  function: {
    name: "searchStyledComponents",
    description: "Search for styled components using the given query",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query for styled components"
        },
        components: {
          type: "array",
          description: "The components to search for",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "The name of the component"
              },
              description: {
                type: "string",
                description: "The description of the component"
              },
              example: {
                type: "string",
                description: "An example of the component"
              },
              link: {
                type: "string",
                description: "The link to the component"
              }
            },
            required: ["name", "description", "example", "link"]
          }
        },
        required: ["query", "components"]
      }
    }
  }
};

module.exports = {
  searchStyledComponents,
  searchStyledComponentsTool
};
