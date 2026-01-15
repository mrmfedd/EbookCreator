# Monorepo Migration Guide

This document outlines the migration from the current structure to the new monorepo architecture.

## Current Structure → New Structure

### Packages Created

1. **@anointed-pages/manuscript-core**
   - Location: `packages/manuscript-core/`
   - Contains: Schema definitions, ManuscriptStore
   - Status: ✅ Created

2. **@anointed-pages/style-registry**
   - Location: `packages/style-registry/`
   - Contains: StyleRegistry class, style mapping rules
   - Status: ✅ Created

3. **@anointed-pages/idml-parser**
   - Location: `packages/idml-parser/`
   - Contains: IDML import/export logic
   - Status: 📦 Package.json created, needs migration

4. **@anointed-pages/kdp-validator**
   - Location: `packages/kdp-validator/`
   - Contains: KDP validation engine
   - Status: 📦 Package.json created, re-exports existing code

5. **@anointed-pages/exporters**
   - Location: `packages/exporters/`
   - Contains: EPUB, PDF, DOCX, IDML exporters
   - Status: 📦 Package.json created, needs migration

6. **@anointed-pages/sermon-engine**
   - Location: `packages/sermon-engine/`
   - Contains: Sermon-to-book pipeline
   - Status: 📦 Package.json created, scaffolded

### Apps to Create

1. **apps/web-editor** - React publishing UI
2. **apps/render-engine** - Ebook + print renderer
3. **apps/api** - Backend services
4. **apps/ai-services** - AI formatting & content tools

## Migration Steps

### Step 1: Move Backend Code

```bash
# Move IDML parser
mv backend/services/idmlParser.js packages/idml-parser/
mv backend/engine/idmlImport.js packages/idml-parser/

# Move exporters
mv backend/engine/export/* packages/exporters/

# Move validators
mv backend/engine/validate/* packages/kdp-validator/

# Move renderers
mv backend/engine/render/* apps/render-engine/
```

### Step 2: Move Frontend Code

```bash
# Move React app
mv frontend/* apps/web-editor/
```

### Step 3: Create API App

```bash
# Move server
mv backend/server.js apps/api/
mv backend/routes/* apps/api/routes/
```

### Step 4: Update Imports

All imports need to be updated to use the new package names:
- `@anointed-pages/manuscript-core`
- `@anointed-pages/style-registry`
- `@anointed-pages/idml-parser`
- `@anointed-pages/kdp-validator`
- `@anointed-pages/exporters`
- `@anointed-pages/sermon-engine`

### Step 5: Add Branding

Update all UI components to use the Anointed Pages branding from `shared/constants/branding.js`.

## Next Steps

1. Complete package migrations
2. Create app structures
3. Update all imports
4. Add AI services scaffolding
5. Implement sermon-engine
6. Add comprehensive tests

## Branding Integration

The branding system is defined in `shared/constants/branding.js`:

- Colors: Deep Royal Purple, Antique Gold, Warm Parchment
- Typography: Playfair Display, Source Serif Pro, Inter
- Tone: Elegant, minimal, seminary-grade

Apply these throughout the web-editor app.

