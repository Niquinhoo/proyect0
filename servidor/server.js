const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3000;

// Permitir acceso desde otros dispositivos
app.use(cors());

// Servir el frontend original (desde la carpeta raíz)
app.use(express.static(path.join(__dirname, "..")));

// Servir imágenes subidas
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Configurar Multer para guardar imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Endpoint para subir imágenes
app.post("/upload", upload.single("imagen"), (req, res) => {
  const ruta = `/uploads/${req.file.filename}`;
  res.json({ ruta });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
