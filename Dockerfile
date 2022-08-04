FROM ubuntu:latest
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update
RUN apt-get install -y vim
RUN apt-get install -y zip
RUN apt-get install -y ssh
RUN apt-get install -y npm
WORKDIR /app
COPY . .
# you can use it with:
# docker build . -t cloudfront-auth && docker run -it cloudfront-auth
# then, copy the zip file with:
# docker cp <docker-id>:/app/distributions/<distribution-id> .