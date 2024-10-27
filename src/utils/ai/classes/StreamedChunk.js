class StreamedChunk {
  constructor() {
    this.id = "";
    this.object = "";
    this.created = 0;
    this.model = "";
    this.choices = [
      {
        index: 0,
        delta: {
          role: null, // 'assistant' or 'user'
          content: null // Partial markdown content
        },
        finish_reason: null
      }
    ];
  }
}

module.exports = { StreamedChunk };
