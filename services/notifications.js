const Notification = require('../models/Notification');

async function createNotification(payload) {
    try {
        // Basic shape validation to avoid throwing
        const doc = await Notification.create({
            type: payload.type || 'product_created',
            title: payload.title || 'اعلان',
            message: payload.message || '',
            meta: payload.meta || {},
        });
        return doc;
    } catch (e) {
        // Never crash on notification failure
        return null;
    }
}

module.exports = { createNotification };


