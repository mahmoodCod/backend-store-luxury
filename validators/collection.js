const yup = require('yup');

const createCollectionValidator = yup.object().shape({
  name: yup
    .string()
    .required('نام مجموعه الزامی است')
    .min(2, 'نام مجموعه باید حداقل 2 کاراکتر باشد')
    .max(100, 'نام مجموعه نمی‌تواند بیش از 100 کاراکتر باشد')
    .trim(),
  
  description: yup
    .string()
    .required('توضیحات مجموعه الزامی است')
    .trim(),
  
  slug: yup
    .string()
    .required('شناسه مجموعه الزامی است')
    .trim(),
  
  image: yup
    .string()
    .optional(),
  
  isActive: yup
    .boolean()
    .optional()
    .default(true),
  
  sortOrder: yup
    .number()
    .integer('ترتیب باید عدد صحیح باشد')
    .min(0, 'ترتیب نمی‌تواند منفی باشد')
    .optional()
    .default(0),
  
  sections: yup
    .array()
    .optional()
    .default([])
});

const updateCollectionValidator = yup.object().shape({
  name: yup
    .string()
    .min(2, 'نام مجموعه باید حداقل 2 کاراکتر باشد')
    .max(100, 'نام مجموعه نمی‌تواند بیش از 100 کاراکتر باشد')
    .trim()
    .optional(),
  
  description: yup
    .string()
    .min(10, 'توضیحات مجموعه باید حداقل 10 کاراکتر باشد')
    .max(500, 'توضیحات مجموعه نمی‌تواند بیش از 500 کاراکتر باشد')
    .trim()
    .optional(),
  
  image: yup
    .string()
    .url('آدرس تصویر باید معتبر باشد')
    .optional(),
  
  isActive: yup
    .boolean()
    .optional(),
  
  sortOrder: yup
    .number()
    .integer('ترتیب باید عدد صحیح باشد')
    .min(0, 'ترتیب نمی‌تواند منفی باشد')
    .optional()
});

module.exports = {
  createCollectionValidator,
  updateCollectionValidator
};
