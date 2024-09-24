// const { ToolMessage, SystemMessage, HumanMessage } = require('@langchain/core/messages');
const { assistantPrompts } = require('./static/assistant');
const { systemPrompts } = require('./static/system');
// const { SystemMessagePromptTemplate } = require('@langchain/core/prompts');
const { toolPrompts } = require('../functions');
const { instructionsPrompts } = require('./static');

const getPromptByName = (type, name) => {
  if (type === 'system') {
    systemPrompts[name];
  }
  if (type === 'user') { /* empty */ }
  if (type === 'assistant') {
    assistantPrompts[name];
  }
  if (type === 'function') {
    toolPrompts[name];
  }
};
const createPrompt = (type, name) => {
  const prompt = getPromptByName(type, name);
  return {
    role: type,
    content: prompt,
  };
};
const getMainSystemMessageContent = () => {
  return systemPrompts['REACT_TAILWIND_SYSTEM_PROMPT_TEXT'];
};
const getMainAssistantMessageInstructions = () => {
  return assistantPrompts['REACT_GUIDE'];
};
const getFormattingInstructions = () => {
  return instructionsPrompts['RESPONSE_FORMAT_MD'];
};
const getMainToolMessageContent = () => createPrompt('tool', 'SUMMARIZE_MESSAGES');

module.exports = {
  createPrompt,
  getFormattingInstructions,
  getMainSystemMessageContent,
  getMainAssistantMessageInstructions,
  getMainToolMessageContent,
};
