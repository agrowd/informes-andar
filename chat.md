# Registro de Conversación - 2026-06-09 (Diagnóstico de Caída del Puerto 8000 en Producción)

## Usuario:
- Reportó que el puerto 8000 en el VPS está caído y no responde. Indicó continuar ("segui").

## Antigravity:
- **Diagnóstico y Conexión SSH**: Conexión remota al VPS mediante un script Node.js con `ssh2`. Identificó que el puerto 8000 no estaba en escucha localmente en el servidor, y que la aplicación `informes-andar` no figuraba en la lista de procesos de PM2.
- **Fallo de tipo de módulo**: Descubrió que intentar iniciar el servicio usando `ecosystem.config.js` causaba que PM2 fallara debido a que el archivo es CommonJS (`module.exports`) mientras que `package.json` declara `"type": "module"`.
- **Resolución**: Inició el proceso de PM2 utilizando el archivo alternativo `ecosystem.config.cjs` (ya preparado pero inactivo) ejecutando `pm2 start ecosystem.config.cjs`.
- **Persistencia**: Confirmó el estado `online` del proceso en el puerto 8000, comprobó el funcionamiento local mediante `curl -I http://localhost:8000` (redirigiendo a `/login` con éxito), y ejecutó `pm2 save` para registrar permanentemente el proceso y prevenir caídas en futuros reinicios del VPS.
