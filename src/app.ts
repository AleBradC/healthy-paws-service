import express from "express";
import * as dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import pool from "./core/config/db";
import { passport } from "./core/middleware/passport-config";
import authenticationRoutes from "./features/authentication/authentication.routes";
import registrationRoutes from "./features/registration/registration.routes";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "8080", 10);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());

app.use("/api/auth", authenticationRoutes);
app.use("/api/auth", registrationRoutes);

const startServer = async () => {
  try {
    const dataBase = await pool.connect();
    console.log("Successfully connected to the database.");
    dataBase.release();

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to connect to the database.", err);
    process.exit(1);
  }
};

startServer();
