FROM docker.io/node:26

WORKDIR /app

COPY package*.json .
RUN npm install

COPY . .

EXPOSE 3000
ENTRYPOINT [ "npm", "run", "dev", "--", "--host", "0.0.0.0" ]