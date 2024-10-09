const express = require('express');
const { asyncHandler } = require('@/utils/api');
const router = express.Router();
const { assistantController } = require('@/utils/ai/openAi/assistants');
// --- Assistant endpoints ---
// - Assistant main endpoints -
router.post('/list', asyncHandler(assistantController.listAssistants));
router.post('/create', asyncHandler(assistantController.createAssistant));
router.post('/delete', asyncHandler(assistantController.deleteAssistant));
router.post('/update', asyncHandler(assistantController.updateAssistant));
// - Assistant file endpoints -
router.post('/files/upload', asyncHandler(assistantController.uploadFile));
// - Assistant thread endpoints -
router.post('/threads/create', asyncHandler(assistantController.createThread));
// - Assistant message endpoints -
router.post('/messages/create', asyncHandler(assistantController.createMessage));
// - Assistant run endpoints -
router.post('/runs/create', asyncHandler(assistantController.createRun));
router.post('/runs/createStream', asyncHandler(assistantController.createRunStream));
router.post(
  '/runs/createStreamWithFunctions',
  asyncHandler(assistantController.createRunStreamWithFunctions)
);
router.post('/runs/retrieve', asyncHandler(assistantController.retrieveRun));

router.post('/byThread', asyncHandler(assistantController.getByThread));
router.post('/assistant/test', asyncHandler(assistantController.assistantTest));
module.exports = router;
