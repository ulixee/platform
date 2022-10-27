FROM node:16-slim

ARG ADD_TO_INSTALL=true
ARG VERSION
LABEL org.opencontainers.image.source=https://github.com/ulixee/ulixee
LABEL org.opencontainers.image.description="The open data platform. This image packages Ulixee Server, Hero and the last 2 Chrome versions."
LABEL org.opencontainers.image.licenses=MIT

# fonts
RUN echo "deb http://httpredir.debian.org/debian buster main contrib non-free" > /etc/apt/sources.list \
    && echo "deb http://httpredir.debian.org/debian buster-updates main contrib non-free" >> /etc/apt/sources.list \
    && echo "deb http://security.debian.org/ buster/updates main contrib non-free" >> /etc/apt/sources.list \
    && echo "ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true" | debconf-set-selections \
    && apt-get update \
    && apt-get install -y \
        fonts-arphic-ukai \
        fonts-arphic-uming \
        fonts-ipafont-mincho \
        fonts-thai-tlwg \
        fonts-kacst \
        fonts-ipafont-gothic \
        fonts-unfonts-core \
        ttf-wqy-zenhei \
        ttf-mscorefonts-installer \
        fonts-freefont-ttf \
        xvfb \
        curl \
    && apt-get clean \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

## Uncomment to install ALL google fonts (>2GB extracted)
# RUN mkdir -p /tmp/goog-fonts \
#  && git clone https://github.com/google/fonts.git /tmp/goog-fonts \
#  && find /tmp/goog-fonts/ -type f -name "*.ttf" -exec cp {} "/usr/local/share/fonts/" \; \
#  && rm -rf /tmp/goog-fonts

RUN mkdir -p /opt/bin && chmod +x /dev/shm && mkdir -p /ulixee/browsers

WORKDIR /app/ulixee
ENV BROWSERS_DIR /ulixee/browsers

RUN cd /app/ulixee && yarn init -yp \
    && yarn add @ulixee/server@$VERSION \
    && $ADD_TO_INSTALL \
    && $(npx install-browser-deps) \
    && groupadd -r ulixee && useradd -r -g ulixee -G audio,video ulixee \
    && mkdir -p /home/ulixee/Downloads \
    && mkdir -p /home/ulixee/.cache/ulixee \
    && chown -R ulixee:ulixee /home/ulixee \
    && chown -R ulixee:ulixee /ulixee \
    && chown -R ulixee:ulixee /app/ulixee \
    && chmod 777 /tmp \
    && chmod 777 /ulixee/browsers \
    && chmod -R 777 /home/ulixee/.cache/ulixee

# Add below to run as unprivileged user.
USER ulixee

CMD npx @ulixee/server start
# To run this docker, please see ./run.sh
