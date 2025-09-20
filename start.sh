#!/usr/bin/env sh
# Render expone $PORT. n8n escucha en N8N_PORT.
export N8N_PORT="${PORT:-5678}"
echo "Iniciando n8n en puerto ${N8N_PORT}..."
n8n start