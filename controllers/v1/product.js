const { createProductValidator, updateProductValidator } = require("../../validators/product");
const Product = require("../../models/Product");
const Collection = require("../../models/Collection");
const { errorResponse, successRespons } = require("../../helpers/respanses");
const { createPaginationData } = require('../../utils/index');
const { isValidObjectId } = require("mongoose");
const fs = require('fs');
const path = require('path');
const Comment = require('../../models/Comment');

const supportedFormat = [
    "image/jpeg",
    "image/svg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
]

exports.createProduct = async (req, res, next) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    
    const {
      name,
      description,
      subCategory,
      category,
      collectionId,
      section,
      price,
      stock,
      isActive,
      featured,
      tags
    } = req.body;

    // Validation
    const validatedData = await createProductValidator.validate({
      name,
      description,
      subCategory,
      category,
      collectionId,
      section,
      price: parseFloat(price),
      stock: parseInt(stock),
      isActive: isActive === 'true',
      featured: featured === 'true',
      tags: tags ? tags.split(',').map(tag => tag.trim()) : []
    }, { abortEarly: false });

    // Check if collection exists
    const collectionExists = await Collection.findById(validatedData.collectionId);
    if (!collectionExists) {
      return errorResponse(res, 400, "مجموعه یافت نشد");
    }

    // Handle image uploads
    let imagePaths = [];
    if (req.files && req.files.length > 0) {
      // Images are stored in 'public' folder, serve via /images endpoint
      imagePaths = req.files.map(file => `/images/${file.filename}`);
      console.log('Image paths:', imagePaths);
      console.log('Files uploaded:', req.files.map(f => ({ name: f.filename, path: f.path })));
    } else {
      // Use default image if no images uploaded
      imagePaths = ['/images/modern-furniture-collection.png'];
      console.log('Using default image');
    }

    // Create product
    const product = new Product({
      name: validatedData.name,
      description: validatedData.description,
      subCategory: validatedData.subCategory,
      category: validatedData.category,
      collectionId: validatedData.collectionId,
      section: validatedData.section,
      price: validatedData.price,
      stock: validatedData.stock,
      images: imagePaths,
      isActive: validatedData.isActive,
      featured: validatedData.featured,
      tags: validatedData.tags
    });

    await product.save();

    return successRespons(res, 201, {
      product,
      message: "محصول با موفقیت ایجاد شد"
    });

  } catch (err) {
    next(err);
  }
};

exports.getAllProduct = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, category, isActive, featured, collectionId } = req.query;
    
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.category = category;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (featured !== undefined) {
      query.featured = featured === 'true';
    }

    if (collectionId) {
      query.collectionId = collectionId;
    }

    const products = await Product.find(query)
      .populate('collectionId', 'name slug')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ featured: -1, createdAt: -1 });

    const totalProducts = await Product.countDocuments(query);

    // Attach rating summary (avg/count) for approved comments in one query
    const productIds = products.map(p => p._id);
    if (productIds.length > 0) {
      const summaries = await Comment.aggregate([
        { $match: { product: { $in: productIds }, status: 'approved' } },
        { $group: { _id: '$product', count: { $sum: 1 }, avg: { $avg: '$rating' } } }
      ]);
      const idToSummary = new Map(summaries.map(s => [String(s._id), { count: s.count || 0, average: Number((s.avg || 0).toFixed(1)) }]));
      products.forEach((p) => {
        const s = idToSummary.get(String(p._id));
        p.set('ratingSummary', s || { count: 0, average: 0 }, { strict: false });
      });
    }

    return successRespons(res, 200, {
      products,
      pagination: createPaginationData(page, limit, totalProducts, "Products")
    });

  } catch (err) {
    next(err);
  }
};

exports.getOneProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!isValidObjectId(productId)) {
      return errorResponse(res, 400, "شناسه محصول معتبر نیست");
    }

    const product = await Product.findById(productId);

    if (!product) {
      return errorResponse(res, 404, "محصول یافت نشد");
    }

    return successRespons(res, 200, product);

  } catch (err) {
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const {
      name,
      description,
      subCategory,
      category,
      price,
      stock
    } = req.body;

    if (!isValidObjectId(productId)) {
      return errorResponse(res, 400, "شناسه محصول معتبر نیست");
    }

    const product = await Product.findById(productId);
    if (!product) {
      return errorResponse(res, 404, "محصول یافت نشد");
    }

    // Validation
    const validatedData = await updateProductValidator.validate({
      name,
      description,
      subCategory,
      category,
      price: price ? parseFloat(price) : undefined,
      stock: stock ? parseInt(stock) : undefined
    }, { abortEarly: false });

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      const newImagePaths = req.files.map(file => `/images/products/${file.filename}`);
      product.images = [...product.images, ...newImagePaths];
    }

    // Update product
    Object.keys(validatedData).forEach(key => {
      if (validatedData[key] !== undefined) {
        product[key] = validatedData[key];
      }
    });

    await product.save();

    return successRespons(res, 200, {
      product,
      message: "محصول با موفقیت به‌روزرسانی شد"
    });

  } catch (err) {
    next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!isValidObjectId(productId)) {
      return errorResponse(res, 400, "شناسه محصول معتبر نیست");
    }

    const product = await Product.findById(productId);
    if (!product) {
      return errorResponse(res, 404, "محصول یافت نشد");
    }

    // Delete images from filesystem
    product.images.forEach(imagePath => {
      const fullPath = path.join(__dirname, '../../public', imagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    });

    await Product.findByIdAndDelete(productId);

    return successRespons(res, 200, {
      message: "محصول با موفقیت حذف شد"
    });

  } catch (err) {
    next(err);
  }
};