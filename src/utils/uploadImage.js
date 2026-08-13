const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

const uploadImage = (file, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },

      (error, result) => {
        if (error) {
          console.error("Cloudinary Error:");
          console.error(error);
          return reject(error);
        }

        resolve(result.secure_url);
      },
    );

    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });
};

module.exports = uploadImage;
