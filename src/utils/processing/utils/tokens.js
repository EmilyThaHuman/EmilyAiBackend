function countTokens(text) {
  return encode(text).length;
}

function tokenizeText(text) {
  return text.split(/\s+/);
}
