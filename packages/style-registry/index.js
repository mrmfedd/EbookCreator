/**
 * @anointed-pages/style-registry
 * 
 * InDesign-compatible style registry with 1:1 mapping.
 * Paragraph, character, and object styles.
 * Global style updates.
 */

const { makeId } = require('@anointed-pages/manuscript-core');

class StyleRegistry {
  constructor() {
    this.id = makeId('style-registry');
    this.styles = [];
  }

  listStyles() {
    return [...this.styles];
  }

  addStyle({ id, name, type, locked = true, properties = {} }) {
    if (!name || !type) {
      throw new Error('Style name and type are required');
    }
    const styleId = id || makeId('style');
    if (this.styles.find((style) => style.id === styleId)) {
      throw new Error('Style id already exists');
    }
    const style = {
      id: styleId,
      name,
      type, // 'paragraph' | 'character' | 'object'
      locked: Boolean(locked),
      properties
    };
    this.styles.push(style);
    return style;
  }

  updateStyle(styleId, updates = {}) {
    const style = this.styles.find((item) => item.id === styleId);
    if (!style) {
      throw new Error('Style not found');
    }
    Object.assign(style, {
      name: updates.name ?? style.name,
      type: updates.type ?? style.type,
      locked:
        typeof updates.locked === 'boolean' ? updates.locked : style.locked,
      properties: updates.properties ?? style.properties
    });
    return style;
  }

  getStyle(styleId) {
    return this.styles.find((item) => item.id === styleId);
  }

  getStyleByName(name) {
    return this.styles.find((item) => item.name === name);
  }

  getStylesByType(type) {
    return this.styles.filter((item) => item.type === type);
  }
}

module.exports = StyleRegistry;

