# Anointed Pages Publishing Platform

> "Where the Anointing Meets Excellence."

Professional ebook creation platform with InDesign round-trip workflows, Atticus-style structured editing, AI-assisted formatting, and sermon-to-book conversion.

## Architecture

This is a monorepo built for publisher-grade reliability and InDesign-first workflows.

### Structure

```
/apps
  /web-editor        → React publishing UI
  /render-engine     → Ebook + print renderer
  /api               → Backend services
  /ai-services       → AI formatting & content tools

/packages
  /manuscript-core   → Canonical manuscript schema
  /style-registry    → InDesign-compatible styles
  /idml-parser       → IDML import/export
  /kdp-validator     → KDP compliance engine
  /exporters         → EPUB, PDF, DOCX, IDML
  /sermon-engine     → Sermon-to-book pipeline

/shared
  /types
  /utils
  /constants
```

## Core Principles

- **Structure first, layout second**
- **Styles are centralized and global**
- **No inline formatting**
- **InDesign style names are preserved**
- **Rendering is stateless**
- **All exports must be KDP-safe**

## Getting Started

```bash
# Install all dependencies
npm install

# Run development servers
npm run dev

# Build all packages
npm run build
```

## Brand Identity

**Anointed Pages Publishing** — Professional publishing without compromising spiritual integrity.

- Primary: Deep Royal Purple #4B2E83
- Secondary: Antique Gold #C9A24D
- Background: Warm Parchment #FAF7F2

## License

ISC

