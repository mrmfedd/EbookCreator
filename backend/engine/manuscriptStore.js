const StyleRegistry = require('./styleRegistry');
const {
  addChapter,
  deleteChapter,
  reorderChapters,
  updateChapter
} = require('./chapterManager');
const { validateSpans } = require('./validation');

const makeId = (prefix) =>
  `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

class ManuscriptStore {
  constructor() {
    this.manuscripts = new Map();
    this.styleRegistries = new Map();
  }

  createManuscript({ title = 'Untitled Manuscript', metadata = {} } = {}) {
    const manuscriptId = makeId('manuscript');
    const styleRegistry = new StyleRegistry();
    styleRegistry.addStyle({
      id: 'paragraph-default',
      name: 'Body',
      type: 'paragraph',
      locked: true,
      properties: { spacing: '1.5' }
    });
    this.styleRegistries.set(styleRegistry.id, styleRegistry);
    const manuscript = {
      id: manuscriptId,
      title,
      metadata: {
        author: metadata.author || '',
        language: metadata.language || 'en'
      },
      styleRegistryId: styleRegistry.id,
      frontMatter: [],
      chapters: [],
      backMatter: []
    };
    this.manuscripts.set(manuscriptId, manuscript);
    return manuscript;
  }

  getManuscript(manuscriptId) {
    return this.manuscripts.get(manuscriptId);
  }

  getStyleRegistry(manuscriptId) {
    const manuscript = this.getManuscript(manuscriptId);
    if (!manuscript) return null;
    return this.styleRegistries.get(manuscript.styleRegistryId);
  }

  addChapter(manuscriptId, chapterInput) {
    const manuscript = this.getManuscript(manuscriptId);
    return addChapter(manuscript, chapterInput);
  }

  deleteChapter(manuscriptId, chapterId) {
    const manuscript = this.getManuscript(manuscriptId);
    return deleteChapter(manuscript, chapterId);
  }

  reorderChapters(manuscriptId, orderedIds) {
    const manuscript = this.getManuscript(manuscriptId);
    return reorderChapters(manuscript, orderedIds);
  }

  updateChapter(manuscriptId, chapterId, updates) {
    const manuscript = this.getManuscript(manuscriptId);
    return updateChapter(manuscript, chapterId, updates);
  }

  listStyles(manuscriptId) {
    const registry = this.getStyleRegistry(manuscriptId);
    return registry ? registry.listStyles() : [];
  }

  addStyle(manuscriptId, styleInput) {
    const registry = this.getStyleRegistry(manuscriptId);
    if (!registry) {
      throw new Error('Style registry not found');
    }
    return registry.addStyle(styleInput);
  }

  updateStyle(manuscriptId, styleId, updates) {
    const registry = this.getStyleRegistry(manuscriptId);
    if (!registry) {
      throw new Error('Style registry not found');
    }
    return registry.updateStyle(styleId, updates);
  }

  updateBlock(manuscriptId, chapterId, blockId, updates = {}) {
    const manuscript = this.getManuscript(manuscriptId);
    if (!manuscript) throw new Error('Manuscript not found');
    const chapter = manuscript.chapters.find((c) => c.id === chapterId);
    if (!chapter) throw new Error('Chapter not found');
    const block = chapter.blocks.find((b) => b.id === blockId);
    if (!block) throw new Error('Block not found');

    if (typeof updates.text === 'string') {
      block.text = updates.text;
    }
    if (typeof updates.styleId === 'string') {
      block.styleId = updates.styleId;
    }
    if (Array.isArray(updates.spans)) {
      const errors = validateSpans(block.text, updates.spans);
      if (errors.length) {
        throw new Error(errors[0]);
      }
      block.spans = updates.spans;
    }
    return block;
  }
}

module.exports = ManuscriptStore;
