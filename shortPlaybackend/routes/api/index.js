// routes/api/index.js
const express = require('express');
const authRoutes = require('./auth');
const healthRoutes = require('./health');
const workRoutes = require('../../models/work/indexApi');
const commentRoutes = require('../../models/comment/indexApi');
const collectionRoutes = require('../../models/collection/indexApi');
const aiRoutes = require('./ai');
const friendRoutes = require('./friends');
const chatRoutes = require('./chat');
const userRoutes = require('./users');
const classifierRoutes = require('../../models/Classifier/indexApi');
const walletRoutes = require('../../models/Wallet/indexApi');
const activityRoutes = require('../../models/activity/indexApi');
const playDataRoutes = require('../../models/playData/indexApi');
const collectRoutes = require('../../models/collect/indexApi');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use('/work', workRoutes);
router.use('/comment', commentRoutes);
router.use('/collection', collectionRoutes);
router.use('/ai', aiRoutes);
router.use('/friends', friendRoutes);
router.use('/chat', chatRoutes);
router.use('/users', userRoutes);
router.use('/classifier', classifierRoutes);
router.use('/wallet', walletRoutes);
router.use('/activity', activityRoutes);
router.use('/playdata', playDataRoutes);
router.use('/collect', collectRoutes);

module.exports = router;
