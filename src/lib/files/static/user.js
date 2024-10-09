const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const File = require('./models/File'); // Adjust the path to your File model

// const defaultFileDirectory = path.join(__dirname, 'uploads');
// This is where the default files will be stored.
const defaultFileDirectory = path.join(__dirname, 'defaultFiles');
const initialUserFiles = [
  {
    name: 'defaultText.txt',
    path: path.join(defaultFileDirectory, 'defaultText.txt'),
    content: fs.readFileSync(path.join(__dirname, 'defaultFiles', 'defaultText.txt'), 'utf8'),
  },
  {
    name: 'defaultPng.png',
    path: path.join(defaultFileDirectory, 'defaultPng.png'),
    content: fs.readFileSync(path.join(__dirname, 'defaultFiles', 'defaultPng.png'), 'base64'),
  },
  {
    name: 'defaultPdf.pdf',
    path: path.join(defaultFileDirectory, 'defaultPdf.pdf'),
    content: fs.readFileSync(path.join(__dirname, 'defaultFiles', 'defaultPdf.pdf'), 'base64'),
  },
  {
    name: 'defaultJs.js',
    path: path.join(defaultFileDirectory, 'defaultJs.js'),
    content: fs.readFileSync(path.join(__dirname, 'defaultFiles', 'defaultJs.js'), 'utf8'),
  },
  {
    name: 'defaultJson.json',
    path: path.join(defaultFileDirectory, 'defaultJson.json'),
    content: fs.readFileSync(path.join(__dirname, 'defaultFiles', 'defaultJson.json'), 'utf8'),
  },
  // Add more default files as needed
];

const filesToInsert = initialUserFiles.reduce((accumulator, file) => {
  const fileExtension = path.extname(file.name).substring(1).toLowerCase();
  const allowedTypes = [
    'txt',
    'pdf',
    'doc',
    'docx',
    'md',
    'html',
    'json',
    'csv',
    'tsv',
    'jsx',
    'js',
    'png',
    'jpg',
    'jpeg',
    'gif',
  ];

  if (!allowedTypes.includes(fileExtension)) {
    console.warn(`Skipping unsupported file type: .${fileExtension}`);
    return accumulator;
  }

  const mimeTypes = {
    txt: 'text/plain',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    md: 'text/markdown',
    html: 'text/html',
    json: 'application/json',
    csv: 'text/csv',
    tsv: 'text/tab-separated-values',
    jsx: 'text/jsx',
    js: 'application/javascript',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
  };
  const mimeType = mimeTypes[fileExtension] || 'application/octet-stream';

  // Get file stats
  const fileStats = fs.statSync(file.path);
  const fileSize = fileStats.size;

  // Read the raw data of the file
  const fileData = fs.readFileSync(file.path);

  const mappedFile = new File({
    _id: new mongoose.Types.ObjectId(),
    name: file.name,
    path: file.path,
    content: fileData,
    size: fileSize,
    type: mimeType,

    originalFileType: fileExtension,
    space: 'files', // Adjust as needed
    metadata: {
      fileSize: fileSize,
      fileType: fileExtension,
      lastModified: fileStats.mtime,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    __v: 0,
  });

  accumulator.push(mappedFile);
  return accumulator;
}, []);

const defaultFiles = [];

module.exports = {
  defaultFileDirectory,
  initialUserFiles,
  defaultFiles,
};
