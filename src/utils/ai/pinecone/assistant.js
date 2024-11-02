/**
 * Creates a prompt for the AI assistant, including the provided context.
 *
 * @param {Object[]} messages - The conversation messages.
 * @param {string} namespaceId - The namespace ID for the context.
 * @returns {Promise<Object>} - The prompt object.
 */
const createPrompt = async (messages, namespaceId) => {
  try {
    const lastMessage = messages[messages.length - 1]["content"];
    const context = await getContext(lastMessage, namespaceId);

    const prompt = [
      {
        role: "system",
        content: `AI assistant is a brand new, powerful, human-like artificial intelligence.
      DO NOT SHARE REFERENCE URLS THAT ARE NOT INCLUDED IN THE CONTEXT BLOCK.
      AI assistant will not apologize for previous responses, but instead will indicate new information was gained.
      If user asks about or refers to the current "workspace" AI will refer to the content after START CONTEXT BLOCK and before END OF CONTEXT BLOCK as the CONTEXT BLOCK. 
      If AI sees a REFERENCE URL in the provided CONTEXT BLOCK, please use reference that URL in your response as a link reference right next to the relevant information in a numbered link format e.g. ([reference number](link))
      If link is a pdf and you are CERTAIN of the page number, please include the page number in the pdf href (e.g. .pdf#page=x ).
      If AI is asked to give quotes, please bias towards providing reference links to the original source of the quote.
      AI assistant will take into account any CONTEXT BLOCK that is provided in a conversation. It will say it does not know if the CONTEXT BLOCK is empty.
      AI assistant will not invent anything that is not drawn directly from the context.
      AI assistant will not answer questions that are not related to the context.
      START CONTEXT BLOCK
      ${context}
      END OF CONTEXT BLOCK
      `
      }
    ];
    return { prompt };
  } catch (e) {
    throw e;
  }
};
