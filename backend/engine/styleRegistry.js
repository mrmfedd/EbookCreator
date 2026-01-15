const makeId = (prefix) =>
  `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

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
      type,
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
}

module.exports = StyleRegistry;
