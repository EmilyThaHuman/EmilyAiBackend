const { User } = require("@models/user");
const { Workspace } = require("@models/workspace");
const { ChatSession } = require("@models/chat");
const { Pinecone } = require("@pinecone-database/pinecone");
const { ChatOpenAI, OpenAIEmbeddings } = require("@langchain/openai");
const { tools } = require("@lib/functions");
const { getEnv } = require("@utils/api");
const { logChatDataError } = require("./chat_helpers.js");
const { logger } = require("@config/logging/logger.js");

const initializeChatSession = async (sessionId, workspaceId, userId, prompt, sessionLength) => {
  try {
    let chatSession = await ChatSession.findById(sessionId);
    if (!chatSession) {
      logger.info(
        `[ATTEMPTING SESSION CREATION] WORKSPACE: ${workspaceId} USER: ${userId} - length: ${sessionLength}`
      );
      try {
        chatSession = new ChatSession({
          name: `${prompt}-${workspaceId}`,
          workspaceId: workspaceId,
          userId: userId,
          topic: prompt,
          active: true,
          model: getEnv("OPENAI_API_CHAT_COMPLETION_MODEL"),
          messages: [],
          systemPrompt: null,
          tools: [],
          files: [],
          summary: "",
          stats: {
            tokenUsage: 0,
            messageCount: 0
          },
          settings: {
            contextCount: 15,
            maxTokens: 300, // max length of the completion
            temperature: 0.5,
            model: getEnv("OPENAI_API_CHAT_COMPLETION_MODEL"),
            topP: 1,
            n: 4,
            debug: false,
            summarizeMode: false
          },
        });
        await chatSession.save();
        logger.info(`Session Creation Successful: ${chatSession._id}`);
        const workspace = await Workspace.findById(workspaceId);
        if (workspace) {
          workspace.chatSessions.push(chatSession._id);
          await workspace.save();
        } else {
          throw new Error("Workspace not found");
        }
        const user = await User.findById(userId);
        if (user) {
          user.chatSessions.push(chatSession._id);
          await user.save();
        } else {
          throw new Error("User not found");
        }
      } catch (error) {
        logger.error(
          `Error initializing chat session:
        [message][${error.message}]
        [error][${error}]
        [sessionId] ${sessionId}
        [userId] ${userId},`,
          error
        );
        throw error;
      }
    } else {
      logger.info(`Chat session found: ${chatSession._id}`);
      const currentPromptHistory = chatSession.promptHistory;
      chatSession.promptHistory = [...currentPromptHistory, prompt];
    }
    await chatSession.save();
    return chatSession;
  } catch (error) {
    const chatData = { sessionId, userId, prompt };
    logChatDataError("initializeChatSession", chatData, error);
    throw error;
  }
};

const initializeOpenAI = (apiKey, chatSession, completionModel) => {
  const configs = {
    modelName: completionModel,
    temperature: 0.4,
    maxTokens: 300,
    streaming: true,
    openAIApiKey: apiKey || process.env.OPENAI_API_PROJECT_KEY,
    organization: "reed_tha_human",
    // tools: tools,
    code_interpreter: "auto",
    function_call: "auto",
    // callbacks: {
    //   handleLLMNewToken: (token) => {
    //     logger.info(`New token: ${token}`);
    //   }
    // }
  };
  return new ChatOpenAI(configs);
};

const initializePinecone = () => {
  return new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
};

const initializeEmbeddings = (apiKey) => {
  return new OpenAIEmbeddings({
    modelName: getEnv("PINECONE_EMBEDDING_MODEL_NAME"),
    apiKey: apiKey || getEnv("OPENAI_API_PROJECT_KEY")
  });
};

module.exports = {
  initializeOpenAI,
  initializePinecone,
  initializeEmbeddings,
  initializeChatSession
};
// /**
//  * Save messages to a chat session.
//  * @param {String} sessionId - The ID of the chat session.
//  * @param {Array} messages - Array of message objects to be saved.
//  */
// const saveMessagesToSession = async (sessionId, messages) => {
//   try {
//     // Find the chat session by ID and populate existing messages
//     const chatSession = await ChatSession.findById(sessionId).populate('messages');
//     if (!chatSession) {
//       throw new Error('Chat session not found');
//     }
//     logger.info(`Chat session found: ${chatSession._id}`);
//     // logger.info(`MESSAGES: ${JSON.stringify(messages)}`);
//     // Extract existing messageIds from the session
//     const existingMessageIds = chatSession?.messages.map((msg) => msg.messageId);
//     // Filter out messages that already exist in the session
//     const newMessagesData = messages.filter(
//       (message) => !existingMessageIds.includes(message.messageId)
//     );
//     // Iterate over each new message and create ChatMessage documents
//     const newMessages = await Promise.all(
//       newMessagesData.map(async (message) => {
//         const newMessage = new ChatMessage({
//           sessionId,
//           type: message.role || 'message',
//           data: {
//             content: message.content,
//             additional_kwargs: message.additional_kwargs || {},
//           },
//           assistantId: message.assistantId,
//           userId: message.userId,
//           messageId: null,
//           conversationId: message.conversationId,
//           content: message.content,
//           role: message.role,
//           tokens: message.tokens,
//           localEmbedding: message.localEmbedding,
//           openaiEmbedding: message.openaiEmbedding,
//           sharing: message.sharing,
//           sequenceNumber: message.sequenceNumber,
//           metadata: message.metadata || {},
//         });
//         logger.info(`Creating new message ${message.messageId} for session ${sessionId}`);
//         logger.info(`New message data: ${JSON.stringify(newMessage)}`);
//         logger.info(`Saving message ${message.messageId} to session ${sessionId}`);
//         await newMessage.save();
//         return newMessage;
//       })
//     );

//     // Add new messages to the chat session
//     chatSession.messages.push(...newMessages.map((msg) => msg._id));
//     chatSession.stats.messageCount += newMessages.length;
//     await chatSession.save();
//     console.log(`Total messages in session ${sessionId}: ${chatSession.messages.length}`);
//   } catch (error) {
//     const chatData = { sessionId, messages };
//     logChatDataError(`saveMessagesToSession`, chatData, error);
//     throw error;
//   }
// };
