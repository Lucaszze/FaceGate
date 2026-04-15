FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layers caching)
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy source
COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
