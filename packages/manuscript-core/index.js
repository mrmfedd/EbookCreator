/**
 * @anointed-pages/manuscript-core
 * 
 * Canonical manuscript schema and core data structures.
 * 
 * Structure first, layout second.
 * Chapter-based structure with front matter / body / back matter separation.
 */

const manuscriptSchema = {
  id: 'string',
  title: 'string',
  metadata: {
    author: 'string',
    language: 'string'
  },
  styleRegistryId: 'string',
  frontMatter: [
    {
      id: 'string',
      title: 'string',
      blocks: 'Block[]',
      order: 'number'
    }
  ],
  chapters: [
    {
      id: 'string',
      title: 'string',
      subtitle: 'string',
      blocks: 'Block[]',
      order: 'number'
    }
  ],
  backMatter: [
    {
      id: 'string',
      title: 'string',
      blocks: 'Block[]',
      order: 'number'
    }
  ]
};

const blockSchema = {
  id: 'string',
  type: 'paragraph',
  text: 'string',
  styleId: 'string',
  spans: [
    {
      id: 'string',
      styleId: 'string',
      start: 'number',
      end: 'number'
    }
  ]
};

const styleSchema = {
  id: 'string',
  name: 'string',
  type: 'paragraph | character | object',
  locked: 'boolean',
  properties: 'object'
};

const styleRegistrySchema = {
  id: 'string',
  styles: 'Style[]'
};

const makeId = (prefix) =>
  `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

module.exports = {
  manuscriptSchema,
  blockSchema,
  styleSchema,
  styleRegistrySchema,
  makeId
};

