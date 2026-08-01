const fs = require('fs');
const path = require('path');

const languages = ['en', 'es', 'pt', 'de', 'ar'];
const translations = {
  en: {
    "make_a_beat_title": "Make a beat",
    "make_a_beat_reference": "Reference",
    "make_a_beat_genre": "Genre",
    "make_a_beat_description": "Description",
    "make_a_beat_placeholder": "Add details about your beat",
    "make_a_beat_btn": "Make a beat"
  },
  es: {
    "make_a_beat_title": "Crear un beat",
    "make_a_beat_reference": "Referencia",
    "make_a_beat_genre": "Género",
    "make_a_beat_description": "Descripción",
    "make_a_beat_placeholder": "Añade detalles sobre tu beat",
    "make_a_beat_btn": "Crear beat"
  },
  pt: {
    "make_a_beat_title": "Criar um beat",
    "make_a_beat_reference": "Referência",
    "make_a_beat_genre": "Gênero",
    "make_a_beat_description": "Descrição",
    "make_a_beat_placeholder": "Adicione detalhes sobre o seu beat",
    "make_a_beat_btn": "Criar beat"
  },
  de: {
    "make_a_beat_title": "Beat erstellen",
    "make_a_beat_reference": "Referenz",
    "make_a_beat_genre": "Genre",
    "make_a_beat_description": "Beschreibung",
    "make_a_beat_placeholder": "Füge Details zu deinem Beat hinzu",
    "make_a_beat_btn": "Beat erstellen"
  },
  ar: {
    "make_a_beat_title": "أنشئ إيقاعاً",
    "make_a_beat_reference": "مرجع",
    "make_a_beat_genre": "النوع",
    "make_a_beat_description": "الوصف",
    "make_a_beat_placeholder": "أضف تفاصيل حول إيقاعك",
    "make_a_beat_btn": "أنشئ إيقاعاً"
  }
};

languages.forEach(lang => {
  const file = path.join(__dirname, 'messages', `${lang}.json`);
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    // add to audio section
    if (!data.audio) data.audio = {};
    Object.assign(data.audio, translations[lang]);
    
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log(`Updated ${lang}.json`);
  }
});
