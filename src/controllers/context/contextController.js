const { createPrompt } = require("../utils/promptCreation");

/**
 * Controller class for managing documents.
 */
class ContextController {
  /**
   * Constructs a new instance of DocumentsController.
   */
  constructor() {
    this.fetchContext = this.fetchContext.bind(this);
  }

  /**
   * Adds a new document.
   * @param {Request} req - The request object.
   * @param {Response} res - The response object.
   * @returns {Promise} A promise that resolves to the added document.
   */
  async fetchContext(req, res) {
    try {
      const { namespaceId, messages } = req.body;

      if (!namespaceId || !messages) {
        return res.status(400).send({ message: "Missing required fields" });
      }
      const context = await createPrompt(messages, namespaceId);

      res.status(200).send({ query: messages[messages.length - 1], context });
    } catch (error) {
      console.error("Error fetching context:", error);
      res.status(500).send({ message: "Failed to fetch context" });
    }
  }
}

module.exports = new ContextController();
