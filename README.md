# 🏆 La Liga v2 · Rediseño de gerencia

## Qué cambia

1. **Fuera la facturación** — módulo completo eliminado (registro, aprobación, ranking, KPIs)
2. **Dos ligas**: Agentes / Staff & Obra Nueva, cada una con su ranking individual
3. **Catálogo de puntos nuevo** para las dos ligas
4. **13 participantes nuevos** en la liga Staff & Obra Nueva (11 usuarios nuevos + Rober y Almudena que compiten sin dejar de ser admins)
5. **Pantalla "Cargar puntos"** en el panel desktop: volcado masivo del CRM sin ir uno a uno
6. Equipos mixtos: agentes + staff asignables al mismo equipo
7. Logros actualizados a las nuevas acciones

## Puntos v2

### Liga Agentes
| Acción | Puntos | ¿Quién la registra? |
|---|---|---|
| Área de influencia | 2 | Admin (CRM) |
| Llamada de prospección | 10 | Admin (CRM) |
| Win Win | 10 | Admin (CRM) |
| Comercio aliado | 10 | Admin (CRM) |
| Entrevista M1 | 50 | Admin (CRM) |
| Entrevista M2 | 75 | Admin (CRM) |
| Entrevista M3 | 125 | Admin (CRM) |
| Reseña de cliente | 5 | Admin (CRM) |
| Reseña en Google Maps | 5 | Admin (CRM) |
| Publicar en RRSS | 5 | **El agente** |
| Grabar para un Reel | 10 | **El agente** |
| Formación/Entrenamiento | 10 | **El agente** (notas obligatorias con el resultado) |
| Crear un evento | 200 | **El agente** |

### Liga Staff & Obra Nueva (todo autoservicio)
| Acción | Puntos |
|---|---|
| Grabar para un Reel | 10 |
| Reseña en Google Maps | 5 |
| Win Win | 10 |
| Comercio aliado | 10 |
| Liebres | 10 |

## Archivos del bundle (15)

### Nuevos
- `src/views/PanelPuntos.jsx` — carga masiva desde CRM
- `scripts/seed-staff.mjs` — siembra de los 11 usuarios nuevos + parches

### Modificados (sustituir)
- `src/App.jsx`, `src/lib/constants.js`, `src/lib/notifications.js`, `src/data/seedUsers.js`
- `src/views/`: RegistrarAccion, Ranking, Dashboard, AdminHome, Panel, PanelAgentes, PanelEquipos, GestionEquipos, Logros

### ⚠️ ELIMINAR del repo (3 archivos)
- `src/views/RegistrarFacturacion.jsx`
- `src/views/AprobarFacturacion.jsx`
- `src/hooks/useBillingRequests.js`

En GitHub web: abre cada archivo → icono de papelera → commit. O desde Codespaces: `git rm src/views/RegistrarFacturacion.jsx src/views/AprobarFacturacion.jsx src/hooks/useBillingRequests.js`

**Si no los borras, el build de Vercel fallará** (importan funciones que ya no existen en notifications.js). Bórralos en el mismo commit que subes el resto.

## Orden de despliegue

1. **Sube los 15 archivos** del bundle + **borra los 3 de facturación** (mismo commit idealmente, desde Codespaces)
2. Espera el deploy de Vercel
3. **Ejecuta el seed** desde Codespaces:
   ```
   node scripts/seed-staff.mjs
   ```
   (necesitas `service-account.json` en la raíz, el mismo del seed original)
   - Crea las 11 cuentas nuevas (contraseña inicial = su teléfono)
   - Marca a Rober y Almudena con league staff
   - Añade league:'agentes' a los agentes existentes
4. **No hay cambios en Firestore rules** — no toques Firebase Console
5. Hard refresh y prueba

## Los 11 usuarios nuevos

Contraseña inicial = su teléfono. Cambio forzado en primer login.

**Staff**: Mar Moscardó, Julia Ordóñez, Mireia Sáez, Verónica Fortea, Marivi Gil
**Obra Nueva**: Ros Aguilar, Inma Frasquet, Carles Navarro, Alicia Barberá, Jose Manuel Lafuente, Jose González

Rober y Almudena ya existen; el seed solo les añade la liga.

## Cómo funciona "Cargar puntos" (para Almudena)

1. Panel desktop → botón naranja **"Cargar puntos"**
2. Eliges liga (Agentes / Staff & ON)
3. Eliges la acción (ej. "Llamada de prospección")
4. Con el CRM abierto al lado, pones el **nº de veces** de cada persona (botones +/- o teclado)
5. La barra de abajo muestra el total → **"Registrar puntos"**
6. Un solo click: crea las solicitudes ya aprobadas (histórico auditable), suma puntos a cada persona y a su equipo, y les manda notificación

Repite para la siguiente acción. Volcar el CRM semanal entero son 2-3 minutos.

## Datos existentes

- Los puntos actuales de los agentes **no se tocan**
- Las solicitudes históricas con acciones antiguas (captación, venta) se conservan en la base de datos; simplemente ya no se pueden crear nuevas
- Las facturaciones históricas quedan en Firestore (invisibles en la app); si quieres purgarlas, el botón "Borrar todo" las elimina
- Los campos periodBilling/totalBilling quedan huérfanos pero inofensivos

## Cosas a decidir después (no bloqueantes)

- **Umbrales de rangos**: siguen en 150/400/800. Con la nueva economía de puntos (prospecciones ×10, entrevistas 50-125, evento 200) puede que tras el primer periodo veáis que suben demasiado rápido o lento. Se recalibra en 5 minutos.
- **Subir archivo en Formación**: por ahora el agente escribe el resultado en las notas (obligatorio). Subir un archivo real (foto/PDF) requiere activar Firebase Storage — se puede añadir si las notas se quedan cortas.
