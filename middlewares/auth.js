const { errorResponse } = require("../helpers/respanses");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return errorResponse(res, 401, "Token not provided !!");
    }

    const tokenArray = token.split(" ");
    const tokenValue = tokenArray[1];

    if (tokenArray[0] !== "Bearer") {
      return errorResponse(
        res,
        401,
        "Write [Bearer ] at the start ot the token"
      );
    }

    try {
      // Verify token signature and expiration
      jwt.verify(tokenValue, process.env.JWT_SECRET);
    } catch (e) {
      const message = e.name === 'TokenExpiredError' ? 'Token has expired' : 'Token is not valid !!';
      return errorResponse(res, 401, message);
    }
    const decoded = jwt.decode(tokenValue);
    const userId = decoded && decoded.userId;

    const user = await User.findOne({ _id: userId });

    if (!user) {
      return errorResponse(res, 404, "User not found !!");
    }

    req.user = user;

    next();
  } catch (err) {
    next(err);
  }
};
