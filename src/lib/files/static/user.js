const fs = require("fs");
const path = require("path");

const defaultFileDirectory = path.join(__dirname, "defaultFiles");

const initialUserFiles = [
  {
    name: "defaultText.txt",
    path: path.join(defaultFileDirectory, "defaultText.txt"),
    content: fs.readFileSync(path.join(__dirname, "defaultFiles", "defaultText.txt"), "utf8")
  },
  {
    name: "defaultPng.png",
    path: path.join(defaultFileDirectory, "defaultPng.png"),
    content: fs.readFileSync(path.join(__dirname, "defaultFiles", "defaultPng.png"), "base64")
  },
  {
    name: "defaultPdf.pdf",
    path: path.join(defaultFileDirectory, "defaultPdf.pdf"),
    content: fs.readFileSync(path.join(__dirname, "defaultFiles", "defaultPdf.pdf"), "base64")
  },
  {
    name: "defaultJs.js",
    path: path.join(defaultFileDirectory, "defaultJs.js"),
    content: fs.readFileSync(path.join(__dirname, "defaultFiles", "defaultJs.js"), "utf8")
  },
  {
    name: "defaultJson.json",
    path: path.join(defaultFileDirectory, "defaultJson.json"),
    content: fs.readFileSync(path.join(__dirname, "defaultFiles", "defaultJson.json"), "utf8")
  },
  {
    name: "defaultHtml.html",
    path: path.join(defaultFileDirectory, "defaultHtml.html"),
    content: fs.readFileSync(path.join(__dirname, "defaultFiles", "defaultHtml.html"), "utf8")
  }
  // Add more default files as needed
];

module.exports = {
  defaultFileDirectory,
  initialUserFiles
};
