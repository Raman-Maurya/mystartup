# Base image
FROM node:18-alpine as base

# Create app directory
WORKDIR /app

# Copy package.json files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci
RUN cd client && npm ci

# Copy app source
COPY . .

# Build client
FROM base as build
RUN cd client && npm run build

# Production stage
FROM node:18-alpine as production
WORKDIR /app

# Copy package.json files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built client and server files
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/backend ./backend
COPY --from=build /app/src ./src

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "src/server.js"]
