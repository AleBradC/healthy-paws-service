import express from "express";
import * as dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import authRoutes from "./features/authentication/auth.routes";
import pool from "./core/config/db";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "8080", 10);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);

const startServer = async () => {
  try {
    const client = await pool.connect();
    console.log("Successfully connected to the database.");
    client.release();

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to connect to the database.", err);
    process.exit(1);
  }
};

startServer();

export default app;
