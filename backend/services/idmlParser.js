const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');
const { XMLParser } = require('fast-xml-parser');

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true
});

const safeRead = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf-8');
};

const collectText = (node) => {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(collectText).join('');
  if (node['#text']) return node['#text'];

  let text = '';
  if (node.Content) {
    text += collectText(node.Content);
  }
  if (node.CharacterStyleRange) {
    const ranges = Array.isArray(node.CharacterStyleRange)
      ? node.CharacterStyleRange
      : [node.CharacterStyleRange];
    text += ranges.map(collectText).join('');
  }
  if (node.ParagraphStyleRange) {
    const ranges = Array.isArray(node.ParagraphStyleRange)
      ? node.ParagraphStyleRange
      : [node.ParagraphStyleRange];
    text += ranges.map(collectText).join('');
  }

  return text;
};

const findParagraphRanges = (node, results = []) => {
  if (!node) return results;
  if (Array.isArray(node)) {
    node.forEach((item) => findParagraphRanges(item, results));
    return results;
  }
  if (node.ParagraphStyleRange) {
    const ranges = Array.isArray(node.ParagraphStyleRange)
      ? node.ParagraphStyleRange
      : [node.ParagraphStyleRange];
    ranges.forEach((range) => results.push(range));
  }
  if (node.ParagraphRange) {
    const ranges = Array.isArray(node.ParagraphRange)
      ? node.ParagraphRange
      : [node.ParagraphRange];
    ranges.forEach((range) => results.push(range));
  }
  Object.values(node).forEach((value) => {
    if (typeof value === 'object') findParagraphRanges(value, results);
  });
  return results;
};

const collectStyles = (node, typeKey, results = []) => {
  if (!node) return results;
  if (Array.isArray(node)) {
    node.forEach((item) => collectStyles(item, typeKey, results));
    return results;
  }
  if (typeof node !== 'object') return results;

  Object.entries(node).forEach(([key, value]) => {
    if (key.includes(typeKey)) {
      const items = Array.isArray(value) ? value : [value];
      items.forEach((item) => {
        if (item && typeof item === 'object') {
          const name = item['@_Name'] || item['@_Self'] || '';
          const self = item['@_Self'] || item['@_Name'] || '';
          if (name || self) {
            results.push({ name, self });
          }
        }
      });
    }
    if (typeof value === 'object') {
      collectStyles(value, typeKey, results);
    }
  });

  return results;
};

const extractStylesFromFile = (filePath, typeKey) => {
  const xmlContent = safeRead(filePath);
  if (!xmlContent) return [];
  const parsed = xmlParser.parse(xmlContent);
  return collectStyles(parsed, typeKey);
};

const normalizeStyleName = (styleName) => {
  if (!styleName) return '';
  const parts = styleName.split('/');
  return parts[parts.length - 1];
};

const extractStoryParagraphs = (storyXml) => {
  const paragraphs = [];
  const ranges = findParagraphRanges(storyXml);
  ranges.forEach((range) => {
    const styleNameRaw = range?.['@_AppliedParagraphStyle'] || '';
    const styleName = normalizeStyleName(styleNameRaw);
    const text = collectText(range?.Content || range);
    if (text.trim()) {
      paragraphs.push({
        id: `para-${Math.random().toString(36).slice(2, 10)}`,
        styleName,
        text: text.trim()
      });
    }
  });
  return paragraphs;
};

const isChapterParagraph = (para) => {
  return (
    /chapter/i.test(para.styleName) ||
    /^chapter\s+\d+/i.test(para.text) ||
    /^chapter\b/i.test(para.text)
  );
};

const detectChapters = (paragraphs) => {
  return paragraphs
    .filter(isChapterParagraph)
    .map((para, index) => ({
      id: `chapter-${index + 1}`,
      title: para.text,
      styleName: para.styleName,
      order: index + 1
    }));
};

const isSubtitleCandidate = (para) => {
  if (!para || !para.text) return false;
  if (/subtitle/i.test(para.styleName)) return true;
  if (/^by\s+/i.test(para.text.trim())) return true;
  return para.text.trim().length > 0 && para.text.trim().length <= 140;
};

const mapParagraphsToChapters = (paragraphs, chapters) => {
  if (!chapters.length) return paragraphs;
  let currentChapterId = null;
  let chapterIndex = 0;
  return paragraphs.map((para, index) => {
    if (isChapterParagraph(para)) {
      currentChapterId = chapters[chapterIndex]?.id || currentChapterId;
      chapterIndex += 1;
      return {
        ...para,
        chapterId: currentChapterId,
        isChapterTitle: true,
        role: 'chapter-title'
      };
    }
    if (
      currentChapterId &&
      !para.chapterId &&
      isSubtitleCandidate(para) &&
      (index === 0 || paragraphs[index - 1]?.isChapterTitle)
    ) {
      return {
        ...para,
        chapterId: currentChapterId,
        role: 'chapter-subtitle'
      };
    }
    return { ...para, chapterId: currentChapterId, role: 'body' };
  });
};

const parseIDML = (filePath) => {
  const zip = new AdmZip(filePath);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idml-'));
  zip.extractAllTo(tempDir, true);

  const stylesDir = path.join(tempDir, 'Styles');
  const styleFiles = fs.existsSync(stylesDir)
    ? fs.readdirSync(stylesDir).filter((file) => file.endsWith('.xml'))
    : [];

  const paragraphStyles = [];
  const characterStyles = [];
  const objectStyles = [];

  styleFiles.forEach((file) => {
    const filePath = path.join(stylesDir, file);
    paragraphStyles.push(...extractStylesFromFile(filePath, 'ParagraphStyle'));
    characterStyles.push(...extractStylesFromFile(filePath, 'CharacterStyle'));
    objectStyles.push(...extractStylesFromFile(filePath, 'ObjectStyle'));
  });

  const dedupe = (styles) => {
    const seen = new Set();
    return styles.filter((style) => {
      const key = style.self || style.name;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const storiesDir = path.join(tempDir, 'Stories');
  const storyFiles = fs.existsSync(storiesDir)
    ? fs.readdirSync(storiesDir).filter((file) => file.endsWith('.xml'))
    : [];

  const allParagraphs = [];
  storyFiles.forEach((file) => {
    const storyXml = safeRead(path.join(storiesDir, file));
    if (!storyXml) return;
    const parsed = xmlParser.parse(storyXml);
    allParagraphs.push(...extractStoryParagraphs(parsed));
  });

  const chapters = detectChapters(allParagraphs);
  const paragraphs = mapParagraphsToChapters(allParagraphs, chapters);

  fs.rmSync(tempDir, { recursive: true, force: true });

  return {
    styles: {
      paragraphStyles: dedupe(paragraphStyles),
      characterStyles: dedupe(characterStyles),
      objectStyles: dedupe(objectStyles)
    },
    content: {
      paragraphs
    },
    chapters,
    stats: {
      storyCount: storyFiles.length,
      paragraphCount: allParagraphs.length,
      chapterCount: chapters.length
    }
  };
};

module.exports = { parseIDML };
