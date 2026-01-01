const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } = require('docx');
const puppeteer = require('puppeteer');
const Epub = require('epub-gen');
const fs = require('fs-extra');
const path = require('path');

class Exporter {
  constructor() {
    this.outputDir = path.join(__dirname, '../output');
    fs.ensureDirSync(this.outputDir);
  }

  async exportDocument(formattedContent, preferences, format) {
    switch (format.toLowerCase()) {
      case 'docx':
        return await this.exportDocx(formattedContent, preferences);
      case 'pdf':
        return await this.exportPdf(formattedContent, preferences);
      case 'epub':
        return await this.exportEpub(formattedContent, preferences);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  async exportDocx(formattedContent, preferences) {
    const children = [];

    formattedContent.chapters.forEach((chapter, chapterIndex) => {
      // Chapter title
      children.push(
        new Paragraph({
          children: [new TextRun(chapter.title)],
          heading: HeadingLevel.TITLE,
          spacing: { after: 400, before: 600 },
          alignment: AlignmentType.CENTER
        })
      );

      chapter.sections.forEach(section => {
        // Section header
        if (section.header) {
          children.push(
            new Paragraph({
              children: [new TextRun(section.header)],
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 300, before: 400 }
            })
          );
        }

        // Subsections
        if (section.subsections && section.subsections.length > 0) {
          section.subsections.forEach(subsection => {
            if (subsection.subheader) {
              children.push(
                new Paragraph({
                  text: subsection.subheader,
                  heading: HeadingLevel.HEADING_2,
                  spacing: { after: 200, before: 300 }
                })
              );
            }

            subsection.content.forEach(para => {
              children.push(
                new Paragraph({
                  text: para,
                  spacing: { after: 200 },
                  indent: preferences.indentFirstLine ? { firstLine: 288 } : {}
                })
              );
            });
          });
        }

        // Direct content
        if (section.content && section.content.length > 0) {
          section.content.forEach(para => {
            children.push(
              new Paragraph({
                children: [new TextRun(para)],
                spacing: { after: 200 },
                indent: preferences.indentFirstLine ? { firstLine: 288 } : {},
                alignment: AlignmentType.JUSTIFIED
              })
            );
          });
        }
      });

      // Lists
      if (chapter.lists) {
        chapter.lists.forEach(list => {
          list.items.forEach((item, index) => {
            const prefix = list.type === 'numbered' ? `${index + 1}. ` : '• ';
            children.push(
              new Paragraph({
                children: [new TextRun(prefix + item)],
                spacing: { after: 100 },
                indent: { left: 360 }
              })
            );
          });
        });
      }
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: children
      }]
    });

    const filename = `manuscript-${Date.now()}.docx`;
    const filepath = path.join(this.outputDir, filename);

    const buffer = await Packer.toBuffer(doc);
    await fs.writeFile(filepath, buffer);

    return filename;
  }

  async exportPdf(formattedContent, preferences) {
    const html = this.generateHtml(formattedContent, preferences);
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const filename = `manuscript-${Date.now()}.pdf`;
      const filepath = path.join(this.outputDir, filename);

      const styles = this.getPdfStyles(preferences);
      
      const trimSize = this.getTrimSizeForPuppeteer(preferences.trimSize);
      
      await page.pdf({
        path: filepath,
        format: trimSize,
        margin: styles.margin,
        printBackground: true
      });

      return filename;
    } finally {
      await browser.close();
    }
  }

  async exportEpub(formattedContent, preferences) {
    const content = [];

    formattedContent.chapters.forEach((chapter, index) => {
      let html = `<h1>${chapter.title}</h1>`;

      chapter.sections.forEach(section => {
        if (section.header) {
          html += `<h2>${section.header}</h2>`;
        }

        if (section.subsections && section.subsections.length > 0) {
          section.subsections.forEach(subsection => {
            if (subsection.subheader) {
              html += `<h3>${subsection.subheader}</h3>`;
            }
            subsection.content.forEach(para => {
              html += `<p>${this.escapeHtml(para)}</p>`;
            });
          });
        }

        if (section.content && section.content.length > 0) {
          section.content.forEach(para => {
            html += `<p>${this.escapeHtml(para)}</p>`;
          });
        }
      });

      content.push({
        title: chapter.title,
        data: html
      });
    });

    const filename = `manuscript-${Date.now()}.epub`;
    const filepath = path.join(this.outputDir, filename);

    const epubOptions = {
      title: 'Formatted Manuscript',
      author: 'Author',
      content: content,
      output: filepath
    };

    await new Promise((resolve, reject) => {
      new Epub(epubOptions)
        .promise
        .then(() => resolve())
        .catch(reject);
    });

    return filename;
  }

  generateHtml(formattedContent, preferences) {
    const styles = this.getPdfStyles(preferences);
    const { fontFamily, fontSize, lineHeight, margin } = styles;

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: ${fontFamily};
      font-size: ${fontSize};
      line-height: ${lineHeight};
      margin: ${margin.top} ${margin.right} ${margin.bottom} ${margin.left};
      text-align: justify;
    }
    h1 {
      text-align: center;
      margin-top: 1.5em;
      margin-bottom: 1em;
      font-size: 1.8em;
      page-break-after: avoid;
    }
    h2 {
      margin-top: 1.5em;
      margin-bottom: 1em;
      font-size: 1.4em;
      page-break-after: avoid;
    }
    h3 {
      margin-top: 1.2em;
      margin-bottom: 0.8em;
      font-size: 1.2em;
      page-break-after: avoid;
    }
    p {
      margin-bottom: 0.8em;
      text-indent: ${preferences.indentFirstLine ? '0.5in' : '0'};
      text-align: justify;
    }
    ul, ol {
      margin-left: 1.5em;
      margin-bottom: 0.8em;
    }
  </style>
</head>
<body>
`;

    formattedContent.chapters.forEach(chapter => {
      html += `<h1>${this.escapeHtml(chapter.title)}</h1>`;

      chapter.sections.forEach(section => {
        if (section.header) {
          html += `<h2>${this.escapeHtml(section.header)}</h2>`;
        }

        if (section.subsections && section.subsections.length > 0) {
          section.subsections.forEach(subsection => {
            if (subsection.subheader) {
              html += `<h3>${this.escapeHtml(subsection.subheader)}</h3>`;
            }
            subsection.content.forEach(para => {
              html += `<p>${this.escapeHtml(para)}</p>`;
            });
          });
        }

        if (section.content && section.content.length > 0) {
          section.content.forEach(para => {
            html += `<p>${this.escapeHtml(para)}</p>`;
          });
        }
      });
    });

    html += `</body></html>`;
    return html;
  }

  getTrimSizeForPuppeteer(trimSize) {
    // Puppeteer uses predefined formats or width/height in inches
    const sizes = {
      '5x8': { width: 5, height: 8 },
      '5.5x8.5': { width: 5.5, height: 8.5 },
      '6x9': { width: 6, height: 9 }
    };
    
    const size = sizes[trimSize] || sizes['6x9'];
    return { width: `${size.width}in`, height: `${size.height}in` };
  }

  getPdfStyles(preferences) {
    const { fontFamily } = preferences;

    const fonts = {
      serif: 'Times New Roman, serif',
      'sans-serif': 'Arial, sans-serif'
    };

    return {
      fontFamily: fonts[fontFamily] || fonts.serif,
      fontSize: '12pt',
      lineHeight: '1.6',
      margin: {
        top: '1in',
        bottom: '1in',
        left: '1in',
        right: '1in'
      }
    };
  }

  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

module.exports = new Exporter();
