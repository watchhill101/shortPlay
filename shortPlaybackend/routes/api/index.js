// routes/api/index.js
const express = require('express');
const authRoutes = require('./auth');
const healthRoutes = require('./health');
const aiRoutes = require('./ai');
const friendRoutes = require('./friends');
const chatRoutes = require('./chat');
const userRoutes = require('./users');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use('/ai', aiRoutes);
router.use('/friends', friendRoutes);
router.use('/chat', chatRoutes);
router.use('/users', userRoutes);

module.exports = router;