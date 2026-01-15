const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: false
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  format: false
});

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'idml-rt-'));

const listStoryFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.xml'));
};

const collectParagraphRanges = (node, results = []) => {
  if (!node) return results;
  if (Array.isArray(node)) {
    node.forEach((item) => collectParagraphRanges(item, results));
    return results;
  }
  if (node.ParagraphStyleRange) {
    const ranges = Array.isArray(node.ParagraphStyleRange)
      ? node.ParagraphStyleRange
      : [node.ParagraphStyleRange];
    ranges.forEach((r) => results.push(r));
  }
  if (node.ParagraphRange) {
    const ranges = Array.isArray(node.ParagraphRange)
      ? node.ParagraphRange
      : [node.ParagraphRange];
    ranges.forEach((r) => results.push(r));
  }
  Object.values(node).forEach((value) => {
    if (typeof value === 'object') collectParagraphRanges(value, results);
  });
  return results;
};

const styleNameById = (styles, styleId) => {
  const s = styles.find((x) => x.id === styleId);
  return s?.name || null;
};

const appliedParagraphStyleFromName = (name) => {
  // Keep InDesign naming; do not rename. IDML typically uses "ParagraphStyle/<Name>"
  return name ? `ParagraphStyle/${name}` : null;
};

// Round-trip approach:
// - unzip original IDML
// - for each paragraph range, update ONLY the text content and (optionally) AppliedParagraphStyle if changed
// - keep all other XML intact to preserve layout/resources/spreads/stable IDs
async function exportIdmlRoundTrip({
  manuscript,
  styles,
  sourceIdmlPath,
  outputDir
}) {
  ensureDir(outputDir);
  if (!sourceIdmlPath || !fs.existsSync(sourceIdmlPath)) {
    throw new Error('sourceIdmlPath is required for round-trip export');
  }

  // Build lookup: storyId + rangeIndex → block
  const blocks = [];
  (manuscript.chapters || []).forEach((ch) => {
    (ch.blocks || []).forEach((b) => blocks.push({ chapterId: ch.id, ...b }));
  });
  const byKey = new Map();
  blocks.forEach((b) => {
    const meta = b?.properties?.idml;
    if (!meta) return;
    byKey.set(`${meta.storyId}:${meta.rangeIndex}`, b);
  });

  const zip = new AdmZip(sourceIdmlPath);
  const temp = tmpDir();
  zip.extractAllTo(temp, true);

  const storiesDir = path.join(temp, 'Stories');
  const storyFiles = listStoryFiles(storiesDir);
  storyFiles.forEach((file) => {
    const storyId = file.replace('.xml', '');
    const filePath = path.join(storiesDir, file);
    const xml = fs.readFileSync(filePath, 'utf-8');
    const parsed = parser.parse(xml);
    const ranges = collectParagraphRanges(parsed);

    ranges.forEach((range, idx) => {
      const key = `${storyId}:${idx}`;
      const block = byKey.get(key);
      if (!block) return;

      // Update paragraph style only if user changed styleId and we can map it back to a style name.
      const name = styleNameById(styles, block.styleId);
      const applied = appliedParagraphStyleFromName(name);
      if (applied) {
        range['@_AppliedParagraphStyle'] = applied;
      }

      // Replace content text. Keep structure simple: set Content string.
      // NOTE: This preserves the paragraph style; character spans round-trip is complex and is next increment.
      range.Content = block.text;
    });

    const rebuilt = builder.build(parsed);
    fs.writeFileSync(filePath, rebuilt, 'utf-8');
  });

  const outPath = path.join(outputDir, `${manuscript.id}-roundtrip.idml`);
  const outZip = new AdmZip();
  outZip.addLocalFolder(temp);
  outZip.writeZip(outPath);
  fs.rmSync(temp, { recursive: true, force: true });

  return {
    path: outPath,
    warnings: [
      'Round-trip export currently preserves paragraph styles + layout by patching story text in-place.',
      'Character-style spans round-trip is not yet implemented (next increment).'
    ]
  };
}

module.exports = { exportIdmlRoundTrip };

