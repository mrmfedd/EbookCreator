/**
 * ManuscriptStore
 * 
 * In-memory store for manuscripts.
 * In production, this would be backed by a database.
 */

const { makeId } = require('./index');

class ManuscriptStore {
  constructor() {
    this.manuscripts = new Map();
    this.styleRegistries = new Map();
  }

  createManuscript({ title = 'Untitled Manuscript', metadata = {} } = {}) {
    const manuscriptId = makeId('manuscript');
    const manuscript = {
      id: manuscriptId,
      title,
      metadata: {
        author: metadata.author || '',
        language: metadata.language || 'en'
      },
      styleRegistryId: null, // Will be set when style registry is created
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

  updateManuscript(manuscriptId, updates) {
    const manuscript = this.getManuscript(manuscriptId);
    if (!manuscript) throw new Error('Manuscript not found');
    Object.assign(manuscript, updates);
    return manuscript;
  }

  deleteManuscript(manuscriptId) {
    return this.manuscripts.delete(manuscriptId);
  }

  listManuscripts() {
    return Array.from(this.manuscripts.values());
  }
}

module.exports = ManuscriptStore;

