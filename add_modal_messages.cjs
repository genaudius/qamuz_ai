const fs = require('fs');
const path = require('path');

const languages = ['en', 'es', 'pt', 'de', 'ar'];
const translations = {
  en: {
    "reference_title": "Reference",
    "reference_subtitle": "Create songs inspired by a reference track",
    "reference_upload": "Upload audio",
    "reference_youtube": "YouTube link",
    "reference_tab_upload": "Upload",
    "reference_tab_library": "Library",
    "reference_disclaimer": "By uploading, you acknowledge and agree to the Disclaimer and allow others to use the audio.",
    "vocal_title": "Character",
    "vocal_subtitle": "Choose a character to perform your song",
    "vocal_create_new": "Create new character",
    "vocal_tab_mine": "Mine",
    "vocal_tab_official": "Official",
    "vocal_tab_liked": "Liked",
    "dropdown_reference": "Reference",
    "dropdown_vocal": "Vocal",
    "dropdown_instrumental": "Instrumental"
  },
  es: {
    "reference_title": "Referencia",
    "reference_subtitle": "Crea canciones inspiradas en una pista de referencia",
    "reference_upload": "Subir audio",
    "reference_youtube": "Enlace de YouTube",
    "reference_tab_upload": "Subir",
    "reference_tab_library": "Biblioteca",
    "reference_disclaimer": "Al subir el archivo, reconoces y aceptas el Aviso Legal y permites que otros usen el audio.",
    "vocal_title": "Personaje",
    "vocal_subtitle": "Elige un personaje para interpretar tu canción",
    "vocal_create_new": "Crear nuevo personaje",
    "vocal_tab_mine": "Míos",
    "vocal_tab_official": "Oficiales",
    "vocal_tab_liked": "Me gusta",
    "dropdown_reference": "Referencia",
    "dropdown_vocal": "Vocal",
    "dropdown_instrumental": "Instrumental"
  },
  pt: {
    "reference_title": "Referência",
    "reference_subtitle": "Crie músicas inspiradas em uma faixa de referência",
    "reference_upload": "Enviar áudio",
    "reference_youtube": "Link do YouTube",
    "reference_tab_upload": "Enviar",
    "reference_tab_library": "Biblioteca",
    "reference_disclaimer": "Ao enviar, você reconhece e concorda com o Aviso Legal e permite que outros usem o áudio.",
    "vocal_title": "Personagem",
    "vocal_subtitle": "Escolha um personagem para interpretar sua música",
    "vocal_create_new": "Criar novo personagem",
    "vocal_tab_mine": "Meus",
    "vocal_tab_official": "Oficiais",
    "vocal_tab_liked": "Curtidos",
    "dropdown_reference": "Referência",
    "dropdown_vocal": "Vocal",
    "dropdown_instrumental": "Instrumental"
  },
  de: {
    "reference_title": "Referenz",
    "reference_subtitle": "Erstellen Sie Songs inspiriert von einem Referenztrack",
    "reference_upload": "Audio hochladen",
    "reference_youtube": "YouTube-Link",
    "reference_tab_upload": "Hochladen",
    "reference_tab_library": "Bibliothek",
    "reference_disclaimer": "Mit dem Hochladen erkennen Sie den Haftungsausschluss an und erlauben anderen, das Audio zu verwenden.",
    "vocal_title": "Charakter",
    "vocal_subtitle": "Wähle einen Charakter, um dein Lied zu singen",
    "vocal_create_new": "Neuen Charakter erstellen",
    "vocal_tab_mine": "Meine",
    "vocal_tab_official": "Offiziell",
    "vocal_tab_liked": "Gefällt mir",
    "dropdown_reference": "Referenz",
    "dropdown_vocal": "Vokal",
    "dropdown_instrumental": "Instrumental"
  },
  ar: {
    "reference_title": "مرجع",
    "reference_subtitle": "أنشئ أغاني مستوحاة من مسار مرجعي",
    "reference_upload": "تحميل صوت",
    "reference_youtube": "رابط يوتيوب",
    "reference_tab_upload": "تحميل",
    "reference_tab_library": "المكتبة",
    "reference_disclaimer": "من خلال التحميل، تقر وتوافق على إخلاء المسؤولية وتسمح للآخرين باستخدام الصوت.",
    "vocal_title": "الشخصية",
    "vocal_subtitle": "اختر شخصية لأداء أغنيتك",
    "vocal_create_new": "إنشاء شخصية جديدة",
    "vocal_tab_mine": "الخاصة بي",
    "vocal_tab_official": "رسمي",
    "vocal_tab_liked": "أعجبني",
    "dropdown_reference": "مرجع",
    "dropdown_vocal": "غناء",
    "dropdown_instrumental": "موسيقى فقط"
  }
};

languages.forEach(lang => {
  const file = path.join(__dirname, 'messages', `${lang}.json`);
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    if (!data.audio) data.audio = {};
    Object.assign(data.audio, translations[lang]);
    
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log(`Updated ${lang}.json`);
  }
});
