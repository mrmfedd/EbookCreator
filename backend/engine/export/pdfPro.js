const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const { KDP_PRESETS } = require('../render/print');
const { wrapParagraph, shouldMoveParagraphToNextPage } = require('./pagination');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const ptPerIn = 72;

const getPageSpec = ({ preset = '6x9' }) => {
  const size = KDP_PRESETS[preset] || KDP_PRESETS['6x9'];
  return {
    preset,
    width: size.w * ptPerIn,
    height: size.h * ptPerIn
  };
};

// “Proper” pagination: deterministic line-breaking + mirrored margins + widow/orphan rules + chapter breaks.
async function exportPrintPdfPro({ manuscript, outputDir, options = {} }) {
  ensureDir(outputDir);

  const { preset, width, height } = getPageSpec({ preset: options.preset || '6x9' });
  const mirrorMargins = options.mirrorMargins !== false;
  const hyphenate = options.hyphenate !== false;
  const widows = options.widows ?? 2;
  const orphans = options.orphans ?? 2;

  // Basic KDP-like margins (in points)
  const marginTop = 0.75 * ptPerIn;
  const marginBottom = 0.75 * ptPerIn;
  const marginInner = 0.9 * ptPerIn;
  const marginOuter = 0.7 * ptPerIn;

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await doc.embedFont(StandardFonts.TimesRomanBold);

  const fontSize = 11;
  const titleSize = 18;
  const leading = 14;
  const paragraphGap = 8;

  let pageIndex = 0; // 0-based
  let page = null;
  let y = 0;

  const startPage = () => {
    page = doc.addPage([width, height]);
    pageIndex += 1;
    y = height - marginTop;
  };

  const marginsForPage = () => {
    if (!mirrorMargins) {
      return { left: marginOuter, right: marginOuter };
    }
    // Page 1 is right-hand (odd) in print, but our pageIndex increments after startPage().
    const isRight = pageIndex % 2 === 1;
    return isRight
      ? { left: marginInner, right: marginOuter }
      : { left: marginOuter, right: marginInner };
  };

  const remainingLines = () => {
    const usable = y - marginBottom;
    return Math.floor(usable / leading);
  };

  const drawLine = (text, fnt, sizePt) => {
    const { left } = marginsForPage();
    page.drawText(text, { x: left, y, size: sizePt, font: fnt });
    y -= sizePt === titleSize ? (titleSize + 4) : leading;
  };

  const ensureSpace = (linesNeeded) => {
    if (!page) startPage();
    if (remainingLines() < linesNeeded) startPage();
  };

  const maxWidth = () => {
    const { left, right } = marginsForPage();
    return width - left - right;
  };

  const chapters = (manuscript.chapters || [])
    .slice()
    .sort((a, b) => a.order - b.order);

  chapters.forEach((chapter, idx) => {
    // Chapter page break
    startPage();

    // Title centered-ish (simple)
    const titleLines = wrapParagraph({
      text: chapter.title || `Chapter ${idx + 1}`,
      font: fontBold,
      fontSize: titleSize,
      maxWidth: maxWidth(),
      hyphenate
    });
    titleLines.forEach((ln) => drawLine(ln, fontBold, titleSize));
    y -= 10;

    (chapter.blocks || []).forEach((block) => {
      const lines = wrapParagraph({
        text: block.text || '',
        font,
        fontSize,
        maxWidth: maxWidth(),
        hyphenate
      });

      if (
        shouldMoveParagraphToNextPage({
          remainingLinesOnPage: remainingLines(),
          paragraphLineCount: lines.length,
          minLinesAtBottom: orphans,
          minLinesAtTop: widows
        })
      ) {
        startPage();
      }

      // Render lines, splitting across pages if needed, with widow/orphan constraint
      let i = 0;
      while (i < lines.length) {
        if (remainingLines() === 0) startPage();
        const space = remainingLines();
        // If we are about to split but next page would get too few lines, move now.
        const remaining = lines.length - i;
        if (space < remaining && remaining - space < widows) {
          startPage();
          continue;
        }
        const take = Math.min(space, remaining);
        for (let j = 0; j < take; j++) {
          drawLine(lines[i + j], font, fontSize);
        }
        i += take;
      }

      y -= paragraphGap;
    });
  });

  const pdfBytes = await doc.save();
  const outPath = path.join(outputDir, `${manuscript.id}-${preset}-pro.pdf`);
  fs.writeFileSync(outPath, pdfBytes);
  return { path: outPath, preset };
}

module.exports = { exportPrintPdfPro };

