const { logger } = require("@config/logging");
const EventEmitter = require("events");
const { StreamedChunk } = require("./StreamedChunk");

/**
 * LogStreamHandler manages Server-Sent Events (SSE) streams for logging and real-time data transmission.
 */
class LogStreamHandler extends EventEmitter {
  constructor(res, { clientId = "unknown-client", enableConsoleLogging = true } = {}) {
    super();
    try {
      this.res = res;
      this.clientId = clientId;
      this.enableConsoleLogging = enableConsoleLogging;
      this.startTime = new Date().toISOString();
      this.completeContent = "";
      this.isStreamEnded = false;
      this.chunks = [];
      this.logs = [];
      this.loggerBuffer = "";
      this.prevLogLength = 0;
    } catch (error) {
      logger.error(`[LogStreamHandler]: Error in constructor: ${error.message}`);
    }
  }

  /**
   * Sends data to the client via Server-Sent Events (SSE).
   * @param {Object|string} data - The data to send. JSON-stringified if object.
   */
  sendData(data) {
    try {
      if (this.isStreamEnded) {
        this.log("warn", `Attempted to send data after stream ended.`);
        return;
      }

      let formattedData;
      if (typeof data === "string") {
        formattedData = data;
      } else if (typeof data === "object" && data !== null) {
        formattedData = JSON.stringify(data);
      } else {
        throw new TypeError(`Invalid data type: ${typeof data}`);
      }

      this.res.write(`data: ${formattedData}\n\n`, (err) => {
        if (err) {
          this.log("error", `Error sending data - ${err.message}`);
          this.endStream("Error sending data");
        }
      });
    } catch (error) {
      this.log("error", `Failed to send data: ${error.message}`);
    }
  }

  /**
   * Logs messages to the logger and optionally to the console.
   * @param {string} level - The log level ('info', 'warn', 'error').
   * @param {string} message - The log message.
   */
  log(level, message, data = null) {
    try {
      const fullMessage = `[LogStreamHandler][${this.clientId}]: ${message}`;
      logger[level](fullMessage, data || {});

      if (this.enableConsoleLogging) {
        this.clearPreviousLog();
        console.log(fullMessage);
        this.prevLogLength = (fullMessage.match(/\n/g) || []).length + 1;
      }
    } catch (error) {
      logger.error(`[LogStreamHandler][log]: Error during logging: ${error.message}`);
    }
  }

  /**
   * Handles new token streaming. Accumulates content and emits a 'token' event.
   * @param {string} token - The new token to be streamed.
   */
  handleLLMNewToken(token) {
    try {
      this.completeContent += token;
      this.emit("token", token);
      this.sendAndLog({ type: "token", content: token });
    } catch (error) {
      this.log("error", `Failed to handle new token: ${error.message}`);
    }
  }

  /**
   * Handles the start of a run by logging and sending the run start data.
   * @param {Object} run - The run details.
   */
  handleRunStart(run) {
    try {
      const logEntry = { ...run, start_time: this.startTime };
      this.logs.push(logEntry);
      this.sendAndLog({ type: "run_start", data: logEntry });
    } catch (error) {
      this.log("error", `Failed to handle run start: ${error.message}`);
    }
  }

  /**
   * Sends error data and terminates the stream in case of errors.
   * @param {Error} error - The error object.
   */
  handleError(error) {
    try {
      logger.error(`[LogStreamHandler][${this.clientId}]: ${error.message}`);
      this.sendAndLog({ type: "error", message: error.message, stack: error.stack });
      this.endStream("Error occurred");
    } catch (err) {
      this.log("error", `Failed to handle error: ${err.message}`);
    }
  }

  /**
   * Handles the end of the run, logs and sends the final output, and ends the stream.
   */
  handleRunEnd() {
    try {
      const finalOutput = this.getCompleteContent();
      const latestLog = this.logs[this.logs.length - 1];
      if (latestLog) {
        latestLog.end_time = new Date().toISOString();
        latestLog.final_output = finalOutput;
      }
      this.sendAndLog({ type: "run_end", data: latestLog });
      this.endStream("Run completed successfully");
    } catch (error) {
      this.log("error", `Failed to handle run end: ${error.message}`);
    }
  }

  /**
   * Sends data and logs it.
   * @param {Object} data - The data to send and log.
   */
  sendAndLog(data) {
    try {
      this.sendData(data);
      this.log(
        data.type === "error" ? "error" : "info",
        `${data.type.toUpperCase()}: ${JSON.stringify(data)}`
      );
    } catch (error) {
      this.log("error", `Failed to send and log: ${error.message}`);
    }
  }

  /**
   * Manually ends the stream.
   * @param {string} [message='Stream Ended'] - The reason for ending the stream.
   */
  endStream(message = "Stream Ended") {
    try {
      if (this.isStreamEnded) return;
      this.isStreamEnded = true;
      this.sendAndLog({ type: "end", message });
      this.res.end(() => this.log("info", "Stream ended."));
    } catch (error) {
      this.log("error", `Failed to end stream: ${error.message}`);
    }
  }

  /**
   * Processes streamed data.
   * @param {string} data - The raw streamed data.
   */
  processStreamedData(data) {
    try {
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

      const content = chunk.choices[0].delta.content;
      if (content) {
        this.completeContent += content;
      }

      if (chunk.choices[0].finish_reason) {
        this.onStreamComplete(); // Function to handle completion
      }
    } catch (error) {
      this.log("error", `Failed to process streamed data: ${error.message}`);
    }
  }

  /**
   * Clears the previous console log (if any).
   */
  clearPreviousLog() {
    try {
      if (this.prevLogLength > 0) {
        process.stdout.write("\x1B[2K\x1B[1A".repeat(this.prevLogLength)); // Clear previous lines
        this.prevLogLength = 0;
      }
    } catch (error) {
      this.log("error", `Failed to clear previous log: ${error.message}`);
    }
  }

  /**
   * Clears the accumulated response content.
   */
  clearCompleteContent() {
    try {
      this.completeContent = "";
      this.loggerBuffer = "";
    } catch (error) {
      this.log("error", `Failed to clear complete content: ${error.message}`);
    }
  }

  /**
   * Retrieves the accumulated response content.
   * @returns {string} The accumulated response content.
   */
  getCompleteContent() {
    try {
      return this.completeContent;
    } catch (error) {
      this.log("error", `Failed to get complete content: ${error.message}`);
      return "";
    }
  }
}

module.exports = {
  LogStreamHandler
};
