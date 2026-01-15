# Anointed Pages Publishing - Architecture

## Monorepo Structure

```
anointed-pages-publishing/
├── apps/
│   ├── web-editor/        → React publishing UI (Atticus-style)
│   ├── render-engine/     → Ebook + print renderer
│   ├── api/               → Backend services
│   └── ai-services/       → AI formatting & content tools
├── packages/
│   ├── manuscript-core/   → Canonical manuscript schema
│   ├── style-registry/    → InDesign-compatible styles
│   ├── idml-parser/       → IDML import/export
│   ├── kdp-validator/     → KDP compliance engine
│   ├── exporters/         → EPUB, PDF, DOCX, IDML
│   └── sermon-engine/     → Sermon-to-book pipeline
└── shared/
    ├── types/             → Shared type definitions
    ├── utils/             → Shared utilities
    └── constants/         → Branding, constants
```

## Core Architectural Rules

### 1. Structure First, Layout Second
- Manuscript structure is canonical
- Layout is derived from structure
- No layout information in manuscript data

### 2. Styles are Centralized and Global
- All styles in style registry
- No inline formatting
- Global style updates propagate

### 3. No Inline Formatting
- All formatting via style references
- Text blocks reference styleId
- Character spans reference styleId

### 4. InDesign Style Names are Preserved
- Style names match InDesign exactly
- 1:1 mapping maintained
- Round-trip safe

### 5. Rendering is Stateless
- Renderers are pure functions
- No side effects
- Deterministic output

### 6. All Exports Must be KDP-Safe
- Validation before export
- KDP compliance checks
- Warning system for risks

## Package Responsibilities

### @anointed-pages/manuscript-core
- Canonical book schema
- Chapter-based structure
- Front matter / body / back matter separation
- ManuscriptStore (in-memory, replaceable with DB)

### @anointed-pages/style-registry
- Paragraph, character, object styles
- 1:1 mapping with InDesign
- Global style updates
- Style mapping rules

### @anointed-pages/idml-parser
- Import IDML (XML parsing)
- Preserve styles, nesting, overrides
- Export round-trip IDML
- Style name preservation

### @anointed-pages/kdp-validator
- Structural validation
- Typography validation
- EPUB + print checks
- Warning vs blocking errors

### @anointed-pages/exporters
- EPUB 3 export
- KDP print PDF export
- DOCX (InDesign-safe)
- IDML round-trip export

### @anointed-pages/sermon-engine
- Sermon intake (audio, video, transcript)
- Transcription pipeline
- Structural analysis
- Chapter draft generation
- Theological tone preservation

## App Responsibilities

### apps/web-editor
- Atticus-like locked editor
- Chapter navigation
- Style selector (no free formatting)
- Live warnings for unsafe edits
- Anointed Pages branding

### apps/render-engine
- EPUB 3 renderer
- KDP print PDF renderer
- Preview modes (Kindle / Print)
- Stateless rendering

### apps/api
- REST API endpoints
- File upload handling
- Manuscript CRUD
- Export endpoints
- Validation endpoints

### apps/ai-services
- Style consistency auditor
- Chapter optimization
- Scripture formatting assistant
- KDP risk detector
- **AI suggests, user approves** (never auto-applies)

## Explicit Prohibitions

❌ No Word-style free editing
❌ No HTML-first storage
❌ No style flattening
❌ No reflow without approval
❌ No AI auto-application of changes
❌ No theological content rewriting by AI

## Brand Identity

**Anointed Pages Publishing** — "Where the Anointing Meets Excellence."

- Primary: Deep Royal Purple #4B2E83
- Secondary: Antique Gold #C9A24D
- Background: Warm Parchment #FAF7F2
- Typography: Playfair Display, Source Serif Pro, Inter
- Tone: Elegant, minimal, seminary-grade, sacred but modern

## Development Principles

1. **InDesign is a first-class citizen**
2. **Publisher-grade reliability**
3. **Structure over presentation**
4. **User approval for all AI suggestions**
5. **KDP compliance by default**

