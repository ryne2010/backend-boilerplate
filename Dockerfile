 FROM node:14-buster-slim  as ts-compiler

RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    procps 

RUN  apt-get clean && rm -rf /var/lib/apt/lists/*

RUN wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | apt-key add -

RUN echo "deb http://repo.mongodb.com/apt/debian buster/mongodb-enterprise/4.4 main" | tee /etc/apt/sources.list.d/mongodb-enterprise.list

RUN apt-get update && apt-get install -y mongodb-enterprise-cryptd

RUN apt-get upgrade -y \
    && apt-get remove -y wget \
    gnupg \
    && apt-get clean -y 

ENV NODE_PATH=./build

WORKDIR /app

COPY package.json package-lock*.json ./

COPY tsconfig.json ./

RUN chown -R node:node .

USER node

RUN yarn install \
    && yarn cache clean --force 

COPY --chown=node:node . .

RUN yarn build

FROM ts-compiler as prod


ENV NODE_ENV=production
ENV GCP_PROJECT_CONFIG=projects/863278199979
ENV PROJECT_ID=vendrix-prod
ENV GCP_LOG_NAME=gcr-vendrix-api-v2
ENV REDISHOST=10.140.48.11

# VGS Vault Cred
ENV GCP_VGS_USERNAME=GCP_VGS_USERNAME
ENV GCP_VGS_PASSWORD=GCP_VGS_PASSWORD
# KMS Vault Info
ENV GCP_KMS_VAULT_SERVICE_ACCOUNT=mongo-csfle-master@vendrix-prod.iam.gserviceaccount.com
ENV GCP_CSFLE_MASTER_KMS=GCP_CSFLE_MASTER_KMS
ENV KMS_LOCATION=us
ENV KMS_KEY_RING=vendrix-prod

ENV PORT=8080
LABEL co.vendrix.nodeversion=$NODE_VERSION

# Service account authorized
ENV SERVICE_ACCOUNT=gcr-vendrix-api@vendrix-prod.iam.gserviceaccount.com
#GCP JWT 
ENV JWT_GCP_PUBLIC_KEY=https://www.googleapis.com/oauth2/v3/certs
ENV JWT_GCP_AUDIENCE=https://gcr-vendrix-api-gcpdev-dsop464t3q-uc.a.run.app
ENV JWT_GCP_ISSUER=https://accounts.google.com
#mongourl
ENV GCP_MONGO_URI_GCR_VENDRIX_API=GCP_MONGO_URI_GCR_VENDRIX_API

# ERROR Reporting Service
ENV ENGINE=GKE_TRANSACTION_INAUTH-INBOUND

RUN mongocryptd &

CMD node ./build/server.js

FROM prod as gcpdev

ENV NODE_ENV=gcpdevelopment
ENV GCP_PROJECT_CONFIG=projects/823553870491
# Service account authorized
ENV SERVICE_ACCOUNT=gcr-vendrix-api@vendrix-dev.iam.gserviceaccount.com
ENV PROJECT_ID=vendrix-dev
ENV REDISHOST=10.43.144.11
ENV VERSION=1.0d

# Very Good Security Vault
ENV VGS_VAULT=tntsfeqzp4a.sandbox.verygoodproxy.com
ENV VGS_VAULT=vault-dev.vendrix.co
# KMS Vault Info
ENV GCP_KMS_VAULT_SERVICE_ACCOUNT=mongo-csfle-master@vendrix-dev.iam.gserviceaccount.com
ENV KMS_LOCATION=us-central1
ENV KMS_KEY_RING=vendrix-dev

CMD node ./build/server.js


FROM gcpdev as dev
ENV NODE_ENV=development
RUN yarn add typescript -D

RUN yarn install --only=development

CMD ["node", "server.js"]