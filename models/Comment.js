const mongoose = require('mongoose');

const repliesSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending','approved','rejected'],
        default: 'pending',
    },
}, { timestamps: true });
const commentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
  status: {
    type: String,
    enum: ['pending','approved','rejected'],
    default: 'pending',
  },
    replies: [repliesSchema],
}, { timestamps: true });

const model = mongoose.model('Comment', commentSchema);

module.exports = model;