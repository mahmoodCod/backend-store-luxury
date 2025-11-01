const { errorResponse, successRespons } = require("../../helpers/respanses");
const Comment = require('../../models/Comment');
const Product = require('../../models/Product');
const { createPaginationData } = require('../../utils/index');
const { createCommentValidator, addReplyValidator, updateCommentValidator } = require('../../validators/comment');
const { isValidObjectId } = require("mongoose");

exports.createComment = async (req,res,next) => {
    try {
        const user = req.user;
        const { content, rating, productId } = req.body;

        await createCommentValidator.validate({
            content,
            productId,
            rating,
        }, { abortEarly: false});
        const product = await Product.findOne({ _id: productId });

        if (!product) {
            return errorResponse(res,404, 'محصول یافت نشد');
        };

        const newComment = await Comment.create({
            product: product._id,
            user: user._id,
            content,
            rating,
            replies: [],
        });

        // Create admin notification (guarded)
        try {
          const { createNotification } = require('../../services/notifications');
          await createNotification({
            type: 'comment_created',
            title: 'کامنت جدید ثبت شد',
            message: `${user.username || user.phone || 'کاربر'} روی ${product.name} نظر داد`,
            meta: { commentId: newComment._id, productId: product._id, productName: product.name, rating },
          });
        } catch (_) {}

        return successRespons(res,201, {
            message: 'کامنت با موفقیت ایجاد شد',
            comment: newComment
        });
    } catch (err) {
        next(err);
    };
};

exports.getComment = async (req,res,next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const comments = await Comment.find()
      .sort({
        createdAt: "desc",
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("product")
      .populate("user", "-addresses")
      .populate({
        path: "replies",
        populate: { path: "user", select: "-addresses" },
      });

    const totalComments = await Comment.countDocuments();

    return successRespons(res, 200, {
      comments,
      pagination: createPaginationData(page, limit, totalComments, "Comments"),
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllComments = async (req,res,next) => {
  try {
    const { page = 1 , limit = 10 } = req.query;

    const comments = await Comment.find()
    .sort({
      createdAt: "desc",
    }).skip(( page  - 1 ) * limit).limit(limit).populate('product').populate('user', '-addresses').populate({
      path: 'replies',
      populate: { path: "user", select: "-addresses" }
    });

    const totalComments = await Comment.countDocuments();

    return successRespons(res,200, {
      comments,
      pagination: createPaginationData( page, limit, totalComments, 'Comments' )
    });
  } catch (err) {
    next(err);
  };
};

exports.getProductComments = async (req,res,next) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!isValidObjectId(productId)) {
      return errorResponse(res, 400, 'شناسه محصول معتبر نیست');
    }

    let comments = await Comment.find({ product: productId, status: 'approved' })
      .sort({ createdAt: "desc" })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', '-addresses')
      .populate({
        path: 'replies',
        populate: { path: "user", select: "-addresses" }
      });

    // Only show approved replies
    comments = comments.map((c) => {
      const doc = c.toObject();
      doc.replies = (doc.replies || []).filter((r) => r.status === 'approved');
      return doc;
    });

    const totalComments = await Comment.countDocuments({ product: productId, status: 'approved' });

    return successRespons(res, 200, {
      comments,
      pagination: createPaginationData(page, limit, totalComments, 'Comments')
    });
  } catch (err) {
    next(err);
  };
};

// Summary: average rating and total approved comments for a product
exports.getProductCommentsSummary = async (req,res,next) => {
  try {
    const { productId } = req.params;

    if (!isValidObjectId(productId)) {
      return errorResponse(res, 400, 'شناسه محصول معتبر نیست');
    }

    const result = await Comment.aggregate([
      { $match: { product: require('mongoose').Types.ObjectId(productId), status: 'approved' } },
      { $group: { _id: '$product', count: { $sum: 1 }, avg: { $avg: '$rating' } } },
    ]);

    const summary = result && result.length > 0 ? {
      count: result[0].count || 0,
      average: Number((result[0].avg || 0).toFixed(1)),
    } : { count: 0, average: 0 };

    return successRespons(res, 200, { summary });
  } catch (err) {
    next(err);
  }
};

exports.removeComment = async (req,res,next) => {
    try {
        const { commentId } = req.params;

        if (!isValidObjectId(commentId)) {
            return errorResponse(res,400, 'شناسه کامنت معتبر نیست');
        };

        const deleteComment = await Comment.findByIdAndDelete(commentId);

        if (!deleteComment) {
            return errorResponse(res,400, 'کامنت یافت نشد');
        };

        return successRespons(res,200, {
            message: 'کامنت با موفقیت حذف شد',
            comment: deleteComment
        });

    } catch (err) {
        next(err);
    };
};

exports.updateComment = async (req,res,next) => {
    try {
        const { commentId } = req.params;
        const { content, rating } = req.body;
        const user = req.user;
    
        await updateCommentValidator.validate(
          { content, rating },
          {
            abortEarly: false,
          }
        );
    
        const comment = await Comment.findById(commentId);
    
        if (!comment) {
          return errorResponse(res, 404, "کامنت یافت نشد");
        }
    
        if (comment.user.toString() !== user._id.toString()) {
          return errorResponse(res, 403, "شما با این اقدام دسترسی ندارید");
        }
    
        const updatedComment = await Comment.findByIdAndUpdate(
          commentId,
          {
            content,
            rating,
          },
          { new: true }
        );
    
        return successRespons(res, 200, {
          message: "کامنت با موفقیت اپدیت شد",
          comment: updatedComment,
        });
      } catch (err) {
        next(err);
      }
};

// Admin: update comment status (approve/reject)
exports.updateCommentStatus = async (req,res,next) => {
  try {
    const { commentId } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(commentId)) {
      return errorResponse(res, 400, 'شناسه کامنت معتبر نیست');
    }
    if (!['pending','approved','rejected'].includes(status)) {
      return errorResponse(res, 400, 'وضعیت نامعتبر است');
    }

    const updated = await Comment.findByIdAndUpdate(commentId, { status }, { new: true });
    if (!updated) {
      return errorResponse(res, 404, 'کامنت یافت نشد');
    }

    return successRespons(res, 200, { message: 'وضعیت کامنت به‌روزرسانی شد', comment: updated });
  } catch (err) {
    next(err);
  }
};

exports.createReply = async (req,res,next) => {
    try {
        const user = req.user;
        const { content } = req.body;
        const { commentId } = req.params;

        if (!isValidObjectId(commentId)) {
            return errorResponse(res,400, 'شناسه کامنت معتبر نیست');
        };
    
        await addReplyValidator.validate({
          content,
        }, { abortEarly: false });

        const reply = await Comment.findByIdAndUpdate(commentId,{
            $push: {
                replies: {
                  content,
                  user: user._id,
                  status: 'pending',
                },
              },
        }, { new: true });
    
        if (!reply) {
            return errorResponse(res,404, 'کامنت یافت نشد');
        };
        try {
          const parent = await Comment.findById(commentId).populate('product');
          const { createNotification } = require('../../services/notifications');
          await createNotification({
            type: 'reply_created',
            title: 'پاسخ جدید به کامنت',
            message: `${user.username || user.phone || 'کاربر'} به یک کامنت پاسخ داد`,
            meta: { commentId, productId: parent?.product?._id, productName: parent?.product?.name },
          });
        } catch (_) {}
    
        return successRespons(res, 200, {
          reply
        });

    } catch (err) {
        next(err);
    };
};

exports.updateReply = async (req,res,next) => {
    try {

    } catch (err) {
        next(err);
    };
};

exports.removeReply = async (req,res,next) => {
    try {
        const { commentId, replyId } = req.params;
        const user = req.user;
    
        if (!isValidObjectId(commentId) || !isValidObjectId(replyId)) {
          return errorResponse(res, 400, "شناسه کامنت یا پاسخ معتبر نیست");
        }
    
        const comment = await Comment.findById(commentId);
        if (!comment) {
          return errorResponse(res, 404, "کامنت یافت نشد");
        }
    
        const reply = comment.replies.id(replyId);
        if (!reply) {
          return errorResponse(res, 404, "پاسخ یافت نشد");
        }
    
        if (reply.user.toString() !== user._id.toString()) {
          return errorResponse(res, 403, "شما به این اقدام دسترسی ندارید");
        }
    
        comment.replies.pull(replyId);
        await comment.save();
    
        return successRespons(res, 200, {
          message: "پاسخ با موفقیت حذف شد",
        });
      } catch (err) {
        next(err);
      }
};

// Admin: update reply status (approve/reject/pending)
exports.updateReplyStatus = async (req,res,next) => {
  try {
    const { commentId, replyId } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(commentId) || !isValidObjectId(replyId)) {
      return errorResponse(res, 400, 'شناسه کامنت یا پاسخ معتبر نیست');
    }
    if (!['pending','approved','rejected'].includes(status)) {
      return errorResponse(res, 400, 'وضعیت نامعتبر است');
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return errorResponse(res, 404, 'کامنت یافت نشد');
    }
    const reply = comment.replies.id(replyId);
    if (!reply) {
      return errorResponse(res, 404, 'پاسخ یافت نشد');
    }
    reply.status = status;
    await comment.save();

    return successRespons(res, 200, { message: 'وضعیت پاسخ به‌روزرسانی شد' });
  } catch (err) {
    next(err);
  }
};
