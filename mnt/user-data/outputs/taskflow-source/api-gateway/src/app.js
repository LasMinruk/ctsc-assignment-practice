const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// Security
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS || '*' }));
app.use(morgan('combined'));

// Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Rate limit exceeded' }
});
app.use(globalLimiter);

// Service URLs
const AUTH_SERVICE   = process.env.AUTH_SERVICE_URL   || 'http://localhost:3001';
const TASK_SERVICE   = process.env.TASK_SERVICE_URL   || 'http://localhost:3002';
const NOTIF_SERVICE  = process.env.NOTIF_SERVICE_URL  || 'http://localhost:3003';

// Proxy Options factory
const proxyOptions = (target, pathRewrite) => ({
  target,
  changeOrigin: true,
  pathRewrite,
  on: {
    error: (err, req, res) => {
      console.error(`Proxy error to ${target}:`, err.message);
      res.status(502).json({ error: 'Service unavailable', service: target });
    }
  }
});

// Health Check (Gateway itself)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    routes: {
      auth:         AUTH_SERVICE,
      tasks:        TASK_SERVICE,
      notifications: NOTIF_SERVICE
    }
  });
});

// Aggregate health check — queries all services
app.get('/health/all', async (req, res) => {
  const axios = require('axios');
  const services = [
    { name: 'auth-service',         url: `${AUTH_SERVICE}/health` },
    { name: 'task-service',         url: `${TASK_SERVICE}/health` },
    { name: 'notification-service', url: `${NOTIF_SERVICE}/health` }
  ];

  const results = await Promise.allSettled(
    services.map(s => axios.get(s.url, { timeout: 3000 }).then(r => ({ name: s.name, status: r.data.status })))
  );

  const health = results.map((r, i) => ({
    service: services[i].name,
    status: r.status === 'fulfilled' ? r.value.status : 'down',
    error:  r.status === 'rejected'  ? r.reason.message : null
  }));

  const allHealthy = health.every(h => h.status === 'ok');
  res.status(allHealthy ? 200 : 207).json({ gateway: 'ok', services: health });
});

// API Info
app.get('/', (req, res) => {
  res.json({
    name: 'TaskFlow API Gateway',
    version: '1.0.0',
    endpoints: {
      'POST /api/auth/register':         'Register new user',
      'POST /api/auth/login':            'Login',
      'GET  /api/auth/profile':          'Get profile (auth required)',
      'GET  /api/tasks':                 'List tasks (auth required)',
      'POST /api/tasks':                 'Create task (auth required)',
      'PUT  /api/tasks/:id':             'Update task (auth required)',
      'DELETE /api/tasks/:id':           'Delete task (auth required)',
      'GET  /api/notifications':         'List notifications',
      'POST /api/notifications/send':    'Send notification',
      'GET  /health':                    'Gateway health',
      'GET  /health/all':                'All services health'
    }
  });
});

// Proxy Routes
app.use('/api/auth', createProxyMiddleware(proxyOptions(AUTH_SERVICE)));
app.use('/api/tasks', createProxyMiddleware(proxyOptions(TASK_SERVICE)));
app.use('/api/notifications', createProxyMiddleware(proxyOptions(NOTIF_SERVICE)));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log(`API Gateway running on port ${PORT}`));

module.exports = app;
