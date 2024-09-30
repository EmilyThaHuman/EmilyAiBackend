const ALLOWED_FILE_TYPES = [
  'application/json',
  'text/plain',
  'text/javascript',
  'application/javascript',
  'text/jsx',
  'image/png',
  'image/jpeg',
  'image/gif',
];
const SUPPORTED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
  'audio/wav',
  'audio/mp3',
  'audio/aiff',
  'audio/aac',
  'audio/ogg',
  'audio/flac',
  'video/mp4',
  'video/mpeg',
  'video/mov',
  'video/avi',
  'video/x-flv',
  'video/mpg',
  'video/webm',
  'video/wmv',
  'video/3gpp',
]);

module.exports = {
  ALLOWED_FILE_TYPES,
  SUPPORTED_MIME_TYPES,
};
