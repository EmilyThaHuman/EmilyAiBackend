const { openai } = require('@ai-sdk/openai');
const { StreamData, streamText } = require('ai');
const express = require('express');
// const { asyncHandler } = require('@/utils/api/sync.js');
const router = express.Router();

router.post('/', async (req, res) => {
  // use stream data (optional):
  const data = new StreamData();
  data.append('initialized call');

  const result = await streamText({
    model: openai('gpt-4o'),
    prompt: 'Invent a new holiday and describe its traditions.',
    onFinish() {
      data.append('call completed');
      data.close();
    },
  });

  result.pipeDataStreamToResponse(res, { data });
});

module.exports = router;
