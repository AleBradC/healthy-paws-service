import express from "express";
import http from "http";
import * as dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { readFileSync } from "fs";
import path from "path";
import * as jwt from "jsonwebtoken";

import pool from "./core/config/db";
import { passport } from "./core/middleware/passport-config";
import authenticationRoutes from "./features/authentication/authentication.routes";
import registrationRoutes from "./features/registration/registration.routes";
import { globalErrorHandler } from "./core/middleware/error-middleware";

import { resolvers } from "./schema/resolvers";
import { createDoctorLoaders } from "./features/doctors/doctors.loaders";
import { createPetLoaders } from "./features/pets/pets.loaders";
import { createOwnerLoaders } from "./features/owners/owners.loaders";

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const PORT = parseInt(process.env.PORT || "8080", 10);

app.use(
  cors({
    origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"] : ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  })
);
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
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  try {
    const dataBase = await pool.connect();
    console.log("Successfully connected to the database.");
    dataBase.release();

    await server.start();

    // GraphQL Route
    app.use(
      "/graphql",
      expressMiddleware(server, {
        context: async ({ req }) => {
          let user = null;
          const authHeader = req.headers.authorization;
          if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.substring(7);
            try {
              user = jwt.verify(token, process.env.JWT_SECRET as string) as any;
            } catch (err) {
              // invalid token
            }
          }
          return {
            db: pool,
            user,
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
