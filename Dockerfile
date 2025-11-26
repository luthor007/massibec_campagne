# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=22.7.0
FROM node:${NODE_VERSION}-slim as base

LABEL fly_launch_runtime="Next.js"

# Next.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"


# Throw-away build stage to reduce size of final image
FROM base as build

# Install packages needed to build node modules, Sharp, and Python scraper
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    node-gyp \
    pkg-config \
    python3 \
    python3-pip \
    python3-venv \
    python-is-python3 \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

# Install node modules
COPY package-lock.json package.json ./
RUN npm ci --include=dev

# Copy application code (including scripts/scraper and requirements)
COPY . .

# Verify scraper files are present (for debugging)
RUN echo "🔍 Verifying scraper files..." && \
    ls -la scripts/ 2>/dev/null || echo "⚠️ scripts/ directory not found" && \
    ls -la scripts/scraper/ 2>/dev/null || echo "⚠️ scripts/scraper/ directory not found" && \
    test -f scripts/scraper/main.py && echo "✅ scripts/scraper/main.py found" || echo "❌ scripts/scraper/main.py NOT found" && \
    test -f scripts/scraper/__init__.py && echo "✅ scripts/scraper/__init__.py found" || echo "❌ scripts/scraper/__init__.py NOT found" && \
    test -f scripts/requirements-scraper.txt && echo "✅ scripts/requirements-scraper.txt found" || echo "❌ scripts/requirements-scraper.txt NOT found"

# Install Python dependencies for scraper (after copying code)
# Use --break-system-packages flag for Python 3.11+ (PEP 668) - safe in Docker containers
RUN if [ -f scripts/requirements-scraper.txt ]; then \
    pip3 install --no-cache-dir --break-system-packages -r scripts/requirements-scraper.txt; \
    else \
    echo "⚠️ WARNING: scripts/requirements-scraper.txt not found, skipping Python dependencies"; \
    fi

# Build application
RUN npm run build

# Remove development dependencies
RUN npm prune --omit=dev


# Final stage for app image
FROM base

# Install runtime dependencies for Sharp (libvips), Python for scraper, and Chrome for Selenium
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    libvips \
    python3 \
    python3-pip \
    python-is-python3 \
    wget \
    gnupg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome for Selenium (headless mode)
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg && \
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Copy built application
COPY --from=build /app /app

# Verify scraper files are present in final image (for debugging)
RUN echo "🔍 Verifying scraper files in final image..." && \
    ls -la scripts/ 2>/dev/null || echo "⚠️ scripts/ directory not found" && \
    ls -la scripts/scraper/ 2>/dev/null || echo "⚠️ scripts/scraper/ directory not found" && \
    test -f scripts/scraper/main.py && echo "✅ scripts/scraper/main.py found" || echo "❌ scripts/scraper/main.py NOT found" && \
    test -f scripts/scraper/__init__.py && echo "✅ scripts/scraper/__init__.py found" || echo "❌ scripts/scraper/__init__.py NOT found" && \
    test -f scripts/requirements-scraper.txt && echo "✅ scripts/requirements-scraper.txt found" || echo "❌ scripts/requirements-scraper.txt NOT found"

# Install Python dependencies for scraper (after copying app to ensure scripts/ exists)
# Use --break-system-packages flag for Python 3.11+ (PEP 668) - safe in Docker containers
RUN if [ -f scripts/requirements-scraper.txt ]; then \
    pip3 install --no-cache-dir --break-system-packages -r scripts/requirements-scraper.txt; \
    else \
    echo "⚠️ WARNING: scripts/requirements-scraper.txt not found, skipping Python dependencies"; \
    fi

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD [ "npm", "run", "start" ]
