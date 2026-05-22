/**
 * CSV Extractor
 * Reads articles_dataset.csv (or any uploaded CSV) and returns
 * an array of raw row objects.
 */
const fs   = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

/**
 * @param {string} filePath  Absolute path to the CSV file
 * @param {object} logger    { log(level, msg, meta) }
 * @returns {Array<object>}  Raw parsed rows
 */
function extractCSV(filePath, logger) {
  logger.log('info', `CSV extractor: reading ${path.basename(filePath)}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');

  const rows = parse(raw, {
    columns:          true,
    skip_empty_lines: true,
    trim:             true,
    bom:              true,
  });

  logger.log('info', `CSV extractor: parsed ${rows.length} rows`);
  return rows;
}

module.exports = { extractCSV };
