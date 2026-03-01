const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/taskdb')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// Task Schema
const taskSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  status:      { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
  priority:    { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  userId:      { type: String, required: true },
  username:    { type: String },
  dueDate:     { type: Date },
  tags:        [{ type: String }],
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now }
});

const Task = mongoose.model('Task', taskSchema);

// Auth Middleware - calls Auth Service to verify JWT
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    const response = await axios.post(`${authUrl}/api/auth/verify`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    req.user = response.data.user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Notify helper - calls Notification Service
const notifyTaskEvent = async (event, taskData, userEmail) => {
  try {
    const notifUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003';
    await axios.post(`${notifUrl}/api/notifications/send`, {
      event,
      taskData,
      userEmail
    });
  } catch (err) {
    console.error('Notification error (non-critical):', err.message);
  }
};

// Health Check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'task-service' }));

// Swagger/OpenAPI spec endpoint
app.get('/api/tasks/openapi', (req, res) => {
  res.json({
    openapi: '3.0.0',
    info: { title: 'Task Service API', version: '1.0.0' },
    paths: {
      '/api/tasks': {
        get: { summary: 'List tasks', security: [{ bearerAuth: [] }] },
        post: { summary: 'Create task', security: [{ bearerAuth: [] }] }
      },
      '/api/tasks/{id}': {
        get: { summary: 'Get task' },
        put: { summary: 'Update task' },
        delete: { summary: 'Delete task' }
      }
    }
  });
});

// GET all tasks for user
app.get('/api/tasks', authenticate, async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 10 } = req.query;
    const filter = { userId: req.user.id };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const tasks = await Task.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Task.countDocuments(filter);
    res.json({ tasks, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single task
app.get('/api/tasks/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create task
app.post('/api/tasks', authenticate, async (req, res) => {
  try {
    const { title, description, priority, dueDate, tags } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const task = await Task.create({
      title, description, priority, dueDate, tags,
      userId: req.user.id,
      username: req.user.username
    });

    // Notify via Notification Service
    await notifyTaskEvent('TASK_CREATED', task, req.user.email);

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update task
app.put('/api/tasks/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (req.body.status === 'done') {
      await notifyTaskEvent('TASK_COMPLETED', task, req.user.email);
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE task
app.delete('/api/tasks/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stats endpoint
app.get('/api/tasks/stats/summary', authenticate, async (req, res) => {
  try {
    const stats = await Task.aggregate([
      { $match: { userId: req.user.id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Task Service running on port ${PORT}`));

module.exports = app;
