import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import { passport } from "./authenticationService/passport-config";
import authRoutes from "./authenticationService/routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default-secret",
    resave: false,
    saveUninitialized: false,
  })
);

// Initialize Passport and restore authentication state, if any, from the session.
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/auth", authRoutes);
app.use("/", () => {
  console.log("hello");
});

const startServer = async () => {
  app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}...`);
  });
};

startServer();
