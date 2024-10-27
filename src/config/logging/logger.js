require("colors");
require("winston-daily-rotate-file");
const path = require("path");
const winston = require("winston");
const { format, transports, createLogger, config } = winston;
const { combine, timestamp, printf, colorize } = format;
const { format: dateFormat } = require("date-fns");

const timestampFormat = () => dateFormat(new Date(), "HH:mm");
const capitalizeLevels = format((info) => {
  info.level = info.level.toUpperCase();
  return info;
})();
const logFilter = (level) => {
  return format((info) => {
    if (info.level === level) {
      return info;
    }
  })();
};
const consoleFormat = combine(
  timestamp({ format: timestampFormat }),
  capitalizeLevels,
  colorize(),
  printf((info) => `[${info.level}][${info.timestamp}] ${info.message}`)
);
const consoleTransport = new transports.Console({
  format: consoleFormat
});
const createDailyRotateFileTransport = (level) => {
  return new transports.DailyRotateFile({
    level: level,
    filename: path.join(__dirname, "..", "..", "..", "logs", `${level}`, `${level}-%DATE%.log`),
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "14d",
    format: combine(
      timestamp({ format: timestampFormat }),
      logFilter(level),
      printf((info) => `[${info.level}][${info.timestamp}] ${info.message}`)
    )
  });
};

const logger = createLogger({
  levels: config.npm.levels,
  transports: [
    consoleTransport,
    ...Object.keys(config.npm.levels).map((level) => createDailyRotateFileTransport(level))
  ],
  exitOnError: false
});

logger.setMaxListeners(500);
module.exports.logger = logger;
module.exports = {
  logger
};
