FROM n8nio/n8n:latest
# Render inyecta $PORT; n8n debe escuchar en N8N_PORT
# CMD ["sh","-lc","N8N_PORT=${PORT:-5678} exec n8n start"]

# FROM n8nio/n8n:latest
# 
# # Necesitamos permisos de root solo para copiar el script
# USER root
# COPY start.sh /usr/local/bin/start.sh
# RUN chmod 755 /usr/local/bin/start.sh
# # Volver a usuario 'node' (como recomienda n8n)
# USER node
# 
# # Usar el script de arranque
# CMD ["/usr/local/bin/start.sh"]