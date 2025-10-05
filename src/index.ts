import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import { passport } from "./authenticationService/passport-config";
import authRoutes from "./authenticationService/routes";
import pool from "./db";

dotenv.config();

const app = express();
const PORT = 8080;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default-secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/auth", authRoutes);

const startServer = async () => {
  try {
    const client = await pool.connect();
    console.log("Successfully connected to the database.");
    client.release(); // Release the client back to the pool

    app.listen(PORT, () => {
      console.log(`Listening on port ${PORT}...`);
    });
  } catch (err) {
    console.error("Failed to connect to the database.", err);
    process.exit(1);
  }
};

startServer();
