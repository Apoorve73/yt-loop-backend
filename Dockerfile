FROM node:18

# Install dependencies
RUN apt-get update && \
    apt-get install -y ffmpeg python3 curl && \
    # Download the latest yt-dlp release and place it into /usr/local/bin
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    # Make yt-dlp executable by all users
    chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# Copy only the package.json file to the image.
COPY package.json .
# Run npm install to install Node.js dependencies defined in package.json.
RUN npm install

# Copy all remaining project files and folders into the Docker image's /app directory.
COPY . .

# Expose port 3000 so Docker can map and allow access to it from outside the container.
EXPOSE 3000

# Set the default command for the container to run `npm start`, which will start the Node.js server.
CMD ["npm", "start"]
