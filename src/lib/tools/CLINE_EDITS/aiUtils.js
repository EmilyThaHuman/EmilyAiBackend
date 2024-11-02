// aiUtils.js
const { createAI, createStreamableValue } = require('ai/rsc');
const { checkRateLimit } = require('./rateLimiting');
const { initializeSemanticCache, getFromSemanticCache, setInSemanticCache } = require('./semanticCache');
const { getSearchResults, getImages, getVideos } = require('./searchProviders');
const { get10BlueLinksContents, processAndVectorizeContent } = require('./contentProcessing');
const { relevantQuestions } = require('./generateRelevantQuestions');
const { streamingChatCompletion } = require('./streamingChatCompletion');
const { lookupTool } = require('./mentionTools');

async function myAction(userMessage, mentionTool, logo, file) {
    const streamable = createStreamableValue({});

    await checkRateLimit(streamable);
    await initializeSemanticCache();

    const cachedData = await getFromSemanticCache(userMessage);
    if (cachedData) {
        streamable.update({ cachedData });
        return streamable.value;
    }

    if (mentionTool) {
        await lookupTool(mentionTool, userMessage, streamable, file);
    }

    const [images, sources, videos, conditionalFunctionCallUI] = await Promise.all([
        getImages(userMessage),
        getSearchResults(userMessage),
        getVideos(userMessage),
        functionCalling(userMessage),
    ]);

    streamable.update({ searchResults: sources, images, videos });

    if (config.useFunctionCalling) {
        streamable.update({ conditionalFunctionCallUI });
    }

    const html = await get10BlueLinksContents(sources);
    const vectorResults = await processAndVectorizeContent(html, userMessage);
    const accumulatedLLMResponse = await streamingChatCompletion(userMessage, vectorResults, streamable);
    const followUp = await relevantQuestions(sources, userMessage);

    streamable.update({ followUp });

    setInSemanticCache(userMessage, {
        searchResults: sources,
        images,
        videos,
        conditionalFunctionCallUI: config.useFunctionCalling ? conditionalFunctionCallUI : undefined,
        llmResponse: accumulatedLLMResponse,
        followUp,
        semanticCacheKey: userMessage
    });

    streamable.done({ status: 'done' });
    return streamable.value;
}

module.exports = {
    myAction
};
