/**
 * Formats a date input to a string representation in Seattle time (Pacific Time Zone).
 * @param {string|number|Date} input - The date to format. Can be a string (parseable by Date constructor), a number (milliseconds since epoch), or a Date object.
 * @returns {string} A string representation of the date in the format "Month Day, Year" in Seattle time.
 */
const formatDate = (input) => {
  if (typeof input === "string" || typeof input === "number" || input instanceof Date) {
    let date;
    if (typeof input === "string") {
      date = new Date(input);
    } else if (typeof input === "number") {
      date = new Date(input);
    } else {
      date = input;
    }

    // Convert date to seattle time dd:mm:yyyy
    const seattleTime = date.toLocaleString("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    return seattleTime;
  }
};

/**
 * Returns the current date formatted for the Seattle (Pacific) time zone.
 * @returns {string} A string representing the current date in the format "Month Day, Year" in the America/Los_Angeles time zone.
 */
const getFormattedNow = () => {
  const now = new Date();
  const seattleTime = now.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  return seattleTime;
};

module.exports = {
  formatDate,
  getFormattedNow
};
