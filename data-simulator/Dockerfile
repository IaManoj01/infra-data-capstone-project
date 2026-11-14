
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

RUN mkdir -p /app/data/weather \
    /app/data/generation \
    /app/data/batches

CMD ["python", "-u", "-m", "src.scheduler"]
