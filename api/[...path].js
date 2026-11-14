import app from '../server/index.js';

// Vercel catch-all API function: all /api/* routes reuse the same Express app
// used by the standalone Render/Node server. Importing the app does not open a listener.
export default app;
