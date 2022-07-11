FROM node:lts-alpine
ENV NODE_ENV=production
ENV MQTTURL=mqtt://10.1.2.3
ENV MQTTUSER=username
ENV MQTTPASS=password
ENV PORT=1020
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../
COPY . .
EXPOSE 1020
RUN chown -R node /usr/src/app
USER node
CMD ["npm", "start"]