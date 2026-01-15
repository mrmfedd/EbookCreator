const fs = require('fs');
const AdmZip = require('adm-zip');

const validateEpub = (epubPath) => {
  const warnings = [];
  const errors = [];
  if (!fs.existsSync(epubPath)) {
    return { errors: ['EPUB file not found'], warnings };
  }
  const zip = new AdmZip(epubPath);
  const entries = zip.getEntries().map((e) => e.entryName);

  const has = (name) => entries.includes(name);

  if (!has('mimetype')) errors.push('Missing mimetype');
  if (!has('META-INF/container.xml')) errors.push('Missing META-INF/container.xml');
  if (!has('OEBPS/package.opf')) errors.push('Missing OEBPS/package.opf');
  if (!has('OEBPS/nav.xhtml')) errors.push('Missing OEBPS/nav.xhtml');
  if (!has('OEBPS/content.xhtml')) errors.push('Missing OEBPS/content.xhtml');
  if (!has('OEBPS/styles.css')) warnings.push('Missing OEBPS/styles.css');

  try {
    const mimeEntry = zip.getEntry('mimetype');
    const mime = mimeEntry ? mimeEntry.getData().toString('utf-8') : '';
    if (mime.trim() !== 'application/epub+zip') {
      errors.push('Invalid mimetype contents');
    }
  } catch {
    errors.push('Could not read mimetype');
  }

  return { errors, warnings };
};

module.exports = { validateEpub };

