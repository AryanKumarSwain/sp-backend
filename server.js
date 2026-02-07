import express from "express";
import cors from "cors";
import previewRoutes from "./routes/preview.routes.js";

const app = express();

app.use(cors({
  origin: [
    "http://localhost:8080",
    "http://localhost:5173",
    "https://sp-backend-sq28.onrender.com",
    "https://YOUR_NETLIFY_SITE.netlify.app"
  ],
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.use("/api", previewRoutes);

// ✅ IMPORTANT: Render needs process.env.PORT
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
