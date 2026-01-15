const fs = require('fs');
const path = require('path');
const yazl = require('yazl');
const { escapeHtml, makeAnchorId, cssIdent, byId } = require('../render/utils');
const { mapParagraphToEpub, mapCharacterToCss } = require('../styleMapping');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const buildContainerXml = () => `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

const buildNavXhtml = ({ title, toc }) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(title)} - TOC</title>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h2>Contents</h2>
    <ol>
      ${toc
        .map((e) => `<li><a href="${escapeHtml(e.href)}">${escapeHtml(e.title)}</a></li>`)
        .join('\n')}
    </ol>
  </nav>
</body>
</html>`;

const buildContentXhtml = ({ manuscript, styles }) => {
  const styleById = byId(styles);
  const chapters = (manuscript.chapters || []).slice().sort((a, b) => a.order - b.order);

  const body = chapters
    .map((ch) => {
      const anchor = makeAnchorId('ch', ch.id);
      const titleCls = cssIdent('Chapter Title');
      const subtitleCls = cssIdent('Chapter Subtitle');
      const blocks = (ch.blocks || [])
        .map((b) => {
          const pStyle = styleById.get(b.styleId);
          const epubElement = pStyle ? mapParagraphToEpub(pStyle) : 'p';
          const cls = cssIdent(pStyle?.name || b.styleId);
          const styleName = pStyle?.name || b.styleId;
          
          // Apply character style spans if present
          const rawText = b.text || '';
          let htmlText = '';
          
          if (b.spans && b.spans.length > 0) {
            // Sort spans by start position
            const sortedSpans = [...b.spans].sort((a, b) => a.start - b.start);
            let lastPos = 0;
            
            sortedSpans.forEach((span) => {
              // Add text before this span
              if (span.start > lastPos) {
                htmlText += escapeHtml(rawText.substring(lastPos, span.start));
              }
              
              // Add styled span
              const charStyle = styleById.get(span.styleId);
              const cssProps = charStyle ? mapCharacterToCss(charStyle) : {};
              const cssString = Object.entries(cssProps)
                .map(([prop, value]) => `${prop}: ${value}`)
                .join('; ');
              const spanText = escapeHtml(rawText.substring(span.start, span.end));
              
              if (cssString) {
                htmlText += `<span class="${cssIdent(charStyle?.name || span.styleId)}" style="${escapeHtml(cssString)}">${spanText}</span>`;
              } else {
                htmlText += `<span class="${cssIdent(charStyle?.name || span.styleId)}">${spanText}</span>`;
              }
              
              lastPos = span.end;
            });
            
            // Add remaining text after last span
            if (lastPos < rawText.length) {
              htmlText += escapeHtml(rawText.substring(lastPos));
            }
          } else {
            // No spans, just escape the whole text
            htmlText = escapeHtml(rawText);
          }
          
          return `<${epubElement} class="${cls}" data-style-id="${escapeHtml(b.styleId)}" data-style-name="${escapeHtml(styleName)}">${htmlText}</${epubElement}>`;
        })
        .join('\n');

      return `<section class="chapter" id="${escapeHtml(anchor)}">
  <h1 class="${titleCls}">${escapeHtml(ch.title || '')}</h1>
  ${ch.subtitle ? `<p class="${subtitleCls}">${escapeHtml(ch.subtitle)}</p>` : ''}
  ${blocks}
</section>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="${escapeHtml(
    manuscript?.metadata?.language || 'en'
  )}">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(manuscript.title || 'Book')}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  ${body}
</body>
</html>`;
};

const buildStylesCss = (styles) => {
  const paragraph = styles.filter((s) => s.type === 'paragraph');
  const character = styles.filter((s) => s.type === 'character');

  const base = `
body{font-family:Georgia,serif;line-height:1.6;}
section.chapter{page-break-before:always;}
section.chapter:first-of-type{page-break-before:auto;}
`;

  // Paragraph styles: preserve name in class, use mapped element styling
  const paragraphCss = paragraph
    .map((s) => {
      const cls = cssIdent(s.name);
      const epubElement = mapParagraphToEpub(s);
      // Style both the class and the element for flexibility
      return `.${cls}, ${epubElement}.${cls}{}`;
    })
    .join('\n');
  
  // Character styles: apply CSS mappings
  const characterCss = character
    .map((s) => {
      const cls = cssIdent(s.name);
      const cssProps = mapCharacterToCss(s);
      const cssString = Object.entries(cssProps)
        .map(([prop, value]) => `${prop}: ${value}`)
        .join('; ');
      return `.${cls}{${cssString}}`;
    })
    .join('\n');
    
  return `${base}\n${paragraphCss}\n${characterCss}\n`;
};

const buildPackageOpf = ({ manuscript, toc }) => {
  const title = escapeHtml(manuscript.title || 'Book');
  const lang = escapeHtml(manuscript?.metadata?.language || 'en');
  const id = escapeHtml(manuscript.id || 'bookid');

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${id}</dc:identifier>
    <dc:title>${title}</dc:title>
    <dc:language>${lang}</dc:language>
    ${manuscript?.metadata?.author ? `<dc:creator>${escapeHtml(manuscript.metadata.author)}</dc:creator>` : ''}
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>
    <item id="css" href="styles.css" media-type="text/css"/>
  </manifest>
  <spine>
    <itemref idref="content"/>
  </spine>
</package>`;
};

const buildToc = (manuscript) => {
  const chapters = (manuscript?.chapters || []).slice().sort((a, b) => a.order - b.order);
  return chapters.map((c) => ({
    id: c.id,
    title: c.title || `Chapter ${c.order}`,
    href: `content.xhtml#${makeAnchorId('ch', c.id)}`
  }));
};

async function exportEpub({ manuscript, styles, outputDir }) {
  ensureDir(outputDir);
  const toc = buildToc(manuscript);

  const epubPath = path.join(outputDir, `${manuscript.id}.epub`);
  const zipfile = new yazl.ZipFile();

  // mimetype must be first + uncompressed for EPUB compatibility
  zipfile.addBuffer(Buffer.from('application/epub+zip'), 'mimetype', { compress: false });

  zipfile.addBuffer(Buffer.from(buildContainerXml()), 'META-INF/container.xml');

  const oebps = 'OEBPS';
  zipfile.addBuffer(Buffer.from(buildPackageOpf({ manuscript, toc })), `${oebps}/package.opf`);
  zipfile.addBuffer(Buffer.from(buildNavXhtml({ title: manuscript.title, toc })), `${oebps}/nav.xhtml`);
  zipfile.addBuffer(Buffer.from(buildContentXhtml({ manuscript, styles })), `${oebps}/content.xhtml`);
  zipfile.addBuffer(Buffer.from(buildStylesCss(styles)), `${oebps}/styles.css`);

  await new Promise((resolve, reject) => {
    zipfile.outputStream
      .pipe(fs.createWriteStream(epubPath))
      .on('close', resolve)
      .on('error', reject);
    zipfile.end();
  });

  return { path: epubPath, toc };
}

module.exports = { exportEpub };

