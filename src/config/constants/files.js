const ALLOWED_FILE_TYPES = [
  "application/json",
  "text/plain",
  "text/javascript",
  "application/javascript",
  "text/jsx",
  "image/png",
  "image/jpeg",
  "image/gif"
];
const SUPPORTED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
  "audio/wav",
  "audio/mp3",
  "audio/aiff",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
  "video/mp4",
  "video/mpeg",
  "video/mov",
  "video/avi",
  "video/x-flv",
  "video/mpg",
  "video/webm",
  "video/wmv",
  "video/3gpp"
]);
const ALLOWED_FILE_TYPES_ABBR = [
  "txt",
  "pdf",
  "doc",
  "docx",
  "md",
  "html",
  "json",
  "csv",
  "tsv",
  "jsx",
  "js",
  "png",
  "jpg",
  "jpeg",
  "gif"
];

const SUPPORTED_MIME_TYPES_ABBR = {
  txt: "text/plain",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  md: "text/markdown",
  html: "text/html",
  json: "application/json",
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  jsx: "text/jsx",
  js: "application/javascript",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif"
};

module.exports = {
  ALLOWED_FILE_TYPES,
  SUPPORTED_MIME_TYPES,
  ALLOWED_FILE_TYPES_ABBR,
  SUPPORTED_MIME_TYPES_ABBR
};
