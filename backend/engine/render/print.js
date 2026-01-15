const { escapeHtml, cssIdent, byId, renderTextWithSpans } = require('./utils');

const KDP_PRESETS = {
  '5x8': { w: 5, h: 8 },
  '5.25x8': { w: 5.25, h: 8 },
  '6x9': { w: 6, h: 9 },
  '8.5x11': { w: 8.5, h: 11 }
};

const styleHeuristicsCss = (styleName) => {
  const name = String(styleName || '').toLowerCase();
  if (name.includes('chapter') || name.includes('title') || name.includes('heading')) {
    return 'font-weight:700;font-size:18pt;margin:18pt 0 12pt;text-align:center;';
  }
  if (name.includes('subtitle')) {
    return 'font-style:italic;margin:0 0 16pt;text-align:center;';
  }
  return 'margin:0 0 12pt;text-indent:18pt;';
};

const characterHeuristicsCss = (styleName) => {
  const name = String(styleName || '').toLowerCase();
  let css = '';
  if (name.includes('bold')) css += 'font-weight:700;';
  if (name.includes('italic')) css += 'font-style:italic;';
  if (name.includes('small') && name.includes('caps')) css += 'font-variant:small-caps;';
  return css || 'font-weight:inherit;';
};

const buildCss = ({ preset, mirrorMargins }) => {
  const size = KDP_PRESETS[preset] || KDP_PRESETS['6x9'];
  const w = `${size.w}in`;
  const h = `${size.h}in`;

  const baseMargins = {
    top: '0.75in',
    bottom: '0.75in',
    inner: '0.9in',
    outer: '0.7in'
  };

  const pageCss = mirrorMargins
    ? `
@page { size: ${w} ${h}; margin-top:${baseMargins.top}; margin-bottom:${baseMargins.bottom}; }
@page :left { margin-left:${baseMargins.inner}; margin-right:${baseMargins.outer}; }
@page :right { margin-left:${baseMargins.outer}; margin-right:${baseMargins.inner}; }
`
    : `
@page { size: ${w} ${h}; margin:${baseMargins.top} ${baseMargins.outer} ${baseMargins.bottom} ${baseMargins.outer}; }
`;

  return `
${pageCss}
html,body{margin:0;padding:0;}
body{font-family:Georgia,serif;font-size:11pt;line-height:1.4;color:#111827;}
section.chapter{page-break-before:always;}
section.chapter:first-of-type{page-break-before:auto;}
p{orphans:2;widows:2;text-align:justify;hyphens:auto;}
`;
};

const renderPrint = ({ manuscript, styles, options = {} }) => {
  const preset = options.preset || '6x9';
  const mirrorMargins = options.mirrorMargins !== false;

  const css = buildCss({ preset, mirrorMargins });
  const styleById = byId(styles);
  const characterStyleById = new Map(
    styles.filter((s) => s.type === 'character').map((s) => [s.id, s])
  );

  const styleCss = [
    ...styles
      .filter((s) => s.type === 'paragraph')
      .map((s) => `.${cssIdent(s.name)}{${styleHeuristicsCss(s.name)}}`),
    ...styles
      .filter((s) => s.type === 'character')
      .map((s) => `.${cssIdent(s.name)}{${characterHeuristicsCss(s.name)}}`)
  ].join('\n');

  const chaptersHtml = (manuscript?.chapters || [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((chapter) => {
      const titleCls = cssIdent('Chapter Title');
      const subtitleCls = cssIdent('Chapter Subtitle');
      const blocksHtml = (chapter.blocks || [])
        .map((block) => {
          const pStyle = styleById.get(block.styleId);
          const cls = cssIdent(pStyle?.name || block.styleId);
          const inner = renderTextWithSpans({
            text: block.text,
            spans: block.spans || [],
            characterStyleById
          });
          return `<p class="${cls}" data-style-id="${escapeHtml(block.styleId)}">${inner}</p>`;
        })
        .join('\n');

      return `
<section class="chapter" data-chapter-id="${escapeHtml(chapter.id)}">
  <h1 class="${titleCls}">${escapeHtml(chapter.title || '')}</h1>
  ${chapter.subtitle ? `<p class="${subtitleCls}">${escapeHtml(chapter.subtitle)}</p>` : ''}
  ${blocksHtml}
</section>`;
    })
    .join('\n');

  const html = `<!doctype html>
<html lang="${escapeHtml(manuscript?.metadata?.language || 'en')}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(manuscript?.title || 'Print')}</title>
  <style>${css}\n${styleCss}</style>
</head>
<body>
  ${chaptersHtml}
</body>
</html>`;

  return { html, css, preset };
};

module.exports = { renderPrint, KDP_PRESETS };

