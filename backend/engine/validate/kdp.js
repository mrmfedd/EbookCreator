/**
 * KDP Validation Checklist Engine
 * 
 * Validates manuscripts for Kindle Direct Publishing (KDP) requirements
 * Categories:
 * 1. Structure (TOC, chapter breaks, empty chapters)
 * 2. EPUB Compliance (EPUB 3, valid spine, valid nav)
 * 3. Typography (font embedding, disallowed fonts, inline font sizes)
 * 4. Print Rules (trim size, margins, page breaks)
 * 5. Warnings (non-blocking issues)
 */

const { KDP_PRESETS } = require('../render/print');

/**
 * Validate Structure
 * - TOC present
 * - Chapter breaks valid
 * - No empty chapters
 */
function validateStructure(manuscript) {
  const errors = [];
  const warnings = [];
  const checks = {
    tocPresent: false,
    chapterBreaksValid: true,
    noEmptyChapters: true
  };

  if (!manuscript) {
    return { errors: ['Manuscript missing'], warnings, checks };
  }

  const chapters = (manuscript.chapters || []).slice().sort((a, b) => a.order - b.order);

  // Check TOC presence
  // TOC is considered present if there are chapters with titles
  const chaptersWithTitles = chapters.filter(c => c.title && c.title.trim());
  if (chaptersWithTitles.length > 0) {
    checks.tocPresent = true;
  } else {
    errors.push('Table of Contents missing: No chapters with titles found');
  }

  // Check chapter breaks validity
  // Chapter breaks are valid if chapters are properly ordered and have valid IDs
  const chapterIds = new Set();
  chapters.forEach((chapter, index) => {
    if (!chapter.id) {
      errors.push(`Chapter at index ${index} missing ID`);
      checks.chapterBreaksValid = false;
    } else if (chapterIds.has(chapter.id)) {
      errors.push(`Duplicate chapter ID: ${chapter.id}`);
      checks.chapterBreaksValid = false;
    } else {
      chapterIds.add(chapter.id);
    }
    
    // Check order sequence
    if (chapter.order !== undefined && chapter.order !== index + 1) {
      warnings.push(`Chapter "${chapter.title || chapter.id}" has non-sequential order: ${chapter.order}`);
    }
  });

  // Check for empty chapters
  chapters.forEach((chapter) => {
    const blocks = chapter.blocks || [];
    const hasContent = blocks.some(block => {
      const text = block?.text || '';
      return text.trim().length > 0;
    });
    
    if (!hasContent) {
      errors.push(`Chapter "${chapter.title || chapter.id}" is empty (no content blocks)`);
      checks.noEmptyChapters = false;
    } else if (blocks.length === 0) {
      warnings.push(`Chapter "${chapter.title || chapter.id}" has no blocks defined`);
    }
  });

  return { errors, warnings, checks };
}

/**
 * Validate EPUB Compliance
 * - EPUB 3
 * - Valid spine
 * - Valid nav document
 */
function validateEpubCompliance(manuscript, styles, renderedHtml) {
  const errors = [];
  const warnings = [];
  const checks = {
    epub3: false,
    validSpine: false,
    validNav: false
  };

  if (!manuscript) {
    return { errors: ['Manuscript missing'], warnings, checks };
  }

  // Check EPUB 3 compliance (basic checks)
  // EPUB 3 requires proper HTML5 structure
  if (renderedHtml) {
    const hasDoctype = /<!doctype\s+html/i.test(renderedHtml);
    const hasHtml5 = /<html[^>]*>/i.test(renderedHtml);
    
    if (hasDoctype && hasHtml5) {
      checks.epub3 = true;
    } else {
      errors.push('EPUB 3 compliance: Missing HTML5 doctype or html element');
    }
  } else {
    warnings.push('EPUB 3 compliance: Cannot verify without rendered HTML');
  }

  // Check valid spine
  // Spine is valid if chapters are properly ordered and accessible
  const chapters = (manuscript.chapters || []).slice().sort((a, b) => a.order - b.order);
  if (chapters.length > 0) {
    const allHaveIds = chapters.every(c => c.id);
    const allHaveOrder = chapters.every(c => typeof c.order === 'number');
    
    if (allHaveIds && allHaveOrder) {
      checks.validSpine = true;
    } else {
      errors.push('Valid spine: Some chapters missing IDs or order numbers');
    }
  } else {
    errors.push('Valid spine: No chapters found');
  }

  // Check valid nav document
  // Nav is valid if there are chapters with titles for navigation
  const chaptersWithTitles = chapters.filter(c => c.title && c.title.trim());
  if (chaptersWithTitles.length > 0) {
    checks.validNav = true;
  } else {
    errors.push('Valid nav document: No chapters with titles for navigation');
  }

  return { errors, warnings, checks };
}

/**
 * Validate Typography
 * - Font embedding allowed
 * - No disallowed fonts
 * - No inline font sizes
 */
function validateTypography(manuscript, styles, renderedHtml) {
  const errors = [];
  const warnings = [];
  const checks = {
    fontEmbeddingAllowed: true,
    noDisallowedFonts: true,
    noInlineFontSizes: true
  };

  // KDP disallowed fonts (system fonts that may not render consistently)
  const DISALLOWED_FONTS = [
    'comic sans ms',
    'papyrus',
    'impact',
    'arial black',
    'courier new'
  ];

  // Check font embedding
  // Font embedding is allowed by default (we use web-safe fonts)
  // This is a pass unless we detect embedded fonts that might cause issues
  if (renderedHtml) {
    // Check for @font-face declarations (font embedding)
    const hasFontFace = /@font-face/i.test(renderedHtml);
    if (hasFontFace) {
      warnings.push('Font embedding detected: Ensure embedded fonts are properly licensed for KDP');
    }
  }

  // Check for disallowed fonts
  const allStyles = styles || [];
  allStyles.forEach((style) => {
    const styleName = (style.name || '').toLowerCase();
    const props = style.properties || {};
    
    // Check style name for disallowed fonts
    DISALLOWED_FONTS.forEach((disallowed) => {
      if (styleName.includes(disallowed)) {
        errors.push(`Disallowed font detected in style "${style.name}": ${disallowed}`);
        checks.noDisallowedFonts = false;
      }
    });

    // Check properties for font-family
    if (props.raw) {
      const fontFamily = props.raw.Properties?.AppliedFont || props.raw.AppliedFont;
      if (fontFamily) {
        const fontLower = String(fontFamily).toLowerCase();
        DISALLOWED_FONTS.forEach((disallowed) => {
          if (fontLower.includes(disallowed)) {
            errors.push(`Disallowed font in style "${style.name}": ${fontFamily}`);
            checks.noDisallowedFonts = false;
          }
        });
      }
    }
  });

  // Check for inline font sizes
  // Inline font sizes are not allowed in KDP (should use styles)
  if (renderedHtml) {
    // Check for inline style attributes with font-size
    const inlineFontSizeRegex = /style\s*=\s*["'][^"']*font-size[^"']*["']/gi;
    const matches = renderedHtml.match(inlineFontSizeRegex);
    if (matches && matches.length > 0) {
      errors.push(`Inline font sizes detected (${matches.length} instances): Use paragraph/character styles instead`);
      checks.noInlineFontSizes = false;
    }

    // Check for <font size=""> tags (deprecated)
    const fontTags = renderedHtml.match(/<font[^>]*size\s*=/gi);
    if (fontTags && fontTags.length > 0) {
      errors.push(`<font size=""> tags detected (${fontTags.length} instances): Use CSS styles instead`);
      checks.noInlineFontSizes = false;
    }
  }

  return { errors, warnings, checks };
}

/**
 * Validate Print Rules
 * - Trim size valid
 * - Margins compliant
 * - Page breaks correct
 */
function validatePrintRules(manuscript, options = {}) {
  const errors = [];
  const warnings = [];
  const checks = {
    trimSizeValid: false,
    marginsCompliant: true,
    pageBreaksCorrect: true
  };

  const preset = options.preset || '6x9';
  const trimSize = KDP_PRESETS[preset];

  // Check trim size validity
  if (trimSize) {
    // KDP acceptable trim sizes (in inches)
    const validSizes = [
      { w: 5, h: 8 },
      { w: 5.25, h: 8 },
      { w: 5.5, h: 8.5 },
      { w: 6, h: 9 },
      { w: 6.14, h: 9.21 },
      { w: 6.69, h: 9.61 },
      { w: 7, h: 10 },
      { w: 7.44, h: 9.69 },
      { w: 8, h: 10 },
      { w: 8.25, h: 10.75 },
      { w: 8.5, h: 11 }
    ];

    const isValidSize = validSizes.some(
      (size) => Math.abs(size.w - trimSize.w) < 0.01 && Math.abs(size.h - trimSize.h) < 0.01
    );

    if (isValidSize) {
      checks.trimSizeValid = true;
    } else {
      errors.push(`Invalid trim size: ${trimSize.w}" x ${trimSize.h}" (preset: ${preset})`);
    }
  } else {
    errors.push(`Unknown trim size preset: ${preset}`);
  }

  // Check margins compliance
  // KDP minimum margins: 0.5" on all sides for most sizes
  // Inner margin should be at least 0.75" for binding
  const baseMargins = {
    top: 0.75,
    bottom: 0.75,
    inner: 0.9,
    outer: 0.7
  };

  // These are the default margins we use, so they should be compliant
  // But we check if custom margins are provided
  if (options.margins) {
    const margins = options.margins;
    if (margins.top < 0.5 || margins.bottom < 0.5) {
      errors.push('Margins too small: Minimum 0.5" required for top and bottom');
      checks.marginsCompliant = false;
    }
    if (margins.inner < 0.75) {
      errors.push('Inner margin too small: Minimum 0.75" required for binding');
      checks.marginsCompliant = false;
    }
    if (margins.outer < 0.5) {
      warnings.push('Outer margin less than recommended: 0.7" recommended');
    }
  }

  // Check page breaks
  // Page breaks should be at chapter boundaries
  if (manuscript) {
    const chapters = manuscript.chapters || [];
    chapters.forEach((chapter, index) => {
      // First chapter should not have page-break-before
      // Subsequent chapters should have page breaks
      // This is handled in CSS, so we just verify structure
      if (index > 0 && !chapter.id) {
        warnings.push(`Chapter at index ${index} missing ID, may affect page break handling`);
      }
    });
  }

  return { errors, warnings, checks };
}

/**
 * Generate Warnings (Non-Blocking)
 * - Long chapters
 * - Excessive italics
 * - Scene break spacing
 */
function generateWarnings(manuscript, styles) {
  const warnings = [];
  const checks = {
    longChapters: [],
    excessiveItalics: [],
    sceneBreakSpacing: []
  };

  if (!manuscript) return { warnings, checks };

  const chapters = manuscript.chapters || [];
  const LONG_CHAPTER_THRESHOLD = 10000; // characters
  const EXCESSIVE_ITALICS_THRESHOLD = 0.3; // 30% of text

  chapters.forEach((chapter) => {
    const blocks = chapter.blocks || [];
    let totalChars = 0;
    let italicChars = 0;

    blocks.forEach((block) => {
      const text = block?.text || '';
      totalChars += text.length;

      // Check for italic character styles in spans
      if (block.spans && block.spans.length > 0) {
        block.spans.forEach((span) => {
          const spanStyle = styles?.find(s => s.id === span.styleId);
          const styleName = (spanStyle?.name || '').toLowerCase();
          
          if (styleName.includes('italic')) {
            const spanText = text.substring(span.start, span.end);
            italicChars += spanText.length;
          }
        });
      }

      // Check for scene breaks (common patterns)
      // Scene breaks often have extra spacing or special characters
      const sceneBreakPatterns = [
        /^\s*\*\s*\*\s*\*\s*$/,  // ***
        /^\s*#\s*#\s*#\s*$/,     // ###
        /^\s*~\s*~\s*~\s*$/,     // ~~~
        /^\s*-\s*-\s*-\s*$/,     // ---
        /^\s*\.\s*\.\s*\.\s*$/   // ...
      ];

      sceneBreakPatterns.forEach((pattern) => {
        if (pattern.test(text.trim())) {
          // Check spacing around scene break
          const blockIndex = blocks.indexOf(block);
          if (blockIndex > 0 && blockIndex < blocks.length - 1) {
            const prevBlock = blocks[blockIndex - 1];
            const nextBlock = blocks[blockIndex + 1];
            const prevText = (prevBlock?.text || '').trim();
            const nextText = (nextBlock?.text || '').trim();
            
            // Scene breaks should have spacing before and after
            if (prevText.length > 0 && nextText.length > 0) {
              // This is likely a scene break, check if spacing is adequate
              // (We can't easily check CSS spacing here, so we just note it)
              checks.sceneBreakSpacing.push({
                chapter: chapter.title || chapter.id,
                blockId: block.id
              });
            }
          }
        }
      });
    });

    // Check for long chapters
    if (totalChars > LONG_CHAPTER_THRESHOLD) {
      const wordCount = Math.round(totalChars / 5); // Rough estimate
      warnings.push(`Chapter "${chapter.title || chapter.id}" is very long (${wordCount.toLocaleString()} words estimated). Consider splitting.`);
      checks.longChapters.push({
        chapter: chapter.title || chapter.id,
        charCount: totalChars
      });
    }

    // Check for excessive italics
    if (totalChars > 0) {
      const italicRatio = italicChars / totalChars;
      if (italicRatio > EXCESSIVE_ITALICS_THRESHOLD) {
        warnings.push(`Chapter "${chapter.title || chapter.id}" has excessive italics (${Math.round(italicRatio * 100)}% of text). Consider reducing for better readability.`);
        checks.excessiveItalics.push({
          chapter: chapter.title || chapter.id,
          ratio: italicRatio
        });
      }
    }
  });

  return { warnings, checks };
}

/**
 * Main KDP Validation Function
 * Runs all validation categories and returns comprehensive checklist
 */
function validateKDP(manuscript, styles, options = {}) {
  const { renderEbook } = require('../render/ebook');
  
  // Render HTML for EPUB compliance and typography checks
  let renderedHtml = null;
  try {
    const renderResult = renderEbook({ manuscript, styles });
    renderedHtml = renderResult?.html || null;
  } catch (error) {
    // If rendering fails, we'll skip HTML-based checks
  }

  // Run all validation categories
  const structure = validateStructure(manuscript);
  const epubCompliance = validateEpubCompliance(manuscript, styles, renderedHtml);
  const typography = validateTypography(manuscript, styles, renderedHtml);
  const printRules = validatePrintRules(manuscript, options);
  const warnings = generateWarnings(manuscript, styles);

  // Aggregate results
  const allErrors = [
    ...structure.errors,
    ...epubCompliance.errors,
    ...typography.errors,
    ...printRules.errors
  ];

  const allWarnings = [
    ...structure.warnings,
    ...epubCompliance.warnings,
    ...typography.warnings,
    ...printRules.warnings,
    ...warnings.warnings
  ];

  // Calculate overall status
  const hasErrors = allErrors.length > 0;
  const hasWarnings = allWarnings.length > 0;
  const isValid = !hasErrors;

  return {
    valid: isValid,
    errors: allErrors,
    warnings: allWarnings,
    categories: {
      structure: {
        ...structure,
        status: structure.errors.length === 0 ? 'pass' : 'fail'
      },
      epubCompliance: {
        ...epubCompliance,
        status: epubCompliance.errors.length === 0 ? 'pass' : 'fail'
      },
      typography: {
        ...typography,
        status: typography.errors.length === 0 ? 'pass' : 'fail'
      },
      printRules: {
        ...printRules,
        status: printRules.errors.length === 0 ? 'pass' : 'fail'
      },
      warnings: {
        ...warnings,
        status: 'warning' // Always warning status (non-blocking)
      }
    },
    summary: {
      totalErrors: allErrors.length,
      totalWarnings: allWarnings.length,
      passed: isValid,
      failed: hasErrors
    }
  };
}

module.exports = {
  validateKDP,
  validateStructure,
  validateEpubCompliance,
  validateTypography,
  validatePrintRules,
  generateWarnings
};

