const Hypher = require('hypher');
const english = require('hyphenation.en-us');

const hyphenator = new Hypher(english);

const splitWords = (text) => String(text || '').split(/\s+/).filter(Boolean);

const wrapParagraph = ({
  text,
  font,
  fontSize,
  maxWidth,
  hyphenate = true
}) => {
  const words = splitWords(text);
  const lines = [];
  let line = '';

  const measure = (t) => font.widthOfTextAtSize(t, fontSize);

  const pushLine = () => {
    if (line.trim()) lines.push(line.trim());
    line = '';
  };

  const tryAppend = (word) => {
    const candidate = line ? `${line} ${word}` : word;
    return measure(candidate) <= maxWidth ? candidate : null;
  };

  const breakLongWord = (word) => {
    if (!hyphenate) return [word];
    const parts = hyphenator.hyphenate(word);
    if (!parts || parts.length <= 1) return [word];
    // Greedy: fit as many syllables as possible on current line with hyphen.
    const fragments = [];
    let current = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const candidate = current ? `${current}${part}` : part;
      const withHyphen = i < parts.length - 1 ? `${candidate}-` : candidate;
      // If this fragment doesn't fit as a word, flush current and start new.
      if (measure(withHyphen) > maxWidth && current) {
        fragments.push(i < parts.length - 1 ? `${current}-` : current);
        current = part;
      } else {
        current = candidate;
      }
    }
    if (current) fragments.push(current);
    return fragments;
  };

  for (const w of words) {
    const appended = tryAppend(w);
    if (appended) {
      line = appended;
      continue;
    }

    // Word doesn't fit on current line; start new line.
    pushLine();

    // If the word itself is too long, hyphenate/break it.
    if (measure(w) > maxWidth) {
      const parts = breakLongWord(w);
      for (let i = 0; i < parts.length; i++) {
        const piece = parts[i];
        const fits = measure(piece) <= maxWidth;
        if (!fits) {
          // Fallback: force-break by chars.
          let chunk = '';
          for (const ch of piece) {
            const c2 = chunk + ch;
            if (measure(c2) > maxWidth && chunk) {
              lines.push(chunk);
              chunk = ch;
            } else {
              chunk = c2;
            }
          }
          if (chunk) lines.push(chunk);
        } else {
          // Place piece on a new line.
          lines.push(piece);
        }
      }
      continue;
    }

    line = w;
  }

  pushLine();
  return lines;
};

// Widow/orphan handling at paragraph level:
// - if less than minLinesAtBottom remain, move whole paragraph to next page
// - if paragraph would leave fewer than minLinesAtTop on next page, also move it
const shouldMoveParagraphToNextPage = ({
  remainingLinesOnPage,
  paragraphLineCount,
  minLinesAtBottom = 2,
  minLinesAtTop = 2
}) => {
  if (paragraphLineCount === 0) return false;
  if (remainingLinesOnPage < minLinesAtBottom) return true;
  // If only 1 line would fit on current page, avoid orphan.
  if (remainingLinesOnPage === 1) return true;
  // If paragraph would split, ensure next page gets >= minLinesAtTop.
  const linesNextPage = paragraphLineCount - remainingLinesOnPage;
  if (linesNextPage > 0 && linesNextPage < minLinesAtTop) return true;
  return false;
};

module.exports = {
  wrapParagraph,
  shouldMoveParagraphToNextPage
};

