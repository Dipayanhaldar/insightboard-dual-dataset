// Vercel detects Express applications from a root-level entrypoint.
// The application and route implementation remain shared with the Render server.
import express from 'express';
import app from './server/index.js';

void express;
export default app;
