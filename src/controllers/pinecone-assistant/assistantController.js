// controllers/chatController.js

const { EventSource } = require("extended-eventsource");

/**
 * Handles the pineconeAssistantChat functionality by streaming messages from Pinecone Assistants API to the client.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 */
const pineconeAssistantChat = async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages)) {
    return res
      .status(400)
      .json({ error: "Invalid messages format. Expected an array of messages." });
  }

  // Set headers for Server-Sent Events (SSE)
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Construct the full URL to the Pinecone Assistant API for the specific assistant
  const url = `${process.env.PINECONE_ASSISTANT_URL}/${process.env.PINECONE_ASSISTANT_NAME}/chat/completions`;

  // Initialize EventSource to communicate with Pinecone Assistants API
  const eventSource = new EventSource(url, {
    method: "POST",
    body: JSON.stringify({
      stream: true,
      messages
    }),
    headers: {
      Authorization: `Bearer ${process.env.PINECONE_API_KEY}`,
      "Content-Type": "application/json",
      "X-Project-Id": process.env.PINECONE_ASSISTANT_ID
    },
    disableRetry: true
  });

  // Handle incoming messages from Pinecone Assistants API
  eventSource.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);

      if (message?.choices?.[0]?.finish_reason) {
        // If the assistant has finished, close the EventSource and the response
        eventSource.close();
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      } else {
        // Stream the incoming data to the client
        res.write(`data: ${JSON.stringify(message)}\n\n`);
      }
    } catch (err) {
      console.error("Error parsing message:", err);
      eventSource.close();
      res.write(`data: ${JSON.stringify({ error: "Error processing message." })}\n\n`);
      res.end();
    }
  };

  // Handle errors from EventSource
  eventSource.onerror = (error) => {
    console.error("EventSource error:", error);
    eventSource.close();
    res.write(`data: ${JSON.stringify({ error: "Connection error." })}\n\n`);
    res.end();
  };

  // Handle client disconnects
  req.on("close", () => {
    console.log("Client disconnected.");
    eventSource.close();
    res.end();
  });
};

module.exports = { pineconeAssistantChat };
