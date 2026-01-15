const escapeHtml = (input) => {
  const text = String(input ?? '');
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const cssIdent = (input) => {
  const raw = String(input ?? '');
  const simplified = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return simplified ? `s-${simplified}` : 's-unknown';
};

const makeAnchorId = (prefix, input) => {
  const base = cssIdent(input).replace(/^s-/, '');
  return `${prefix}-${base}`.slice(0, 64);
};

const byId = (items = []) => {
  const map = new Map();
  items.forEach((item) => {
    if (item?.id) map.set(item.id, item);
  });
  return map;
};

const safeSpans = (spans = [], textLen = 0) => {
  return spans
    .filter(
      (s) =>
        s &&
        typeof s.start === 'number' &&
        typeof s.end === 'number' &&
        s.start >= 0 &&
        s.end <= textLen &&
        s.start < s.end &&
        s.styleId
    )
    .sort((a, b) => a.start - b.start);
};

const renderTextWithSpans = ({ text, spans, characterStyleById }) => {
  const rawText = String(text ?? '');
  const len = rawText.length;
  const normalized = safeSpans(spans, len);
  if (normalized.length === 0) {
    return escapeHtml(rawText);
  }

  // Non-overlapping rendering; if overlaps exist, later spans are ignored.
  let html = '';
  let cursor = 0;
  normalized.forEach((span) => {
    if (span.start < cursor) return;
    if (span.start > cursor) {
      html += escapeHtml(rawText.slice(cursor, span.start));
    }
    const style = characterStyleById.get(span.styleId);
    const cls = cssIdent(style?.name || span.styleId);
    html += `<span class="${cls}" data-style-id="${escapeHtml(span.styleId)}">${escapeHtml(
      rawText.slice(span.start, span.end)
    )}</span>`;
    cursor = span.end;
  });
  if (cursor < len) {
    html += escapeHtml(rawText.slice(cursor));
  }
  return html;
};

module.exports = {
  escapeHtml,
  cssIdent,
  makeAnchorId,
  byId,
  renderTextWithSpans
};
