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

/**
 * Get paragraph style mapping
 * @param {string} idmlName - InDesign style name
 * @returns {Object|null} Mapping object or null if not found
 */
function getParagraphMapping(idmlName) {
  if (!idmlName) return null;
  
  // Exact match first
  const exactMatch = PARAGRAPH_STYLE_MAP[idmlName];
  if (exactMatch) {
    return {
      ...exactMatch,
      idmlName,
      mapped: true
    };
  }
  
  // Preserve name exactly if not in map (rule: style names preserved exactly)
  return {
    internal: idmlName,
    epub: 'p', // Default to <p> for unmapped styles
    preserveName: true,
    idmlName,
    mapped: false
  };
}

/**
 * Get character style mapping
 * @param {string} idmlName - InDesign style name
 * @returns {Object|null} Mapping object or null if not found
 */
function getCharacterMapping(idmlName) {
  if (!idmlName) return null;
  
  // Exact match first
  const exactMatch = CHARACTER_STYLE_MAP[idmlName];
  if (exactMatch) {
    return {
      ...exactMatch,
      idmlName,
      mapped: true
    };
  }
  
  // Preserve name exactly if not in map (rule: style names preserved exactly)
  return {
    internal: idmlName,
    css: {},
    preserveName: true,
    idmlName,
    mapped: false
  };
}

/**
 * Check if style has nested styles
 * @param {Object} style - Style object with properties
 * @returns {boolean}
 */
function hasNestedStyles(style) {
  const nested = style?.properties?.nestedStyles;
  return nested && (Array.isArray(nested) ? nested.length > 0 : Object.keys(nested).length > 0);
}

/**
 * Check if style has overrides
 * @param {Object} style - Style object with properties
 * @returns {boolean}
 */
function hasOverrides(style) {
  const overrides = style?.properties?.overrides;
  return overrides && Object.keys(overrides).length > 0;
}

/**
 * Flag overrides without flattening
 * @param {Object} style - Style object
 * @returns {Object} Style with override flags
 */
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

/**
 * Retain nested styles in style object
 * @param {Object} style - Style object from IDML
 * @returns {Object} Style with nested styles retained
 */
function retainNestedStyles(style) {
  if (!style) return style;
  
  const nested = style.properties?.nestedStyles;
  if (!nested) return style;
  
  return {
    ...style,
    properties: {
      ...style.properties,
      nestedStyles: nested, // Retain as-is
      _nestedStylesRetained: true
    }
  };
}

/**
 * Map paragraph style for EPUB export
 * @param {Object} style - Internal style object
 * @returns {string} EPUB HTML element name
 */
function mapParagraphToEpub(style) {
  if (!style || !style.name) return 'p';
  
  const mapping = getParagraphMapping(style.name);
  return mapping?.epub || 'p';
}

/**
 * Map character style to CSS
 * @param {Object} style - Internal style object
 * @returns {Object} CSS properties object
 */
function mapCharacterToCss(style) {
  if (!style || !style.name) return {};
  
  const mapping = getCharacterMapping(style.name);
  return mapping?.css || {};
}

/**
 * Apply style mapping rules to a style during import
 * @param {Object} idmlStyle - Style extracted from IDML
 * @returns {Object} Mapped style with preserved name and flags
 */
function applyMappingRules(idmlStyle) {
  if (!idmlStyle) return null;
  
  const { name, type, properties = {} } = idmlStyle;
  
  // Preserve style name exactly (rule: style names preserved exactly)
  const preservedName = name;
  
  // Get mapping based on type
  let mapping = null;
  if (type === 'paragraph') {
    mapping = getParagraphMapping(preservedName);
  } else if (type === 'character') {
    mapping = getCharacterMapping(preservedName);
  }
  
  // Retain nested styles (rule: nested styles retained)
  const withNested = retainNestedStyles(idmlStyle);
  
  // Flag overrides (rule: overrides flagged, not flattened)
  const withFlags = flagOverrides(withNested);
  
  // Build final style object
  const mappedStyle = {
    ...idmlStyle,
    name: preservedName, // Preserve exact name
    idmlName: preservedName, // Store original InDesign name
    properties: {
      ...withFlags.properties,
      mapping: mapping || { internal: preservedName, mapped: false }
    }
  };
  
  return mappedStyle;
}

/**
 * Get all paragraph style mappings
 * @returns {Object} All paragraph mappings
 */
function getAllParagraphMappings() {
  return PARAGRAPH_STYLE_MAP;
}

/**
 * Get all character style mappings
 * @returns {Object} All character mappings
 */
function getAllCharacterMappings() {
  return CHARACTER_STYLE_MAP;
}

module.exports = {
  // Mapping functions
  getParagraphMapping,
  getCharacterMapping,
  mapParagraphToEpub,
  mapCharacterToCss,
  
  // Style processing
  applyMappingRules,
  hasNestedStyles,
  hasOverrides,
  flagOverrides,
  retainNestedStyles,
  
  // Data access
  getAllParagraphMappings,
  getAllCharacterMappings,
  
  // Constants
  PARAGRAPH_STYLE_MAP,
  CHARACTER_STYLE_MAP
};

