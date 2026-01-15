const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { parseIDML } = require('./services/idmlParser');
const {
  exportDocx,
  exportEpub,
  exportPdf,
  exportIdml
} = require('./services/exporter');
const engine = require('./engine');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const allowedExtensions = new Set(['.idml', '.epub', '.docx', '.pdf', '.txt']);

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}_${safeName}`);
    }
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.indd') {
      return cb(
        new Error('INDD not supported. Export to IDML before upload.'),
        false
      );
    }
    if (!allowedExtensions.has(ext)) {
      return cb(
        new Error('Unsupported file type. Use IDML, EPUB, DOCX, PDF, or TXT.'),
        false
      );
    }
    cb(null, true);
  }
});

const uploadsIndex = [];

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/info', (req, res) => {
  res.json({
    name: 'EbookPro',
    description: 'Publishing bridge for InDesign-safe ebook workflows.',
    status: 'bootstrapped'
  });
});

// Phase 1 Core Engine
app.get('/api/engine/schemas', (req, res) => {
  res.json(engine.schemas);
});

app.get('/api/engine/render/presets', (req, res) => {
  res.json({ kdp: engine.KDP_PRESETS });
});

app.post('/api/engine/render/ebook', (req, res) => {
  try {
    const { manuscriptId, manuscript, styles } = req.body || {};
    const ms = manuscriptId ? engine.getManuscript(manuscriptId) : manuscript;
    if (!ms) return res.status(404).json({ error: 'Manuscript not found' });
    const styleList =
      styles ||
      (manuscriptId ? engine.listStyles(manuscriptId) : []);
    const result = engine.renderEbook({ manuscript: ms, styles: styleList });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/engine/render/print', (req, res) => {
  try {
    const { manuscriptId, manuscript, styles, options } = req.body || {};
    const ms = manuscriptId ? engine.getManuscript(manuscriptId) : manuscript;
    if (!ms) return res.status(404).json({ error: 'Manuscript not found' });
    const styleList =
      styles ||
      (manuscriptId ? engine.listStyles(manuscriptId) : []);
    const result = engine.renderPrint({
      manuscript: ms,
      styles: styleList,
      options: options || {}
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/engine/validate', (req, res) => {
  try {
    const { manuscriptId, targets, options } = req.body || {};
    const ms = manuscriptId ? engine.getManuscript(manuscriptId) : null;
    if (!ms) return res.status(404).json({ error: 'Manuscript not found' });
    const styles = engine.listStyles(manuscriptId);
    const set = new Set(Array.isArray(targets) ? targets : ['manuscript', 'toc']);

    const result = {};
    if (set.has('manuscript')) result.manuscript = engine.validateManuscript(ms);
    if (set.has('toc')) result.toc = engine.validateToc(ms);
    if (set.has('print')) result.print = engine.validatePrint(options || { preset: '6x9' });

    // EPUB validation requires an exported file; this returns structural readiness checks only.
    if (set.has('epub')) {
      const { html } = engine.renderEbook({ manuscript: ms, styles });
      if (!html) result.epub = { errors: ['Ebook renderer produced no HTML'], warnings: [] };
      else result.epub = { errors: [], warnings: ['EPUB file-level validation runs after export.'] };
    }

    // KDP comprehensive validation
    if (set.has('kdp')) {
      result.kdp = engine.validateKDP(ms, styles, options || { preset: '6x9' });
    }

    res.json({ validation: result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/engine/export/:format', async (req, res) => {
  try {
    const { manuscriptId, options } = req.body || {};
    const ms = manuscriptId ? engine.getManuscript(manuscriptId) : null;
    if (!ms) return res.status(404).json({ error: 'Manuscript not found' });
    const styles = engine.listStyles(manuscriptId);
    const outputDir = path.join(__dirname, 'exports');
    const format = req.params.format;

    let out = null;
    let warnings = [];
    if (format === 'epub') {
      out = await engine.exportEpub({ manuscript: ms, styles, outputDir });
      const v = engine.validateEpub(out.path);
      if (v.errors.length) {
        return res.status(400).json({ error: `EPUB validation failed: ${v.errors[0]}`, validation: v });
      }
      warnings = v.warnings;
    } else if (format === 'docx') {
      out = await engine.exportDocxInDesignSafe({ manuscript: ms, styles, outputDir });
      warnings = ['DOCX export is style-mapped best-effort; full InDesign round-trip fidelity may require additional mapping.'];
    } else if (format === 'pdf') {
      const preset = options?.preset || '6x9';
      const pro = options?.pro === true;
      if (pro) {
        out = await engine.exportPrintPdfPro({
          manuscript: ms,
          outputDir,
          options: {
            preset,
            mirrorMargins: true,
            hyphenate: true,
            widows: 2,
            orphans: 2
          }
        });
        warnings = [
          ...engine.validatePrint({ preset }).warnings,
          'PDF generated with pro pagination (hyphenation + widow/orphan rules).'
        ];
      } else {
        out = await engine.exportPrintPdf({
          manuscript: ms,
          outputDir,
          options: { preset }
        });
        warnings = engine.validatePrint({ preset }).warnings;
      }
    } else if (format === 'idml') {
      const mode = options?.mode || 'roundtrip';
      if (mode === 'roundtrip') {
        out = await engine.exportIdmlRoundTrip({
          manuscript: ms,
          styles,
          sourceIdmlPath: ms.source?.filePath,
          outputDir
        });
        warnings = out.warnings || [];
      } else {
        out = await engine.exportIdmlStub({ manuscript: ms, outputDir });
        warnings = out.warnings || [];
      }
    } else {
      return res.status(400).json({ error: 'Unsupported export format' });
    }

    const fileName = path.basename(out.path);
    res.json({
      success: true,
      format,
      warnings,
      downloadUrl: `/api/download/${fileName}`
    });
  } catch (error) {
    console.error('Engine export error:', error);
    res.status(400).json({ error: error.message || 'Export failed' });
  }
});

app.post('/api/engine/manuscript', (req, res) => {
  try {
    const manuscript = engine.createManuscript(req.body || {});
    res.json({ manuscript });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/engine/import/idml', (req, res) => {
  try {
    const { filePath, uploadId, title, metadata } = req.body || {};
    const resolvedPath = uploadId
      ? uploadsIndex.find((u) => u.id === uploadId)?.filePath
      : filePath;
    if (!resolvedPath) {
      return res
        .status(400)
        .json({ error: 'filePath or uploadId is required' });
    }
    const result = engine.importIDML(resolvedPath);
    const manuscript = engine.createManuscript({
      title: title || path.basename(resolvedPath, '.idml'),
      metadata: metadata || {}
    });
    manuscript.source = {
      type: 'idml',
      filePath: resolvedPath
    };
    result.styles.forEach((style) => {
      engine.addStyle(manuscript.id, {
        id: style.id,
        name: style.name,
        type: style.type,
        locked: true,
        properties: style.properties
      });
    });
    manuscript.chapters = result.chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      subtitle: '',
      section: chapter.section || 'body',
      blocks: [],
      order: chapter.order
    }));

    // Naive block→chapter mapping: first chapter gets content until next chapter title.
    // (No HTML/CSS; blocks reference styleId only.)
    let chapterIndex = 0;
    manuscript.chapters.forEach((c) => {
      c.blocks = [];
    });
    result.blocks.forEach((block) => {
      const styleName = String(block.properties?.rawAppliedParagraphStyle || '');
      const isChapterTitle =
        /chapter/i.test(styleName) || /^chapter\b/i.test(block.text);
      if (isChapterTitle && manuscript.chapters[chapterIndex]) {
        // Ensure chapter title stays as chapter title (still style-based)
        manuscript.chapters[chapterIndex].title = block.text;
        // Advance to next chapter for subsequent blocks
        chapterIndex = Math.min(chapterIndex + 1, manuscript.chapters.length - 1);
        return;
      }
      const target = manuscript.chapters[Math.max(0, chapterIndex - 1)] || manuscript.chapters[0];
      if (target) {
        target.blocks.push({
          id: block.id,
          type: 'paragraph',
          text: block.text,
          styleId: block.styleId,
          spans: [],
          properties: block.properties
        });
      }
    });

    res.json({
      manuscript,
      importLogs: result.logs,
      styleCount: result.styles.length,
      chapterCount: result.chapters.length
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/engine/manuscript/:id', (req, res) => {
  const manuscript = engine.getManuscript(req.params.id);
  if (!manuscript) {
    return res.status(404).json({ error: 'Manuscript not found' });
  }
  res.json({ manuscript });
});

app.patch('/api/engine/manuscript/:id', (req, res) => {
  try {
    const manuscript = engine.updateManuscript(req.params.id, req.body || {});
    res.json({ manuscript });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/engine/manuscript/:id/chapters', (req, res) => {
  try {
    const chapter = engine.addChapter(req.params.id, req.body || {});
    res.json({ chapter });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/engine/manuscript/:id/chapters/:chapterId', (req, res) => {
  try {
    const chapters = engine.deleteChapter(req.params.id, req.params.chapterId);
    res.json({ chapters });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/engine/manuscript/:id/chapters/reorder', (req, res) => {
  try {
    const { orderedIds } = req.body || {};
    const chapters = engine.reorderChapters(req.params.id, orderedIds || []);
    res.json({ chapters });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/engine/manuscript/:id/chapters/:chapterId', (req, res) => {
  try {
    const chapter = engine.updateChapter(
      req.params.id,
      req.params.chapterId,
      req.body || {}
    );
    res.json({ chapter });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/engine/manuscript/:id/styles', (req, res) => {
  try {
    const styles = engine.listStyles(req.params.id);
    res.json({ styles });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/engine/manuscript/:id/styles', (req, res) => {
  try {
    const style = engine.addStyle(req.params.id, req.body || {});
    res.json({ style });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/engine/manuscript/:id/styles/:styleId', (req, res) => {
  try {
    const style = engine.updateStyle(
      req.params.id,
      req.params.styleId,
      req.body || {}
    );
    res.json({ style });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch(
  '/api/engine/manuscript/:id/chapters/:chapterId/blocks/:blockId',
  (req, res) => {
    try {
      const block = engine.updateBlock(
        req.params.id,
        req.params.chapterId,
        req.params.blockId,
        req.body || {}
      );
      res.json({ block });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const record = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    originalName: req.file.originalname,
    storedName: req.file.filename,
    size: req.file.size,
    extension: path.extname(req.file.originalname).toLowerCase(),
    filePath: req.file.path,
    uploadedAt: new Date().toISOString()
  };
  uploadsIndex.unshift(record);
  res.json({
    success: true,
    file: record
  });
});

app.use((err, req, res, next) => {
  if (err instanceof Error && err.message) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

app.get('/api/uploads', (req, res) => {
  res.json({ files: uploadsIndex.slice(0, 20) });
});

app.post('/api/idml/parse', (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) {
      return res.status(400).json({ error: 'Upload id is required' });
    }
    const record = uploadsIndex.find((file) => file.id === id);
    if (!record) {
      return res.status(404).json({ error: 'Upload not found' });
    }
    if (record.extension !== '.idml') {
      return res.status(400).json({
        error: 'IDML required. Export your INDD to IDML before upload.'
      });
    }
    const result = parseIDML(record.filePath);
    const styleRegistry = [
      ...result.styles.paragraphStyles.map((style) => ({
        id: style.self || style.name,
        name: style.name || style.self,
        type: 'paragraph',
        locked: true
      })),
      ...result.styles.characterStyles.map((style) => ({
        id: style.self || style.name,
        name: style.name || style.self,
        type: 'character',
        locked: true
      })),
      ...result.styles.objectStyles.map((style) => ({
        id: style.self || style.name,
        name: style.name || style.self,
        type: 'object',
        locked: true
      }))
    ];
    record.styleRegistry = styleRegistry;
    record.parseResult = result;
    record.chapters = result.chapters || [];
    record.content = result.content || { paragraphs: [] };
    res.json({ success: true, result, styleRegistry });
  } catch (error) {
    console.error('IDML parse error:', error);
    res.status(500).json({ error: error.message || 'IDML parse failed' });
  }
});

app.get('/api/styles/:id', (req, res) => {
  const record = uploadsIndex.find((file) => file.id === req.params.id);
  if (!record || !record.styleRegistry) {
    return res.status(404).json({ error: 'Style registry not found' });
  }
  res.json({ styles: record.styleRegistry });
});

app.post('/api/styles/:id/lock', (req, res) => {
  const record = uploadsIndex.find((file) => file.id === req.params.id);
  if (!record || !record.styleRegistry) {
    return res.status(404).json({ error: 'Style registry not found' });
  }
  const { styleId, locked } = req.body || {};
  const style = record.styleRegistry.find((item) => item.id === styleId);
  if (!style) {
    return res.status(404).json({ error: 'Style not found' });
  }
  style.locked = Boolean(locked);
  res.json({ success: true, style });
});

app.get('/api/chapters/:id', (req, res) => {
  const record = uploadsIndex.find((file) => file.id === req.params.id);
  if (!record || !record.chapters) {
    return res.status(404).json({ error: 'Chapters not found' });
  }
  res.json({ chapters: record.chapters });
});

app.post('/api/chapters/:id/update', (req, res) => {
  const record = uploadsIndex.find((file) => file.id === req.params.id);
  if (!record || !record.chapters) {
    return res.status(404).json({ error: 'Chapters not found' });
  }
  const { chapters } = req.body || {};
  if (!Array.isArray(chapters)) {
    return res.status(400).json({ error: 'chapters array is required' });
  }
  const normalized = chapters.map((chapter, index) => ({
    id: chapter.id,
    title: chapter.title,
    styleName: chapter.styleName,
    order: index + 1
  }));
  record.chapters = normalized;
  res.json({ success: true, chapters: record.chapters });
});

app.post('/api/toc/:id/generate', (req, res) => {
  const record = uploadsIndex.find((file) => file.id === req.params.id);
  if (!record) {
    return res.status(404).json({ error: 'Upload not found' });
  }
  const { styles } = req.body || {};
  const selectedStyles = Array.isArray(styles) ? styles : [];
  const chapters = record.chapters || [];
  const tocEntries = chapters
    .filter((chapter) =>
      selectedStyles.length === 0
        ? true
        : selectedStyles.includes(chapter.styleName)
    )
    .map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      styleName: chapter.styleName
    }));
  record.toc = tocEntries;
  res.json({ success: true, toc: tocEntries });
});

app.get('/api/content/:id', (req, res) => {
  const record = uploadsIndex.find((file) => file.id === req.params.id);
  if (!record || !record.content) {
    return res.status(404).json({ error: 'Content not found' });
  }
  res.json({ content: record.content });
});

app.post('/api/content/:id/update', (req, res) => {
  const record = uploadsIndex.find((file) => file.id === req.params.id);
  if (!record || !record.content) {
    return res.status(404).json({ error: 'Content not found' });
  }
  const { paragraphId, text, styleName } = req.body || {};
  if (!paragraphId) {
    return res.status(400).json({ error: 'paragraphId is required' });
  }
  const para = record.content.paragraphs.find(
    (item) => item.id === paragraphId
  );
  if (!para) {
    return res.status(404).json({ error: 'Paragraph not found' });
  }
  if (typeof text === 'string') {
    para.text = text;
  }
  if (typeof styleName === 'string') {
    para.styleName = styleName;
  }
  res.json({ success: true, paragraph: para });
});

app.post('/api/export/:id/:format', async (req, res) => {
  try {
    const record = uploadsIndex.find((file) => file.id === req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'Upload not found' });
    }
    const format = req.params.format;
    const outputDir = path.join(__dirname, 'exports');
    const baseName = `${record.id}-${Date.now()}`;
    let outputPath;
    if (format === 'docx') {
      outputPath = await exportDocx({
        outputDir,
        fileName: baseName,
        content: record.content || { paragraphs: [] }
      });
    } else if (format === 'epub') {
      outputPath = await exportEpub({ outputDir, fileName: baseName });
    } else if (format === 'pdf') {
      outputPath = await exportPdf({ outputDir, fileName: baseName });
    } else if (format === 'idml') {
      outputPath = await exportIdml({ outputDir, fileName: baseName });
    } else {
      return res.status(400).json({ error: 'Unsupported export format' });
    }
    res.json({
      success: true,
      format,
      downloadUrl: `/api/download/${path.basename(outputPath)}`
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message || 'Export failed' });
  }
});

app.get('/api/download/:fileName', (req, res) => {
  const exportsDir = path.join(__dirname, 'exports');
  const filePath = path.join(exportsDir, req.params.fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  res.download(filePath);
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
