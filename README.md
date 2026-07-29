# Qamuz AI - Plataforma de Streaming de Música y Estudio de Creación IA

**Qamuz AI** es una aplicación full-stack moderna de streaming musical y suite creativa potenciada por Inteligencia Artificial. Permite escuchar música, gestionar bibliotecas y listas de reproducción, y generar canciones completas con letra, música, videos musicales cinematográficos y portadas digitales mediante modelos de IA avanzados.

---

## 🚀 Características Principales

### 🎧 1. Reproductor de Música y Experiencia de Streaming
- **Reproductor Interactivo**: Reproducción continua con soporte para canciones en CDN y motor sintetizador Web Audio API en caso de fallos.
- **Ecualizador de Audio Avanzado**: Control de bajos, medios, agudos, compresión y modos envolventes (Spatial 3D / Bass Boost).
- **Letras Sincronizadas**: Visualización de letras en tiempo real con resaltado de versos y visualizador de formas de onda.
- **Cola de Reproducción Dinámica**: Reordenamiento, repetición, reproducción aleatoria y adición de canciones personalizadas.

### 🎨 2. Qamuz AI Studio (Suite de Creación IA)
- **Generación de Música (Qamuz Audio Engine)**:
  - Creación de canciones por prompt o letra personalizada.
  - Modos por género (Pop, Reggaeton, Lofi, Cyberpunk, Metal, Flamenco, Trap, Synthwave).
  - Integración directa con el motor de composición **Qamuz Audio Engine V4.5** y sintetizador multimodal de respaldo.
- **Generación de Videos Musicales (Qamuz Render Engine)**:
  - Animación de escenas musicales con efectos de cámara (Zoom, Pan, Orbit, Drone).
  - Estilos visuales: Anime 90s, Cyberpunk Neon, Cinema 8K, Claymation, Pixel Art, Vaporwave.
- **Generación de Portadas e Imágenes de Álbum (Qamuz Vision Art)**:
  - Creación automática de portadas de álbumes en Ultra HD, ilustraciones vectoriales y arte 3D.

### 📊 3. Dashboard de Administración (Admin Dashboard)
- **Gestión de Usuarios**: Cambio de roles (Admin, Pro, User), cancelación/activación de cuentas y métricas.
- **Analíticas en Tiempo Real**: Total de usuarios, usuarios activos, ingresos mensuales, estado de suscripciones.
- **Estado de Motores de IA Qamuz**: Monitoreo de claves y estado operativo de los motores de generación de texto, voz, audio, imagen y video de Qamuz.
- **Logs del Sistema**: Registro de auditoría de actividad del sistema y errores.

---

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 19**: Biblioteca de UI interactiva.
- **TypeScript 5.8**: Tipado estático estricto.
- **Vite 6**: Bundler ultra rápido para desarrollo y producción.
- **Tailwind CSS v4**: Framework de estilos utilitarios responsive.
- **Motion (`motion/react`)**: Animaciones suaves para componentes y modales.
- **Lucide React**: Sistema de iconos vectorial.
- **Web Audio API**: Motor sintetizador de audio personalizado para previsualizaciones musicales locales.

### Backend
- **Node.js**: Entorno de ejecución en servidor.
- **Express.js v4**: Servidor HTTP para la API backend y proxy de servicios IA.
- **esbuild**: Empaquetador del servidor backend compilando a un único archivo `dist/server.cjs` para alta eficiencia en producción.
- **tsx**: Ejecutor TypeScript directo para entorno de desarrollo.

### Integraciones de IA y APIs
- **Google Gemini API (`@google/genai`)**: Generación de letras, prompts creativos y síntesis de metadatos.
- **Kie Suno API**: Generación de pistas musicales reales.
- **Replicate & OpenRouter**: Proveedores alternativos de IA para imágenes y texto.
- **ElevenLabs**: Síntesis de voz.

---

## 📁 Estructura del Proyecto

```text
├── server.ts                   # Servidor Express Backend (Rutas API, Proxy IA)
├── src/
│   ├── main.tsx                # Punto de entrada de React
│   ├── App.tsx                 # Componente principal y layout general
│   ├── ai_providers/           # Integración con proveedores de IA (Kie Suno, ElevenLabs, etc.)
│   ├── components/
│   │   ├── Sidebar.tsx         # Navegación principal
│   │   ├── Player.tsx          # Reproductor flotante e interfaz expandida
│   │   ├── Header.tsx          # Encabezado con búsqueda y perfil de usuario
│   │   ├── views/
│   │   │   ├── AIStudioView.tsx    # Estudio de creación IA (Música, Video, Portadas)
│   │   │   ├── AdminView.tsx       # Dashboard Administrativo completo
│   │   │   ├── HomeView.tsx        # Pantalla principal con carrusel y novedades
│   │   │   ├── LibraryView.tsx     # Biblioteca del usuario y playlists
│   │   │   ├── SearchView.tsx      # Búsqueda global de artistas, canciones y listas
│   │   │   ├── PlaylistDetailView.tsx
│   │   │   ├── ArtistDetailView.tsx
│   │   │   ├── QueueView.tsx
│   │   │   └── LyricsView.tsx
│   │   ├── modals/             # Modales (Equalizer, Custom Track, Recommendations)
│   │   └── auth/               # Modal de pagos / suscripciones Stripe
│   ├── context/
│   │   ├── PlayerContext.tsx   # Estado global de reproducción, cola y favoritos
│   │   └── AuthContext.tsx     # Estado global de usuario y permisos
│   ├── data/
│   │   └── mockData.ts         # Datos iniciales y canciones de muestra
│   └── utils/
│       └── audioEngine.ts      # Motor sintetizador de audio con Web Audio API
├── package.json
├── vite.config.ts
├── .env.example
└── README.md
```

---

## ⚙️ Variables de Entorno (`.env`)

Crea un archivo `.env` en la raíz del proyecto tomando como plantilla `.env.example`:

```env
# Servidor
PORT=3000
NODE_ENV=development

# Claves de IA (Opcionales / Recomendadas)
GEMINI_API_KEY=tu_clave_gemini
KIE_SUNO_API_KEY=tu_clave_kie_suno
ELEVENLABS_API_KEY=tu_clave_elevenlabs
REPLICATE_API_TOKEN=tu_clave_replicate
OPENROUTER_API_KEY=tu_clave_openrouter
```

---

## 📦 Instalación y Despliegue

### 1. Desarrollo Local / En esta plataforma
```bash
# Instalar dependencias
npm install

# Iniciar servidor en modo desarrollo (Port 3000)
npm run dev
```
Accede a `http://localhost:3000`.

---

### 2. Despliegue en VPS (Hostinger VPS, DigitalOcean, Hetzner, AWS, etc.)

#### Requisitos previos en el VPS (Ubuntu/Debian):
```bash
sudo apt update && sudo apt install -y nodejs npm nginx git
sudo npm install -g pm2
```

#### Pasos de despliegue:
1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/tu-usuario/qamuz-app.git
   cd qamuz-app
   ```
2. **Instalar y Construir**:
   ```bash
   npm install
   npm run build
   ```
3. **Configurar el archivo `.env`**:
   ```bash
   cp .env.example .env
   nano .env
   ```
4. **Ejecutar con PM2**:
   ```bash
   pm2 start dist/server.cjs --name "qamuz-app"
   pm2 save
   pm2 startup
   ```
5. **Configurar Nginx Reverse Proxy** (`/etc/nginx/sites-available/default`):
   ```nginx
   server {
       listen 80;
       server_name tudominio.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
6. **Reiniciar Nginx y Activar SSL con Certbot**:
   ```bash
   sudo systemctl restart nginx
   sudo certbot --nginx -d tudominio.com
   ```

---

### 3. Despliegue en Hosting Compartido / Cloud Hosting de Hostinger (Node.js App Manager)

1. En el panel hPanel de Hostinger, dirígete a **Node.js Apps**.
2. Crea una nueva aplicación de Node.js especificando:
   - **Versión de Node.js**: 20.x o superior.
   - **Directorio de la aplicación**: `/public_html` o la carpeta asignada.
   - **Archivo de inicio**: `dist/server.cjs`
3. Sube los archivos del proyecto (o mediante Git Integration).
4. Ejecutar el comando de compilación en la terminal SSH del hosting:
   ```bash
   npm install
   npm run build
   ```
5. Inicia la aplicación desde el panel de Hostinger.

---

### 4. Despliegue con Docker

Crea un archivo `Dockerfile` en la raíz del proyecto:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package*.json ./
RUN npm install --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
```

Construir y ejecutar:
```bash
docker build -t qamuz-app .
docker run -d -p 3000:3000 --env-file .env --name qamuz qamuz-app
```

---

## 📌 Guía para realizar un nuevo Commit con Git

Para guardar y subir los últimos cambios realizados:

```bash
# 1. Verificar archivos modificados
git status

# 2. Agregar todos los cambios al área de preparación
git add .

# 3. Crear el commit descriptivo
git commit -m "feat: integración robusta con API de Suno, purga de generadores sintéticos obsoletos y mejoras en el diseño de interfaz (sidebar y player)"

# 4. Subir los cambios a tu repositorio remoto (GitHub/GitLab)
git push origin main
```

## 🔄 Últimas Actualizaciones
- **Suno Oficial Integrado:** Transición 100% al motor Suno (Kie) erradicando viejos generadores de música sintética obsoletos como MusicGPT. 
- **Sistema Anti-Fallos:** Lógica de fallbacks automáticos rotando por los endpoints oficiales de Kie para asegurar que tu canción siempre se genere.
- **UI Moderna Mejorada:** Rediseño del layout incluyendo un sidebar responsivo más ancho con opción de ocultar y un reproductor musical flotante reposicionado para maximizar el uso de pantalla.

---

## 📄 Licencia
Este proyecto está licenciado bajo la Licencia MIT.
