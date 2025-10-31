const express = require('express');
const { auth } = require('../../middlewares/auth');
const roleGuard = require('../../middlewares/roleGuard');
const {
  getAllCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection
} = require('../../controllers/v1/collection');

const router = express.Router();

// Public routes
router.route('/')
  .get(getAllCollections);

router.route('/:id')
  .get(getCollection);

// Admin routes
router.route('/')
  .post(auth, roleGuard('ADMIN'), createCollection);

router.route('/:id')
  .patch(auth, roleGuard('ADMIN'), updateCollection)
  .delete(auth, roleGuard('ADMIN'), deleteCollection);

module.exports = router;
