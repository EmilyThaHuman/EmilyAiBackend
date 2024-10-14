const kafka = require("kafka-node");
const { connectDB } = require("./connect");
const { logger } = require("@config/logging");

/**
 * Initialize Kafka client and producer
 */
const kafkaClient = new kafka.KafkaClient({ kafkaHost: "localhost:9092" });
const producer = new kafka.Producer(kafkaClient);

/**
 * Set up MongoDB Change Stream for the messages collection
 * and publish changes to a Kafka topic.
 */
const initializeChangeStream = async () => {
  try {
    // Connect to MongoDB
    const { db } = await connectDB();

    // Define the collection to watch
    const chatCollection = db.collection("messages");

    // Initialize the Change Stream
    const changeStream = chatCollection.watch();

    // Handle Change Stream events
    changeStream.on("change", (change) => {
      logger.info(`Change detected in MongoDB: ${JSON.stringify(change)}`);

      // Only handle inserts (e.g., new messages)
      if (change.operationType === "insert") {
        const message = change.fullDocument;

        // Prepare Kafka payload
        const payload = [{ topic: "chat-messages", messages: JSON.stringify(message) }];

        // Send the message to Kafka topic
        producer.send(payload, (err, data) => {
          if (err) {
            logger.error(`Error sending message to Kafka: ${err.message}`);
          } else {
            logger.info(`Message sent to Kafka: ${JSON.stringify(data)}`);
          }
        });
      }
    });

    logger.info("MongoDB Change Stream initialized");
  } catch (error) {
    logger.error(`Error initializing Change Stream: ${error.message}`);
    throw error;
  }
};

/**
 * Start the stream processor instance
 */
const startStreamProcessor = () => {
  producer.on("ready", async () => {
    logger.info("Kafka Producer is ready");
    await initializeChangeStream();
  });

  producer.on("error", (err) => {
    logger.error(`Kafka Producer error: ${err.message}`);
  });
};

module.exports = {
  startStreamProcessor
};
