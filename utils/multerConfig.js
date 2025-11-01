const multer = require("multer");
const fs = require("fs");
const path = require("path");

exports.multerStorage = (destination) => {
  const uploadPath = path.join(__dirname, '..', destination);
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadPath);
    },

    filename: function (req, file, cb) {
      const imageFile = file.originalname.split(".");
      const extName = imageFile.pop();
      const fileName = imageFile.join(".");

      cb(null, `${fileName}-${Date.now()}.${extName}`);
    },
  });

  const upload = multer({
    storage: storage,
    limits: { fileSize: 512_000_000 },
  });

  return upload;
};
