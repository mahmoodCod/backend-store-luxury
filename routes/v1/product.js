const express = require('express');
const { auth } = require('../../middlewares/auth');
const roleGuard = require('../../middlewares/roleGuard');
const { createProduct, deleteProduct, getOneProduct, updateProduct, getAllProduct } = require('../../controllers/v1/product');
const { multerStorage } = require('../../utils/multerConfig');
const { productLimiter } = require('../../middlewares/security');

const upload = multerStorage('public');

const router = express.Router();

router.route('/')
.post(productLimiter, auth, roleGuard('ADMIN'), upload.array('images', 10), createProduct)
.get(getAllProduct);

router.route('/:productId')
.get(getOneProduct)
.patch(auth,roleGuard('ADMIN'),upload.array('images', 10),updateProduct)
.delete(auth, roleGuard('ADMIN'), deleteProduct);

module.exports = router;