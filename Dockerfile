FROM n8nio/n8n:latest

# Opcional: instala tzdata si quieres zona horaria específica
# RUN apk add --no-cache tzdata

# Copiamos script de arranque que mapea PORT -> N8N_PORT en Render
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Render inyecta PORT; n8n debe escuchar en N8N_PORT
CMD ["/start.sh"]
