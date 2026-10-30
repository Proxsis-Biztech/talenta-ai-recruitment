import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Validate PDF magic bytes (%PDF-)
const isValidPDF = (filePath: string): boolean => {
  try {
    const buffer = Buffer.alloc(5);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 5, 0);
    fs.closeSync(fd);
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46 && buffer[4] === 0x2D;
  } catch {
    return false;
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
    cb(null, uniqueSuffix + '-' + safeName);
  }
});
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'application/pdf' && path.extname(file.originalname).toLowerCase() === '.pdf') {
    cb(null, true);
  } else {
    cb(new Error('Hanya file PDF yang diizinkan!'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for certificate, CV will be checked below
  fileFilter
});

// Wrapper to handle multer errors gracefully
export const uploadCV = (req: any, res: any, next: any) => {
  upload.fields([
    { name: 'cv', maxCount: 1 }
  ])(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    // Custom file size validation for CV
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (files && files['cv'] && files['cv'][0].size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Ukuran file CV maksimal 5MB' });
    }
    
    // Validate PDF content via magic bytes (%PDF-)
    if (files && files['cv'] && files['cv'][0].path) {
      if (!isValidPDF(files['cv'][0].path)) {
        // Remove the invalid file
        fs.unlink(files['cv'][0].path, () => {});
        return res.status(400).json({ error: 'File yang diupload bukan PDF valid' });
      }
    }
    
    next();
  });
};
