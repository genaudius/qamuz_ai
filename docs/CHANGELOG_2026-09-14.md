# Registro de trabajo — 14 de septiembre de 2026

Sesión de trabajo sobre **Qamuz AI** (SvelteKit 2 / Svelte 5, adapter-node, PostgreSQL + Drizzle) y **Qamuz Studio 2.0** (Svelte 5 + Tauri 2).

---

## 1. Arreglo del error 500 (RESUELTO y desplegado)

### Síntoma
El sitio devolvía HTTP 500. En `/api/chats` y en la home `/`.

### Causa raíz
El proyecto **no aplica migraciones de Drizzle en el deploy**. En su lugar usa
`src/lib/server/db/ensure-canonical.ts`, una función que corre al arrancar
(desde `hooks.server.ts` → `settingsHandle`, una sola vez por proceso) y crea el
schema de forma idempotente (`IF NOT EXISTS`).

Ese archivo estaba **incompleto**: le faltaban columnas que el código sí usa, por
lo que Postgres devolvía `42703 column ... does not exist` → 500.

Columnas/objetos que faltaban:
- Tabla `chat`: `isBranch`, `branchAtIndex`, `branchSourceChatId`, `projectId`
  (rompía `GET /api/chats`).
- Tabla `user`: `userType`, `artistName`, `username`, `isVerifiedArtist`,
  `verificationStatus`, `verificationRequestedAt`, `hasUnlimitedFanAccess`
  (rompía la home `/` vía Better Auth "Failed to get session").
- Tabla `music`: `alignedLyrics`, `commentsCount`.
- Tabla `music_comment` (+ índices).

Nota: en producción, la mayoría de las columnas de `user`/`music` ya existían;
las que realmente faltaban en el VPS eran las de `chat`. El 500 de `userType` se
observó en la base de datos **local**.

### Solución aplicada
1. Completé `src/lib/server/db/ensure-canonical.ts` para materializar todas las
   columnas/tablas faltantes (idempotente, se auto-repara al arrancar en
   cualquier entorno).
2. Agregué migración versionada `drizzle/0011_chat_branch_columns.sql` +
   entrada en `drizzle/meta/_journal.json`.
3. Apliqué el SQL directo a la base de datos de producción para resolverlo al
   instante (sin esperar al redeploy).

### Verificación
- Producción tras `pm2 restart`: `/` → 200, `/api/chats` → 401 (correcto sin
  sesión), `/audio` → 302, `/library` → 200; sin errores `42703` nuevos.
- Público: `https://qamuz.ai/` → 200.
- Local: home `/` → 200.

### Commit y despliegue
- Commit: `ec0a037` en `main` (3 archivos; `scratch_deploy/` está en `.gitignore`).
- Push a `origin main` (GitHub): `adbb4d1..ec0a037`.
- Deploy al VPS: como `/var/www/qamuz_ai` **no es repo git**, el flujo real fue
  subir los archivos por SFTP + `npm run build` + `pm2 restart` (script
  `scratch_deploy/deploy_ensure_canonical.mjs`). PM2 `qamuz-ai` quedó online v2.5.0.

### Archivos modificados
- `src/lib/server/db/ensure-canonical.ts`
- `drizzle/0011_chat_branch_columns.sql` (nuevo)
- `drizzle/meta/_journal.json`

---

## 2. Levantar Qamuz Studio 2.0 (HECHO)

- Se levantó el dev server (Svelte 5 + Vite) en el puerto fijo **1420**, que es
  el que consume el iframe de Qamuz AI (`http://127.0.0.1:1420`, vista `/studio`).
- Verificado: `http://localhost:1420/` → 200.
- La CSP del Studio ya permite embeberse desde `localhost:5173` (Ai en dev) y
  `qamuz.ai` en prod.
- Pendiente opcional: la app de escritorio nativa se levanta con
  `npm run tauri dev` (compila el lado Rust en `src-tauri`, tarda más).

---

## 3. Error al extraer stems (DIAGNOSTICADO, pendiente de token)

### Síntoma
Al extraer los stems de una canción aparece un aviso de error.

### Flujo
`Studio → POST /api/music-tools/stems` (Qamuz Ai) →
`genAudiusClient.separateStems()` → worker de GenAudius (`/api/stems`).
Resolución de worker: `GENAUDIUS_PRIMARY_URL` / `GENAUDIUS_FAILOVER_URL` (env) →
`admin_settings.local_music_base_url` / `LOCAL_MUSIC_BASE_URL` → default
`http://127.0.0.1:42003`.

### Causa raíz (local y producción)
- El `.env` **local** y el `.env` del **VPS** NO tienen `GENAUDIUS_PRIMARY_URL`
  ni token. Solo tienen `LOCAL_MUSIC_ENABLED=true` y
  `LOCAL_MUSIC_BASE_URL=http://127.0.0.1:42003`.
- En producción, `admin_settings.local_music_base_url = http://localhost:42003`.
- Resultado: la extracción de stems intenta conectarse a un worker **local en
  `127.0.0.1:42003` que no existe** → falla → 502 `genaudius_stems_failed`.
- El worker real de **Modal**
  (`https://dagrabastudio--genaudius-v1-api-app.modal.run`) está **sano**
  (`/health` → `{"status":"ok","model":"GenAudius_V1","device":"cuda","model_loaded":true}`)
  pero nunca se usa porque no está configurado como `GENAUDIUS_PRIMARY_URL`.
- El endpoint `/api/stems` de Modal **requiere token**: responde **401** sin
  `Authorization`. El endpoint `/api/auth/auto` (auto-token) da 404 en Modal.

### Fix propuesto (pendiente)
Añadir a `.env` (local) y al `.env` del VPS:

```
GENAUDIUS_PRIMARY_URL="https://dagrabastudio--genaudius-v1-api-app.modal.run"
GENAUDIUS_PRIMARY_TOKEN="<token real de Modal>"
```

Opcional (respaldo RunPod):
```
GENAUDIUS_FAILOVER_URL="https://api.runpod.ai/v2/40ul5r2eltnue8"
GENAUDIUS_FAILOVER_TOKEN="<token real de RunPod>"
```

### Bloqueante
Falta el **token real de Modal** (`GENAUDIUS_PRIMARY_TOKEN`). En el repo aparece
redactado como `[SENSITIVE]` en `.env.production`, `.env.prod.local` y
`.env.production.local`, así que no está disponible. Se necesita obtenerlo (del
gestor de secretos o del dashboard de Modal) para completar el arreglo en local
y en el VPS y reiniciar (`vite dev` / `pm2 restart`).

---

## Notas de infraestructura y seguridad

- **VPS Hostinger**: `187.127.254.145`, deploy dir `/var/www/qamuz_ai`, proceso
  PM2 `qamuz-ai`, nginx como reverse proxy a `localhost:3000`. **No es repo git**.
- **Deploy de actualización real**: subir archivos por SFTP + `npm run build` +
  `pm2 restart` (los scripts `deploy_full_update.mjs` que hacen `git pull` no
  sirven porque no hay `.git` en el VPS).
- **Riesgo de seguridad señalado**: los scripts en `scratch_deploy/*.mjs` tienen
  credenciales SSH y de base de datos en texto plano. La carpeta está en
  `.gitignore` (no se sube al repo), pero convendría mover esos secretos a
  variables de entorno.
- Recomendación a futuro: convertir `/var/www/qamuz_ai` en un clone de git para
  simplificar los despliegues, y/o añadir un paso de migraciones al deploy.


---

## 4. Privilegios de admin para todos los flujos (HECHO)

Se elevó la cuenta `genaudius@gmail.com` en la base de datos de producción para
que no la bloquee ningún gate:
`isAdmin=true`, `planTier=advanced`, `userType=producer_artist`,
`professionalRole=producer`, `isVerifiedArtist=true`,
`verificationStatus=verified`, `hasUnlimitedFanAccess=true`,
`subscriptionStatus=active` (antes `incomplete`), `emailVerifiedBool=true`.
El único cambio real fue `subscriptionStatus`; el resto ya estaba en su máximo.

---

## 5. QAMUZ MASTER PRO: acceso de admin + gate reactivo (HECHO)

**Problema:** el gate de Master Pro solo miraba el `planTier` (query param `?plan=`)
y se evaluaba una sola vez al montar, ignorando `isAdmin`. Un admin quedaba
bloqueado con el aviso "Premium".

**Fix:**
- Qamuz Ai (`src/routes/studio/+page.svelte`): pasa `admin=1` en el query param
  del iframe y `isAdmin` en el postMessage `qamuz-studio:user`.
- Studio (`entitlement.ts`): `readIsAdmin()` + `hasMasterProAccess(tier?, isAdmin?)`
  → admin siempre pasa; evalúa el tier del store reactivo.
- Studio (`account.svelte.ts`): `account.isAdmin` reactivo, alimentado por query
  param y postMessage.
- Studio (`MasteringPanel.svelte`): `unlocked` es reactivo
  (`$derived(hasMasterProAccess(account.plan, account.isAdmin))`).
- Servidor (Qamuz Ai `master-jobs.ts`): `sessionUser` ahora trae `isAdmin`;
  nuevo helper `canUseMasterPro` (admin O premium); usado en
  `/api/studio/master-jobs` y en `/api/studio/maestro-usage` (admin = ilimitado).

---

## 6. QAMUZ MASTER PRO: el motor de audio no procesaba (HECHO)

**Problema:** el DSP de mastering es 100% client-side (Web Audio). `applyMastering()`
requería `engine.backend.audioContext`; si el engine no arrancaba (autoplay policy
del navegador, común en el iframe embebido) lanzaba y rompía TODO: analizador
(espectro wet), knobs/botones y el agente Maestro (todos pasan por `reprocess()`).

**Fix (`Studio: src/lib/audio/mastering.ts`):** `applyMastering` ya no depende del
engine. Nuevo `makeBuffer()` usa el AudioContext del engine si existe, y si no cae
a un `OfflineAudioContext` propio (no necesita gesto de usuario ni engine corriendo).
Además `MasteringPanel` hace `engine.backend.resume()` al montar (best-effort) para
meters en vivo y preview.

---

## 7. Unificación del Studio dentro del SaaS (Opción B) (HECHO)

Se sirve el Studio 2.0 desde el mismo origen que el SaaS en lugar del dominio
externo `qamuz.studio`.

- `src/routes/studio/+page.svelte`: en producción el iframe apunta a
  `/qamuz-studio/index.html` (mismo origen). Dev sigue en `127.0.0.1:1420`.
- `package.json`: `prebuild` ejecuta `studio:build` (buildea el Studio y copia su
  `dist/` a `static/qamuz-studio/`) antes de compilar el SaaS.
- `scripts/sync-qamuz-studio.mjs`: tolerante — si el proyecto Studio no está junto
  al SaaS (caso VPS), no rompe el build y conserva el `static/qamuz-studio/` existente.

Resultado: un solo dominio, un solo deploy, misma sesión/cookies. El Studio sigue
siendo app independiente (no reescrito a SvelteKit nativo). Backend ya centralizado
en `/api/studio/*` y `/api/music/*` (el Studio no tiene backend propio).

`static/qamuz-studio/` está en `.gitignore`; el build viaja al VPS por SFTP.

---

## 8. Endpoints backend faltantes del Studio (Fase 2) (HECHO)

**Sesiones completas del DAW** (guardar/reabrir project.json + WAVs):
- `PUT/GET /api/studio/sessions/[name]/project`
- `GET /api/studio/sessions/[name]/audio` (lista)
- `PUT/GET /api/studio/sessions/[name]/audio/[fileId]` (bytes)
- Helper: `src/lib/server/studio-session-store.ts` (usa `storageService`,
  namespace por usuario+sesión, manifiesto JSON de audios).

**Stems alineado al contrato async del Studio** (`/api/music-tools/stems`):
- `POST { musicId, type:'split_stem' }` → 202 `{ jobId }` (409 si ya en curso).
- `GET ?jobId` → `{ status, stems:[{index,name}] }`; `GET ?jobId&stem=N` → bytes.
- Modo síncrono legacy (`separate_vocal`) mantenido por compatibilidad.
- Helper: `src/lib/server/studio-stem-jobs.ts` (wrapper async in-process, Map por
  jobId, TTL 30 min).

**Limitaciones conocidas:**
- Los jobs de stems viven en memoria (una instancia PM2); se pierden en reinicio.
- La separación real de stems sigue **bloqueada** por falta de
  `GENAUDIUS_PRIMARY_TOKEN` (Modal) en el `.env` local y del VPS (ver punto 3).
