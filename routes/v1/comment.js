const express = require('express');
const { auth } = require('../../middlewares/auth');
const roleGuard = require('../../middlewares/roleGuard');
const { createComment, getComment, getAllComments, getProductComments, getProductCommentsSummary, removeComment, updateComment, updateCommentStatus, createReply, updateReply, removeReply, updateReplyStatus } = require('../../controllers/v1/comment');
const { commentLimiter } = require('../../middlewares/security');

const router = express.Router();

router.route('/')
.post(commentLimiter, auth, createComment)
.get(getComment);

router.route('/all').get(auth, roleGuard('ADMIN'), getAllComments);

router.route('/product/:productId').get(getProductComments);
router.route('/product/:productId/summary').get(getProductCommentsSummary);

router.route('/:commentId')
.delete(auth, roleGuard('ADMIN'), removeComment)
.patch(auth,updateComment);

router.route('/:commentId/status')
.patch(auth, roleGuard('ADMIN'), updateCommentStatus);

router.route('/:commentId/reply')
.post(commentLimiter, auth, createReply);

router.route('/:commentId/reply/:replyId')
.patch(auth, updateReply)
.delete(auth, removeReply);

router.route('/:commentId/reply/:replyId/status')
.patch(auth, roleGuard('ADMIN'), updateReplyStatus);

module.exports = router;