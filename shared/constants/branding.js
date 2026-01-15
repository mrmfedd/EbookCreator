/**
 * Anointed Pages Publishing Branding System
 * 
 * "Where the Anointing Meets Excellence."
 * Professional publishing without compromising spiritual integrity.
 */

export const BRAND = {
  name: 'Anointed Pages Publishing',
  tagline: 'Where the Anointing Meets Excellence.',
  promise: 'Professional publishing without compromising spiritual integrity.'
};

export const COLORS = {
  primary: '#4B2E83',      // Deep Royal Purple
  secondary: '#C9A24D',    // Antique Gold
  background: '#FAF7F2',   // Warm Parchment
  text: '#1F1F1F',         // Charcoal Black
  accent: '#7A1E2D'        // Burgundy
};

export const TYPOGRAPHY = {
  headings: {
    primary: 'Playfair Display',
    fallback: 'Libre Baskerville',
    stack: '"Playfair Display", "Libre Baskerville", serif'
  },
  body: {
    primary: 'Source Serif Pro',
    fallback: 'EB Garamond',
    stack: '"Source Serif Pro", "EB Garamond", serif'
  },
  ui: {
    primary: 'Inter',
    fallback: 'Lato',
    stack: '"Inter", "Lato", system-ui, sans-serif'
  }
};

export const UI_TONE = {
  elegant: true,
  minimal: true,
  seminaryGrade: true,
  sacredButModern: true
};

export const ICONOGRAPHY = {
  bookAndFlame: '📖🔥',
  oilDropAndQuill: '💧✍️',
  crossImplied: true // Never literal-heavy
};

module.exports = {
  BRAND,
  COLORS,
  TYPOGRAPHY,
  UI_TONE,
  ICONOGRAPHY
};

