import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import { passport } from "./authenticationService/passport-config";
import authRoutes from "./authenticationService/routes";

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
  app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}...`);
  });
};

startServer();
