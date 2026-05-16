import "dotenv/config";

import express from "express";
import http from "http";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { readFileSync } from "fs";
import path from "path";

import pool from "./core/config/db";
import { passport } from "./core/middleware/passport-config";
import authenticationRoutes from "./features/authentication/authentication.routes";
import registrationRoutes from "./features/registration/registration.routes";
import { globalErrorHandler } from "./core/middleware/error-middleware";

import { resolvers } from "./schema/resolvers";
import { requireAuthMutations } from "./schema/plugins/requireAuthMutations";
import { createDoctorLoaders } from "./features/doctors/doctors.loaders";
import { createPetLoaders } from "./features/pets/pets.loaders";
import { createOwnerLoaders } from "./features/owners/owners.loaders";

const app = express();
const httpServer = http.createServer(app);
const PORT = parseInt(process.env.PORT || "8080", 10);

// Build the CORS origin list from env — no origins are hardcoded in source.
// Set ALLOWED_ORIGINS=https://your-domain.com in production.
// Dev fallback applies only when NODE_ENV is not "production".
const getAllowedOrigins = (): string[] => {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
  }
  if (process.env.NODE_ENV !== "production") {
    return ["http://localhost:5173", "http://localhost:3000"];
  }
  return [];
};

// helmet must be first to ensure security headers are set on every response.
app.use(helmet());
app.use(
  cors({
    origin: getAllowedOrigins(),
    credentials: true,
  })
);
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());

// REST Routes
app.use("/api/auth", authenticationRoutes);
app.use("/api/auth", registrationRoutes);

const startServer = async () => {
  const typeDefs = readFileSync(
    path.join(__dirname, "schema/typeDefs.graphql"),
    { encoding: "utf-8" }
  );

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      requireAuthMutations,
    ],
  });

  try {
    let dataBase;
    let retries = 5;
    while (retries > 0) {
      try {
        dataBase = await pool.connect();
        console.log("Successfully connected to the database.");
        break;
      } catch (err) {
        console.log(`Failed to connect to DB, retrying... (${retries} attempts left)`);
        retries -= 1;
        if (retries === 0) throw err;
        await new Promise(res => setTimeout(res, 3000));
      }
    }
    if (dataBase) dataBase.release();

    await server.start();

    // GraphQL Route
    app.use(
      "/graphql",
      (req, res, next) => {
        passport.authenticate("jwt", { session: false }, (err: any, user: any) => {
          if (user) {
            req.user = user;
          }
          next();
        })(req, res, next);
      },
      expressMiddleware(server, {
        context: async ({ req }) => {
          return {
            db: pool,
            user: req.user || null,
            doctorLoaders: createDoctorLoaders(),
            petLoaders: createPetLoaders(),
            ownerLoaders: createOwnerLoaders(),
          };
        },
      })
    );

    app.use(globalErrorHandler);

    await new Promise<void>((resolve) =>
      httpServer.listen({ port: PORT }, resolve)
    );
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`🚀 GraphQL ready at http://localhost:${PORT}/graphql`);
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
