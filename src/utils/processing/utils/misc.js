/**
 * Extracts the library name abbreviation from a full name string.
 * @param {string} fullName - The full name of the library, potentially containing an abbreviation in parentheses.
 * @returns {string} The extracted abbreviation or an error message if no abbreviation is found.
 */
const getLibraryNameAbbreviation = (fullName) => {
  // Use a regular expression to match the abbreviation within parentheses
  const match = fullName.match(/\(([^)]+)\)/);

  // Check if a match was found and return the abbreviation or an error message
  return match ? match[1] : "No abbreviation found";
};

module.exports = {
  getLibraryNameAbbreviation
};
