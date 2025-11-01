const { errorResponse } = require("../helpers/respanses");

module.exports = (role) => {
    return async(req,res,next) => {
        try {
            if(!req.user.roles.includes(role)) {
                return errorResponse(res,401, 'You have not access to this route !!');
            };
            next()
        } catch (err) {
            next(err);
        };
    };
};