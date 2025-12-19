FROM python:3.9-slim

# Install Chrome dependencies
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    curl \
    fontconfig \
    libgconf-2-4 \
    libnss3 \
    libxss1 \
    libasound2 \
    libxtst6 \
    python3-tk \
    python3-dev \
    chromium \
    chromium-driver \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Port setting
ENV PORT 10000
EXPOSE 10000

CMD ["gunicorn", "--bind", "0.0.0.0:10000", "app:app"]
