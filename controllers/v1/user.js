const { errorResponse, successRespons } = require("../../helpers/respanses");
const User = require("../../models/User");
const Ban = require("../../models/Ban");

// Admin: get all users with basic pagination
exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const query = search
      ? {
          $or: [
            { phone: { $regex: search, $options: "i" } },
            { username: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    return successRespons(res, 200, {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// Admin: list banned users (based on Ban collection by phone)
exports.getBannedUsers = async (req, res, next) => {
  try {
    const bans = await Ban.find();
    return successRespons(res, 200, { bans });
  } catch (err) {
    next(err);
  }
};

// Admin: ban a user by id (stores user's phone in Ban collection)
exports.banUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return errorResponse(res, 404, "کاربر یافت نشد");

    // Mark user as banned and store phone in Ban list (used by auth flow)
    user.banned = true;
    await user.save();

    const existing = await Ban.findOne({ phone: user.phone });
    if (!existing) {
      await Ban.create({ phone: user.phone });
    }

    return successRespons(res, 200, { message: "کاربر مسدود شد" });
  } catch (err) {
    next(err);
  }
};

// Admin: unban a user by id
exports.unbanUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return errorResponse(res, 404, "کاربر یافت نشد");

    user.banned = false;
    await user.save();

    await Ban.deleteOne({ phone: user.phone });

    return successRespons(res, 200, { message: "کاربر از حالت مسدودی خارج شد" });
  } catch (err) {
    next(err);
  }
};

// Authenticated: update my profile basic fields
exports.updateMe = async (req, res, next) => {
  try {
    const user = req.user;
    const { firstName, lastName, email, username } = req.body;

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (email !== undefined) user.email = email;
    if (username !== undefined) user.username = username;

    await user.save();
    return successRespons(res, 200, { user });
  } catch (err) {
    next(err);
  }
};

// Authenticated: list my addresses
exports.getUserAddresses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    return successRespons(res, 200, { addresses: user.addresses || [] });
  } catch (err) {
    next(err);
  }
};

// Authenticated: create new address
exports.createAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const { name, postalCode, address, province, city, cityId, location } = req.body;

    if (!name || !postalCode || !address) {
      return errorResponse(res, 400, "نام، کدپستی و آدرس الزامی است");
    }

    user.addresses.push({ name, postalCode, address, province, city, cityId, location });
    await user.save();
    return successRespons(res, 201, { addresses: user.addresses });
  } catch (err) {
    next(err);
  }
};

// Authenticated: remove address by id
exports.removeAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user._id);

    user.addresses.id(addressId)?.remove();
    await user.save();

    return successRespons(res, 200, { addresses: user.addresses });
  } catch (err) {
    next(err);
  }
};

// Authenticated: update address by id
exports.updateAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user._id);
    const addr = user.addresses.id(addressId);
    if (!addr) return errorResponse(res, 404, "آدرس یافت نشد");

    const { name, postalCode, address, province, city, cityId, location } = req.body;
    if (name !== undefined) addr.name = name;
    if (postalCode !== undefined) addr.postalCode = postalCode;
    if (address !== undefined) addr.address = address;
    if (province !== undefined) addr.province = province;
    if (city !== undefined) addr.city = city;
    if (cityId !== undefined) addr.cityId = cityId;
    if (location !== undefined) addr.location = location;

    await user.save();
    return successRespons(res, 200, { addresses: user.addresses });
  } catch (err) {
    next(err);
  }
};


