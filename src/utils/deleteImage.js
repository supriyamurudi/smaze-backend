const cloudinary = require("../config/cloudinary");

const deleteImage = async (imageUrl) => {
  try {
    if (!imageUrl) return;

    const parts = imageUrl.split("/");

    const publicId = parts
      .slice(parts.indexOf("upload") + 2)
      .join("/")
      .split(".")[0];

    await cloudinary.uploader.destroy(publicId);

    console.log("Old image deleted:", publicId);
  } catch (error) {
    console.log("Cloudinary delete error:", error.message);
  }
};

module.exports = deleteImage;
