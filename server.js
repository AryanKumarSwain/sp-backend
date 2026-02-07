import express from "express";
import cors from "cors";
import previewRoutes from "./routes/preview.routes.js";

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:8080",
      "http://localhost:5173",
      "https://swainrecommend.netlify.app",
    ],
    methods: ["GET"],
  })
);

app.use(express.json());
app.use("/api", previewRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
