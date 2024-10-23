const bufferUtils = require("./buffer");
const chunkUtils = require("./chunk");
const cleanUtils = require("./clean");
const documentUtils = require("./documents");
const downloadUtils = require("./download");
const encodingUtils = require("./encoding");
const extractUtils = require("./extract");
const fileUtils = require("./files");
const formatUtils = require("./format");
const httpUtils = require("./http");
const identifyUtils = require("./identifyValue");
const loggingUtils = require("./loggingFunctions");
const mainUtils = require("./main");
const metadataUtils = require("./metadata");
const miscUtils = require("./misc");
const parseUtils = require("./parse");
const pdfUtils = require("./pdf");
const stringUtils = require("./string");
const scrape2Utils = require("./scrape2");
const scrapeFunctionUtils = require("./scrapeFunctions");
const textUtils = require("./text");
const vectorizeUtils = require("./vectorize");

module.exports = {
  ...bufferUtils,
  ...chunkUtils,
  ...cleanUtils,
  ...documentUtils,
  ...downloadUtils,
  ...encodingUtils,
  ...extractUtils,
  ...fileUtils,
  ...formatUtils,
  ...httpUtils,
  ...identifyUtils,
  ...mainUtils,
  ...metadataUtils,
  ...miscUtils,
  ...parseUtils,
  ...pdfUtils,
  ...stringUtils,
  ...scrape2Utils,
  ...scrapeFunctionUtils,
  ...textUtils,
  ...vectorizeUtils,
  ...loggingUtils
};

// module.exports = {
//   ...require("./buffer"),
//   ...require("./chunk"),
//   ...require("./clean"),
//   ...require("./documents"),
//   ...require("./download"),
//   ...require("./encoding"),
//   ...require("./extract"),
//   ...require("./files"),
//   ...require("./format"),
//   ...require("./http"),
//   ...require("./identifyValue"),
//   ...require("./loggingFunctions"),
//   ...require("./main"),
//   ...require("./metadata"),
//   ...require("./misc"),
//   ...require("./parse"),
//   ...require("./pdf"),
//   ...require("./string"),
//   ...require("./scrape2"),
//   ...require("./scrapeFunctions"),
//   ...require("./text"),
//   ...require("./vectorize")
// };
