import express from "express";
import cors from "cors";
import previewRoutes from "./routes/preview.routes.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:8081", // Vite default
  })
);

app.use(express.json());
app.use("/api", previewRoutes);

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
