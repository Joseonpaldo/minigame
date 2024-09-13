# Use the official Node.js 22 image from the Docker Hub
FROM node:22

# Set the working directory in the container
WORKDIR /usr/src/app

# Install pnpm
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml (if available)
COPY package*.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 4000

# Command to run the app
CMD ["pnpm", "start"]