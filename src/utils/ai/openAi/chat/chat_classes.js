// const { logger } = require("@config/logging");
// const EventEmitter = require("events");

// /**
//  * LogStreamHandler manages Server-Sent Events (SSE) streams for logging and real-time data transmission.
//  */
// class LogStreamHandler extends EventEmitter {
//   /**
//    * Initializes a new instance of LogStreamHandler.
//    * @param {http.ServerResponse} res - The HTTP response object to send SSE data.
//    * @param {Object} [options] - Optional configurations.
//    * @param {string} [options.clientId] - An identifier for the client.
//    * @param {boolean} [options.enableConsoleLogging=true] - Flag to enable/disable console logging.
//    */
//   constructor(res, options = {}) {
//     super();
//     this.res = res;
//     this.clientId = options.clientId || "unknown-client";
//     this.enableConsoleLogging = options.enableConsoleLogging !== false;
//     this.logs = []; // Store log entries
//     this.startTime = new Date().toISOString(); // Timestamp of the start of the run
//     this.accumulatedResponse = ""; // Store the full accumulated response
//     this.loggerBuffer = ""; // Store the full accumulated response
//     this.isStreamEnded = false;

//     // Initialize SSE headers
//     this.initializeSSE();

//     // Handle client disconnects
//     this.setupClientDisconnectHandler();
//   }

//   /**
//    * Initializes Server-Sent Events by setting appropriate headers.
//    */
//   initializeSSE() {
//     this.res.writeHead(200, {
//       "Content-Type": "text/event-stream",
//       "Cache-Control": "no-cache",
//       Connection: "keep-alive"
//     });
//     this.res.write("\n"); // Initial newline to ensure headers are sent
//   }

//   /**
//    * Sets up a handler for client disconnects to perform cleanup.
//    */
//   setupClientDisconnectHandler() {
//     this.res.on("close", () => {
//       if (!this.isStreamEnded) {
//         logger.warn(`[LogStreamHandler][${this.clientId}]: Client disconnected unexpectedly.`);
//         this.endStream("Client disconnected");
//       }
//     });
//   }

//   /**
//    * Sends data to the client via Server-Sent Events (SSE).
//    * @param {Object|string} data - The data to send. If string, sent as is; if object, JSON-stringified.
//    */
//   sendData(data) {
//     if (this.isStreamEnded) {
//       logger.warn(
//         `[LogStreamHandler][${this.clientId}]: Attempted to send data after stream ended.`
//       );
//       return;
//     }

//     const formattedData = typeof data === "string" ? data : JSON.stringify(data);
//     this.res.write(`data: ${formattedData}\n\n`, (err) => {
//       if (err) {
//         console.error(`[LogStreamHandler][${this.clientId}]: Error sending data - ${err.message}`);
//         this.endStream("Error sending data");
//       }
//     });
//   }

//   /**
//    * Sends the [DONE] marker to signify the end of the stream.
//    */
//   sendDone() {
//     this.sendData("[DONE]");
//   }

//   /**
//    * Sends a heartbeat message to keep the SSE connection alive.
//    */
//   sendHeartbeat() {
//     this.sendData("heartbeat");
//   }

//   /**
//    * Clears the console log based on the previous log length.
//    */
//   clearPreviousLog() {
//     if (this.prevLogLength > 0) {
//       // Move cursor up by the number of lines we previously logged and clear them
//       process.stdout.write("\x1B[0G"); // Move cursor to start of the line
//       process.stdout.write("\x1B[2K"); // Clear the current line
//       process.stdout.write("\x1B[1A".repeat(this.prevLogLength)); // Move cursor up by previous log lines
//       for (let i = 0; i < this.prevLogLength; i++) {
//         process.stdout.write("\x1B[2K"); // Clear each line
//         process.stdout.write("\x1B[1B"); // Move cursor back down
//       }
//       process.stdout.write("\x1B[0G"); // Reset cursor to the start of the line
//     }
//   }

//   /**
//    * Logs data to both the configured logger and optionally to the console.
//    * @param {Object} data - The log data.
//    */
//   logToConsole(data) {
//     if (!data || !data.type) {
//       const warningMessage = `[LogStreamHandler]: Received undefined or incomplete data: ${JSON.stringify(data)}`;
//       logger.warn(warningMessage);
//       if (this.enableConsoleLogging) {
//         logger.warn(warningMessage, data);
//       }
//       return;
//     }

//     let logMessage;
//     switch (data.type) {
//       case "error":
//         logMessage = `[LogStreamHandler]: ${data.message}`;
//         logger.error(logMessage);
//         break;
//       case "run_start":
//       case "run_end":
//         logMessage = `[LogStreamHandler]: ${JSON.stringify(data)}`;
//         logger.info(logMessage);
//         break;
//       case "token":
//         // log the accumulated response
//         this.loggerBuffer += data.content;
//         logMessage = `${this.loggerBuffer}`;
//         logger.info(logMessage);
//         // logMessage = `[LogStreamHandler]: ${data.content}`;
//         // logMessage = `${data.content}`;
//         // console.log(logMessage);
//         break;
//       case "end":
//         logMessage = `[LogStreamHandler]: ${data.message}`;
//         console.log(logMessage);
//         break;
//       default:
//         logMessage = `[LogStreamHandler]: Unknown log type: ${JSON.stringify(data)}`;
//         logger.warn(logMessage);
//     }

//     if (this.enableConsoleLogging) {
//       // clear last line
//       console.log("\x1B[1A\x1B[2K");
//       // log new line
//       console.log(logMessage);
//     }
//   }

//   /**
//    * Accumulates the response and emits an event for real-time processing.
//    * @param {string} token - The new token.
//    */
//   handleLLMNewToken(token) {
//     this.accumulatedResponse += token;
//     this.emit("token", token); // Emit event for potential real-time processing

//     const data = { type: "token", content: token };
//     this.sendData(data);
//     this.logToConsole(data);
//   }

//   /**
//    * Handles the start of a run by logging and sending relevant data.
//    * @param {Object} run - The run details.
//    */
//   handleRunStart(run) {
//     const logEntry = {
//       id: run.id,
//       name: run.name,
//       type: run.type,
//       tags: run.tags || [],
//       metadata: run.metadata || {},
//       start_time: this.startTime,
//       streamed_output: [],
//       streamed_output_str: []
//     };

//     this.logs.push(logEntry);

//     const data = { type: "run_start", data: logEntry };
//     this.sendData(data);
//     this.logToConsole(data);
//   }

//   /**
//    * Handles errors that occur during the run by logging and sending error data.
//    * @param {Error} error - The error object.
//    */
//   handleError(error) {
//     // Ensure that error is an instance of Error
//     if (!(error instanceof Error)) {
//       error = new Error("Unknown error occurred");
//     }

//     const data = { type: "error", message: error.message, stack: error.stack };
//     this.sendData(data);
//     this.logToConsole(data);
//     this.sendDone();
//     this.endStream("Error occurred");
//   }

//   /**
//    * Handles the completion of the run by logging, sending final data, and ending the stream.
//    * @param {string} finalOutput - The final output of the run.
//    */
//   handleRunEnd(finalOutput) {
//     const endTime = new Date().toISOString();
//     const latestLog = this.logs[this.logs.length - 1];

//     if (latestLog) {
//       latestLog.end_time = endTime;
//       latestLog.final_output = finalOutput;
//     }

//     const data = { type: "run_end", data: latestLog };
//     this.sendData(data);
//     this.logToConsole(data);

//     this.sendDone();
//     this.endStream("Run completed successfully");
//   }

//   /**
//    * Manually ends the stream with an optional message.
//    * @param {string} [message='Stream Ended'] - The reason for ending the stream.
//    */
//   endStream(message = "Stream Ended") {
//     if (this.isStreamEnded) return;
//     this.isStreamEnded = true;

//     const data = { type: "end", message };
//     this.sendData(data);
//     this.logToConsole(data);

//     this.sendDone();
//     this.res.end(() => {
//       console.log(`[LogStreamHandler][${this.clientId}]: Stream ended.`);
//       this.emit("end"); // Emit 'end' event for any listeners
//     });
//   }

//   /**
//    * Clears the accumulated response. Useful for resetting state if needed.
//    */
//   clearAccumulatedResponse() {
//     this.accumulatedResponse = "";
//   }

//   /**
//    * Retrieves the accumulated response.
//    * @returns {string} The accumulated response.
//    */
//   getAccumulatedResponse() {
//     return this.accumulatedResponse;
//   }
// }

// module.exports = {
//   LogStreamHandler
// };
