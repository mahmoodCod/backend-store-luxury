
const errorResponse = (res, statusCode, message, data ) => {
    return res.status(statusCode).json({ status: statusCode, success: false, error: message,data });
};

const successRespons = (res, statusCode = 200, data ) => {
    return res.status(statusCode).json({ status: statusCode, success: true, data});
};


module.exports = { errorResponse,successRespons };