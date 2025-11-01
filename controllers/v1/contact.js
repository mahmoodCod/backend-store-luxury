const { errorResponse, successRespons } = require('../../helpers/respanses');

// Send contact message
exports.send = async (req, res, next) => {
  try {
    const { name, email, phone, message, subject } = req.body;

    // Basic validation
    if (!name || !message) {
      return errorResponse(res, 400, 'نام و پیام الزامی است');
    }

    // TODO: Implement email sending or save to database
    // For now, just return success
    // You can add a Contact model and save messages there
    // Or use nodemailer to send emails
    
    console.log('Contact message received:', {
      name,
      email,
      phone,
      subject,
      message,
      timestamp: new Date().toISOString()
    });

    return successRespons(res, 200, {
      message: 'پیام شما با موفقیت دریافت شد'
    });
  } catch (err) {
    next(err);
  }
};

