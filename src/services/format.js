// formattingService.js
const prettier = require("prettier");
const { ESLint } = require("eslint");
const beautify = require("js-beautify").js;
const MarkdownIt = require("markdown-it");
const Cite = require("citation-js");
const PDFDocument = require("pdfkit");
const fs = require("fs");

const md = new MarkdownIt();
const eslint = new ESLint();

async function formatJavaScript(code, method = "prettier") {
  switch (method) {
    case "prettier":
      return prettier.format(code, { parser: "babel" });
    case "eslint":
      const results = await eslint.lintText(code);
      // Handle ESLint results as needed
      return results;
    case "beautify":
      return beautify(code, { indent_size: 2, space_in_empty_paren: true });
    default:
      return code;
  }
}

function formatMarkdown(markdownText) {
  return md.render(markdownText);
}

function formatCitation(citationData, format = "bibtex") {
  const cite = new Cite(citationData);
  return cite.format(format);
}

function createPDF(content, outputPath) {
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(outputPath));
  doc.text(content);
  doc.end();
}

module.exports = {
  formatJavaScript,
  formatMarkdown,
  formatCitation,
  createPDF
};
