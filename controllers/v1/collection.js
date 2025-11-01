const Collection = require("../../models/Collection");
const { errorResponse, successRespons } = require("../../helpers/respanses");
const { createCollectionValidator, updateCollectionValidator } = require("../../validators/collection");

// دریافت همه مجموعه‌ها
exports.getAllCollections = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = "", isActive } = req.query;
    
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    const collections = await Collection.find(query)
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    
    const total = await Collection.countDocuments(query);
    
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    };
    
    return successRespons(res, 200, { collections, pagination }, "مجموعه‌ها با موفقیت دریافت شدند");
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

// دریافت یک مجموعه
exports.getCollection = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const collection = await Collection.findById(id).lean();
    
    if (!collection) {
      return errorResponse(res, 404, "مجموعه یافت نشد");
    }
    
    return successRespons(res, 200, { collection }, "مجموعه با موفقیت دریافت شد");
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

// ایجاد مجموعه جدید
exports.createCollection = async (req, res, next) => {
  try {
    const { name, description, image, isActive, sortOrder, sections } = req.body;
    
    // Generate slug from name (support Persian characters)
    const slug = name.toLowerCase()
      .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u200C\u200D\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '')
      .trim();
    
    // Ensure slug is not empty
    if (!slug || slug === '-') {
      throw new Error('نام مجموعه باید شامل حروف باشد');
    }
    
    console.log('Collection data received:', { name, description, slug, image, isActive, sortOrder, sections });
    
    // Validation
    const validatedData = await createCollectionValidator.validate({
      name,
      description,
      slug,
      image,
      isActive,
      sortOrder,
      sections
    }, { abortEarly: false });
    
    // Process sections
    const processedSections = (sections || []).map((section, index) => {
      const sectionSlug = section.name.toLowerCase()
        .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim();
      return {
        name: section.name,
        description: section.description || "",
        slug: sectionSlug || `section-${index}`,
        image: section.image || "",
        isActive: section.isActive !== undefined ? section.isActive : true,
        sortOrder: section.sortOrder || index
      };
    });
    
    const collection = new Collection({
      name: validatedData.name,
      description: validatedData.description,
      slug: validatedData.slug,
      image: image || "",
      isActive: validatedData.isActive !== undefined ? validatedData.isActive : true,
      sortOrder: validatedData.sortOrder || 0,
      sections: processedSections
    });
    
    const newCollection = await collection.save();
    
    return successRespons(res, 201, { collection: newCollection }, "مجموعه با موفقیت ایجاد شد");
  } catch (error) {
    console.error('Collection creation error:', error);
    if (error.name === 'ValidationError') {
      console.error('Validation errors:', error.errors);
      return errorResponse(res, 400, error.message);
    }
    if (error.name === 'MongoError' && error.code === 11000) {
      return errorResponse(res, 400, "مجموعه با این نام یا شناسه قبلاً وجود دارد");
    }
    if (error.errors) {
      const errorMessages = Object.values(error.errors).map(err => err.message).join(', ');
      console.error('Validation errors:', errorMessages);
      return errorResponse(res, 400, `خطاهای اعتبارسنجی: ${errorMessages}`);
    }
    return errorResponse(res, 500, error.message || "خطا در ایجاد مجموعه");
  }
};

// به‌روزرسانی مجموعه
exports.updateCollection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, image, isActive, sortOrder } = req.body;
    
    // Generate slug from name if name is provided
    let updateData = { name, description, image, isActive, sortOrder };
    if (name) {
      const slug = name.toLowerCase()
        .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u200C\u200D\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/^-+|-+$/g, '')
        .trim();
      
      if (slug && slug !== '-') {
        updateData.slug = slug;
      }
    }
    
    // Validation
    const validatedData = await updateCollectionValidator.validate(updateData, { abortEarly: false });
    
    const collection = await Collection.findByIdAndUpdate(
      id,
      {
        ...validatedData,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );
    
    if (!collection) {
      return errorResponse(res, 404, "مجموعه یافت نشد");
    }
    
    return successRespons(res, 200, { collection }, "مجموعه با موفقیت به‌روزرسانی شد");
  } catch (error) {
    if (error.name === 'ValidationError') {
      return errorResponse(res, 400, error.message);
    }
    return errorResponse(res, 500, error.message);
  }
};

// حذف مجموعه
exports.deleteCollection = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const collection = await Collection.findByIdAndDelete(id);
    
    if (!collection) {
      return errorResponse(res, 404, "مجموعه یافت نشد");
    }
    
    return successRespons(res, 200, null, "مجموعه با موفقیت حذف شد");
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};
