import { StreamedChunk } from "./StreamedChunk";

// Define the overall response schema
class OpenAIStreamResponse {
  constructor() {
    this.chunks = []; // Array of StreamedChunk
    this.completeContent = ""; // Accumulated markdown content
  }

  // Method to process incoming streamed data
  processStreamedData(data) {
    const parsedData = JSON.parse(data);
    const chunk = new StreamedChunk();

    chunk.id = parsedData.id;
    chunk.object = parsedData.object;
    chunk.created = parsedData.created;
    chunk.model = parsedData.model;
    chunk.choices = parsedData.choices.map((choice) => ({
      index: choice.index,
      delta: {
        role: choice.delta.role || null,
        content: choice.delta.content || null
      },
      finish_reason: choice.finish_reason || null
    }));

    this.chunks.push(chunk);

    // Accumulate markdown content
    const content = chunk.choices[0].delta.content;
    if (content) {
      this.completeContent += content;
      this.renderMarkdown(content); // Function to render markdown incrementally
    }

    // Check if the stream is finished
    if (chunk.choices[0].finish_reason) {
      this.onStreamComplete(); // Function to handle completion
    }
  }

  // Placeholder for rendering markdown
  renderMarkdown(content) {
    // Implement your markdown rendering logic here
    console.log("New Content:", content);
  }

  // Placeholder for handling stream completion
  onStreamComplete() {
    console.log("Stream complete. Full content:", this.completeContent);
    // Implement any finalization logic here
    this.completeContent = ""; // Reset for next stream
  }
}
