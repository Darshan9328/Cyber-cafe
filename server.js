const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const IMAGE_PATH = path.join(__dirname, "uploads/images.json");

// Storage to memory for sharp processing
const upload = multer({ storage: multer.memoryStorage() });

// Get carousel images
app.get("/api/images", (req, res) => {
  const images = fs.existsSync(IMAGE_PATH)
    ? JSON.parse(fs.readFileSync(IMAGE_PATH))
    : [];
  res.json(images);
});

// Add and resize image
app.post("/api/images", upload.single("image"), async (req, res) => {
  try {
    const filename = `${Date.now()}-${req.file.originalname.replace(
      /\s+/g,
      "-"
    )}`;
    const outputPath = path.join(__dirname, "uploads", filename);

    // Resize to 1200x500 and save
   await sharp(req.file.buffer)
     .resize({
       width: 1200,
       height: 500,
       fit: "contain",
       background: { r: 255, g: 255, b: 255, alpha: 1 },
     })
     .toFile(outputPath);

    const imageUrl = `/uploads/${filename}`;
    const images = fs.existsSync(IMAGE_PATH)
      ? JSON.parse(fs.readFileSync(IMAGE_PATH))
      : [];
    images.push({ url: imageUrl });
    fs.writeFileSync(IMAGE_PATH, JSON.stringify(images));
    res.status(201).json({ message: "Image uploaded", url: imageUrl });
  } catch (error) {
    console.error("Image upload failed:", error);
    res.status(500).json({ message: "Image upload failed" });
  }
});

// Delete image
app.delete("/api/images", express.json(), (req, res) => {
  const { url } = req.body;
  const images = JSON.parse(fs.readFileSync(IMAGE_PATH));
  const updated = images.filter((img) => img.url !== url);
  const filePath = path.join(__dirname, url);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  fs.writeFileSync(IMAGE_PATH, JSON.stringify(updated));
  res.json({ message: "Image deleted" });
});

// Contact form
app.post("/api/contact", async (req, res) => {
  const { name, email, phone, message } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"CyberZone Contact" <${process.env.EMAIL_USER}>`,
      to: process.env.TO_EMAIL,
      subject: "New Contact Message from Dwarkesh Online",
      html: `<h3>New Contact Request</h3>
             <p><strong>Name:</strong> ${name}</p>
             <p><strong>Email:</strong> ${email}</p>
             <p><strong>Phone:</strong> ${phone}</p>
             <p><strong>Message:</strong><br>${message}</p>`,
    });

    res.status(200).json({ message: "Email sent successfully" });
  } catch (err) {
    console.error("Email sending failed:", err);
    res.status(500).json({ message: "Email sending failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
