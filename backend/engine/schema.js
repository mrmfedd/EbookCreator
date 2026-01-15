const manuscriptSchema = {
  id: 'string',
  title: 'string',
  metadata: {
    author: 'string',
    publisher: 'string',
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

module.exports = {
  manuscriptSchema,
  blockSchema,
  styleSchema,
  styleRegistrySchema
};
