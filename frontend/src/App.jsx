import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [health, setHealth] = useState({ status: 'checking' })
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploads, setUploads] = useState([])
  const [parseResult, setParseResult] = useState(null)
  const [parseStatus, setParseStatus] = useState('')
  const [styleRegistry, setStyleRegistry] = useState([])
  const [chapters, setChapters] = useState([])
  const [chapterStatus, setChapterStatus] = useState('')
  const [tocStatus, setTocStatus] = useState('')
  const [tocEntries, setTocEntries] = useState([])
  const [tocStyleFilters, setTocStyleFilters] = useState([])
  const [content, setContent] = useState([])
  const [editorStatus, setEditorStatus] = useState('')
  const [exportStatus, setExportStatus] = useState('')
  const [exportLinks, setExportLinks] = useState([])
  const [activeTab, setActiveTab] = useState('writing')
  const [activeChapterId, setActiveChapterId] = useState('all')
  const [manuscript, setManuscript] = useState(null)
  const [engineStyles, setEngineStyles] = useState([])
  const [focusedBlock, setFocusedBlock] = useState(null)
  const [undoStack, setUndoStack] = useState([])
  const [redoStack, setRedoStack] = useState([])
  const [previewMode, setPreviewMode] = useState('ebook')
  const [printPreset, setPrintPreset] = useState('6x9')
  const [renderedHtml, setRenderedHtml] = useState('')
  const [renderStatus, setRenderStatus] = useState('')
  const [validation, setValidation] = useState(null)
  const [exportWarnings, setExportWarnings] = useState([])
  const [exportMenuOpen, setExportMenuOpen] = useState(false)

  const refreshUploads = () => {
    fetch('/api/uploads')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.files)) {
          setUploads(data.files)
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    let isMounted = true
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) setHealth(data)
      })
      .catch(() => {
        if (isMounted) setHealth({ status: 'unreachable' })
      })
    refreshUploads()
    return () => {
      isMounted = false
    }
  }, [])

  const handleUpload = async (event) => {
    event.preventDefault()
    const file = event.target.elements.file?.files?.[0]
    if (!file) {
      setUploadStatus('Please choose a file first.')
      return
    }
    setUploadStatus('Uploading...')
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      const text = await res.text()
      if (!res.ok) {
        throw new Error(text || 'Upload failed')
      }
      const data = text ? JSON.parse(text) : {}
      if (data.file) {
        setUploads((prev) => [data.file, ...prev].slice(0, 20))
        setUploadStatus(
          `Uploaded: ${data.file.originalName} (${data.file.size} bytes)`
        )
        refreshUploads()
      } else {
        setUploadStatus('Uploaded, but no response details returned.')
      }
      event.target.reset()
    } catch (error) {
      setUploadStatus(`Upload failed. ${error.message}`)
    }
  }

  const handleParseIdml = async (upload) => {
    setParseStatus('Parsing IDML...')
    setParseResult(null)
    setStyleRegistry([])
    try {
      const res = await fetch('/api/idml/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: upload.id })
      })
      const text = await res.text()
      if (!res.ok) {
        throw new Error(text || 'Parse failed')
      }
      const data = text ? JSON.parse(text) : {}
      if (data.result) {
        setParseResult({
          upload,
          ...data.result
        })
        if (Array.isArray(data.styleRegistry)) {
          setStyleRegistry(data.styleRegistry)
        }
          if (Array.isArray(data.result.chapters)) {
            setChapters(data.result.chapters)
          }
        if (Array.isArray(data.result.content?.paragraphs)) {
          setContent(data.result.content.paragraphs)
        }
        setActiveChapterId('all')
        setTocEntries([])
        setTocStyleFilters([])
        setParseStatus('Parse complete.')
      } else {
        setParseStatus('Parse completed with no details.')
      }
    } catch (error) {
      setParseStatus(`Parse failed. ${error.message}`)
    }
  }

  const pushUndo = (nextState) => {
    setUndoStack((prev) => [...prev, nextState].slice(-50))
    setRedoStack([])
  }

  const undo = () => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      setRedoStack((r) => [...r, { manuscript, engineStyles }].slice(-50))
      setManuscript(last.manuscript)
      setEngineStyles(last.engineStyles)
      return prev.slice(0, -1)
    })
  }

  const redo = () => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      setUndoStack((u) => [...u, { manuscript, engineStyles }].slice(-50))
      setManuscript(last.manuscript)
      setEngineStyles(last.engineStyles)
      return prev.slice(0, -1)
    })
  }

  const importLatestToEngine = async () => {
    const latest = uploads[0]
    if (!latest) {
      setParseStatus('No uploads found.')
      return
    }
    if (latest.extension !== '.idml') {
      setParseStatus('Upload an IDML file to import.')
      return
    }
    setParseStatus('Importing into engine...')
    try {
      const res = await fetch('/api/engine/import/idml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId: latest.id })
      })
      const text = await res.text()
      if (!res.ok) throw new Error(text || 'Import failed')
      const data = text ? JSON.parse(text) : {}
      setManuscript(data.manuscript)
      const stylesRes = await fetch(
        `/api/engine/manuscript/${data.manuscript.id}/styles`
      )
      const stylesData = await stylesRes.json()
      setEngineStyles(stylesData.styles || [])
      setActiveChapterId(data.manuscript.chapters?.[0]?.id || 'all')
      setActiveTab('writing')
      setParseStatus('Engine import complete.')
      setPreviewMode('ebook')
    } catch (error) {
      setParseStatus(`Engine import failed. ${error.message}`)
    }
  }

  const renderPreview = async (mode) => {
    if (!manuscript?.id) return
    setRenderStatus('Rendering...')
    try {
      const endpoint =
        mode === 'print' ? '/api/engine/render/print' : '/api/engine/render/ebook'
      const body =
        mode === 'print'
          ? { manuscriptId: manuscript.id, options: { preset: printPreset } }
          : { manuscriptId: manuscript.id }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const text = await res.text()
      if (!res.ok) throw new Error(text || 'Render failed')
      const data = text ? JSON.parse(text) : {}
      setRenderedHtml(data.html || '')
      setRenderStatus('Rendered.')
    } catch (error) {
      setRenderStatus(`Render failed. ${error.message}`)
    }
  }

  const runValidation = async () => {
    if (!manuscript?.id) return
    try {
      const res = await fetch('/api/engine/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manuscriptId: manuscript.id,
          targets: ['manuscript', 'toc', 'epub', 'print', 'kdp'],
          options: { preset: printPreset }
        })
      })
      const data = await res.json()
      setValidation(data.validation || null)
    } catch (error) {
      setValidation({ error: String(error?.message || error) })
    }
  }

  const exportEngine = async (format) => {
    if (!manuscript?.id) return
    setExportWarnings([])
    try {
      const res = await fetch(`/api/engine/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manuscriptId: manuscript.id,
          options: {
            preset: printPreset,
            pro: format === 'pdf',
            mode: format === 'idml' ? 'roundtrip' : undefined
          }
        })
      })
      const text = await res.text()
      if (!res.ok) throw new Error(text || 'Export failed')
      const data = text ? JSON.parse(text) : {}
      setExportWarnings(data.warnings || [])
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank', 'noreferrer')
      }
    } catch (error) {
      setExportWarnings([`Export failed: ${error.message}`])
    }
  }

  useEffect(() => {
    if (!manuscript?.id) return
    renderPreview(previewMode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manuscript?.id, previewMode, printPreset])

  const paragraphStyles = engineStyles.filter((s) => s.type === 'paragraph')
  const characterStyles = engineStyles.filter((s) => s.type === 'character')

  const adjustSpans = (oldText, newText, spans) => {
    const a = oldText || ''
    const b = newText || ''
    let start = 0
    while (start < a.length && start < b.length && a[start] === b[start]) start++
    let endA = a.length - 1
    let endB = b.length - 1
    while (
      endA >= start &&
      endB >= start &&
      a[endA] === b[endB]
    ) {
      endA--
      endB--
    }
    const delta = b.length - a.length
    const changeEndOld = endA + 1
    return (spans || [])
      .map((span) => {
        if (span.end <= start) return span
        if (span.start >= changeEndOld) {
          return { ...span, start: span.start + delta, end: span.end + delta }
        }
        return null
      })
      .filter(Boolean)
  }

  const updateBlockLocal = (chapterId, blockId, updates) => {
    if (!manuscript) return
    const next = JSON.parse(JSON.stringify(manuscript))
    const chapter = next.chapters.find((c) => c.id === chapterId)
    const block = chapter?.blocks.find((b) => b.id === blockId)
    if (!block) return
    Object.assign(block, updates)
    pushUndo({ manuscript, engineStyles })
    setManuscript(next)
  }

  const persistBlock = async (chapterId, block) => {
    if (!manuscript) return
    try {
      const res = await fetch(
        `/api/engine/manuscript/${manuscript.id}/chapters/${chapterId}/blocks/${block.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: block.text,
            styleId: block.styleId,
            spans: block.spans || []
          })
        }
      )
      const text = await res.text()
      if (!res.ok) throw new Error(text || 'Block update failed')
      setEditorStatus('Saved.')
    } catch (error) {
      setEditorStatus(`Save failed. ${error.message}`)
    }
  }

  const applyCharacterStyleToSelection = (styleId) => {
    if (!focusedBlock || !manuscript) return
    const { chapterId, blockId, start, end } = focusedBlock
    if (typeof start !== 'number' || typeof end !== 'number' || start >= end) {
      setEditorStatus('Select some text in a paragraph first.')
      return
    }
    const next = JSON.parse(JSON.stringify(manuscript))
    const chapter = next.chapters.find((c) => c.id === chapterId)
    const block = chapter?.blocks.find((b) => b.id === blockId)
    if (!block) return
    const span = {
      id: `span-${Math.random().toString(36).slice(2, 10)}`,
      styleId,
      start,
      end
    }
    block.spans = [...(block.spans || []), span]
    pushUndo({ manuscript, engineStyles })
    setManuscript(next)
    persistBlock(chapterId, block)
  }

  const moveChapter = (index, direction) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= chapters.length) return
    const reordered = [...chapters]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(nextIndex, 0, moved)
    setChapters(
      reordered.map((chapter, idx) => ({ ...chapter, order: idx + 1 }))
    )
  }

  const updateChapterTitle = (index, value) => {
    setChapters((prev) =>
      prev.map((chapter, idx) =>
        idx === index ? { ...chapter, title: value } : chapter
      )
    )
  }

  const saveChapters = async () => {
    if (!parseResult?.upload?.id) return
    setChapterStatus('Saving chapters...')
    try {
      const res = await fetch(`/api/chapters/${parseResult.upload.id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapters })
      })
      const text = await res.text()
      if (!res.ok) {
        throw new Error(text || 'Save failed')
      }
      const data = text ? JSON.parse(text) : {}
      if (Array.isArray(data.chapters)) {
        setChapters(data.chapters)
      }
      setChapterStatus('Chapters saved.')
    } catch (error) {
      setChapterStatus(`Save failed. ${error.message}`)
    }
  }

  const toggleTocStyle = (styleName) => {
    setTocStyleFilters((prev) =>
      prev.includes(styleName)
        ? prev.filter((name) => name !== styleName)
        : [...prev, styleName]
    )
  }

  const generateToc = async () => {
    if (!parseResult?.upload?.id) return
    setTocStatus('Generating TOC...')
    try {
      const res = await fetch(`/api/toc/${parseResult.upload.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ styles: tocStyleFilters })
      })
      const text = await res.text()
      if (!res.ok) {
        throw new Error(text || 'TOC generation failed')
      }
      const data = text ? JSON.parse(text) : {}
      if (Array.isArray(data.toc)) {
        setTocEntries(data.toc)
        setTocStatus('TOC generated.')
      } else {
        setTocStatus('TOC generated with no entries.')
      }
    } catch (error) {
      setTocStatus(`TOC failed. ${error.message}`)
    }
  }

  const updateParagraph = async (paragraphId, updates) => {
    if (!parseResult?.upload?.id) return
    try {
      const res = await fetch(`/api/content/${parseResult.upload.id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paragraphId, ...updates })
      })
      const text = await res.text()
      if (!res.ok) {
        throw new Error(text || 'Update failed')
      }
      const data = text ? JSON.parse(text) : {}
      if (data.paragraph) {
        setContent((prev) =>
          prev.map((para) =>
            para.id === data.paragraph.id ? data.paragraph : para
          )
        )
      }
    } catch (error) {
      setEditorStatus(`Editor update failed. ${error.message}`)
    }
  }

  const updateLocalParagraph = (paragraphId, updates) => {
    setContent((prev) =>
      prev.map((para) => (para.id === paragraphId ? { ...para, ...updates } : para))
    )
  }

  const handleExport = async (format) => {
    if (!parseResult?.upload?.id) return
    setExportStatus(`Exporting ${format.toUpperCase()}...`)
    try {
      const res = await fetch(
        `/api/export/${parseResult.upload.id}/${format}`,
        { method: 'POST' }
      )
      const text = await res.text()
      if (!res.ok) {
        throw new Error(text || 'Export failed')
      }
      const data = text ? JSON.parse(text) : {}
      if (data.downloadUrl) {
        setExportLinks((prev) => [
          { format, url: data.downloadUrl, ts: Date.now() },
          ...prev
        ])
        setExportStatus(`${format.toUpperCase()} ready.`)
      } else {
        setExportStatus('Export completed without a download link.')
      }
    } catch (error) {
      setExportStatus(`Export failed. ${error.message}`)
    }
  }

  const getStyleLock = (styleName) => {
    const style = styleRegistry.find((item) => item.name === styleName)
    return style?.locked ?? true
  }

  const handleStyleLockToggle = async (styleId, locked) => {
    if (!parseResult?.upload?.id) return
    try {
      const res = await fetch(`/api/styles/${parseResult.upload.id}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ styleId, locked })
      })
      if (!res.ok) {
        throw new Error('Failed to update style lock')
      }
      const data = await res.json()
      setStyleRegistry((prev) =>
        prev.map((style) => (style.id === data.style.id ? data.style : style))
      )
    } catch (error) {
      setParseStatus(`Style update failed. ${error.message}`)
    }
  }

  const latestUpload = uploads[0]
  const activeChapter =
    activeChapterId === 'all'
      ? null
      : chapters.find((chapter) => chapter.id === activeChapterId)
  const activeSubtitle = content.find(
    (para) =>
      para.chapterId === activeChapterId && para.role === 'chapter-subtitle'
  )?.text

  // Organize chapters into Front Matter, Body Chapters, and Back Matter
  const organizeChapters = () => {
    if (!manuscript?.chapters) return { frontMatter: [], chapters: [], backMatter: [] }
    
    const allChapters = manuscript.chapters
    // For now, assume first chapter is front matter if it has a specific role/type
    // and last chapter is back matter. In a real implementation, this would check chapter.type or chapter.role
    const frontMatter = []
    const chapters = []
    const backMatter = []
    
    allChapters.forEach((chapter) => {
      // Simple heuristic: if chapter title suggests front/back matter, categorize it
      const titleLower = chapter.title?.toLowerCase() || ''
      if (titleLower.includes('front matter') || titleLower.includes('title page') || 
          titleLower.includes('copyright') || titleLower.includes('dedication') ||
          titleLower.includes('table of contents') || titleLower.includes('preface')) {
        frontMatter.push(chapter)
      } else if (titleLower.includes('back matter') || titleLower.includes('appendix') ||
                 titleLower.includes('index') || titleLower.includes('glossary') ||
                 titleLower.includes('bibliography') || titleLower.includes('about the author')) {
        backMatter.push(chapter)
      } else {
        chapters.push(chapter)
      }
    })
    
    return { frontMatter, chapters, backMatter }
  }

  const { frontMatter, chapters: bodyChapters, backMatter } = organizeChapters()
  const currentBlock = focusedBlock && manuscript?.chapters
    ?.find(c => c.id === focusedBlock.chapterId)
    ?.blocks?.find(b => b.id === focusedBlock.blockId)
  const currentParagraphStyle = currentBlock 
    ? paragraphStyles.find(s => s.id === currentBlock.styleId)
    : null
  const currentStyleLocked = currentParagraphStyle 
    ? engineStyles.find(s => s.id === currentParagraphStyle.id)?.locked ?? false
    : false
  // Check if round-trip is safe (no warnings about round-trip issues)
  const hasRoundTripWarnings = exportWarnings.some(w => {
    const warning = String(w).toLowerCase()
    return warning.includes('round-trip') || warning.includes('roundtrip') || 
           warning.includes('fidelity') || warning.includes('mapping')
  })
  const isRoundTripSafe = manuscript?.id && !hasRoundTripWarnings && exportWarnings.length === 0

  return (
    <div className="ebookpro-app">
      {/* Top Bar */}
      <header className="top-bar">
        <div className="top-bar-left">
          <span className="book-title">{manuscript?.title || 'Untitled Book'}</span>
        </div>
        <div className="top-bar-right">
          <button 
            type="button" 
            className="topbar-button"
            onClick={() => {
              if (activeTab !== 'preview') {
                setActiveTab('preview')
                renderPreview(previewMode)
              } else {
                setActiveTab('writing')
              }
            }}
          >
            {activeTab === 'preview' ? 'Editor' : 'Preview'}
          </button>
          <div className="export-dropdown">
            <button 
              type="button" 
              className="topbar-button export-button"
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
            >
              Export ▼
            </button>
            {exportMenuOpen && (
              <div className="export-menu">
                <button type="button" onClick={() => { exportEngine('epub'); setExportMenuOpen(false); }}>
                  EPUB (Kindle)
                </button>
                <button type="button" onClick={() => { exportEngine('pdf'); setExportMenuOpen(false); }}>
                  PDF (Print)
                </button>
                <button type="button" onClick={() => { exportEngine('docx'); setExportMenuOpen(false); }}>
                  DOCX (InDesign)
                </button>
                <button type="button" onClick={() => { exportEngine('idml'); setExportMenuOpen(false); }}>
                  IDML (Round-trip)
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="main-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-section-header">Front Matter</div>
            <ul className="sidebar-list">
              {frontMatter.length === 0 ? (
                <li className="sidebar-item muted">No front matter</li>
              ) : (
                frontMatter.map((chapter) => (
                  <li
                    key={chapter.id}
                    className={`sidebar-item ${activeChapterId === chapter.id ? 'active' : ''}`}
                    onClick={() => setActiveChapterId(chapter.id)}
                  >
                    {chapter.title}
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-header">Chapters</div>
            <ul className="sidebar-list">
              {bodyChapters.length === 0 ? (
                <li className="sidebar-item muted">No chapters</li>
              ) : (
                bodyChapters.map((chapter, index) => (
                  <li
                    key={chapter.id}
                    className={`sidebar-item ${activeChapterId === chapter.id ? 'active' : ''}`}
                    onClick={() => setActiveChapterId(chapter.id)}
                  >
                    Chapter {index + 1}
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-header">Back Matter</div>
            <ul className="sidebar-list">
              {backMatter.length === 0 ? (
                <li className="sidebar-item muted">No back matter</li>
              ) : (
                backMatter.map((chapter) => (
                  <li
                    key={chapter.id}
                    className={`sidebar-item ${activeChapterId === chapter.id ? 'active' : ''}`}
                    onClick={() => setActiveChapterId(chapter.id)}
                  >
                    {chapter.title}
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Hidden upload section for development */}
          <div className="sidebar-section" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
            <form onSubmit={handleUpload} className="upload-inline">
              <input
                type="file"
                name="file"
                accept=".idml,.epub,.docx,.pdf,.txt"
                style={{ fontSize: '0.75rem' }}
              />
              <button type="submit" className="ghost-button" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                Upload
              </button>
            </form>
            {latestUpload && (
              <button
                type="button"
                className="ghost-button"
                onClick={importLatestToEngine}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', marginTop: '0.5rem', width: '100%' }}
              >
                Import IDML
              </button>
            )}
            {uploadStatus && <p className="muted" style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>{uploadStatus}</p>}
            {parseStatus && <p className="muted" style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>{parseStatus}</p>}
          </div>
        </aside>

        {/* Editor */}
        <main className="editor">
          {activeTab === 'preview' ? (
            <div className="preview-container">
              <div className="preview-header">
                <select
                  value={previewMode}
                  onChange={(e) => setPreviewMode(e.target.value)}
                  className="preview-select"
                >
                  <option value="ebook">Kindle (Ebook)</option>
                  <option value="print">Print</option>
                </select>
                {previewMode === 'print' && (
                  <select
                    value={printPreset}
                    onChange={(e) => setPrintPreset(e.target.value)}
                    className="preview-select"
                  >
                    <option value="5x8">5 x 8</option>
                    <option value="5.25x8">5.25 x 8</option>
                    <option value="6x9">6 x 9</option>
                    <option value="8.5x11">8.5 x 11</option>
                  </select>
                )}
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => renderPreview(previewMode)}
                >
                  Refresh
                </button>
              </div>
              <div className="preview-content">
                {renderedHtml ? (
                  <iframe
                    title="preview"
                    className="preview-iframe"
                    sandbox=""
                    srcDoc={renderedHtml}
                  />
                ) : (
                  <div className="muted">Import a manuscript to preview.</div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="editor-content">
                {!manuscript ? (
                  <div className="editor-empty">
                    <p className="muted">
                      Upload an IDML file and click "Import IDML" to load it into the editor.
                    </p>
                  </div>
                ) : (
                  (activeChapterId === 'all'
                    ? [...frontMatter, ...bodyChapters, ...backMatter]
                    : [...frontMatter, ...bodyChapters, ...backMatter].filter(
                        (c) => c.id === activeChapterId
                      )
                  ).map((chapter) => (
                    <div key={chapter.id} className="chapter-section">
                      <h1 className="chapter-title">{chapter.title}</h1>
                      {chapter.blocks.map((block) => {
                        const blockStyle = paragraphStyles.find(s => s.id === block.styleId)
                        const styleLocked = blockStyle ? (engineStyles.find(s => s.id === blockStyle.id)?.locked ?? false) : false
                        return (
                          <div key={block.id} className="editor-block">
                            <div className="block-style-indicator">
                              {styleLocked && <span className="lock-indicator" title="Style is locked">🔒</span>}
                              <span className="style-name">{blockStyle?.name || block.styleId}</span>
                            </div>
                            <textarea
                              className="editor-textarea"
                              value={block.text}
                              onFocus={(e) => {
                                setFocusedBlock({
                                  chapterId: chapter.id,
                                  blockId: block.id,
                                  start: e.target.selectionStart,
                                  end: e.target.selectionEnd
                                })
                              }}
                              onSelect={(e) => {
                                setFocusedBlock({
                                  chapterId: chapter.id,
                                  blockId: block.id,
                                  start: e.target.selectionStart,
                                  end: e.target.selectionEnd
                                })
                              }}
                              onChange={(e) => {
                                const newText = e.target.value
                                const newSpans = adjustSpans(
                                  block.text,
                                  newText,
                                  block.spans || []
                                )
                                updateBlockLocal(chapter.id, block.id, {
                                  text: newText,
                                  spans: newSpans
                                })
                              }}
                              onBlur={(e) => {
                                const newText = e.target.value
                                const updated = {
                                  ...block,
                                  text: newText,
                                  spans: adjustSpans(
                                    block.text,
                                    newText,
                                    block.spans || []
                                  )
                                }
                                persistBlock(chapter.id, updated)
                              }}
                            />
                          </div>
                        )
                      })}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Style Panel */}
      <div className="style-panel">
        <div className="style-panel-content">
          <div className="style-control">
            <label className="style-label">
              Paragraph Style
              {currentStyleLocked && <span className="lock-badge" title="Style is locked">🔒</span>}
            </label>
            <select
              className="style-select"
              value={currentBlock?.styleId || ''}
              onChange={(e) => {
                if (currentBlock && focusedBlock) {
                  updateBlockLocal(focusedBlock.chapterId, focusedBlock.blockId, {
                    styleId: e.target.value
                  })
                  const updated = {
                    ...currentBlock,
                    styleId: e.target.value
                  }
                  persistBlock(focusedBlock.chapterId, updated)
                }
              }}
              disabled={!currentBlock}
            >
              <option value="" disabled>
                {currentBlock ? 'Select paragraph style...' : 'No block selected'}
              </option>
              {paragraphStyles.map((s) => {
                const isLocked = engineStyles.find(es => es.id === s.id)?.locked ?? false
                return (
                  <option key={s.id} value={s.id}>
                    {s.name} {isLocked ? '🔒' : ''}
                  </option>
                )
              })}
            </select>
            {currentParagraphStyle && (
              <span className="style-meta" title="InDesign style name">
                ID: {currentParagraphStyle.name}
              </span>
            )}
          </div>

          <div className="style-control">
            <label className="style-label">Character Style</label>
            <select
              className="style-select"
              onChange={(e) => {
                const styleId = e.target.value
                if (styleId) applyCharacterStyleToSelection(styleId)
                e.target.value = ''
              }}
              defaultValue=""
              disabled={!focusedBlock || (focusedBlock.start === focusedBlock.end)}
            >
              <option value="" disabled>
                {focusedBlock && focusedBlock.start !== focusedBlock.end
                  ? 'Apply character style...'
                  : 'Select text to apply style'}
              </option>
              {characterStyles.map((s) => {
                const isLocked = engineStyles.find(es => es.id === s.id)?.locked ?? false
                return (
                  <option key={s.id} value={s.id}>
                    {s.name} {isLocked ? '🔒' : ''}
                  </option>
                )
              })}
            </select>
          </div>

          <div className="style-panel-right">
            {manuscript?.id && (
              <>
                {!isRoundTripSafe && (
                  <div className="roundtrip-warning" title="Some styles may not round-trip safely to IDML">
                    ⚠️ Round-trip warning
                  </div>
                )}
                {isRoundTripSafe && (
                  <div className="roundtrip-safe" title="All styles are round-trip safe">
                    ✓ Round-trip safe
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
