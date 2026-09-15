FROM python:3.10-slim

# Prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1

# Install essential system dependencies for OpenCV, PaddleOCR, and PDF generation
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set up non-root user (Hugging Face default user UID 1000)
RUN useradd -m -u 1000 user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR /app

# Configure cache directories for Paddle & Hugging Face models
ENV PADDLE_HOME=/app/.cache/paddle \
    HF_HOME=/app/.cache/huggingface \
    PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True

# Copy requirements and install
COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-warm PaddleOCR models during Docker build for instant cold starts
RUN python -c "from paddleocr import PaddleOCR; PaddleOCR(ocr_version='PP-OCRv4', use_angle_cls=True, lang='en')"

# Copy application files
COPY --chown=user:user api.py .
COPY --chown=user:user ocr.py .
COPY --chown=user:user rule_engine.py .
COPY --chown=user:user database.py .
COPY --chown=user:user remediation_engine.py .
COPY --chown=user:user report_generator.py .
COPY --chown=user:user utils.py .
COPY --chown=user:user guardrails.json .
COPY --chown=user:user legal_metrology.db .
COPY --chown=user:user assets/ ./assets/
COPY --chown=user:user tests/mass_test_results.json ./tests/

# Set correct permissions
RUN mkdir -p /app/.temp /app/.cache && chown -R user:user /app

USER user

EXPOSE 7860

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "7860"]
