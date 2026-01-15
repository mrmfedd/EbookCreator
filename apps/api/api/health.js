/**
 * Vercel Serverless Function Example
 * 
 * This is an example of how to convert Express routes to Vercel serverless functions.
 * 
 * Original Express route:
 * app.get('/api/health', (req, res) => {
 *   res.json({ status: 'ok', timestamp: new Date().toISOString() });
 * });
 */

export default function handler(req, res) {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    platform: 'vercel'
  });
}

