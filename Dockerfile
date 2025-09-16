FROM node:20-alpine

# ffprobe có trong gói ffmpeg
RUN apk add --no-cache ffmpeg

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY index.js .

ENV PORT=8080
EXPOSE 8080

CMD ["node", "index.js"]
