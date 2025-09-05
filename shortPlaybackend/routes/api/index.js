// routes/api/index.js
const express = require('express');
const authRoutes = require('./auth');
const healthRoutes = require('./health');
const workRoutes = require('./work');
const commentRoutes = require('./comment');
const collectionRoutes = require('./collection');
// 以后有其他路由，比如 userRoutes, postRoutes, 都在这里引入

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use('/work', workRoutes);
router.use('/comment', commentRoutes);
router.use('/collection', collectionRoutes);
// router.use('/users', userRoutes);

module.exports = router;
