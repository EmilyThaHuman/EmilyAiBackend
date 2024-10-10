const { getEnv } = require("@utils/api");
const openai = require("../config/openai");

exports.getChatCompletion = async (messages) => {
  const formattedMessages = messages?.map((msg) => ({
    role: msg.sender === "bot" ? "assistant" : "user",
    content: msg.content
  }));

  const response = await openai.chat.completions.create({
    model: getEnv("OPENAI_API_CHAT_COMPLETION_MODEL"),
    messages: formattedMessages
  });

  return response.choices[0].message.content;
};
