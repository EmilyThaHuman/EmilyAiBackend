// const handleStreamingResponse = async (
//   res,
//   formattedPrompt,
//   chatSession,
//   sessionContextStore,
//   initializationData,
//   messages
// ) => {
//   const DONE_MESSAGE = "DONE";
//   const sendData = (data) => {
//     res.write(`data: ${JSON.stringify(data)}\n\n`);
//   };
//   let fullResponse = "";
//   let buffer = "";

//   // async function handleLLMNewToken(token) {
//   //   buffer += token;
//   //   // Try to parse the buffer as JSON
//   //   try {
//   //     const data = JSON.parse(buffer);
//   //     // If parsing succeeds, process the data
//   //     if (data.role === "function") {
//   //       await handleLLMNewTokenWithRole(data);
//   //     } else {
//   //       sendData({ type: "message", content: data.content });
//   //       fullResponse += data.content;
//   //     }
//   //     buffer = ""; // Reset buffer after successful parsing
//   //   } catch (e) {
//   //     // If parsing fails, wait for more data
//   //     // Do nothing and continue accumulating
//   //   }
//   // }
//   try {
//     const callbackManager = CallbackManager.fromHandlers({
//       async handleLLMNewTokenWithRole(message) {
//         // Handle function calls within the streaming response
//         if (message.role === "function") {
//           const functionName = message.name;
//           const functionArgs = message.content;
//           // Execute the function call or handle accordingly
//           const functionResult = await executeFunction(functionName, functionArgs);
//           // Send the function result back to the model if necessary
//           sendData({ type: "function_result", name: functionName, result: functionResult });
//         }
//       },
//       async handleLLMNewToken(token) {
//         buffer += token;
//         // Try to parse the buffer as JSON
//         try {
//           const data = JSON.parse(buffer);
//           // If parsing succeeds, process the data
//           if (data.role === "function") {
//             await this.handleLLMNewTokenWithRole(data);
//           } else {
//             sendData({ type: "message", content: data.content });
//             fullResponse += data.content;
//           }
//           buffer = ""; // Reset buffer after successful parsing
//         } catch (e) {
//           // If parsing fails, wait for more data
//           // Do nothing and continue accumulating
//         }
//       },
//       async handleLLMEnd() {
//         await saveChatCompletion(initializationData, chatSession, fullResponse);
//         await processChatCompletion(
//           chatSession,
//           fullResponse,
//           sessionContextStore,
//           initializationData
//         );
//         sendData({ type: "end", message: DONE_MESSAGE });
//         res.end();
//       },
//       async handleLLMError(error) {
//         logger.error(`[ERROR][handleStreamingResponse]: ${error.message}`);
//         sendData({ type: "error", message: error.message });
//         res.end();
//       }
//     });

//     const chatOpenAI = new ChatOpenAI({
//       openAIApiKey: initializationData.apiKey,
//       streaming: true,
//       temperature: 0.2,
//       callbackManager
//     });

//     const messageSequence = [
//       new SystemMessage(getMainSystemMessageContent()),
//       new AIMessage(getMainAssistantMessageInstructions()),
//       new HumanMessage(formattedPrompt)
//     ];
//     // Define your function definitions as per OpenAI's function calling format
//     const functions = [
//       {
//         name: "generateResponse",
//         description: "Generates a response based on user input.",
//         parameters: {
//           type: "object",
//           properties: {
//             content: {
//               type: "string",
//               description: "The content of the response."
//             },
//             metadata: {
//               type: "object",
//               properties: {
//                 timestamp: {
//                   type: "string",
//                   description: "The time the response was generated."
//                 },
//                 responseLength: {
//                   type: "integer",
//                   description: "The length of the response in characters."
//                 }
//               },
//               required: ["timestamp", "responseLength"]
//             }
//           },
//           required: ["content", "metadata"]
//         }
//       }
//     ];
//     await chatOpenAI.invoke(messageSequence, {
//       functions,
//       function_call: "auto" // or specify the function name if needed
//     });
//     // Initiate the streaming request to OpenAI
//     // const resultStream = await chatOpenAI.completionWithRetry({
//     //   model: getEnv("OPENAI_API_CHAT_COMPLETION_MODEL"),
//     //   messages: [
//     //     { role: "system", content: getMainSystemMessageContent() },
//     //     { role: "assistant", content: getMainAssistantMessageInstructions() },
//     //     { role: "user", content: formattedPrompt }
//     //   ],
//     //   stream: true,
//     //   // streamUsage: true,
//     //   temperature: 0.2,
//     //   tools: [
//     //     {
//     //       type: "function",
//     //       function: {
//     //         name: "generateResponse",
//     //         strict: true,
//     //         parameters: {
//     //           type: "object",
//     //           required: ["content", "metadata"],
//     //           properties: {
//     //             content: {
//     //               type: "string",
//     //               description: "The content of the response."
//     //             },
//     //             metadata: {
//     //               type: "object",
//     //               required: ["timestamp", "responseLength"],
//     //               properties: {
//     //                 timestamp: {
//     //                   type: "string",
//     //                   description: "The time the response was generated."
//     //                 },
//     //                 responseLength: {
//     //                   type: "integer",
//     //                   description: "The length of the response in characters."
//     //                 }
//     //               },
//     //               additionalProperties: false
//     //             }
//     //           },
//     //           additionalProperties: false
//     //         },
//     //         description: "Generates a response based on user input."
//     //       }
//     //     }
//     //   ],
//     //   parallel_tool_calls: true,
//     //   response_format: {
//     //     type: "json_object"
//     //   }
//     // });
//     // let usageInfo = {};
//     // for await (const chunk of resultStream) {
//     //   // fullResponse += chunkString;

//     //   // Handle each chunk carefully
//     //   const chunkString = chunk.toString();
//     //   logger.info(`Chunk: ${chunkString}`, {
//     //     context: "handleStreamingResponse",
//     //     data: {
//     //       content: chunkString
//     //     }
//     //   });
//     //   const parsedChunk = JSON.parse(chunkString);
//     //   logger.info("Parsed Chunk:", parsedChunk);
//     //   try {
//     //     if (parsedChunk.choices && parsedChunk.choices.length > 0) {
//     //       const choice = parsedChunk.choices[0];
//     //       logger.info("CHOICE:", choice);

//     //       if (choice.finish_reason === "stop") {
//     //         sendData({ type: "done" });
//     //         break;
//     //       }

//     //       if (choice.message) {
//     //         const content = choice.message.content || "";
//     //         sendData({ type: "message", content });
//     //       }

//     //       if (choice.function_call) {
//     //         const { name, arguments: args } = choice.function_call;
//     //         const responseData = JSON.parse(args);
//     //         sendData({ type: "function_call", name, arguments: responseData });
//     //       } else {
//     //         const text = choice.delta.content;
//     //         if (text) {
//     //           sendData({ type: "message", content: text });
//     //           fullResponse += text;
//     //         }
//     //       }
//     //     }
//     //   } catch (error) {
//     //     // Log the error without crashing
//     //     logger.error(`Error parsing chunk: ${error.message}, chunk: ${chunkString}`);
//     //     // Optionally, continue with partial content
//     //     continue;
//     //   }
//     // }

//     // await saveChatCompletion(initializationData, chatSession, fullResponse);
//     // await processChatCompletion(chatSession, fullResponse, sessionContextStore, initializationData);

//     // // Send the DONE message and end the response
//     // sendData({ type: "end", message: DONE_MESSAGE });
//     // res.end();
//   } catch (error) {
//     logger.error(`[ERROR][handleStreamingResponse]: ${error.message}`);
//     sendData({ type: "error", message: error.message });
//     res.end();
//     throw error;
//   }
// };
