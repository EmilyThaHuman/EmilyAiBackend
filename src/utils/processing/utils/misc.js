const getLibraryNameAbbreviation = (fullName) => {
  // Use a regular expression to match the abbreviation within parentheses
  const match = fullName.match(/\(([^)]+)\)/);

  // Check if a match was found and return the abbreviation or an error message
  return match ? match[1] : "No abbreviation found";
};

module.exports = {
  getLibraryNameAbbreviation
};
