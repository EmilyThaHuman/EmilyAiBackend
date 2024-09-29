/* eslint-disable no-unused-vars */
// const { ToolMessage, SystemMessage, HumanMessage } = require('@langchain/core/messages');
const { assistantPrompts } = require('./static/assistant');
const { systemPrompts } = require('./static/system');
// const { SystemMessagePromptTemplate } = require('@langchain/core/prompts');
const { toolPrompts } = require('../functions');
const { instructionsPrompts } = require('./static');

function convertMapToArray(systemPrompts) {
  return Object.keys(systemPrompts);
}

const getPromptByName = (type, name) => {
  if (type === 'system') {
    systemPrompts[name];
  }
  if (type === 'user') {
    /* empty */
  }
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
const getMainSystemMessageContent = (params) => {
  const defaultPrompt = 'REACT_TAILWIND_SYSTEM_PROMPT_TEXT';
  const promptList = convertMapToArray(systemPrompts);
  if (params) {
    return systemPrompts[params];
  }
  return systemPrompts[defaultPrompt];
};
const getMainAssistantMessageInstructions = (params) => {
  const defaultPrompt = 'JS_COMPONENT_ASSISTANT';
  const promptList = convertMapToArray(assistantPrompts);
  if (params) {
    return assistantPrompts[params];
  }
  return assistantPrompts[defaultPrompt];
};
const getFormattingInstructions = () => {
  return instructionsPrompts['ORIGINAL_RESPONSE_FORMAT'];
};
const getMainToolMessageContent = () => createPrompt('tool', 'SUMMARIZE_MESSAGES');

module.exports = {
  createPrompt,
  getFormattingInstructions,
  getMainSystemMessageContent,
  getMainAssistantMessageInstructions,
  getMainToolMessageContent,
};
