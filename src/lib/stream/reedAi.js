/**
 * Create a new stream of server-sent events.
 *
 * @param {object} config
 * @param {string} config.url The URL to connect to.
 * @param {typeof fetch} [config.fetch] The URL to connect to.
 * @param {object} [config.options] The EventSource options.
 * @param {boolean} [config.options.useFileOutput] Whether to use the file output stream.
 * @returns {ReadableStream<ServerSentEvent> & AsyncIterable<ServerSentEvent>}
 */
function createReadableStream({ url, fetch, options = {} }) {
  return new ReadableStream({
    async start(controller) {
      controller.close();
    }
  });
}

export { createReadableStream };
