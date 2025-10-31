const express = require('express');
const { send,verify,getMe } = require('../../controllers/v1/auth');
const { auth } = require('../../middlewares/auth');
const { authLimiter } = require('../../middlewares/security');

const router = express.Router();

router.post('/send', authLimiter, send);
router.post('/verify', authLimiter, verify);
router.get('/me', auth, getMe);

module.exports = router;