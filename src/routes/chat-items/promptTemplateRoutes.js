// routes/promptTemplateRoutes.js

const express = require('express');
const router = express.Router();
const { PromptTemplateController } = require("@controllers/chat-items");

// Use the controller methods
router.get('/', PromptTemplateController.getAll);
router.get('/:id', PromptTemplateController.getById);
router.post('/', PromptTemplateController.create);
router.put('/:id', PromptTemplateController.update);
router.delete('/:id', PromptTemplateController.delete);

module.exports = router;
