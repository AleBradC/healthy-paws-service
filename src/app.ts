import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import session from "express-session";
import bodyParser from "body-parser";
import passport from "passport";

import authRoutes from "./features/authentication/auth.routes";
import pool from "./core/config/db";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "8080", 10);

// --- Middleware ---
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "a-secure-default-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

// --- Routes ---
app.use("/api/auth", authRoutes);

// --- Start Server ---
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
