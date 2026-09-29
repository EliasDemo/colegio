# Imagen del chaincode academic-traceability en modo Chaincode-as-a-Service (CCaaS).
FROM node:20-alpine AS build
WORKDIR /usr/src/app
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci --no-audit --no-fund
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/package.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
USER node
EXPOSE 9999
# CHAINCODE_ID y CHAINCODE_SERVER_ADDRESS se inyectan desde compose-chaincode.yaml
CMD ["sh", "-c", "exec node_modules/.bin/fabric-chaincode-node server --chaincode-address=$CHAINCODE_SERVER_ADDRESS --chaincode-id=$CHAINCODE_ID"]
