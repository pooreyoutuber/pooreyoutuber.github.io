# Base image with Node.js and pre-installed Chrome (best for Puppeteer on Render)
FROM ghcr.io/puppeteer/puppeteer:latest

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your application code (including index.js)
COPY . .

# Render ka default port 10000 hai
EXPOSE 10000

# Start the application using your index.js
CMD [ "node", "index.js" ]
