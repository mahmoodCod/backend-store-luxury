const Notification = require('../../models/Notification');
const { errorResponse, successRespons } = require('../../helpers/respanses');

exports.list = async (req,res,next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const notifications = await Notification.find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(+limit);
        const total = await Notification.countDocuments();
        return successRespons(res, 200, { notifications, total });
    } catch (err) {
        next(err);
    }
};

exports.markRead = async (req,res,next) => {
    try {
        const { id } = req.params;
        const updated = await Notification.findByIdAndUpdate(id, { read: true }, { new: true });
        if (!updated) return errorResponse(res, 404, 'اعلان یافت نشد');
        return successRespons(res, 200, { notification: updated });
    } catch (err) {
        next(err);
    }
};

exports.markAllRead = async (req,res,next) => {
    try {
        await Notification.updateMany({ read: false }, { read: true });
        return successRespons(res, 200, { message: 'همه اعلان‌ها خوانده شد' });
    } catch (err) {
        next(err);
    }
};

exports.remove = async (req,res,next) => {
    try {
        const { id } = req.params;
        const deleted = await Notification.findByIdAndDelete(id);
        if (!deleted) return errorResponse(res, 404, 'اعلان یافت نشد');
        return successRespons(res, 200, { message: 'اعلان حذف شد' });
    } catch (err) {
        next(err);
    }
};


