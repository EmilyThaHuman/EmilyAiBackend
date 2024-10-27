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
