const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');
const { XMLParser } = require('fast-xml-parser');
const { applyMappingRules } = require('./styleMapping');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true
});

const createTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'idml-'));

const readXml = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
};

const normalizeStyleName = (styleName) => {
  if (!styleName) return '';
  const parts = styleName.split('/');
  return parts[parts.length - 1];
};

const extractStyleDefs = (xmlContent, typeKey) => {
  if (!xmlContent) return [];
  const parsed = parser.parse(xmlContent);
  const styles = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    Object.entries(node).forEach(([key, value]) => {
      if (key.includes(typeKey)) {
        const items = Array.isArray(value) ? value : [value];
        items.forEach((item) => {
          if (item && typeof item === 'object') {
            styles.push({
              id: item['@_Self'] || item['@_Name'],
              name: item['@_Name'] || item['@_Self'],
              type: typeKey === 'ParagraphStyle'
                ? 'paragraph'
                : typeKey === 'CharacterStyle'
                ? 'character'
                : 'object',
              properties: {
                raw: item,
                nestedStyles: item.NestedStyleRange || null,
                overrides: item?.Properties || null
              }
            });
          }
        });
      }
      if (typeof value === 'object') walk(value);
    });
  };
  walk(parsed);
  return styles.filter((style) => style.id && style.name);
};

const extractStories = (storiesDir) => {
  if (!fs.existsSync(storiesDir)) return [];
  return fs
    .readdirSync(storiesDir)
    .filter((file) => file.endsWith('.xml'))
    .map((file) => {
      const xmlContent = readXml(path.join(storiesDir, file));
      return {
        id: file.replace('.xml', ''),
        raw: xmlContent || '',
        parsed: xmlContent ? parser.parse(xmlContent) : null
      };
    });
};

const collectParagraphRanges = (node, results = []) => {
  if (!node) return results;
  if (Array.isArray(node)) {
    node.forEach((item) => collectParagraphRanges(item, results));
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
    if (typeof value === 'object') collectParagraphRanges(value, results);
  });
  return results;
};

const extractText = (node) => {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node['#text']) return node['#text'];

  let text = '';
  if (node.Content) text += extractText(node.Content);
  if (node.CharacterStyleRange) {
    const ranges = Array.isArray(node.CharacterStyleRange)
      ? node.CharacterStyleRange
      : [node.CharacterStyleRange];
    text += ranges.map(extractText).join('');
  }
  return text;
};

const hasPageBreak = (node) => {
  if (!node) return false;
  if (Array.isArray(node)) return node.some(hasPageBreak);
  if (node.Br && node.Br['@_BreakType']) {
    return String(node.Br['@_BreakType']).toLowerCase().includes('page');
  }
  return Object.values(node).some((value) =>
    typeof value === 'object' ? hasPageBreak(value) : false
  );
};

const styleLookupByName = (styles, type) => {
  const map = new Map();
  styles
    .filter((s) => s.type === type)
    .forEach((style) => {
      map.set(style.name, style.id);
    });
  return map;
};

const makeId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const extractParagraphBlocks = (stories, paragraphStyleNameToId, logs) => {
  const blocks = [];
  stories.forEach((story) => {
    if (!story.parsed) return;
    const ranges = collectParagraphRanges(story.parsed);
    ranges.forEach((range, rangeIndex) => {
      const styleNameRaw = range['@_AppliedParagraphStyle'] || '';
      const styleName = normalizeStyleName(styleNameRaw);
      const text = extractText(range.Content || range).trim();
      if (!text) return;
      const styleId =
        paragraphStyleNameToId.get(styleName) || styleNameRaw || 'paragraph-default';
      blocks.push({
        id: makeId('block'),
        type: 'paragraph',
        text,
        styleId,
        spans: [],
        properties: {
          idml: {
            storyId: story.id,
            rangeIndex,
            appliedParagraphStyle: styleNameRaw
          },
          rawAppliedParagraphStyle: styleNameRaw,
          rawRange: range
        }
      });
    });
  });
  logs.push(`Paragraph blocks extracted: ${blocks.length}`);
  return blocks;
};

const classifyChapterSection = (title, styleName) => {
  const combined = `${title || ''} ${styleName || ''}`.toLowerCase();
  if (
    combined.includes('front matter') ||
    combined.includes('title page') ||
    combined.includes('copyright') ||
    combined.includes('dedication') ||
    combined.includes('preface') ||
    combined.includes('foreword') ||
    combined.includes('acknowledg') ||
    combined.includes('table of contents') ||
    combined.includes('toc')
  ) {
    return 'front';
  }
  if (
    combined.includes('back matter') ||
    combined.includes('appendix') ||
    combined.includes('index') ||
    combined.includes('glossary') ||
    combined.includes('bibliography') ||
    combined.includes('afterword') ||
    combined.includes('endnotes') ||
    combined.includes('notes') ||
    combined.includes('about the author')
  ) {
    return 'back';
  }
  return 'body';
};

const isBodyChapterCandidate = (title, styleName) => {
  const t = String(title || '').trim();
  const s = String(styleName || '').toLowerCase();
  const tl = t.toLowerCase();
  if (s.includes('chapter') && !s.includes('objective') && !s.includes('toc')) return true;
  if (/^chapter\s+(\d+|[ivxlcdm]+)\b/i.test(tl)) return true;
  if (/^chapter[_\s-]*\d+/.test(tl)) return true;
  return false;
};

const detectChapters = (stories) => {
  const chapters = [];
  let order = 1;
  const isTocLike = ({ title, styleName }) => {
    const t = String(title || '').trim();
    const s = String(styleName || '').toLowerCase();
    const tl = t.toLowerCase();
    if (s.includes('toc') || s.includes('contents')) return true;
    if (tl.includes('table of contents') || tl === 'contents' || tl === 'toc')
      return true;
    const occurrences = (tl.match(/\bchapter\b/g) || []).length;
    // If a single paragraph contains multiple "Chapter" tokens, it's almost certainly TOC text.
    if (occurrences >= 2) return true;
    // Common TOC concatenation pattern: "Chapter 1 ... 15Chapter 2 ... 21"
    if (/\bchapter\s+\d+.*\d+\s*chapter\s+\d+/i.test(t)) return true;
    return false;
  };

  const isChapterText = (text) =>
    /^chapter\s+(\d+|[ivxlcdm]+)\b/i.test(String(text || '').trim());

  stories.forEach((story) => {
    if (!story.parsed) return;
    const ranges = collectParagraphRanges(story.parsed);
    ranges.forEach((range) => {
      const styleName = normalizeStyleName(range['@_AppliedParagraphStyle']);
      const text = extractText(range.Content || range).trim();
      const isChapterStyle = /chapter/i.test(styleName);
      const isHeading = /heading|title/i.test(styleName);
      const isChapterLine = isChapterText(text);
      const pageBreak = hasPageBreak(range);
      // Avoid misclassifying TOC paragraphs and "Chapter Objective" as chapters.
      if (
        styleName.toLowerCase().includes('objective') ||
        isTocLike({ title: text, styleName })
      ) {
        return;
      }
      if (isChapterStyle || isChapterLine || (pageBreak && isHeading)) {
        const section = classifyChapterSection(text, styleName);
        chapters.push({
          id: `chapter-${order}`,
          title: text || styleName || `Chapter ${order}`,
          styleName,
          order,
          section
        });
        order += 1;
      }
    });
  });
  const bodyOrders = chapters
    .filter((ch) => ch.section === 'body' && isBodyChapterCandidate(ch.title, ch.styleName))
    .map((ch) => ch.order);
  if (bodyOrders.length) {
    const firstBody = Math.min(...bodyOrders);
    const lastBody = Math.max(...bodyOrders);
    chapters.forEach((ch) => {
      if (ch.section !== 'body') return;
      if (ch.order < firstBody) ch.section = 'front';
      if (ch.order > lastBody) ch.section = 'back';
    });
  }
  return chapters;
};

const extractChapterMarkers = (tempDir, logs) => {
  const designmapPath = path.join(tempDir, 'designmap.xml');
  const xmlContent = readXml(designmapPath);
  if (!xmlContent) return [];
  const parsed = parser.parse(xmlContent);
  const markers = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    Object.entries(node).forEach(([key, value]) => {
      if (key.toLowerCase().includes('chapter')) {
        markers.push({ key, value });
      }
      if (typeof value === 'object') walk(value);
    });
  };
  walk(parsed);
  if (markers.length) {
    logs.push(`Chapter markers found in designmap.xml: ${markers.length}`);
  }
  return markers;
};

const importIDML = (filePath) => {
  const logs = [];
  if (!fs.existsSync(filePath)) {
    throw new Error('IDML file not found');
  }
  const zip = new AdmZip(filePath);
  const tempDir = createTempDir();
  zip.extractAllTo(tempDir, true);
  logs.push(`Extracted IDML to ${tempDir}`);

  const stylesDir = path.join(tempDir, 'Styles');
  const styleFiles = fs.existsSync(stylesDir)
    ? fs.readdirSync(stylesDir).filter((file) => file.endsWith('.xml'))
    : [];

  const rawStyles = [];
  styleFiles.forEach((file) => {
    const xml = readXml(path.join(stylesDir, file));
    rawStyles.push(...extractStyleDefs(xml, 'ParagraphStyle'));
    rawStyles.push(...extractStyleDefs(xml, 'CharacterStyle'));
    rawStyles.push(...extractStyleDefs(xml, 'ObjectStyle'));
  });
  logs.push(`Raw styles extracted: ${rawStyles.length}`);
  
  // Apply style mapping rules (preserve names, retain nested styles, flag overrides)
  const styles = rawStyles.map(style => applyMappingRules(style)).filter(Boolean);
  logs.push(`Styles mapped: ${styles.length}`);
  
  // Log mapping statistics
  const mappedParagraph = styles.filter(s => s.type === 'paragraph' && s.properties?.mapping?.mapped).length;
  const mappedCharacter = styles.filter(s => s.type === 'character' && s.properties?.mapping?.mapped).length;
  const withNested = styles.filter(s => s.properties?._flags?.hasNestedStyles).length;
  const withOverrides = styles.filter(s => s.properties?._flags?.hasOverrides).length;
  if (mappedParagraph > 0 || mappedCharacter > 0) {
    logs.push(`Mapped styles: ${mappedParagraph} paragraph, ${mappedCharacter} character`);
  }
  if (withNested > 0) {
    logs.push(`Styles with nested styles retained: ${withNested}`);
  }
  if (withOverrides > 0) {
    logs.push(`Styles with overrides flagged: ${withOverrides}`);
  }

  const storiesDir = path.join(tempDir, 'Stories');
  const stories = extractStories(storiesDir);
  logs.push(`Stories extracted: ${stories.length}`);

  const chapters = detectChapters(stories);
  logs.push(`Chapters detected: ${chapters.length}`);
  extractChapterMarkers(tempDir, logs);

  // Build paragraph blocks (content references styles by ID; no inline formatting)
  const paragraphStyleNameToId = styleLookupByName(styles, 'paragraph');
  const blocks = extractParagraphBlocks(stories, paragraphStyleNameToId, logs);

  fs.rmSync(tempDir, { recursive: true, force: true });

  return {
    styles,
    stories: stories.map((story) => ({
      id: story.id,
      raw: story.raw
    })),
    chapters,
    blocks,
    logs
  };
};

module.exports = { importIDML };
