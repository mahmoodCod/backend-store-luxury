const multer = require("multer");
const fs = require("fs");
const path = require("path");

exports.multerStorage = (destination) => {
  const uploadPath = path.join(__dirname, '..', destination);
  console.log('[Multer] Upload path:', uploadPath);
  console.log('[Multer] Upload path exists:', fs.existsSync(uploadPath));
  
  if (!fs.existsSync(uploadPath)) {
    console.log('[Multer] Creating upload directory:', uploadPath);
    fs.mkdirSync(uploadPath, { recursive: true });
    console.log('[Multer] Directory created:', fs.existsSync(uploadPath));
  }

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      console.log('[Multer] Destination callback called for file:', file.originalname);
      console.log('[Multer] Destination path:', uploadPath);
      cb(null, uploadPath);
    },

    filename: function (req, file, cb) {
      const imageFile = file.originalname.split(".");
      const extName = imageFile.pop();
      const fileName = imageFile.join(".");
      const finalFilename = `${fileName}-${Date.now()}.${extName}`;
      
      console.log('[Multer] Filename callback:', {
        originalname: file.originalname,
        generated: finalFilename
      });
      
      cb(null, finalFilename);
    },
  });

  const upload = multer({
    storage: storage,
    limits: { fileSize: 512_000_000 },
    fileFilter: function (req, file, cb) {
      console.log('[Multer] File filter - file:', {
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype
      });
      
      // Accept all files for now (you can add validation later)
      cb(null, true);
    }
  });

  console.log('[Multer] Upload middleware created');
  return upload;
};
