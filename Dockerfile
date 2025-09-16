FROM node:20-alpine
RUN apk add --no-cache ffmpeg

WORKDIR /app
# copy cả lock nếu có
COPY package.json package-lock.json* ./

# Nếu có package-lock.json -> dùng npm ci, nếu không -> dùng npm install
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev; \
    else \
      npm install --omit=dev; \
    fi

COPY index.js .

ENV PORT=8080
EXPOSE 8080
CMD ["node", "index.js"]
