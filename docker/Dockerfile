# FROM node
# FROM node:current-alpine
FROM node:current-slim

RUN mkdir -p /srv/file_server
RUN mkdir -p /srv/file_server/files

WORKDIR /srv/file_server

RUN mv files file && mv file files

COPY ./artifacts/dist ./dist
COPY ./artifacts/firebase.json ./firebase.json
COPY ./artifacts/package.json ./package.json

RUN npm i --omit=dev

CMD ["node", "./dist/main.js"]