# 1. Base Image: Node.js ka stable version use kar rahe hain
FROM node:20-slim

# 2. Install FFmpeg: Ye sabse important step hai
# 'slim' image choti hoti hai, isliye apt-get se FFmpeg install karenge
RUN apt-get update && apt-get install -y \
    ffmpeg \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# 3. Working Directory set karein
WORKDIR /app

# 4. Dependency files copy karein
COPY package*.json ./

# 5. Packages install karein (Puppeteer ke liye zaruri dependencies bhi shamil hain)
RUN npm install

# 6. Pura source code copy karein
COPY . .

# 7. Uploads folder banayein (taaki processing ke waqt error na aaye)
RUN mkdir -p uploads

# 8. Render par port define karein
ENV PORT=10000
EXPOSE 10000

# 9. Application start karein
CMD ["node", "index.js"]
