const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

// Route imports
const authRoutes         = require('./routes/auth');
const articleRoutes      = require('./routes/articles');
const categoryRoutes     = require('./routes/categories');
const tagRoutes          = require('./routes/tags');
const attachmentRoutes   = require('./routes/attachments');
const approvalRoutes     = require('./routes/approvals');
const commentRoutes      = require('./routes/comments');
const ratingRoutes       = require('./routes/ratings');
const bookmarkRoutes     = require('./routes/bookmarks');
const notificationRoutes = require('./routes/notifications');
const searchRoutes       = require('./routes/search');
const dashboardRoutes    = require('./routes/dashboard');
const userRoutes         = require('./routes/users');

const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// CORS
app.use(cors({
  origin:         process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', function(_req, res) {
  res.json({
    success:   true,
    message:   'EKBMS API is running',
    timestamp: new Date().toISOString(),
    version:   '1.0.0',
  });
});

// API Routes
app.use('/api/auth',          authRoutes);
app.use('/api/articles',      articleRoutes);
app.use('/api/categories',    categoryRoutes);
app.use('/api/tags',          tagRoutes);
app.use('/api/attachments',   attachmentRoutes);
app.use('/api/approvals',     approvalRoutes);
app.use('/api/comments',      commentRoutes);
app.use('/api/ratings',       ratingRoutes);
app.use('/api/bookmarks',     bookmarkRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search',        searchRoutes);
app.use('/api/dashboard',     dashboardRoutes);
app.use('/api/users',         userRoutes);

// 404 and global error handler
app.use(notFound);
app.use(errorHandler);

module.exports = app;
