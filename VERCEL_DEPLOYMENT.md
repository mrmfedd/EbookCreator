# Vercel Deployment Guide

## Current Status

⚠️ **The current Express server needs to be converted to Vercel serverless functions for full deployment.**

## What Works Out of the Box

✅ **Frontend (apps/web-editor)**
- Can be deployed directly to Vercel
- Vite build works perfectly
- Static assets served correctly

## What Needs Conversion

❌ **Backend (apps/api)**
- Express server needs to be split into serverless functions
- File uploads need Vercel Blob Storage or external storage (S3, etc.)
- File system operations need to be replaced with cloud storage

## Deployment Options

### Option 1: Frontend Only (Recommended for MVP)

Deploy just the frontend to Vercel and use a separate backend service:

1. **Deploy Frontend:**
   ```bash
   cd apps/web-editor
   vercel
   ```

2. **Backend Options:**
   - Deploy backend to Railway, Render, or Fly.io
   - Use Vercel's API routes (requires conversion)
   - Use a serverless database (PlanetScale, Supabase)

### Option 2: Full Serverless (Requires Refactoring)

Convert Express routes to Vercel serverless functions:

1. **Create API Routes Structure:**
   ```
   apps/api/
   ├── api/
   │   ├── health.js
   │   ├── engine/
   │   │   ├── import/
   │   │   │   └── idml.js
   │   │   ├── export/
   │   │   │   └── [format].js
   │   │   └── validate.js
   │   └── upload.js
   ```

2. **Convert Express Routes:**
   - Each route becomes a serverless function
   - Use Vercel Blob for file storage
   - Use environment variables for configuration

### Option 3: Hybrid Approach

- Frontend on Vercel
- Backend on Railway/Render (keeps Express server)
- Connect via environment variables

## File Storage Considerations

**Current Issues:**
- Express uses local file system (`uploads/`, `exports/`)
- Vercel serverless functions are stateless
- No persistent file system

**Solutions:**
1. **Vercel Blob Storage** (recommended)
   ```javascript
   import { put, get } from '@vercel/blob';
   ```

2. **External Storage:**
   - AWS S3
   - Cloudinary
   - Supabase Storage

3. **Database for Metadata:**
   - Vercel Postgres
   - Supabase
   - PlanetScale

## Quick Start (Frontend Only)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy Frontend:**
   ```bash
   cd apps/web-editor
   vercel
   ```

3. **Set Environment Variables:**
   ```bash
   vercel env add API_URL
   # Enter your backend API URL
   ```

4. **Update Frontend API Calls:**
   ```javascript
   const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
   ```

## Recommended Architecture for Vercel

```
Frontend (Vercel)
  ↓
API Routes (Vercel Serverless)
  ↓
Vercel Blob Storage (files)
  ↓
Vercel Postgres (metadata)
```

## Migration Checklist

- [ ] Convert Express routes to serverless functions
- [ ] Set up Vercel Blob Storage
- [ ] Set up database (Vercel Postgres or external)
- [ ] Update file upload handlers
- [ ] Update file export handlers
- [ ] Configure environment variables
- [ ] Test all API endpoints
- [ ] Deploy frontend
- [ ] Deploy API routes

## Current Limitations

1. **File System:** No persistent storage in serverless
2. **Execution Time:** 10s (Hobby) / 60s (Pro) max
3. **Memory:** Limited in serverless functions
4. **Large Files:** May need streaming for exports

## Next Steps

1. **For Quick Deployment:** Deploy frontend only, keep backend separate
2. **For Full Vercel:** Convert Express to serverless functions
3. **For Production:** Consider hybrid approach with dedicated backend

