# 🔔 La Liga — Notificaciones in-app (Fase 1)

## Qué hace este bundle

Añade un sistema completo de notificaciones in-app a La Liga:

- **Campana en la cabecera** con punto naranja cuando hay algo nuevo
- **Pantalla `/notificaciones`** con histórico, ordenada por fecha
- **Triggers automáticos** en:
  - Agente envía acción → notifica a TODOS los admins
  - Agente envía facturación → notifica a TODOS los admins
  - Admin aprueba/rechaza acción → notifica al agente
  - Admin aprueba/rechaza facturación → notifica al agente
  - Admin asigna a un equipo → notifica al agente
  - Agente entra en el top 3 del ranking → notifica al agente

## Archivos en este bundle

### Nuevos (sustituir si existen)
- `src/lib/notifications.js` — helpers de creación
- `src/hooks/useNotifications.js` — listener en tiempo real
- `src/components/ui/NotificationBell.jsx` — campana con badge
- `src/views/Notificaciones.jsx` — pantalla de listado

### Modificados (sustituir el existente en GitHub)
- `src/lib/firebase.js` — añade `notifications` a COL
- `src/lib/admin.js` — limpia el flag `inTop3` y notifs en los resets
- `src/hooks/useActionRequests.js` — dispara notifs en submit/approve/reject + check top3
- `src/hooks/useBillingRequests.js` — dispara notifs en submit/approve/reject
- `src/components/layout/Header.jsx` — añade NotificationBell
- `src/views/GestionEquipos.jsx` — dispara notif al asignar agente
- `src/App.jsx` — añade ruta `/notificaciones`
- `firestore.rules` — añade reglas de la colección `notifications`

## Cómo desplegar

1. **Sube todos los archivos** del bundle a las mismas rutas en el repo `LaLiga` (drag & drop desde GitHub web, o git push desde Codespaces).

2. **Publica las nuevas reglas de Firestore** desde la consola de Firebase:
   - Ve a Firestore → Rules
   - Pega el contenido de `firestore.rules` y publica
   - (O ejecuta `firebase deploy --only firestore:rules` si tienes el CLI)

3. **Espera el deploy de Vercel** (~1-2 min) y entra a la app.

## Probarlo

- Inicia sesión como **agente** → registra una acción.
- Cierra sesión, inicia como **admin** → verás el punto naranja en la campana.
- Tap en la campana → ves la notificación "Nueva solicitud".
- Tap en la notif → te lleva a `/aprobaciones`.
- Apruebas la acción → al volver al agente verás "Acción aprobada (+X pts)".

## Limitaciones (Fase 1)

- **Sólo funcionan con la app abierta.** Cuando entras a La Liga ves el punto naranja en la campana. Pero la app NO suena ni vibra cuando está cerrada.
- Para push real (vibración aunque el móvil esté bloqueado) → Fase 2: FCM + service worker + función serverless. Necesita 1-2 sesiones dedicadas y plan Blaze de Firebase.

## Notas técnicas

- **Top 3 detection**: se usa un flag `inTop3` en cada doc de usuario. Después de cada aprobación, el cliente del admin recalcula el top 3 actual, compara con los que tenían el flag, y notifica a los nuevos entrantes. Los resets de periodo limpian el flag automáticamente.
- **Sin índices compuestos**: las queries usan filtros simples y ordenan en cliente (mismo patrón que `actionRequests` / `billingRequests`).
- **Auto-mark-all-as-read**: al abrir la pantalla de notificaciones, todas se marcan como leídas tras 800ms. Hay también botón "Marcar todas" arriba.
