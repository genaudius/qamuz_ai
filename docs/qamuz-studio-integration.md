# QAMUZ Studio integrado

El DAW vive en `studio-client/` y se compila dentro de `static/qamuz-studio/` antes del build principal. La ruta autenticada `/studio` lo abre en un iframe del mismo origen y actúa como puente seguro hacia las APIs del SaaS.

## Flujo de datos

- `/api/studio/projects`: crea, lista y guarda proyectos del usuario en `daw_session`.
- `/api/studio/history`: consulta y restaura revisiones de `daw_session_revision`.
- `/api/studio/audio`: importa audio, lo guarda mediante el almacenamiento configurado y registra sus metadatos.
- `/api/music-generation`: mantiene la generación Kie/Suno, la cola, los créditos y la portada existentes en el SaaS.
- `/api/music/:id` y `/api/audio/:id`: entregan audio autenticado al Studio.

## Compilación

`npm run build` ejecuta primero `npm run studio:build`. No se necesita el antiguo repositorio hermano `Qamuz_Daw_Studio`.

Antes de publicar, aplica la migración `0009_daw_session_revisions.sql` mediante el flujo habitual de Drizzle del proyecto.
