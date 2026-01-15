const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel
} = require('docx');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const paragraphStyleName = (stylesById, styleId) => {
  const s = stylesById.get(styleId);
  return s?.name || styleId || 'Body';
};

const isHeadingLike = (name) => /chapter|heading|title/i.test(String(name || ''));

async function exportDocxInDesignSafe({ manuscript, styles, outputDir }) {
  ensureDir(outputDir);
  const stylesById = new Map(styles.map((s) => [s.id, s]));

  const docParagraphs = [];
  (manuscript.chapters || [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .forEach((chapter) => {
      docParagraphs.push(
        new Paragraph({
          text: chapter.title || '',
          heading: HeadingLevel.HEADING_1
        })
      );
      if (chapter.subtitle) {
        docParagraphs.push(
          new Paragraph({
            children: [new TextRun({ text: chapter.subtitle, italics: true })]
          })
        );
      }

      (chapter.blocks || []).forEach((block) => {
        const styleName = paragraphStyleName(stylesById, block.styleId);
        const runs = [];

        // Render character spans into basic formatting hints (best-effort).
        const text = String(block.text || '');
        const spans = (block.spans || [])
          .filter((s) => s && typeof s.start === 'number' && typeof s.end === 'number')
          .sort((a, b) => a.start - b.start);

        let cursor = 0;
        spans.forEach((span) => {
          if (span.start < cursor) return;
          if (span.start > cursor) {
            runs.push(new TextRun(text.slice(cursor, span.start)));
          }
          const style = stylesById.get(span.styleId);
          const name = style?.name || '';
          runs.push(
            new TextRun({
              text: text.slice(span.start, span.end),
              bold: /bold/i.test(name),
              italics: /italic/i.test(name),
              smallCaps: /small\s*caps/i.test(name)
            })
          );
          cursor = span.end;
        });
        if (cursor < text.length) {
          runs.push(new TextRun(text.slice(cursor)));
        }

        docParagraphs.push(
          new Paragraph({
            heading: isHeadingLike(styleName) ? HeadingLevel.HEADING_2 : undefined,
            children: runs.length ? runs : [new TextRun(text)]
          })
        );
      });
    });

  const doc = new Document({
    sections: [{ children: docParagraphs }]
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(outputDir, `${manuscript.id}.docx`);
  fs.writeFileSync(outPath, buffer);
  return { path: outPath };
}

module.exports = { exportDocxInDesignSafe };

