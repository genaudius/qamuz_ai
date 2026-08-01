const fs = require('fs');

const onboardingEs = {
  "title": "Verificación de Perfil",
  "description": "Qamuz está destinado exclusivamente a artistas independientes, músicos, compositores y productores verificados. Nos reservamos el derecho de solicitar documentación que valide su trayectoria antes o durante el uso de la plataforma.",
  "role_label": "¿Cuál es tu rol principal en la industria musical?",
  "roles": {
    "artist": "Artista Independiente",
    "producer": "Productor / Ingeniero de Audio",
    "musician": "Músico / Compositor",
    "label": "Sello Discográfico / Editora",
    "none": "Otro / Aficionado"
  },
  "portfolio_label": "(Opcional) Enlace a tu perfil profesional (Spotify, Instagram, etc.)",
  "submit": "Guardar Perfil y Continuar"
};

const guardrailEs = {
  "title": "Declaración de Derechos de Materiales",
  "ownership_label": "Declaración de Titularidad: Confirmo que el material de origen (voz, audio, composición o imagen) es de mi propiedad intelectual o cuento con las licencias/permisos legales correspondientes para usarlo en esta IA.",
  "no_impersonation_label": "No Suplantación: Prometo no usar voces ni material de personas, artistas o terceros sin su consentimiento explícito por escrito.",
  "liability_label": "Responsabilidad Legal: Entiendo que cualquier reclamación por infracción de derechos o uso indebido será asumida al 100% por mi persona, liberando a Gen Audius LLC de toda responsabilidad.",
  "content_filter_title": "🛡️ Filtro de Contenido Activo",
  "content_filter_desc": "El motor de Qamuz audita automáticamente el texto, audio e imágenes. No se permite contenido violento, político, sexual, de acoso o uso de datos de terceros.",
  "content_filter_label": "Confirmo que mi creación cumple con las políticas de contenido de Qamuz y asumo la responsabilidad total de este trabajo.",
  "rejected_error": "Tu petición no pudo ser procesada porque contraviene las políticas de contenido y uso responsable de Qamuz."
};

const onboardingEn = {
  "title": "Profile Verification",
  "description": "Qamuz is exclusively for verified independent artists, musicians, composers, and producers. We reserve the right to request documentation validating your background.",
  "role_label": "What is your main role in the music industry?",
  "roles": {
    "artist": "Independent Artist",
    "producer": "Producer / Audio Engineer",
    "musician": "Musician / Composer",
    "label": "Record Label / Publisher",
    "none": "Other / Hobbyist"
  },
  "portfolio_label": "(Optional) Link to your professional profile (Spotify, Instagram, etc.)",
  "submit": "Save Profile and Continue"
};

const guardrailEn = {
  "title": "Material Rights Declaration",
  "ownership_label": "Ownership Declaration: I confirm that the source material (voice, audio, composition, or image) is my intellectual property or I have the legal licenses/permissions to use it in this AI.",
  "no_impersonation_label": "No Impersonation: I promise not to use voices or material of people, artists, or third parties without their explicit written consent.",
  "liability_label": "Legal Liability: I understand that any claim for infringement of rights or misuse will be 100% assumed by me, releasing Gen Audius LLC from all liability.",
  "content_filter_title": "🛡️ Active Content Filter",
  "content_filter_desc": "The Qamuz engine automatically audits text, audio, and images. Violent, political, sexual, harassing content, or use of third-party data is not permitted.",
  "content_filter_label": "I confirm that my creation complies with Qamuz's content policies and assume full responsibility for this work.",
  "rejected_error": "Your request could not be processed because it contravenes Qamuz's content and responsible use policies."
};

const locales = ['es', 'en', 'de', 'pt', 'ar'];

locales.forEach(locale => {
  const path = `messages/${locale}.json`;
  if (fs.existsSync(path)) {
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    // Fallback to English for non-Spanish ones as a quick mock, can translate via API if needed.
    data.onboarding = locale === 'es' ? onboardingEs : onboardingEn;
    data.guardrail = locale === 'es' ? guardrailEs : guardrailEn;
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
    console.log(`Updated ${path}`);
  }
});
