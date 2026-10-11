FROM node:24-alpine AS build

# `git` names the build revision, `bash` runs deploy/copy_to_dist.sh
RUN apk add --no-cache git bash
WORKDIR /app

COPY package.json package-lock.json ./
COPY patches ./patches
RUN ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci

COPY . .

ARG BRILLIANT_API_BASE_URL
ARG PROXY_API_BASE_URL
ARG EVM_MAINNET_RPC_URL
ARG NO_PENDING_ACTIVITIES
ARG NO_WEBSOCKET
ARG NO_TRACE_EMULATION
ARG APP_COMMIT_HASH

RUN npm run build \
  && rm -f dist/statoscope-* \
  && sed -n 's/^  Content-Security-Policy: \(.*\)$/add_header Content-Security-Policy "\1" always;/p' dist/_headers > csp.conf \
  && test -s csp.conf

FROM nginx:1.29-alpine

COPY deploy/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/csp.conf /etc/nginx/csp.conf
COPY --from=build /app/dist /usr/share/nginx/html
