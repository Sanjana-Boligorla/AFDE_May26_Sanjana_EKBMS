/**
 * JSON Extractor
 * Reads articles_dataset.json (or any uploaded JSON) and returns
 * an array of raw article objects.
 * Supports two shapes:
 *   { articles: [...] }   -- nested
 *   [...]                 -- bare array
 */
const fs   = require('fs');
const path = require('path');

/**
 * @param {string} filePath  Absolute path to the JSON file
 * @param {object} logger    { log(level, msg, meta) }
 * @returns {Array<object>}  Raw article objects
 */
function extractJSON(filePath, logger) {
  logger.log('info', `JSON extractor: reading ${path.basename(filePath)}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`JSON file not found: ${filePath}`);
  }

  const raw  = fs.readFileSync(filePath, 'utf8');
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON: ${e.message}`);
  }

  const rows = Array.isArray(parsed)
    ? parsed
    : (Array.isArray(parsed.articles) ? parsed.articles : null);

  if (!rows) {
    throw new Error('JSON must be an array or have an "articles" array at the root');
  }

  logger.log('info', `JSON extractor: parsed ${rows.length} records`);
  return rows;
}

module.exports = { extractJSON };
