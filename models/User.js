
const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    postalCode: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true,
    },
    province: { type: String },
    city: { type: String },
    cityId: { type: Number },
    location: {
        lat: { type: Number },
        lng: { type: Number },
    },
});
const userSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true
    },
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String },
    roles: {
        type: [String],
        enum: [ 'ADMIN', 'USER' ],
        default: ['USER'],
    },
    banned: {
        type: Boolean,
        default: false,
    },
    addresses: [addressSchema],
}, { timestamps: true });

const model = mongoose.model('User', userSchema);

module.exports = model;