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

# Drop root: the node:20-alpine image ships a non-privileged `node` user/group
# (uid 1000). Copy everything chowned to that user so the process can read
# its own files but cannot modify the image filesystem as root.
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
# Include the GraphQL schema file as it's needed at runtime
COPY --from=builder --chown=node:node /app/src/schema/typeDefs.graphql ./dist/schema/

USER node

EXPOSE 8080

CMD ["npm", "start"]
