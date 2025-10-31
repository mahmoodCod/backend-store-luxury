const yup = require('yup');

const sendOtpValidator = yup.object({
    phone: yup
    .string()
    .required("phone number is required")
    .matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, 'phone number is not valid')
});

const otpVerifyValidator = yup.object({
    phone: yup
    .string()
    .required("phone number is required")
    .matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
    'phone number is not valid'),
    otp: yup.string().required('otp code is required').matches(/^[0-9]+$/,'otp code is not valid'),
});

module.exports = {sendOtpValidator,otpVerifyValidator};