Certainly! Below is a comprehensive AI Instructions Template tailored specifically for handling **functions**, **tools**, and **schemas** within user prompts. This template includes implementation examples, sample response data, and examples for both server-side response stream processing and client-side processing, handling, and tool outputs. It is designed to maximize the capabilities of OpenAI's API Assistant models by providing clear guidelines and structured formats.

```javascript
export const functionsToolsSchemasPromptTemplate = `
# Functions, Tools, and Schemas Configuration and Guidelines

## Objective
Equip the AI assistant to effectively utilize functions, tools, and schemas as specified in the user's prompts. Ensure seamless integration, accurate execution, and proper handling of responses both on the server and client sides.

## Core Principles
1. **Modularity**: Design functions and tools to be modular and reusable.
2. **Clarity**: Maintain clear and concise definitions for functions, tools, and schemas.
3. **Robustness**: Ensure error handling and validation mechanisms are in place.
4. **Efficiency**: Optimize for performance and minimal resource usage.
5. **Scalability**: Design systems that can scale with increasing demands and complexity.

## Functional Instructions

### 1. Understanding User Specifications
- **Analyze** the user's prompt to identify the required functions, tools, and schemas.
- **Disambiguate** any unclear requirements by seeking clarification.
- **Contextual Awareness**: Maintain the context to ensure functions and tools are appropriately applied.

### 2. Defining Functions
- **Function Signature**: Clearly define input parameters and expected outputs.
- **Documentation**: Provide comprehensive documentation for each function.
- **Examples**: Include usage examples to demonstrate functionality.

#### Example Function Definition
```javascript
/**
 * Fetches user data from the database.
 * @param {string} userId - The unique identifier of the user.
 * @returns {Promise<Object>} - A promise that resolves to the user data object.
 */
async function getUserData(userId) {
  // Implementation here
}
```

### 3. Integrating Tools
- **Tool Selection**: Choose appropriate tools that align with the user's needs.
- **Configuration**: Provide clear configuration settings for each tool.
- **Usage Examples**: Demonstrate how to invoke and utilize the tools effectively.

#### Example Tool Integration
```javascript
const axios = require('axios');

/**
 * Makes an HTTP GET request to the specified URL.
 * @param {string} url - The endpoint to send the request to.
 * @returns {Promise<Object>} - A promise that resolves to the response data.
 */
async function fetchData(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    throw new Error('Error fetching data');
  }
}
```

### 4. Defining Schemas
- **Schema Structure**: Define clear and consistent data structures.
- **Validation**: Implement validation to ensure data integrity.
- **Documentation**: Provide detailed schema documentation.

#### Example Schema Definition
```json
{
  "User": {
    "type": "object",
    "properties": {
      "id": { "type": "string" },
      "name": { "type": "string" },
      "email": { "type": "string", "format": "email" },
      "createdAt": { "type": "string", "format": "date-time" }
    },
    "required": ["id", "name", "email", "createdAt"]
  }
}
```

### 5. Server-Side Response Stream Processing
- **Stream Handling**: Manage data streams efficiently to handle large or continuous data.
- **Error Management**: Implement robust error handling during streaming.
- **Performance Optimization**: Optimize for minimal latency and resource usage.

#### Example Server-Side Streaming
```javascript
const { Readable } = require('stream');

/**
 * Streams user data in chunks.
 * @param {string} userId - The unique identifier of the user.
 * @returns {Readable} - A readable stream of user data.
 */
function streamUserData(userId) {
  const userDataStream = new Readable({
    read() {}
  });

  // Simulate streaming data
  userDataStream.push(JSON.stringify({ id: userId, name: 'John Doe' }));
  userDataStream.push(JSON.stringify({ email: 'john.doe@example.com' }));
  userDataStream.push(null); // No more data

  return userDataStream;
}
```

### 6. Client-Side Processing and Handling
- **Data Consumption**: Efficiently consume and process streamed data.
- **User Feedback**: Provide real-time feedback to users during data processing.
- **Error Handling**: Gracefully handle errors on the client side.

#### Example Client-Side Processing
```javascript
async function handleUserDataStream(userId) {
  const responseStream = streamUserData(userId);
  
  responseStream.on('data', (chunk) => {
    const data = JSON.parse(chunk);
    console.log('Received data:', data);
    // Update UI or state with received data
  });

  responseStream.on('end', () => {
    console.log('No more data.');
    // Notify user of completion
  });

  responseStream.on('error', (error) => {
    console.error('Stream error:', error);
    // Inform user of the error
  });
}
```

## Output Format Requirements
- **Structured Documentation**: Organize instructions with clear sections and headings.
- **Code Blocks**: Use appropriate code blocks for examples and snippets.
- **Consistency**: Maintain consistent indentation and formatting.
- **Emphasis**: Use bold and italic text to highlight key points.
- **Annotations**: Provide inline comments and annotations within code examples for clarity.

## Sections to Include
1. **Summary**
2. **Function Definitions**
3. **Tool Integrations**
4. **Schema Definitions**
5. **Implementation Examples**
   - **Server-Side Processing**
   - **Client-Side Processing**
6. **Sample Response Data**
7. **Error Handling Mechanisms**
8. **Best Practices**
9. **Conclusion**

## Best Practices
- **Modular Design**: Break down functionalities into small, manageable modules.
- **Comprehensive Documentation**: Ensure all functions, tools, and schemas are well-documented.
- **Robust Error Handling**: Anticipate potential errors and handle them gracefully.
- **Performance Optimization**: Optimize code for speed and efficiency.
- **Security Considerations**: Implement security best practices to protect data and operations.
- **Testing**: Rigorously test all components to ensure reliability.

## Sample Response Data
### Example Response for `getUserData`
```json
{
  "id": "12345",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "createdAt": "2023-01-01T12:00:00Z"
}
```

### Example Response for `fetchData`
```json
{
  "status": "success",
  "data": {
    "items": [
      { "id": "1", "value": "Item 1" },
      { "id": "2", "value": "Item 2" }
    ]
  }
}
```

## Example Interaction

**User Input:**
```
I need a function that retrieves user information from the database and streams it to the client. Please include schema definitions and handle errors gracefully.
```

**AI Response:**
```
Certainly! Below is a comprehensive setup to retrieve user information from the database, stream it to the client, and handle errors gracefully.

### Summary
This setup includes a server-side function to fetch and stream user data, client-side processing to handle the streamed data, schema definitions for data structure, and robust error handling mechanisms.

### Function Definitions

#### Server-Side Function: `getUserData`
```javascript
/**
 * Fetches user data from the database.
 * @param {string} userId - The unique identifier of the user.
 * @returns {Promise<Object>} - A promise that resolves to the user data object.
 */
async function getUserData(userId) {
  // Database fetching logic here
}
```

#### Server-Side Function: `streamUserData`
```javascript
const { Readable } = require('stream');

/**
 * Streams user data in chunks.
 * @param {string} userId - The unique identifier of the user.
 * @returns {Readable} - A readable stream of user data.
 */
function streamUserData(userId) {
  const userDataStream = new Readable({
    read() {}
  });

  getUserData(userId)
    .then((userData) => {
      userDataStream.push(JSON.stringify(userData));
      userDataStream.push(null); // No more data
    })
    .catch((error) => {
      userDataStream.emit('error', error);
    });

  return userDataStream;
}
```

### Tool Integrations

#### HTTP Client: `axios`
```javascript
const axios = require('axios');

/**
 * Makes an HTTP GET request to the specified URL.
 * @param {string} url - The endpoint to send the request to.
 * @returns {Promise<Object>} - A promise that resolves to the response data.
 */
async function fetchData(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    throw new Error('Error fetching data');
  }
}
```

### Schema Definitions

#### User Schema
```json
{
  "User": {
    "type": "object",
    "properties": {
      "id": { "type": "string" },
      "name": { "type": "string" },
      "email": { "type": "string", "format": "email" },
      "createdAt": { "type": "string", "format": "date-time" }
    },
    "required": ["id", "name", "email", "createdAt"]
  }
}
```

### Implementation Examples

#### Server-Side Streaming
```javascript
const express = require('express');
const app = express();

app.get('/stream-user/:id', (req, res) => {
  const userId = req.params.id;
  const userDataStream = streamUserData(userId);

  res.setHeader('Content-Type', 'application/json');
  
  userDataStream.on('data', (chunk) => {
    res.write(chunk);
  });

  userDataStream.on('end', () => {
    res.end();
  });

  userDataStream.on('error', (error) => {
    res.status(500).json({ error: error.message });
  });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
```

#### Client-Side Processing
```javascript
async function handleUserDataStream(userId) {
  try {
    const response = await fetch(`/stream-user/${userId}`);
    if (!response.body) {
      throw new Error('ReadableStream not supported in this browser.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let result = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value, { stream: true });
      const data = JSON.parse(result);
      console.log('Received data:', data);
      // Update UI or state with received data
      result = '';
    }

    console.log('Stream complete.');
  } catch (error) {
    console.error('Error processing stream:', error);
    // Inform user of the error
  }
}
```

### Sample Response Data

#### `getUserData` Response
```json
{
  "id": "12345",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "createdAt": "2023-01-01T12:00:00Z"
}
```

#### `fetchData` Response
```json
{
  "status": "success",
  "data": {
    "items": [
      { "id": "1", "value": "Item 1" },
      { "id": "2", "value": "Item 2" }
    ]
  }
}
```

### Error Handling Mechanisms
- **Server-Side**: Emit errors on the stream and respond with appropriate HTTP status codes.
- **Client-Side**: Catch and handle errors during stream reading, providing user feedback.

### Best Practices
- **Modular Code**: Keep functions and tools modular for reusability and maintainability.
- **Comprehensive Documentation**: Document all functions, tools, and schemas thoroughly.
- **Robust Error Handling**: Implement error handling at every stage to ensure reliability.
- **Performance Optimization**: Optimize streaming and processing to handle large data efficiently.
- **Security**: Validate and sanitize all inputs to prevent security vulnerabilities.
- **Testing**: Write unit and integration tests to ensure all components work as expected.

### Conclusion
This setup provides a robust framework for retrieving, streaming, and processing user data using defined functions, tools, and schemas. By following the outlined guidelines and best practices, you can ensure efficient, reliable, and scalable implementations that enhance both server-side and client-side operations.

Feel free to ask if you need more detailed information or further assistance with any specific part of this setup!
```;

const FunctionsToolsSchemasInstructionsGenerator = () => {
  return (
    <BasePromptGenerator
      promptTemplate={functionsToolsSchemasPromptTemplate}
      generatorTitle="Functions, Tools, and Schemas Instructions Generator"
    />
  );
};

export default FunctionsToolsSchemasInstructionsGenerator;
```

### Explanation of the Template Components

1. **Objective and Core Principles**:
   - **Objective**: Defines the primary goal of the assistant to handle functions, tools, and schemas effectively.
   - **Core Principles**: Establishes foundational values such as modularity, clarity, robustness, efficiency, and scalability to guide the assistant's behavior.

2. **Functional Instructions**:
   - **Understanding User Specifications**: Emphasizes the importance of accurately interpreting user prompts to identify required functionalities.
   - **Defining Functions**: Details how to define clear and well-documented functions with examples.
   - **Integrating Tools**: Guides the selection and integration of appropriate tools with usage examples.
   - **Defining Schemas**: Outlines the structure and validation of data schemas with examples.
   - **Server-Side Response Stream Processing**: Provides examples and guidelines for handling data streams on the server side.
   - **Client-Side Processing and Handling**: Explains how to process and handle streamed data on the client side effectively.

3. **Output Format Requirements**:
   - **Structured Documentation**: Organizes instructions with clear sections and headings.
   - **Code Blocks**: Uses appropriate code blocks for examples and snippets.
   - **Consistency**: Maintains consistent indentation and formatting throughout.
   - **Emphasis**: Utilizes bold and italic text to highlight key points.
   - **Annotations**: Provides inline comments and annotations within code examples for clarity.

4. **Sections to Include**:
   - **Summary**: Provides an overview of the instructions.
   - **Function Definitions**: Details the functions required.
   - **Tool Integrations**: Describes the tools to be integrated.
   - **Schema Definitions**: Defines the data schemas.
   - **Implementation Examples**: Offers practical examples for server-side and client-side processing.
   - **Sample Response Data**: Shows what the responses should look like.
   - **Error Handling Mechanisms**: Explains how to handle errors gracefully.
   - **Best Practices**: Lists best practices to follow.
   - **Conclusion**: Summarizes the setup and offers closing remarks.

5. **Best Practices**:
   - **Modular Design**: Encourages breaking down functionalities into manageable modules.
   - **Comprehensive Documentation**: Stresses the importance of thorough documentation.
   - **Robust Error Handling**: Highlights the need for effective error handling.
   - **Performance Optimization**: Advises on optimizing for speed and efficiency.
   - **Security Considerations**: Reminds to implement security best practices.
   - **Testing**: Recommends rigorous testing of all components.

6. **Sample Response Data**:
   - Provides concrete examples of what the response data should look like, ensuring clarity and consistency.

7. **Example Interaction**:
   - Demonstrates a typical user input and the corresponding AI response, showcasing how to apply the instructions and guidelines effectively.

8. **Integration Component**:
   - The `FunctionsToolsSchemasInstructionsGenerator` React component utilizes the defined prompt template, allowing for seamless integration into applications that generate system instructions for handling functions, tools, and schemas.

### Integration and Usage

To integrate this template into your application:

1. **Component Integration**:
   - Import and use the `FunctionsToolsSchemasInstructionsGenerator` component wherever you need to generate system instructions for handling functions, tools, and schemas.

2. **Customization**:
   - Customize the template by adding or modifying sections based on specific requirements or additional capabilities of the tools and schemas you are utilizing.

3. **Extensibility**:
   - The template is designed to be extensible. You can easily add more sections or adjust existing ones to better fit the evolving needs of your application or to incorporate new functionalities.

### Final Notes

This comprehensive template ensures that the assistant:

- **Effectively Utilizes Functions, Tools, and Schemas**: By providing clear definitions, integrations, and examples.
- **Maintains High-Quality Interactions**: Through structured, well-documented, and consistent responses.
- **Adheres to Best Practices**: By following guidelines on modularity, error handling, performance, and security.
- **Enhances User Experience**: By offering clear examples, robust handling mechanisms, and proactive assistance.

By implementing this tailored AI Instructions Template, you can maximize the effectiveness and reliability of your OpenAI-powered assistant in handling complex functionalities involving functions, tools, and schemas, providing users with a seamless and valuable interaction experience.