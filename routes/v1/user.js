const express = require('express');
const { auth } = require('../../middlewares/auth');
const roleGuard = require('../../middlewares/roleGuard');
const { getAll, getBannedUsers, banUser, unbanUser, createAddress, removeAddress, updateAddress, getUserAddresses, updateMe } = require('../../controllers/v1/user');

const router = express.Router();

router.route('/').get(auth,roleGuard('ADMIN'), getAll);
router.route('/banned').get(auth,roleGuard('ADMIN'), getBannedUsers);
router.route('/ban/:userId').post(auth,roleGuard('ADMIN'),banUser);
router.route('/unban/:userId').post(auth,roleGuard('ADMIN'),unbanUser);
router.route('/me').patch(auth, updateMe);
router.route('/me/addresses').get(auth, getUserAddresses).post(auth,createAddress);
router.route('/me/addresses/:addressId').delete(auth,removeAddress).patch(auth, updateAddress); // put->(update all data) patch->(update part of data)

module.exports = router;