const {
  escapeHtml,
  cssIdent,
  makeAnchorId,
  byId,
  renderTextWithSpans
} = require('./utils');

const styleHeuristicsCss = (styleName) => {
  const name = String(styleName || '').toLowerCase();
  if (name.includes('heading') || name.includes('title') || name.includes('chapter')) {
    return 'font-weight:700;font-size:1.6em;margin:1.2em 0 0.6em;';
  }
  if (name.includes('subtitle')) {
    return 'font-style:italic;color:#475569;margin:0 0 1em;';
  }
  return 'margin:0 0 1em;';
};

const characterHeuristicsCss = (styleName) => {
  const name = String(styleName || '').toLowerCase();
  let css = '';
  if (name.includes('bold')) css += 'font-weight:700;';
  if (name.includes('italic')) css += 'font-style:italic;';
  if (name.includes('small') && name.includes('caps')) css += 'font-variant:small-caps;';
  return css || 'font-weight:inherit;';
};

const buildCss = (styles = []) => {
  const paragraph = styles.filter((s) => s.type === 'paragraph');
  const character = styles.filter((s) => s.type === 'character');

  const base = `
html,body{margin:0;padding:0;}
body{font-family:Georgia,serif;font-size:1rem;line-height:1.6;color:#0f172a;padding:1.25rem;max-width:42rem;margin:0 auto;}
nav.toc{border:1px solid #e5e7eb;border-radius:12px;padding:0.75rem 1rem;margin:0 0 1rem;background:#f8fafc;}
nav.toc h2{margin:0 0 0.5rem;font-size:1rem;}
nav.toc ol{margin:0;padding-left:1.25rem;}
section.chapter{margin:1.25rem 0 2rem;}
`;

  const paragraphCss = paragraph
    .map((s) => `.${cssIdent(s.name)}{${styleHeuristicsCss(s.name)}}`)
    .join('\n');

  const characterCss = character
    .map((s) => `.${cssIdent(s.name)}{${characterHeuristicsCss(s.name)}}`)
    .join('\n');

  return `${base}\n${paragraphCss}\n${characterCss}\n`;
};

const buildToc = (manuscript) => {
  const chapters = (manuscript?.chapters || []).slice().sort((a, b) => a.order - b.order);
  return chapters.map((c) => ({
    id: c.id,
    title: c.title || `Chapter ${c.order}`,
    href: `#${makeAnchorId('ch', c.id)}`
  }));
};

const renderEbook = ({ manuscript, styles }) => {
  const css = buildCss(styles);
  const toc = buildToc(manuscript);
  const styleById = byId(styles);
  const characterStyleById = new Map(
    styles.filter((s) => s.type === 'character').map((s) => [s.id, s])
  );

  const tocHtml = `
<nav class="toc" aria-label="Table of Contents">
  <h2>Contents</h2>
  <ol>
    ${toc
      .map((e) => `<li><a href="${escapeHtml(e.href)}">${escapeHtml(e.title)}</a></li>`)
      .join('\n')}
  </ol>
</nav>`;

  const chaptersHtml = (manuscript?.chapters || [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((chapter) => {
      const anchor = makeAnchorId('ch', chapter.id);
      const titleStyleCls = cssIdent('Chapter Title');
      const subtitleStyleCls = cssIdent('Chapter Subtitle');

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
<section class="chapter" id="${escapeHtml(anchor)}" data-chapter-id="${escapeHtml(chapter.id)}">
  <h1 class="${titleStyleCls}">${escapeHtml(chapter.title || '')}</h1>
  ${chapter.subtitle ? `<p class="${subtitleStyleCls}">${escapeHtml(chapter.subtitle)}</p>` : ''}
  ${blocksHtml}
</section>`;
    })
    .join('\n');

  const html = `<!doctype html>
<html lang="${escapeHtml(manuscript?.metadata?.language || 'en')}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(manuscript?.title || 'Manuscript')}</title>
  <style>${css}</style>
</head>
<body>
  ${tocHtml}
  ${chaptersHtml}
</body>
</html>`;

  return { html, css, toc };
};

module.exports = { renderEbook };

