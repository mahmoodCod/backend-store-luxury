const { safeGet, safeSet, safeTtl } = require('../../redis');
const { errorResponse, successRespons } = require('../../helpers/respanses');
const { sendOtpValidator,otpVerifyValidator } = require('../../validators/auth');
const { sendSms } = require('../../services/otp');
const Ban = require('../../models/Ban');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');

// start helper function

function getOtpRedisPattern(phone) {
    return `OTP: ${phone}`;
};
async function getOtpDetails(phone) {
    const otp = await safeGet(getOtpRedisPattern(phone));

    if (!otp) {
        return {
            expired: true,
            remainingTime: 0,
        };
    };
    const remainingTime = await safeTtl(getOtpRedisPattern(phone));// second
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60; // 01:20
    const formattedTime = `${minutes.toString().padStart(2,'0')}: ${seconds.toString().padStart(2,'0')}`;

    return {
        expired: false,
        remainingTime: formattedTime,
    };
};


const genarateOtp = async(phone, length = 4, expireTime = 5) => {
    const digist = '0123456789';
    let otp = '';

    for (let i = 0 ; i < length ; i++) {
        otp += digist[Math.random() * digist.length];
    };

    otp = '123456'; // Temporary -> موقت
    const hashedOtp = await bcrypt.hash(otp,12);

    // Set OTP with expiration (5 minutes = 300 seconds by default)
    const result = await safeSet(getOtpRedisPattern(phone), hashedOtp, 'EX', expireTime * 60);
    
    // Log if Redis is not available (for debugging)
    if (!result || result !== 'OK') {
        console.warn('[OTP] Warning: Redis may not be available. OTP may not be persisted.');
    }

    return otp;
};

// finish helper function
exports.send = async (req,res,next) => {
    try {
        const { phone } = req.body;
        await sendOtpValidator.validate(req.body,{abortEarly: false});

        const isBanned = await Ban.findOne({phone});

        if (isBanned) {
            return errorResponse(res,403,"این شماره تلفن بن شده است");
        };

        const { expired,remainingTime } = await getOtpDetails(phone);

        if (!expired) {
            return successRespons(res, 200, {message: `OTP قبلا ارسال شده است دوباره امتحان کنید ${remainingTime}`});
        };

        const otp = await genarateOtp(phone);

        await sendSms(phone,otp);

        return successRespons(res,200,{message: 'otp با موفقیت ارسال شد :))'});

    } catch (err) {
        next(err);
    };
};

exports.verify = async (req,res,next) => {
    try {
        const { phone, otp } = req.body;
    
        await otpVerifyValidator.validate(req.body, { abortEarly: false });
    
        const savedOtp = await safeGet(getOtpRedisPattern(phone));
    
        if (!savedOtp) {
          return errorResponse(res, 400, "کد تایید منقضی شده یا وجود ندارد. لطفاً کد جدید دریافت کنید.");
        }
    
        const otpIsCorrect = await bcrypt.compare(otp, savedOtp);
    
        if (!otpIsCorrect) {
          return errorResponse(res, 400, "کد تایید اشتباه است. لطفاً دوباره تلاش کنید.");
        }
    
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
          const token = jwt.sign(
            { userId: existingUser._id },
            process.env.JWT_SECRET,
            {
              expiresIn: "30d",
            }
          );
    
          return successRespons(res, 200, { user: existingUser, token });
        }
    
        //* Register
        const isFirstUser = (await User.countDocuments()) === 0;
    
        const user = await User.create({
          phone,
          username: phone,
          roles: isFirstUser ? ["ADMIN"] : ["USER"],
        });
    
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
          expiresIn: "30d",
        });

        // Create admin notification (guarded)
        try {
          const { createNotification } = require('../../services/notifications');
          await createNotification({
            type: 'user_registered',
            title: 'ثبت‌نام کاربر جدید',
            message: `کاربر جدید با شماره ${phone} ثبت نام کرد`,
            meta: { userId: user._id, phone },
          });
        } catch (_) {}

        return successRespons(res, 201, {
          message: "کاربر با موفقیت ثبت نام کرد :))",
          token,
          user,
        });

    } catch (err) {
        next(err);
    };
};

exports.getMe = async (req,res,next) => {
    try {
        const user = req.user;

        return successRespons(res,200, { user });
    } catch (err) {
        next(err);
    };
};