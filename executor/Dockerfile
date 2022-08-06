FROM node:16

WORKDIR /app
COPY ./build/ /app/
COPY ./config/ /app/config/
RUN npm install
CMD node executor/lib/index.js
EXPOSE 4000