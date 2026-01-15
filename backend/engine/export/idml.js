const fs = require('fs');
const path = require('path');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

// NOTE: True round-trip safe IDML requires reconstructing the full IDML package:
// designmap.xml, spreads, stories, resources, style definitions, and IDs matching InDesign expectations.
// This is a complex format and needs a dedicated implementation with strict fidelity tests.
async function exportIdmlStub({ manuscript, outputDir }) {
  ensureDir(outputDir);
  const outPath = path.join(outputDir, `${manuscript.id}.idml`);
  fs.writeFileSync(
    outPath,
    Buffer.from(
      'IDML export is not implemented yet. This file is a placeholder.\n'
    )
  );
  return {
    path: outPath,
    warnings: [
      'IDML export is currently a placeholder. Round-trip safe IDML requires a full IDML package writer.'
    ]
  };
}

module.exports = { exportIdmlStub };

