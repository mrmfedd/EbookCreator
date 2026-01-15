const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun } = require('docx');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const buildParagraphs = (content) => {
  return content.map((para) => {
    return new Paragraph({
      children: [new TextRun(para.text || '')]
    });
  });
};

const exportDocx = async ({ outputDir, fileName, content }) => {
  ensureDir(outputDir);
  const doc = new Document({
    sections: [
      {
        children: buildParagraphs(content.paragraphs || [])
      }
    ]
  });
  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(outputDir, `${fileName}.docx`);
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
};

const exportEpub = async ({ outputDir, fileName }) => {
  ensureDir(outputDir);
  const outputPath = path.join(outputDir, `${fileName}.epub`);
  fs.writeFileSync(outputPath, Buffer.from('EPUB export stub'));
  return outputPath;
};

const exportPdf = async ({ outputDir, fileName }) => {
  ensureDir(outputDir);
  const outputPath = path.join(outputDir, `${fileName}.pdf`);
  fs.writeFileSync(outputPath, Buffer.from('PDF export stub'));
  return outputPath;
};

const exportIdml = async ({ outputDir, fileName }) => {
  ensureDir(outputDir);
  const outputPath = path.join(outputDir, `${fileName}.idml`);
  fs.writeFileSync(outputPath, Buffer.from('IDML export stub'));
  return outputPath;
};

module.exports = {
  exportDocx,
  exportEpub,
  exportPdf,
  exportIdml
};
