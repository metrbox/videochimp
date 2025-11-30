FROM node:20-alpine

# Install FFmpeg
RUN apk add --no-cache ffmpeg

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Create storage directories
RUN mkdir -p uploads outputs logs

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
