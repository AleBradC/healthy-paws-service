# Build stage
FROM node:20-alpine AS development

WORKDIR /app

# Install build dependencies for bcrypt and other native modules
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install

COPY . .

CMD ["sh", "-c", "npm install && npm run watch"]

FROM development AS builder
RUN npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
# Include the GraphQL schema file as it's needed at runtime
COPY --from=builder /app/src/schema/typeDefs.graphql ./dist/schema/

EXPOSE 8080

CMD ["npm", "start"]
