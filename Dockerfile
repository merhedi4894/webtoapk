# Multi-stage build for smaller image

# Stage 1: Build with JDK + Android SDK
FROM node:21-slim AS builder

# Install all dependencies including Python3 + PIL, JDK, zip tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    unzip \
    zip \
    curl \
    wget \
    software-properties-common \
    gnupg \
    python3 \
    python3-pip \
    python3-pil \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Install Eclipse Temurin JDK 21
RUN mkdir -p /etc/apt/keyrings && \
    wget -O - https://packages.adoptium.net/artifactory/api/gpg/key/public | tee /etc/apt/keyrings/adoptium.asc && \
    echo "deb [signed-by=/etc/apt/keyrings/adoptium.asc] https://packages.adoptium.net/artifactory/deb $(cat /etc/os-release | grep VERSION_CODENAME | cut -d= -f2) main" | tee /etc/apt/sources.list.d/adoptium.list && \
    apt-get update && \
    apt-get install -y temurin-21-jdk && \
    rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64
ENV PATH="${JAVA_HOME}/bin:${PATH}"

# Verify Java
RUN java -version && javac -version

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Set Android SDK paths
ENV ANDROID_HOME=/opt/android-sdk
ENV PATH="${PATH}:${ANDROID_HOME}/build-tools/34.0.0:${ANDROID_HOME}/platform-tools"

# Install Android SDK command-line tools
RUN mkdir -p ${ANDROID_HOME}/cmdline-tools && \
    cd ${ANDROID_HOME}/cmdline-tools && \
    curl -sL "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip" -o cmdline-tools.zip && \
    unzip -q cmdline-tools.zip && \
    mv cmdline-tools latest && \
    rm cmdline-tools.zip

# Accept licenses and install SDK packages
RUN yes | ${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager --licenses --sdk_root=${ANDROID_HOME} && \
    ${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager --install \
    "platforms;android-34" \
    "build-tools;34.0.0" \
    "platform-tools" \
    --sdk_root=${ANDROID_HOME}

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# Copy source code
COPY . .

# Generate Prisma client
RUN bun run db:generate

# Build Next.js
RUN bun run build

# Create necessary directories and initialize database
RUN mkdir -p /app/db /app/download/apks /app/upload/icons /app/build-workspace && \
    DATABASE_URL="file:/app/db/custom.db" bun run db:push

# Stage 2: Production image
FROM node:21-slim AS runner

# Install runtime dependencies including Python3 + PIL for icon generation
RUN apt-get update && apt-get install -y --no-install-recommends \
    unzip \
    zip \
    curl \
    wget \
    software-properties-common \
    gnupg \
    python3 \
    python3-pip \
    python3-pil \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Install Eclipse Temurin JDK 21
RUN mkdir -p /etc/apt/keyrings && \
    wget -O - https://packages.adoptium.net/artifactory/api/gpg/key/public | tee /etc/apt/keyrings/adoptium.asc && \
    echo "deb [signed-by=/etc/apt/keyrings/adoptium.asc] https://packages.adoptium.net/artifactory/deb $(cat /etc/os-release | grep VERSION_CODENAME | cut -d= -f2) main" | tee /etc/apt/sources.list.d/adoptium.list && \
    apt-get update && \
    apt-get install -y temurin-21-jdk && \
    rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64
ENV PATH="${JAVA_HOME}/bin:${PATH}"

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Copy Android SDK from builder
ENV ANDROID_HOME=/opt/android-sdk
ENV PATH="${PATH}:${ANDROID_HOME}/build-tools/34.0.0:${ANDROID_HOME}/platform-tools"
COPY --from=builder ${ANDROID_HOME} ${ANDROID_HOME}

WORKDIR /app

# Copy built application
COPY --from=builder /app ./

# Create data directories with proper permissions
RUN mkdir -p /app/db /app/download/apks /app/upload/icons /app/build-workspace && \
    chmod -R 777 /app/db /app/download /app/upload /app/build-workspace

# Copy the pre-initialized database from builder
COPY --from=builder /app/db/custom.db /app/db/custom.db

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL="file:/app/db/custom.db"

# Expose port
EXPOSE 3000

# Create a startup script that ensures db directory exists and starts the app
RUN echo '#!/bin/sh\n\
set -e\n\
echo "[Startup] Ensuring database directory exists..."\n\
mkdir -p /app/db /app/download/apks /app/upload/icons /app/build-workspace\n\
echo "[Startup] Database path: /app/db/custom.db"\n\
echo "[Startup] Starting application..."\n\
exec bun start\n\
' > /app/start.sh && chmod +x /app/start.sh

# Start the application
CMD ["/app/start.sh"]
