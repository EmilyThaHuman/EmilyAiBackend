const { logger } = require("@config/logging");

class LogStreamHandler {
  constructor(res) {
    this.res = res;
    this.logs = []; // Store log entries
    this.startTime = new Date().toISOString(); // Timestamp of the start of the run
    this.accumulatedResponse = ""; // Store the full accumulated response
    this.prevLogLength = 0; // Length of the previous log in characters
  }

  /**
   * Sends data to the client via Server-Sent Events (SSE).
   * @param {Object} data - The data to send.
   */
  sendData(data) {
    this.res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  /**
   * Logs data to the console, overwriting the previous log entry.
   * Uses logger.info for informational logs and logger.error for errors.
   * @param {Object} data - The log data.
   */
  logToConsole(data) {
    let logMessage;
    if (data.type === "error") {
      logMessage = `[ERROR][LogStreamHandler]: ${data.message}`;
      logger.error(logMessage);
    } else if (data.type === "run_start" || data.type === "run_end") {
      logMessage = `[INFO][LogStreamHandler]: ${JSON.stringify(data)}`;
      logger.info(logMessage);
    } else {
      logMessage = `[INFO][LogStreamHandler]: ${data.content}`;
      logger.info(logMessage);
    }
    console.log(logMessage);
  }

  logAccumulatedResponse(accumulatedResponse) {
    // Clear the console
    process.stdout.write("\x1Bc");
    // Print the accumulated response
    console.log("[RESPONSE]:");
    console.log(accumulatedResponse);
  }

  /**
   * Handles the start of a run.
   * @param {Object} run - The run details.
   */
  handleRunStart(run) {
    const logEntry = {
      id: run.id,
      name: run.name,
      type: run.type,
      tags: run.tags || [],
      metadata: run.metadata || {},
      start_time: this.startTime,
      streamed_output: [],
      streamed_output_str: []
    };

    this.logs.push(logEntry);

    const data = { type: "run_start", data: logEntry };
    this.sendData(data);
    this.logToConsole(data);
  }

  /**
   * Handles each new token received during the run.
   * Accumulates the response and logs the updated response in the console.
   * @param {string} token - The new token.
   */
  handleLLMNewToken(token) {
    this.accumulatedResponse += token;
    this.logAccumulatedResponse(this.accumulatedResponse);

    const data = { type: "token", content: token };
    this.sendData(data);
  }

  /**
   * Handles errors that occur during the run.
   * @param {Error} error - The error object.
   */
  handleError(error) {
    const data = { type: "error", message: error.message };
    this.logToConsole(data);
    this.sendData(data);
  }

  /**
   * Handles the completion of the run.
   * @param {string} finalOutput - The final output of the run.
   */
  async handleRunEnd(finalOutput) {
    console.log("[RESPONSE]:", finalOutput);
    const endTime = new Date().toISOString();
    const latestLog = this.logs[this.logs.length - 1];

    if (latestLog) {
      latestLog.end_time = endTime;
      latestLog.final_output = finalOutput;
    }

    const data = { type: "run_end", data: latestLog };
    this.logToConsole(data);
    this.sendData(data);

    // Add a newline after the final response
    console.log();

    this.res.end();
  }

  /**
   * Manually ends the stream in case of unexpected issues.
   */
  endStream() {
    const data = { type: "end", message: "Stream Ended" };
    this.logToConsole(data);
    this.sendData(data);
    this.res.end();
  }
}

module.exports = {
  LogStreamHandler
};
