const yup = require("yup");

const createProductValidator = yup.object().shape({
  name: yup
    .string()
    .required("نام محصول الزامی است")
    .min(3, "نام محصول باید حداقل 3 کاراکتر باشد")
    .max(100, "نام محصول نمی‌تواند بیش از 100 کاراکتر باشد"),

  description: yup
    .string()
    .required("توضیحات محصول الزامی است")
    .max(1000, "توضیحات محصول نمی‌تواند بیش از 1000 کاراکتر باشد"),

  subCategory: yup
    .string()
    .required("زیردسته محصول الزامی است"),

  category: yup
    .string()
    .required("دسته محصول الزامی است"),

  collectionId: yup
    .string()
    .required("مجموعه محصول الزامی است")
    .test('is-objectid', 'شناسه مجموعه باید معتبر باشد', (value) => {
      return /^[0-9a-fA-F]{24}$/.test(value);
    }),
  
  section: yup
    .string()
    .required("بخش محصول الزامی است")
    .min(2, "بخش محصول باید حداقل 2 کاراکتر باشد")
    .max(50, "بخش محصول نمی‌تواند بیش از 50 کاراکتر باشد")
    .trim(),

  price: yup
    .number()
    .required("قیمت محصول الزامی است")
    .min(0, "قیمت نمی‌تواند منفی باشد"),

  stock: yup
    .number()
    .required("موجودی محصول الزامی است")
    .min(0, "موجودی نمی‌تواند منفی باشد"),

  images: yup
    .array()
    .of(yup.string())
    .optional(),

  isActive: yup
    .boolean()
    .optional()
    .default(true),

  featured: yup
    .boolean()
    .optional()
    .default(false),

  tags: yup
    .array()
    .of(yup.string().trim())
    .optional()
    .default([])
});

const updateProductValidator = yup.object().shape({
  name: yup
    .string()
    .min(3, "نام محصول باید حداقل 3 کاراکتر باشد")
    .max(100, "نام محصول نمی‌تواند بیش از 100 کاراکتر باشد")
    .optional(),

  description: yup
    .string()
    .max(1000, "توضیحات محصول نمی‌تواند بیش از 1000 کاراکتر باشد")
    .optional(),

  subCategory: yup
    .string()
    .optional(),

  category: yup
    .string()
    .optional(),

  collectionId: yup
    .string()
    .test('is-objectid', 'شناسه مجموعه باید معتبر باشد', (value) => {
      if (!value) return true; // Optional field
      return /^[0-9a-fA-F]{24}$/.test(value);
    })
    .optional(),

  price: yup
    .number()
    .min(0, "قیمت نمی‌تواند منفی باشد")
    .optional(),

  stock: yup
    .number()
    .min(0, "موجودی نمی‌تواند منفی باشد")
    .optional(),

  images: yup
    .array()
    .of(yup.string())
    .optional(),

  isActive: yup
    .boolean()
    .optional(),

  featured: yup
    .boolean()
    .optional(),

  tags: yup
    .array()
    .of(yup.string().trim())
    .optional()
});

module.exports = {
  createProductValidator,
  updateProductValidator
};