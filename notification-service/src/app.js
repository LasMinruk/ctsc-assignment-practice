const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/notifdb')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// Notification Log Schema
const notificationSchema = new mongoose.Schema({
  event:     { type: String, required: true },
  recipient: { type: String },
  subject:   { type: String },
  message:   { type: String },
  status:    { type: String, enum: ['sent', 'failed', 'simulated'], default: 'simulated' },
  taskData:  { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

// Email transporter (using Ethereal for demo/test — no real creds needed)
const getTransporter = async () => {
  if (process.env.EMAIL_HOST) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
  }
  // Use Ethereal test account (auto-created)
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: { user: testAccount.user, pass: testAccount.pass }
  });
};

// Event message templates
const getTemplate = (event, taskData) => {
  const templates = {
    TASK_CREATED: {
      subject: `✅ New Task Created: ${taskData.title}`,
      message: `A new task "${taskData.title}" has been created with priority: ${taskData.priority}.`
    },
    TASK_COMPLETED: {
      subject: `🎉 Task Completed: ${taskData.title}`,
      message: `Great job! Your task "${taskData.title}" has been marked as done.`
    },
    TASK_UPDATED: {
      subject: `📝 Task Updated: ${taskData.title}`,
      message: `Task "${taskData.title}" has been updated.`
    },
    TASK_DUE_SOON: {
      subject: `⏰ Task Due Soon: ${taskData.title}`,
      message: `Reminder: Task "${taskData.title}" is due soon!`
    }
  };
  return templates[event] || { subject: `TaskFlow: ${event}`, message: JSON.stringify(taskData) };
};

// Health Check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'notification-service' }));

// POST /api/notifications/send — called by other services
app.post('/api/notifications/send', async (req, res) => {
  try {
    const { event, taskData, userEmail } = req.body;
    if (!event) return res.status(400).json({ error: 'event is required' });

    const { subject, message } = getTemplate(event, taskData || {});

    let status = 'simulated';
    let previewUrl = null;

    if (userEmail) {
      try {
        const transporter = await getTransporter();
        const info = await transporter.sendMail({
          from: '"TaskFlow" <noreply@taskflow.app>',
          to: userEmail,
          subject,
          text: message,
          html: `<div style="font-family:sans-serif;padding:20px;"><h2>${subject}</h2><p>${message}</p><hr/><small>TaskFlow Notification Service</small></div>`
        });
        status = 'sent';
        previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('Email preview URL:', previewUrl);
      } catch (emailErr) {
        console.error('Email send failed:', emailErr.message);
        status = 'failed';
      }
    }

    const notification = await Notification.create({ event, recipient: userEmail, subject, message, status, taskData });
    res.status(201).json({ message: 'Notification processed', notification, previewUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications — list all notifications (for admin/audit)
app.get('/api/notifications', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Notification.countDocuments();
    res.json({ notifications, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/stats
app.get('/api/notifications/stats', async (req, res) => {
  try {
    const stats = await Notification.aggregate([
      { $group: { _id: '$event', count: { $sum: 1 } } }
    ]);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`Notification Service running on port ${PORT}`));

module.exports = app;
