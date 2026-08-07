# Node 24 LTS (Krypton). Node 18 is EOL and blocks dependents from upgrading
# packages that require Node >=20 (e.g. sharp@0.35+ for libvips CVE fixes).
FROM node:24-slim

ARG ADD_TO_INSTALL=true
ARG VERSION
LABEL org.opencontainers.image.source=https://github.com/ulixee/platform
LABEL org.opencontainers.image.description="The open data platform. This image packages Ulixee Cloud, Hero and the last 2 Chrome versions."
LABEL org.opencontainers.image.licenses=MIT

# Fonts + Chrome/Xvfb runtime deps. node:24-slim is Debian bookworm (DEB822
# sources); enable contrib/non-free for ttf-mscorefonts-installer. fonts-wqy-zenhei
# replaces the removed ttf-wqy-zenhei package from older Debian.
# python3/make/g++ are needed to compile native modules (e.g. better-sqlite3)
# when prebuilds are not yet published for this Node major.
RUN sed -i 's/Components: main$/Components: main contrib non-free non-free-firmware/' /etc/apt/sources.list.d/debian.sources \
    && echo "ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true" | debconf-set-selections \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        fonts-arphic-ukai \
        fonts-arphic-uming \
        fonts-ipafont-mincho \
        fonts-thai-tlwg \
        fonts-kacst \
        fonts-ipafont-gothic \
        fonts-unfonts-core \
        fonts-wqy-zenhei \
        ttf-mscorefonts-installer \
        fonts-freefont-ttf \
        xvfb \
        git \
        curl \
        ca-certificates \
        python3 \
        make \
        g++ \
    && apt-get clean \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

## Uncomment to install ALL google fonts (>2GB extracted)
# RUN mkdir -p /tmp/goog-fonts \
#  && git clone https://github.com/google/fonts.git /tmp/goog-fonts \
#  && find /tmp/goog-fonts/ -type f -name "*.ttf" -exec cp {} "/usr/local/share/fonts/" \; \
#  && rm -rf /tmp/goog-fonts

RUN mkdir -p /opt/bin && chmod +x /dev/shm

WORKDIR /app/ulixee

RUN cd /app/ulixee && yarn init -yp \
    && yarn add @ulixee/cloud@$VERSION \
    && $ADD_TO_INSTALL \
    && $(npx install-browser-deps) \
    && groupadd -r ulixee && useradd -r -g ulixee -G audio,video ulixee \
    && mkdir -p /home/ulixee/Downloads \
    && mkdir -p /home/ulixee/.cache \
    && mv $HOME/.cache/ulixee /home/ulixee/.cache/ulixee \
    && chown -R ulixee:ulixee /home/ulixee \
    && chown -R ulixee:ulixee /app/ulixee \
    && chmod 777 /tmp \
    && chmod -R 777 /home/ulixee/.cache/ulixee

# Add below to run as unprivileged user. It's not included by default, but you can use docker run `--user ulixee`.
# USER ulixee

CMD ["npx", "@ulixee/cloud", "start"]
# To run this docker, please see ./run.sh
