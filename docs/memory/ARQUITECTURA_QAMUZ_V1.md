# Memoria — Arquitectura QAMUZ / Qamuz_v1 (Project State Sync)

Fecha de registro: 14 de septiembre de 2026
Naturaleza: fotografía arquitectónica + estado de implementación.
Este documento NO es autorización para integrar el modelo ni desplegar.

## Identidad oficial

- **GEN AUDIUS** = la empresa (company / owner).
- **QAMUZ** = la marca / ecosistema (brand).
- **Qamuz_v1** = el modelo de música (foundation music model). Nombre oficial
  exacto: `Qamuz_v1` (NO "GenAudius_Qamuz_v1", NO "GenAudius for QAMUZ AI v1").
- **QAMUZ PROD / MAESTRO** = inteligencia de producción musical (producer intelligence).
- **QAMUZ Studio** = el DAW.
- **QAMUZ SaaS** = autoridad de negocio / control plane.
- **ACE-Step 1.5 XL** = renderer de fundación INICIAL de Qamuz_v1. Es reemplazable.
  ACE-Step NO es la identidad de producto QAMUZ ni MAESTRO.

## Arquitectura de alto nivel (objetivo)

```
USER → QAMUZ SaaS → QAMUZ PROD/MAESTRO → Qamuz_v1 → ACE-Step 1.5 XL
     → audio/stems/assets → QAMUZ Studio
```

- Qamuz_v1 se construye APARTE (workspace dedicado, p. ej. ~/Qamuz_v1). NO se
  instala ACE-Step ni pesos del modelo dentro de los repos del SaaS o del Studio.
- El transporte/contrato de generación en producción NO está autorizado a
  implementarse aún.

## Repositorios (3, no 2)

1. **Qamuz_Ai** — QAMUZ SaaS (SvelteKit 2 / Svelte 5, Drizzle + Postgres/Neon).
   Deploy: VPS Hostinger + PM2 + nginx. Es el Control Plane V1.
2. **Qamuz_Daw_Studio/qamuz_studio_2.0** — QAMUZ Studio (Svelte 5 + Vite, app
   independiente). Deploy objetivo: qamuz.studio (Vercel). También embebido en
   qamuz.ai/studio (mismo origen, servido desde static/qamuz-studio/).
3. **Qamuz_Daw_Studio/studio-bff** — Studio-BFF (Hono + Neon). Backend técnico
   del Studio en standalone; SSO JWT emitido por el SaaS. **Mucho WIP sin
   commitear** — preservar intacto.

## Estado de implementación (verificado 2026-09-14)

| Área | Estado | Evidencia |
|---|---|---|
| Creator Registry / roles | PARTIAL | `user` tiene isAdmin, planTier(enum), professionalRole(enum), userType(string libre), isVerifiedArtist, verificationStatus, artistName, username, hasUnlimitedFanAccess. Dos ejes redundantes (userType vs professionalRole). Sin `creator`/`credit_identity` separados. `producer_artist` es string suelto (no enum). |
| Entitlement contract (AUTHORIZED/DENIED/TEMPORARILY_UNAVAILABLE/REVALIDATION_REQUIRED) | NOT_IMPLEMENTED (como contrato) / PARTIAL (enforcement ad-hoc) | No existen esos estados. Enforcement real: usage-tracking + créditos hold/commit/rollback (credit_transactions) + entitlement.ts boolean de plan en el Studio. |
| Studio-BFF | IMPLEMENTED (pre-existing WIP) | studio-bff (Hono) con studio_user_link, studio_session, studio_project_blob, studio_audio_asset, studio_master_job, studio_eqamuz_preset, projectRevision; SSO JWT (studio-sso.ts). |
| Revalidation client (Studio) | NOT_IMPLEMENTED | El plan se lee una vez (query/postMessage) y se cachea (planTierCache). Sin re-chequeo. |
| Studio persistence | PARTIAL / duplicado | SaaS solo tiene `daw_session`. El BFF tiene studio_session + studio_project_blob + projectRevision. El Studio usa IndexedDB local + saasApi a /api/studio/sessions/* y /api/studio/daw-sessions. |
| executeDawAction | IMPLEMENTED | daw-actions.ts: switch de acciones que muta projectStore/transport/engine/workspace. Es el ejecutor principal PERO no es el único (mix-agent, fill, master.svelte.ts también mutan). |
| ProductionActionV1 + dedupe por action_id | NOT_IMPLEMENTED | No existe el envelope (schema_version/request_id/action_id/…), ni dedupe, ni estados proposed/applied/rejected/failed. Scope se resuelve read-only en el momento (no persiste). |
| Renderer coupling | PARTIAL / divergente | SaaS genera música con Suno/Kie (music-generation, storageLocation:'kie'). Studio genera con GenAudius/Modal (maestro.ts). ACE-Step solo en Runpod_Packs (fuera de las apps). Sin capa "renderer" unificada. |
| Project identities | PARTIAL | daw_session.id (SaaS, direccionado por name), studio_session.id (solo BFF, +projectRevision), musicId (music.id). Sin qamuz_project_id/studio_project_id unificado. |

## Reglas duras vigentes (de este sync)

- Preservar todo el WIP pre-existente (especialmente producer_artist y el repo
  studio-bff sin commitear). No revertir, no reformatear archivos no relacionados.
- NO instalar/integrar ACE-Step ni Qamuz_v1 en SaaS/Studio ahora.
- NO crear api.qamuz.ai ahora. El SaaS es el Control Plane V1.
- NO migrar el Studio a Hostinger/Docker (destino: Vercel + Neon vía BFF).
- NO borrar daw_session. Migración legacy debe ser NO destructiva.
- NO db:push sin autorización separada.
- Entrenamiento: salida de Suno/Kie => training_eligible = false salvo
  autorización explícita.
- Seguridad: credenciales en texto plano en scripts gitignored
  (PLAINTEXT_SSH_CREDENTIAL, PLAINTEXT_POSTGRES_CREDENTIAL). Remediar antes del
  próximo deploy de producción. No exponer valores.

## Nota sobre convergencia

La arquitectura objetivo (Studio-BFF/Neon con studio_session/blob/revision) ya
existe parcialmente en el repo studio-bff. El SaaS aún usa daw_session. La
convergencia (embedded + standalone hacia la misma autoridad de negocio) es
trabajo futuro, no ejecutado en esta sesión.
