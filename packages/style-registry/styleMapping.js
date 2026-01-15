/**
 * IDML Style-Mapping Ruleset
 * 
 * Maps InDesign styles to internal format and EPUB output.
 * Rules:
 * - Style names preserved exactly
 * - Nested styles retained
 * - Overrides flagged, not flattened
 */

/**
 * Paragraph Style Mapping
 * InDesign → Internal → EPUB
 */
const PARAGRAPH_STYLE_MAP = {
  'Chapter_Title': {
    internal: 'Chapter_Title',
    epub: 'h1',
    preserveName: true
  },
  'Body_Text': {
    internal: 'Body_Text',
    epub: 'p',
    preserveName: true
  },
  'Block_Quote': {
    internal: 'Block_Quote',
    epub: 'blockquote',
    preserveName: true
  }
};

/**
 * Character Style Mapping
 * InDesign → Internal → CSS
 */
const CHARACTER_STYLE_MAP = {
  'Italic': {
    internal: 'Italic',
    css: {
      'font-style': 'italic'
    },
    preserveName: true
  },
  'Bold': {
    internal: 'Bold',
    css: {
      'font-weight': '700'
    },
    preserveName: true
  },
  'SmallCaps': {
    internal: 'SmallCaps',
    css: {
      'font-variant': 'small-caps'
    },
    preserveName: true
  }
};

function getParagraphMapping(idmlName) {
  if (!idmlName) return null;
  const exactMatch = PARAGRAPH_STYLE_MAP[idmlName];
  if (exactMatch) {
    return { ...exactMatch, idmlName, mapped: true };
  }
  return {
    internal: idmlName,
    epub: 'p',
    preserveName: true,
    idmlName,
    mapped: false
  };
}

function getCharacterMapping(idmlName) {
  if (!idmlName) return null;
  const exactMatch = CHARACTER_STYLE_MAP[idmlName];
  if (exactMatch) {
    return { ...exactMatch, idmlName, mapped: true };
  }
  return {
    internal: idmlName,
    css: {},
    preserveName: true,
    idmlName,
    mapped: false
  };
}

function hasNestedStyles(style) {
  const nested = style?.properties?.nestedStyles;
  return nested && (Array.isArray(nested) ? nested.length > 0 : Object.keys(nested).length > 0);
}

function hasOverrides(style) {
  const overrides = style?.properties?.overrides;
  return overrides && Object.keys(overrides).length > 0;
}

function flagOverrides(style) {
  if (!style) return style;
  const hasOverride = hasOverrides(style);
  const hasNested = hasNestedStyles(style);
  return {
    ...style,
    properties: {
      ...style.properties,
      _flags: {
        hasOverrides: hasOverride,
        hasNestedStyles: hasNested,
        overrideCount: hasOverride ? Object.keys(style.properties.overrides || {}).length : 0
      }
    }
  };
}

function retainNestedStyles(style) {
  if (!style) return style;
  const nested = style.properties?.nestedStyles;
  if (!nested) return style;
  return {
    ...style,
    properties: {
      ...style.properties,
      nestedStyles: nested,
      _nestedStylesRetained: true
    }
  };
}

function applyMappingRules(idmlStyle) {
  if (!idmlStyle) return null;
  const { name, type, properties = {} } = idmlStyle;
  const preservedName = name;
  let mapping = null;
  if (type === 'paragraph') {
    mapping = getParagraphMapping(preservedName);
  } else if (type === 'character') {
    mapping = getCharacterMapping(preservedName);
  }
  const withNested = retainNestedStyles(idmlStyle);
  const withFlags = flagOverrides(withNested);
  return {
    ...idmlStyle,
    name: preservedName,
    idmlName: preservedName,
    properties: {
      ...withFlags.properties,
      mapping: mapping || { internal: preservedName, mapped: false }
    }
  };
}

module.exports = {
  getParagraphMapping,
  getCharacterMapping,
  hasNestedStyles,
  hasOverrides,
  flagOverrides,
  retainNestedStyles,
  applyMappingRules,
  PARAGRAPH_STYLE_MAP,
  CHARACTER_STYLE_MAP
};

