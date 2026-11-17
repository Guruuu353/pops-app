# Build the web app (plain concatenation, needs only bash) and run the Node 22 server.
FROM node:22-alpine
RUN apk add --no-cache bash
WORKDIR /app
COPY package.json ./
COPY server ./server
COPY web ./web
RUN bash web/build.sh
ENV PORT=8080 POPS_DB=/data/pops.sqlite
VOLUME /data
EXPOSE 8080
CMD ["node","--no-warnings","server/index.js"]
