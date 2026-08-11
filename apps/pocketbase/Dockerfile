FROM alpine:3.21

# PocketBase is pre-1.0 — pin it, read release notes before bumping, back up first.
ARG PB_VERSION=0.39.3

RUN apk add --no-cache unzip ca-certificates

ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/ && rm /tmp/pb.zip

# Version-controlled schema migrations and custom routes/hooks
COPY apps/pocketbase/pb_migrations /pb/pb_migrations
COPY apps/pocketbase/pb_hooks /pb/pb_hooks

EXPOSE 8080

# Data persists in the mounted /pb/pb_data volume (see deploy.yml)
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080"]
