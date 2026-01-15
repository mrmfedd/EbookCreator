const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const { KDP_PRESETS } = require('../render/print');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

// NOTE: This is a basic PDF generator (text only). True KDP-grade layout is Phase 4/5 hardening.
async function exportPrintPdf({ manuscript, outputDir, options = {} }) {
  ensureDir(outputDir);
  const preset = options.preset || '6x9';
  const size = KDP_PRESETS[preset] || KDP_PRESETS['6x9'];

  const ptPerIn = 72;
  const pageW = size.w * ptPerIn;
  const pageH = size.h * ptPerIn;

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await doc.embedFont(StandardFonts.TimesRomanBold);

  const margin = 54; // 0.75in
  const lineHeight = 14;
  const maxWidth = pageW - margin * 2;
  const maxY = pageH - margin;

  const wrap = (text, fnt, sizePt) => {
    const words = String(text || '').split(/\s+/);
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      const width = fnt.widthOfTextAtSize(test, sizePt);
      if (width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  const chapters = (manuscript.chapters || []).slice().sort((a, b) => a.order - b.order);
  chapters.forEach((chapter, idx) => {
    let page = doc.addPage([pageW, pageH]);
    let y = maxY;

    const titleLines = wrap(chapter.title || `Chapter ${idx + 1}`, fontBold, 18);
    titleLines.forEach((ln) => {
      page.drawText(ln, { x: margin, y, size: 18, font: fontBold });
      y -= 22;
    });
    y -= 10;

    (chapter.blocks || []).forEach((block) => {
      const lines = wrap(block.text || '', font, 11);
      lines.forEach((ln) => {
        if (y < margin + lineHeight) {
          page = doc.addPage([pageW, pageH]);
          y = maxY;
        }
        page.drawText(ln, { x: margin, y, size: 11, font });
        y -= lineHeight;
      });
      y -= 8;
    });
  });

  const pdfBytes = await doc.save();
  const outPath = path.join(outputDir, `${manuscript.id}-${preset}.pdf`);
  fs.writeFileSync(outPath, pdfBytes);
  return { path: outPath, preset };
}

module.exports = { exportPrintPdf };

