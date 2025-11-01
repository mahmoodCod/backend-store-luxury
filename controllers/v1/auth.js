const { safeGet, safeSet, safeTtl, isAvailable } = require('../../redis');
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
    const key = getOtpRedisPattern(phone);
    
    // Try Redis first
    let otp = await safeGet(key);
    let remainingTime = -1;
    
    // If Redis is not available, check in-memory store
    if (!otp && !isAvailable()) {
        const memoryData = inMemoryOtpStore.get(key);
        if (memoryData && memoryData.expiresAt > Date.now()) {
            otp = memoryData.hashedOtp;
            remainingTime = Math.floor((memoryData.expiresAt - Date.now()) / 1000); // seconds
        }
    } else if (otp) {
        remainingTime = await safeTtl(key); // second
    }

    if (!otp || remainingTime <= 0) {
        return {
            expired: true,
            remainingTime: 0,
        };
    }
    
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60; // 01:20
    const formattedTime = `${minutes.toString().padStart(2,'0')}: ${seconds.toString().padStart(2,'0')}`;

    return {
        expired: false,
        remainingTime: formattedTime,
    };
};


// In-memory fallback for OTP storage when Redis is unavailable
const inMemoryOtpStore = new Map();

// Clean up expired OTPs from memory every minute
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of inMemoryOtpStore.entries()) {
        if (data.expiresAt < now) {
            inMemoryOtpStore.delete(key);
        }
    }
}, 60000); // Clean up every minute

const genarateOtp = async(phone, length = 4, expireTime = 5) => {
    const digist = '0123456789';
    let otp = '';

    for (let i = 0 ; i < length ; i++) {
        otp += digist[Math.random() * digist.length];
    };

    otp = '123456'; // Temporary -> موقت
    const hashedOtp = await bcrypt.hash(otp,12);

    // Try to set OTP in Redis first
    const result = await safeSet(getOtpRedisPattern(phone), hashedOtp, 'EX', expireTime * 60);
    
    // If Redis is not available, use in-memory fallback
    if (!isAvailable() || !result || result !== 'OK') {
        console.warn('[OTP] Redis not available, using in-memory storage for OTP');
        const expiresAt = Date.now() + (expireTime * 60 * 1000); // milliseconds
        inMemoryOtpStore.set(getOtpRedisPattern(phone), {
            hashedOtp,
            expiresAt
        });
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
    
        const key = getOtpRedisPattern(phone);
        let savedOtp = await safeGet(key);
        
        // If Redis is not available, check in-memory store
        if (!savedOtp && !isAvailable()) {
            const memoryData = inMemoryOtpStore.get(key);
            if (memoryData && memoryData.expiresAt > Date.now()) {
                savedOtp = memoryData.hashedOtp;
            } else if (memoryData && memoryData.expiresAt <= Date.now()) {
                // Expired in memory, remove it
                inMemoryOtpStore.delete(key);
            }
        }
    
        if (!savedOtp) {
          return errorResponse(res, 400, "کد تایید منقضی شده یا وجود ندارد. لطفاً کد جدید دریافت کنید.");
        }
    
        const otpIsCorrect = await bcrypt.compare(otp, savedOtp);
    
        if (!otpIsCorrect) {
          return errorResponse(res, 400, "کد تایید اشتباه است. لطفاً دوباره تلاش کنید.");
        }
        
        // Remove OTP after successful verification (from both Redis and memory)
        if (isAvailable()) {
            await safeSet(key, '', 'EX', 1); // Delete from Redis
        }
        inMemoryOtpStore.delete(key); // Delete from memory
    
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