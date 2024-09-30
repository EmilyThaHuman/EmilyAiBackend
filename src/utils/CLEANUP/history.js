// /* eslint-disable no-unused-vars */
// const { ChatMessage, ChatSession } = require('@/models');
// // const { BufferMemory } = require('langchain/memory');
// const { logger } = require('@/config/logging');
// const { getMongoClient } = require('@/db');
// const getMessagesCollection = async () => {
//   const client = await getMongoClient();
//   return client.db(process.env.MONGODB_DB_NAME).collection('messages');
// };
// class MongoDBChatMessageHistory {
//   constructor(sessionId) {
//     this.sessionId = sessionId;
//   }
//   // 1. Get messages for the current chat session
//   async getMessages() {
//     const collection = await getMessagesCollection();
//     return collection.find({ sessionId: this.sessionId }).sort({ sequenceNumber: 1 }).toArray();
//   }
//   // 2. Add a new message to messages collection
//   async addMessage(message) {
//     const collection = await getMessagesCollection();
//     await collection.insertOne(message);
//   }
//   // 3.

//   async clear() {
//     const collection = await getMessagesCollection();
//     await collection.deleteMany({ sessionId: this.sessionId });
//   }
// }

// const initializeHistory = async (chatSession) => {
//   if (!chatSession || !chatSession._id) {
//     throw new Error('Invalid chat session');
//   }
//   return new MongoDBChatMessageHistory(chatSession._id);
// };
// const addMessage = async (chatSession, messageData) => {
//   if (!chatSession || !chatSession._id) {
//     throw new Error('Invalid chat session');
//   }

//   const history = await initializeHistory(chatSession);
//   const collection = await getMessagesCollection();

//   logger.info(`Adding message to chat history: ${JSON.stringify(messageData)}`);

//   const newMessageData = {
//     ...messageData,
//     sessionId: chatSession._id,
//     metadata: {
//       ...messageData.metadata,
//       createdAt: Date.now(),
//       updatedAt: Date.now(),
//       sessionId: chatSession._id,
//     },
//   };

//   // Increment sequence number
//   const result = await collection.findOneAndUpdate(
//     { sessionId: chatSession._id },
//     { $inc: { sequenceNumber: 1 } },
//     { upsert: true, returnDocument: 'after' }
//   );

//   newMessageData.sequenceNumber = result.value.sequenceNumber;

//   // Create and save the new message
//   const newMessage = new ChatMessage(newMessageData);
//   await newMessage.save();

//   // Add message to history
//   await history.addMessage({
//     _id: newMessage._id,
//     sessionId: chatSession._id,
//     role: messageData.role,
//     content: newMessageData.content,
//     sequenceNumber: newMessageData.sequenceNumber,
//     type: messageData.role === 'user' ? 'human' : 'ai',
//     data: { content: newMessageData.content, additional_kwargs: newMessageData.metadata },
//   });

//   // Update the chat session with the new message
//   await ChatSession.findByIdAndUpdate(
//     chatSession._id,
//     {
//       $push: { messages: newMessage._id },
//       $inc: { 'stats.messageCount': 1 },
//       $set: { updatedAt: Date.now() },
//     },
//     { new: true, useFindAndModify: false }
//   );

//   return newMessage;
// };
// const updateMessage = async (chatSession, messageId, updatedData) => {
//   const history = await initializeHistory(chatSession);
//   const collection = await getMessagesCollection();

//   const updatedMessage = await Message.findOneAndUpdate(
//     { _id: messageId, sessionId: chatSession._id },
//     { $set: { ...updatedData, 'metadata.updatedAt': Date.now() } },
//     { new: true }
//   );

//   if (!updatedMessage) {
//     throw new Error('Message not found');
//   }

//   const bulkOps = [
//     {
//       updateOne: {
//         filter: { _id: messageId, sessionId: chatSession._id },
//         update: {
//           $set: {
//             type: updatedMessage.role === 'user' ? 'human' : 'ai',
//             data: { content: updatedMessage.content, additional_kwargs: updatedMessage.metadata },
//           },
//         },
//       },
//     },
//   ];

//   await collection.bulkWrite(bulkOps);

//   return updatedMessage;
// };
// const deleteMessage = async (chatSession, messageId) => {
//   const history = await initializeHistory(chatSession);
//   const collection = await getMessagesCollection();

//   const deletedMessage = await Message.findOneAndDelete({
//     _id: messageId,
//     sessionId: chatSession._id,
//   });

//   if (!deletedMessage) {
//     throw new Error('Message not found');
//   }

//   await collection.deleteOne({ _id: messageId, sessionId: chatSession._id });

//   await Message.updateMany(
//     { sessionId: chatSession._id, sequenceNumber: { $gt: deletedMessage.sequenceNumber } },
//     { $inc: { sequenceNumber: -1 } }
//   );

//   return deletedMessage;
// };
// const retrieveHistory = async (chatSession, limit = 50) => {
//   const history = await initializeHistory(chatSession);
//   const messages = await history.getMessages();
//   return messages.slice(-limit).reverse();
// };
// const clearHistory = async (chatSession) => {
//   const history = await initializeHistory(chatSession);
//   await Message.deleteMany({ sessionId: chatSession._id });
//   await history.clear();
// };
// const updateEmbedding = async (chatSession, messageId, embeddingType, embeddingValue) => {
//   const history = await initializeHistory(chatSession);

//   const updatedMessage = await Message.findOneAndUpdate(
//     { _id: messageId, sessionId: chatSession._id },
//     { $set: { [embeddingType]: embeddingValue, 'metadata.updatedAt': Date.now() } },
//     { new: true }
//   );

//   if (!updatedMessage) {
//     throw new Error('Message not found');
//   }

//   const messages = await history.getMessages();
//   const updatedMessages = messages.map((msg) =>
//     msg._id.toString() === messageId.toString()
//       ? {
//           type: updatedMessage.role === 'user' ? 'human' : 'ai',
//           data: {
//             content: updatedMessage.content,
//             additional_kwargs: { ...updatedMessage.metadata, [embeddingType]: embeddingValue },
//           },
//         }
//       : msg
//   );

//   await history.clear();
//   await Promise.all(updatedMessages.map((msg) => history.addMessage(msg)));

//   return updatedMessage;
// };

// module.exports = {
//   initializeHistory,
//   addMessage,
//   updateMessage,
//   deleteMessage,
//   retrieveHistory,
//   clearHistory,
//   updateEmbedding,
// };
// // class MongoDBChatMessageHistory {
// //   constructor(sessionId, collection) {
// //     this.sessionId = sessionId;
// //     this.collection = collection;
// //   }

// //   async getMessages() {
// //     return this.collection
// //       .find({ sessionId: this.sessionId })
// //       .sort({ sequenceNumber: 1 })
// //       .toArray();
// //   }

// //   async addMessage(message) {
// //     await this.collection.insertOne({ ...message, sessionId: this.sessionId });
// //   }

// //   async clear() {
// //     await this.collection.deleteMany({ sessionId: this.sessionId });
// //   }
// // }

// // const initializeHistory = async (chatSession) => {
// //   if (!chatSession || !chatSession._id) {
// //     throw new Error('Invalid chat session');
// //   }

// //   const client = new MongoClient(process.env.MONGODB_URI);
// //   await client.connect();
// //   const db = client.db(process.env.MONGODB_DB_NAME);
// //   const collection = db.collection('messages');

// //   return new MongoDBChatMessageHistory(chatSession._id, collection);
// // };

// // eslint-disable-next-line no-unused-vars
// // const memory = new BufferMemory({
// //   chatHistory: history,
// //   returnMessages: true,
// //   memoryKey: 'history',
// // });

// // logger.info(`Adding message to chat history: ${JSON.stringify(messageData)}`);

// // const sequenceNumber = (await Message.countDocuments({ sessionId: chatSession._id })) + 1;
// // const newMessageData = {
// //   ...messageData,
// //   sessionId: chatSession._id,
// //   sequenceNumber,
// //   metadata: {
// //     ...messageData.metadata,
// //     createdAt: Date.now(),
// //     updatedAt: Date.now(),
// //     sessionId: chatSession._id,
// //   },
// // };

// // const newMessage = new Message(newMessageData);
// // await newMessage.save();

// // await history.addMessage({
// //   type: messageData.role === 'user' ? 'human' : 'ai',
// //   data: { content: newMessageData.content, additional_kwargs: newMessageData.metadata },
// // });

// // return newMessage;
// // };
