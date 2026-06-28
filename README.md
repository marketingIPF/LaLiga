# 🚀 La Liga · Deploy a producción

Este bundle contiene **el estado completo y final** de todos los cambios de la semana:

- Sistema de notificaciones in-app (campana + badge + pantalla)
- Ruleta fuera de la app (aprobación simple de facturación)
- "Codirector" → "Admin" en la UI
- Iconos PWA del anillo de progreso
- Panel desktop para admins (`/panel`)
- Fix del bug "Borrar todo"

Todo verificado con `vite build` sin errores.

---

## 📁 Archivos en este bundle (24 archivos)

### Raíz del repo
- `firestore.rules` — reglas actualizadas (incluye colección `notifications`)
- `vite.config.js` — manifest PWA con icono y `background_color: #faf5ee`
- `index.html` — meta tags para iconos iOS

### `public/` (5 archivos nuevos)
- `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon-32.png`, `favicon-16.png`

### `src/` (16 archivos)
- `App.jsx`, `context/AuthContext.jsx`
- `lib/`: `firebase.js`, `admin.js`, `notifications.js` (nuevo)
- `hooks/`: `useActionRequests.js`, `useBillingRequests.js`, `useNotifications.js` (nuevo)
- `components/layout/`: `Header.jsx`, `PanelLayout.jsx` (nuevo)
- `components/ui/`: `NotificationBell.jsx` (nuevo)
- `views/`: `AdminHome.jsx`, `Aprobaciones.jsx`, `AprobarFacturacion.jsx`, `GestionEquipos.jsx`, `Notificaciones.jsx` (nuevo), `Panel.jsx` (nuevo), `RegistrarFacturacion.jsx`

---

## 🛟 Paso 0 — Punto de seguridad

Antes de tocar nada, créate un punto de restauración en GitHub por si algo se rompe y necesitas volver.

1. Abre el repo `LaLiga` en GitHub web
2. En la pestaña **Code**, busca el dropdown de ramas (donde pone `main`)
3. Escribe **`backup-pre-deploy-28jun`** y dale a **"Create branch from main"**
4. Listo, ya tienes un snapshot

> Si algo va mal: vuelves a la rama `backup-pre-deploy-28jun`, abres "Settings → Branches", la pones como default, y todo regresa al estado previo.

---

## 📤 Paso 1 — Subir los archivos

**La forma más rápida** (recomendada): usa GitHub Codespaces.

1. En el repo `LaLiga` → botón verde **Code** → pestaña **Codespaces** → **Create codespace on main**
2. Espera 30s a que cargue el VS Code en el navegador
3. Descomprime este zip en tu Mac/PC
4. **Arrastra** la carpeta completa al árbol de archivos del codespace, en la raíz del repo. Acepta sobrescribir todo.
5. En el codespace, abre la terminal (Ctrl+\`) y haz:
   ```
   git add .
   git status
   ```
6. Comprueba que aparecen los 24 archivos que esperas
7. Continúa:
   ```
   git commit -m "Deploy: notifs + panel desktop + ruleta fuera + iconos + fix reset"
   git push
   ```
8. Vercel detecta el push automáticamente y empieza a desplegar (~2 min)

**Alternativa sin Codespaces** (más lenta pero válida):

1. Descomprime el zip
2. En el repo de GitHub web → pestaña **Code** → botón **Add file → Upload files**
3. Arrastra la carpeta entera ahí. GitHub mantiene la estructura de subcarpetas.
4. Mensaje de commit: `Deploy: notifs + panel desktop + ruleta fuera + iconos + fix reset`
5. **Commit changes** → ese commit dispara Vercel

---

## 🔐 Paso 2 — Publicar las reglas de Firestore (CRÍTICO, no te olvides)

Esto es lo más fácil de olvidar y rompe varias cosas si no se hace.

1. Abre [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto **La Liga**
3. Menú izquierdo → **Firestore Database**
4. Pestaña **Rules** (arriba)
5. Borra todo el contenido del editor
6. Abre el archivo `firestore.rules` del zip en un editor de texto
7. Copia todo el contenido y pégalo en el editor de Firebase
8. Botón **Publish** (arriba derecha)
9. Confirma → debe aparecer "Rules deployed successfully"

> Si esto no se hace, "Borrar todo" sigue fallando y las notificaciones tampoco funcionarán bien.

---

## ⏳ Paso 3 — Esperar el deploy de Vercel

1. Abre [vercel.com](https://vercel.com) → tu proyecto LaLiga
2. Verás el deploy en curso (puntito amarillo). Espera al verde (~90 seg)
3. Cuando esté listo, abre `la-liga-eight.vercel.app` en una pestaña nueva
4. **Vacía caché** del navegador con Cmd+Shift+R (Mac) / Ctrl+F5 (Windows) — importante para que coja el JS nuevo

---

## ✅ Paso 4 — Smoke test (recorrido completo)

Hazlo en este orden. Marca cada paso. Si alguno falla, vuelve aquí y dímelo:

### Test 1 · Iconos PWA
- [ ] Abre la app en el móvil (Safari iOS o Chrome Android)
- [ ] Pestaña **Compartir** → **Añadir a pantalla de inicio**
- [ ] Comprueba que el icono que aparece es el anillo naranja con fondo crema
- [ ] La pantalla de splash al abrir es color crema, no negra

### Test 2 · Login + cambio de contraseña forzado
- [ ] Login con un agente que aún tenga `mustChangePassword:true` (alguno seed)
- [ ] Te debe pedir contraseña nueva al instante
- [ ] La cambias → entras al dashboard normal

### Test 3 · Notificaciones (admin recibe pending)
- [ ] Como agente, registra una acción (Venta, Captación, etc.)
- [ ] Cierra sesión, entra como **admin** (Rober o Almudena)
- [ ] **Comprueba**: campana en la cabecera con punto naranja
- [ ] Tap en la campana → te lleva a `/notificaciones` y ves "🆕 Nueva solicitud"
- [ ] Tap en la notif → te lleva a `/aprobaciones`

### Test 4 · Aprobar acción (notif al agente + check top 3)
- [ ] Como admin, aprueba esa acción pendiente
- [ ] Cierra sesión, entra como ese agente
- [ ] **Comprueba**: campana con punto naranja → "✅ Acción aprobada (+150 pts)"
- [ ] Si el agente entró en el top 3, también ve "🏆 ¡Estás en el top 3!"

### Test 5 · Facturación SIN ruleta
- [ ] Como agente, ve a `/facturacion`, reporta 5.000 €
- [ ] Como admin, ve a `/facturacion-aprobar`
- [ ] **Comprueba**: solo ves dos botones (Rechazar / Aprobar). No hay picker ½/×1/×2
- [ ] Tap Aprobar → la facturación se aprueba con importe íntegro (5.000 €)
- [ ] El agente recibe notif "💰 Facturación aprobada"

### Test 6 · Asignar a un equipo (notif al agente)
- [ ] Como admin, ve a `/equipos`, asigna a un agente a un equipo
- [ ] Ese agente debe recibir notif "👥 Te han añadido a un equipo"

### Test 7 · "Codirector" → "Admin" en la UI
- [ ] En la home del admin, el subtítulo dice **"Panel Admin"** (no "Codirector")
- [ ] En `/equipos`, el subtítulo dice **"Gestión Admin"**

### Test 8 · "Borrar todo" funciona (el bug que arreglamos)
- [ ] Como admin, en home → "Iniciar nuevo periodo"
- [ ] Cambia a la pestaña **"Todo (testing)"**
- [ ] Escribe **BORRAR TODO** en el input
- [ ] Tap el botón rojo
- [ ] **Comprueba**: termina sin error y todo queda a cero

> ⚠️ **OJO**: Test 8 borra todos los datos. Hazlo solo si NO te importa perder lo que haya. Mejor hazlo al final del smoke test y luego vuelves a seedar.

### Test 9 · Panel desktop
- [ ] En el ordenador, entra como admin a `la-liga-eight.vercel.app`
- [ ] En la home aparece un banner negro arriba: **"Panel desktop"** (solo en pantallas ≥ 1024px)
- [ ] Tap → te lleva a `/panel`
- [ ] **Comprueba**: ves 4 KPI cards arriba, la última en naranja (Pendientes)
- [ ] Lista de pendientes a la izquierda con botones Aprobar/Rechazar inline
- [ ] Top 5 + Equipos a la derecha
- [ ] Aprueba algo desde el panel → desaparece de la lista, el agente recibe notif igual que desde móvil
- [ ] Botón **"Vista móvil"** en la cabecera te devuelve a `/`

### Test 10 · Panel NO accesible para agentes
- [ ] Cierra sesión, entra como agente
- [ ] Intenta escribir `/panel` en la URL
- [ ] **Comprueba**: te redirige a `/`

---

## 🆘 Rollback si algo se rompe

1. En GitHub, ve a la pestaña **Code** → cambia a la rama **`backup-pre-deploy-28jun`**
2. **Settings → Branches**, pon `backup-pre-deploy-28jun` como **default branch**
3. Vercel redespliega automáticamente desde esa rama (~2 min)
4. Vuelves al estado anterior
5. Me dices qué falló y lo arreglamos

---

## 📝 Notas finales

- **Compatibilidad con datos antiguos**: las facturaciones aprobadas con multiplicador ≠ 1 antes de este deploy conservan su `finalAmount` original. No se tocan.
- **Re-seedeo**: si has hecho "Borrar todo" en el test 8 y quieres volver a poblar la base, ejecuta `node scripts/seed.mjs` en Codespaces como hicimos al principio.
- **Notificaciones acumuladas**: la primera vez que entres como admin, puede que tengas ya unas cuantas notifs antiguas (de las pruebas que vayas haciendo). Botón "Marcar todas como leídas" en la pantalla de notifs te las limpia.

¡Suerte con el deploy! Si surge algo, me dices el paso del smoke test que falla y lo desbloqueamos.
