FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 PORT=8080

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Build auth → /app/staticfiles/auth/
COPY frontend/auth/package*.json /app/frontend/auth/
RUN cd /app/frontend/auth && npm install
COPY frontend/auth/ /app/frontend/auth/
RUN cd /app/frontend/auth && npm run build

# Build riskcore → /app/staticfiles/risk/
COPY frontend/riskcore/package*.json /app/frontend/riskcore/
RUN cd /app/frontend/riskcore && npm install
COPY frontend/riskcore/ /app/frontend/riskcore/
RUN cd /app/frontend/riskcore && npm run build

# Build actuarialcore → /app/staticfiles/actuarialcore/
COPY frontend/actuarialcore/package*.json /app/frontend/actuarialcore/
RUN cd /app/frontend/actuarialcore && npm install
COPY frontend/actuarialcore/ /app/frontend/actuarialcore/
RUN cd /app/frontend/actuarialcore && npm run build

# Build coreadmin → /app/staticfiles/coreadmin/
COPY frontend/coreadmin/package*.json /app/frontend/coreadmin/
RUN cd /app/frontend/coreadmin && npm install
COPY frontend/coreadmin/ /app/frontend/coreadmin/
RUN cd /app/frontend/coreadmin && npm run build

# Build projectcore → /app/staticfiles/project/
COPY frontend/projectcore/package*.json /app/frontend/projectcore/
RUN cd /app/frontend/projectcore && npm install
COPY frontend/projectcore/ /app/frontend/projectcore/
RUN cd /app/frontend/projectcore && npm run build

# Python deps
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r /app/requirements.txt

# Django project
COPY manage.py /app/
COPY lifeplatform/ /app/lifeplatform/
COPY apps/ /app/apps/

WORKDIR /app
RUN python manage.py collectstatic --noinput

EXPOSE 8080
CMD ["sh", "-c", "gunicorn lifeplatform.wsgi:application --bind 0.0.0.0:$PORT"]
