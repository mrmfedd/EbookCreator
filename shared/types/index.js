/**
 * Shared Type Definitions
 * 
 * Core types used across the monorepo
 */

/**
 * @typedef {Object} Manuscript
 * @property {string} id
 * @property {string} title
 * @property {Object} metadata
 * @property {string} styleRegistryId
 * @property {Chapter[]} frontMatter
 * @property {Chapter[]} chapters
 * @property {Chapter[]} backMatter
 */

/**
 * @typedef {Object} Chapter
 * @property {string} id
 * @property {string} title
 * @property {string} subtitle
 * @property {Block[]} blocks
 * @property {number} order
 */

/**
 * @typedef {Object} Block
 * @property {string} id
 * @property {string} type - 'paragraph'
 * @property {string} text
 * @property {string} styleId
 * @property {Span[]} spans
 */

/**
 * @typedef {Object} Span
 * @property {string} id
 * @property {string} styleId
 * @property {number} start
 * @property {number} end
 */

/**
 * @typedef {Object} Style
 * @property {string} id
 * @property {string} name
 * @property {string} type - 'paragraph' | 'character' | 'object'
 * @property {boolean} locked
 * @property {Object} properties
 */

module.exports = {};

