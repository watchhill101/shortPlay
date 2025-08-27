// routes/api/index.js
const express = require('express');
const authRoutes = require('./auth');
const healthRoutes = require('./health');
// 以后有其他路由，比如 userRoutes, postRoutes, 都在这里引入

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
// router.use('/users', userRoutes);

module.exports = router;