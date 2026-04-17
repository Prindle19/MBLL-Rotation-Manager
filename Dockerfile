# Stage 1: Build React Frontend
FROM node:20-alpine as frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# Note: Vite embeds VITE_ environment variables at build time. 
# Make sure to pass them as build args if using CI/CD.
RUN npm run build

# Stage 2: Build FastAPI Backend
FROM python:3.11-slim

WORKDIR /app

# Copy backend requirements and install
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose port for Cloud Run
EXPOSE 8080

# Run the FastAPI server using Uvicorn
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
