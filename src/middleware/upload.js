const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

const storage = multer.memoryStorage();

const multerInstance = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new ApiError(400, 'Only image files are allowed'));
    }
    cb(null, true);
  },
});

async function uploadToS3(file, folder = 'uploads') {
  const ext = file.originalname.split('.').pop();
  const key = `${folder}/${uuidv4()}.${ext}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );
  return `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
}

function uploadSingle(fieldName) {
  return [
    multerInstance.single(fieldName),
    async (req, _res, next) => {
      try {
        if (req.file) {
          req.fileUrl = await uploadToS3(req.file);
        }
        next();
      } catch (err) {
        next(err);
      }
    },
  ];
}

function uploadMultiple(fieldName, maxCount) {
  return [
    multerInstance.array(fieldName, maxCount),
    async (req, _res, next) => {
      try {
        if (req.files && req.files.length) {
          req.fileUrls = await Promise.all(req.files.map((f) => uploadToS3(f)));
        }
        next();
      } catch (err) {
        next(err);
      }
    },
  ];
}

module.exports = { uploadSingle, uploadMultiple };
