# Registro de Conversación - 2026-06-10 (Caída General del Servidor VPS / Handshake Timeout)

## Usuario:
- Reportó que no puede acceder a ningún puerto del VPS y preguntó qué pasó. Compartió una captura de pantalla de DonWeb indicando consumo de RAM > 100%.

## Antigravity:
- **Diagnóstico de Red e IP**: Comprobó que el VPS responde al comando `ping` con latencia baja (~30ms) y que los puertos `5782` (SSH) y `8000` (Next.js) están abiertos a nivel de red TCP.
- **Identificación de Bloqueo a Nivel de Aplicación**: Encontró que las conexiones a nivel de aplicación (handshake de SSH y peticiones HTTP `curl` locales) se quedan colgadas de forma indefinida sin responder.
- **Diagnóstico**: Este comportamiento es típico de un servidor que ha agotado sus recursos físicos (RAM, CPU o espacio de almacenamiento). Los procesos del sistema quedan bloqueados en I/O o thrashing (intercambio masivo de memoria virtual con el disco), lo que impide que procesen cualquier conexión entrante, a pesar de que el kernel de red responda a los pings y a la apertura de sockets TCP.
- **Recomendación**: Solicitar al usuario un reinicio forzado desde el panel de control de DonWeb para reestablecer el servidor.
- **Post-reinicio & Resurrección**: Una vez encendido el VPS, ejecutó `pm2 resurrect` a través de SSH para levantar todas las aplicaciones caídas (incluyendo `informes-andar`).
- **Autostart de PM2**: Configuró `pm2 startup` y habilitó el servicio `pm2-root.service` en systemd para que los procesos de PM2 inicien solos en el arranque del servidor.
- **Creación de SWAP**: Creó y habilitó de forma persistente un **Swap file de 4GB** (`/swapfile`) en el sistema de almacenamiento SSD para actuar como buffer ante futuros picos de consumo de RAM.
- **Verificación**: Comprobó que todos los puertos están en escucha (`ss -tlnp`), y que la web en port 8000 responde exitosamente con redirección HTTP 307.
