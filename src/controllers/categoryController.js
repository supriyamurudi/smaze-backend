const prisma = require("../config/prisma");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

// ===============================
// Add Category
// ===============================

const addCategory = async (req, res) => {
  try {
    const { name } = req.body;

    const exists = await prisma.category.findUnique({
      where: {
        name,
      },
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    let image = "";

    if (req.file) {
      image = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "smaze/categories",
          },
          (error, result) => {
            if (error) return reject(error);

            resolve(result.secure_url);
          },
        );

        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });
    }

    const category = await prisma.category.create({
      data: {
        name,
        image,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Get Categories
// ===============================

const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Get Single Category
// ===============================

const getCategoryById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const category = await prisma.category.findUnique({
      where: {
        id,
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Update Category
// ===============================

const updateCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const { name } = req.body;

    const updateData = {
      name,
    };

    if (req.file) {
      const image = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "smaze/categories",
          },
          (error, result) => {
            if (error) return reject(error);

            resolve(result.secure_url);
          },
        );

        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });

      updateData.image = image;
    }

    const category = await prisma.category.update({
      where: {
        id,
      },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Delete Category
// ===============================

const deleteCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);

    await prisma.category.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  addCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
