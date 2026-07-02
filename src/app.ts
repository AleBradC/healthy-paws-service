import "dotenv/config";
import { initSentry } from "./core/observability/sentry";
initSentry();

import express from "express";
import * as Sentry from "@sentry/node";
import http from "http";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { ApolloArmor } from "@escape.tech/graphql-armor";
import { readFileSync } from "fs";
import path from "path";

import pool from "./core/config/db";
import {
  BODY_PARSER_JSON_OPTIONS,
  BODY_PARSER_URLENCODED_OPTIONS,
} from "./core/config/body-parser";
import { passport } from "./core/middleware/passport-config";
import authenticationRoutes from "./features/authentication/authentication.routes";
import registrationRoutes from "./features/registration/registration.routes";

import { globalErrorHandler } from "./core/middleware/error-middleware";
import { buildOpenApiDocument } from "./openapi/registry";

import { resolvers } from "./schema/resolvers";
import { requireAuthMutations } from "./schema/plugins/requireAuthMutations";
import { sentryPlugin } from "./schema/plugins/sentryPlugin";
import { auditMutations } from "./schema/plugins/auditMutations";
import { auditContextMiddleware } from "./core/middleware/audit-context";
import { createDoctorLoaders } from "./features/doctors/doctors.loaders";
import { createPetLoaders } from "./features/pets/pets.loaders";
import { createOwnerLoaders } from "./features/owners/owners.loaders";

const app = express();
const httpServer = http.createServer(app);
const PORT = parseInt(process.env.PORT || "8080", 10);

app.set("trust proxy", parseInt(process.env.TRUST_PROXY || "1", 10));

const getAllowedOrigins = (): string[] => {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
  }
  if (process.env.NODE_ENV !== "production") {
    return ["http://localhost:5173", "http://localhost:3000"];
  }
  return [];
};

app.use(helmet());
app.use(
  cors({
    origin: getAllowedOrigins(),
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(bodyParser.json(BODY_PARSER_JSON_OPTIONS));
app.use(bodyParser.urlencoded(BODY_PARSER_URLENCODED_OPTIONS));
app.use(passport.initialize());
app.use(auditContextMiddleware);

app.use("/api/auth", authenticationRoutes);
app.use("/api/auth", registrationRoutes);

app.get("/api/openapi.json", (_req, res) => {
  res.json(buildOpenApiDocument());
});

app.get("/healthz", async (_req, res) => {
  try {
    await Promise.race([
      pool.query("SELECT 1"),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("db timeout")), 1000),
      ),
    ]);
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "error", message: "db unavailable" });
  }
});

const startServer = async () => {
  const typeDefs = readFileSync(
    path.join(__dirname, "schema/typeDefs.graphql"),
    { encoding: "utf-8" },
  );

  const armor = new ApolloArmor({
    blockFieldSuggestion: { enabled: true },
    maxDepth: { n: 8 },
    costLimit: { maxCost: 5000 },
    maxAliases: { n: 15 },
    maxDirectives: { n: 50 },
    maxTokens: { n: 1000 },
  });
  const armorProtection = armor.protect();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: process.env.NODE_ENV !== "production",
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      requireAuthMutations,
      sentryPlugin,
      auditMutations,
      ...armorProtection.plugins,
    ],
    validationRules: [...armorProtection.validationRules],
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
        console.log(
          `Failed to connect to DB, retrying... (${retries} attempts left)`,
        );
        retries -= 1;
        if (retries === 0) throw err;
        await new Promise((res) => setTimeout(res, 3000));
      }
    }
    if (dataBase) dataBase.release();

    await server.start();

    app.use(
      "/graphql",
      (req, res, next) => {
        passport.authenticate(
          "jwt",
          { session: false },
          (err: any, user: any) => {
            if (err) {
              return next(err);
            }
            if (user) {
              req.user = user;
            }
            next();
          },
        )(req, res, next);
      },
      expressMiddleware(server, {
        context: async ({ req }) => {
          return {
            db: pool,
            user: req.user || null,
            doctorLoaders: createDoctorLoaders(),
            petLoaders: createPetLoaders(),
            ownerLoaders: createOwnerLoaders(),
            audit: req.auditContext ?? { ip: null, userAgent: null },
          };
        },
      }),
    );

    Sentry.setupExpressErrorHandler(app);

    app.use(globalErrorHandler);

    await new Promise<void>((resolve) =>
      httpServer.listen({ port: PORT }, resolve),
    );
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`GraphQL ready at http://localhost:${PORT}/graphql`);

    const shutdown = async (signal: string) => {
      console.log(`Received ${signal}, shutting down gracefully.`);
      const force = setTimeout(() => {
        console.error("Forced shutdown after 10s.");
        process.exit(1);
      }, 10_000);
      try {
        await new Promise<void>((resolve, reject) =>
          httpServer.close((err) => (err ? reject(err) : resolve())),
        );
        await server.stop();
        await pool.end();
        clearTimeout(force);
        process.exit(0);
      } catch (err) {
        console.error("Error during shutdown:", err);
        clearTimeout(force);
        process.exit(1);
      }
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
