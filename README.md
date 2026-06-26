# 🏆 La Liga · RK Palanca Fontestad

Sistema de gamificación para el equipo comercial de RK Palanca Fontestad. PWA mobile-first con React + Vite + Tailwind + Firebase.

---

## 📂 Estructura del proyecto

```
la-liga/
├── public/                       # Favicon, iconos PWA
├── scripts/
│   └── seed.mjs                  # Crea usuarios en Auth + Firestore
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── layout/               # AppLayout, BottomNav, Header
│   │   ├── ui/                   # GlassCard, RankBadge, CircularProgress, Avatar
│   │   ├── admin/
│   │   └── agent/
│   ├── context/
│   │   ├── AuthContext.jsx       # Firebase Auth + perfil Firestore
│   │   └── ThemeContext.jsx      # Light / Dark mode
│   ├── data/
│   │   └── seedUsers.js          # 23 usuarios iniciales + grupos
│   ├── hooks/
│   │   ├── useRank.js            # Cálculo de rango y progreso
│   │   ├── useUsers.js
│   │   ├── useGroups.js
│   │   └── useActionRequests.js  # CRUD de solicitudes (con transacciones)
│   ├── lib/
│   │   ├── constants.js          # Catálogo de acciones, rangos, logros
│   │   ├── firebase.js           # init de Firebase
│   │   └── utils.js
│   ├── views/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx         # Home agente
│   │   ├── AdminHome.jsx         # Home codirector
│   │   ├── RegistrarAccion.jsx   # Form de nueva acción
│   │   ├── Aprobaciones.jsx      # Panel admin
│   │   ├── Ranking.jsx           # El Boletín
│   │   ├── Logros.jsx            # Wall of Fame
│   │   └── Perfil.jsx
│   ├── App.jsx                   # Router con guards
│   ├── main.jsx
│   └── index.css                 # Tailwind + estilos iOS 26
├── .env.example
├── firestore.rules               # Reglas de seguridad
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

---

## 🚀 Setup inicial

### 1) Instalar dependencias

```bash
npm install
```

### 2) Crear el proyecto en Firebase

1. Crea un proyecto en [console.firebase.google.com](https://console.firebase.google.com).
2. Activa **Authentication → Email/Password**.
3. Activa **Cloud Firestore** (modo producción).
4. Copia las credenciales en `.env.local` (basado en `.env.example`):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 3) Sembrar los usuarios iniciales

Descarga el **service account JSON** desde Firebase (Project Settings → Service accounts → Generate new private key), guárdalo como `service-account.json` en la raíz, y ejecuta:

```bash
node scripts/seed.mjs
```

Esto crea 23 cuentas en Firebase Auth (UID = ID del agente) y los documentos en Firestore con puntos a cero. La **contraseña inicial** de cada usuario es su número de teléfono.

### 4) Desplegar las reglas de seguridad

```bash
firebase login
firebase init firestore     # selecciona el proyecto, acepta firestore.rules
firebase deploy --only firestore:rules
```

### 5) Arrancar en local

```bash
npm run dev
```

---

## 🎯 Lógica de puntos y rangos

### Acciones (en `src/lib/constants.js`)

| Acción                         | Puntos |
| ------------------------------ | -----: |
| Captación de propiedad         |    100 |
| Venta cerrada                  |    150 |
| Captación en exclusiva (bonus) |    +50 |
| Reseña positiva                |     30 |
| Referido capta/vende           |     40 |
| Formación interna              |     20 |
| Asistencia reunión             |     10 |
| Publicar RRSS                  |     15 |

### Rangos

| Rango        | Puntos del periodo                               |
| ------------ | ------------------------------------------------ |
| Prospectador | 0 – 49                                           |
| Consolidado  | 50 – 149                                         |
| Sénior       | 150 – 299                                        |
| Élite        | 300+                                             |
| Embajador    | Líder histórico de la agencia (mayor lifetime)   |

El rango se calcula en `computeRank()` (puro, testeable). El hook `useRank()` lo expone junto al progreso hacia el siguiente nivel.

---

## 🔐 Modelo de seguridad

- **UID de Firebase Auth = ID del documento `users/{uid}`**. El seed garantiza esa correspondencia.
- Reglas en `firestore.rules`:
  - Cualquier autenticado puede **leer** users / groups / actionRequests (necesario para el ranking).
  - Un agente solo puede **crear** `actionRequests` con `userId == su UID` y `status='pending'`.
  - Solo un Codirector (rol leído desde `users/{uid}.role`) puede aprobar/rechazar y modificar `points` / `lifetimePoints`.
  - La aprobación es **transaccional** (`runTransaction`) — suma atómica al agente y al grupo.

---

## 🎨 Sistema de diseño

- **Tipografía**: Montserrat (preload desde Google Fonts en `index.html`).
- **Colores**: naranja `#cf731b`, negro `#0a0a0a`, blanco/crema `#faf5ee`. Definidos en `tailwind.config.js` bajo `colors.rk`.
- **Dark mode**: `class` strategy. Toggle persistente en `localStorage` (`ThemeContext`).
- **Glassmorphism**: clase `.glass` y `.glass-strong` en `index.css` — `backdrop-blur-xl` + `bg-white/70` claro / `bg-rk-ink-card/60` oscuro.
- **Border radius**: `rounded-3xl` y `rounded-4xl` para look iOS 26.
- **Bottom nav**: tab central tipo FAB elevado, distinto por rol (Agentes ven *Registrar*, Codirectores ven *Aprobar*).
- **Safe areas iOS**: variables `--safe-top` / `--safe-bottom` con `env(safe-area-inset-*)`.

---

## 🧩 Componentes clave

| Componente             | Descripción                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| `GlassCard`            | Tarjeta base con glassmorphism + radio iOS 26.                     |
| `RankBadge`            | Insignia con gradiente según rango.                                |
| `CircularProgress`     | Anillo SVG estilo Apple Watch (acepta children centrados).         |
| `BottomNav`            | Nav inferior con tab central FAB; cambia según rol.                |
| `Avatar`               | Avatar con iniciales fallback.                                     |

---

## 📲 PWA

El plugin `vite-plugin-pwa` está configurado en `vite.config.js`. Añade los iconos en `public/icon-192.png` y `public/icon-512.png` para completar el manifest. El service worker se auto-actualiza.

---

## 🛠️ Próximos pasos sugeridos

- [ ] Añadir iconos PWA (192/512px) con la marca RK Palanca.
- [ ] Configurar Cloud Function de reseteo trimestral de `points` (manteniendo `lifetimePoints`).
- [ ] Notificaciones push al codirector cuando llega una nueva solicitud.
- [ ] Sección de historial de logros (ahora se calculan en cliente; podrían persistirse).
- [ ] Tests unitarios de `computeRank()` y `useRank()`.

---

**Build by Rober · RK Palanca Fontestad · 2026**
