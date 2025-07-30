const multer = require('multer');
const path = require('path');
const fs = require('fs');

// הגדרת יעד השמירה והשם של הקבצים
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/';
    // ודא שהתיקייה קיימת. אם לא, צור אותה.
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // יצירת שם קובץ ייחודי כדי למנוע דריסת קבצים
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// יצירת אובייקט ה-middleware של multer
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 } // מגביל את גודל הקובץ ל-20MB
});

// ייצוא של המידלוור כדי שנוכל להשתמש בו בקבצי ה-routes
module.exports = upload;