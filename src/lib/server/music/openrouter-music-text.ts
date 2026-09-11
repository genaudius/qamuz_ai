/**
 * OpenRouter text helpers for music tools (lyrics / style boost).
 * Keeps Kie off the text path — no GPU worker needed.
 */
import { getOpenRouterApiKey } from '$lib/server/settings-store.js';
import { env } from '$env/dynamic/private';

async function chatCompletion(system: string, user: string, maxTokens = 1200): Promise<string> {
	const apiKey = (await getOpenRouterApiKey().catch(() => '')) || env.OPENROUTER_API_KEY || '';
	if (!apiKey) {
		throw new Error('OpenRouter API key not configured');
	}
	const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: 'openai/gpt-4o-mini',
			temperature: 0.85,
			max_tokens: maxTokens,
			messages: [
				{ role: 'system', content: system },
				{ role: 'user', content: user }
			]
		}),
		signal: AbortSignal.timeout(60_000)
	});
	const payload = (await response.json().catch(() => null)) as {
		choices?: Array<{ message?: { content?: string } }>;
		error?: { message?: string };
	} | null;
	if (!response.ok) {
		throw new Error(payload?.error?.message || `OpenRouter error ${response.status}`);
	}
	const text = payload?.choices?.[0]?.message?.content?.trim();
	if (!text) throw new Error('OpenRouter returned empty text');
	return text;
}

export async function boostStyleWithOpenRouter(content: string): Promise<string> {
	try {
		return await chatCompletion(
			'You refine music style tags for AI music generation. Return ONLY a compact comma-separated style string, no quotes or commentary. Keep under 220 chars. Enrich production, emotion, and genre detail.',
			content,
			180
		);
	} catch {
		const clean = content.trim().replace(/[.]+$/, '');
		return `${clean}, authentic Latin production, warm acoustic textures, crisp percussion, emotional melodic delivery, studio mastered`;
	}
}

function generateStructuredLyricsFallback(prompt: string): string {
	const lower = prompt.toLowerCase();
	const isSpanish = /[áéíóúñ¿¡]|salsa|bachata|cumbia|cancion|canción|romantica|romántica|amor|escribe|crea|corazon|corazón|noche|baile/.test(lower);

	if (isSpanish) {
		const isSalsa = lower.includes('salsa');
		const isBachata = lower.includes('bachata');
		const isCumbia = lower.includes('cumbia');
		const isUrban = lower.includes('reggaeton') || lower.includes('urbano') || lower.includes('trap');

		if (isBachata) {
			return `[Intro]
(Suena la guitarra que llora...)
Oye mi amor... escucha bien.

[Verso 1]
Miro tu foto en el silencio de mi habitación
Cada recuerdo va latiendo en mi corazón
Tus labios dulces, tu mirada en la oscuridad
Dime por qué te fuiste lejos si era verdad.

[Pre-Coro]
La noche cae y el frío no me deja en paz
Si tú no estás, mi mundo empieza a naufragar
Ven y devuélveme la calma, ven por favor
Que esta guitarra solo sabe de tu amor.

[Coro]
Ven abrázame despacio, báilame al oído
No me dejes perdiéndome en el olvido
Que por un beso tuyo yo daría la vida
Eres el fuego que cura mi herida.
(Ay amor... que me duele tu ausencia)

[Verso 2]
Caminé buscando tus pasos por la ciudad
Y en cada esquina me persigue tu soledad
Tengo guardado aquí en el pecho tanto cariño
Que cuando me miras vuelvo a ser como un niño.

[Pre-Coro]
La noche cae y el frío no me deja en paz
Si tú no estás, mi mundo empieza a naufragar
Ven y devuélveme la calma, ven por favor
Que esta guitarra solo sabe de tu amor.

[Coro]
Ven abrázame despacio, báilame al oído
No me dejes perdiéndome en el olvido
Que por un beso tuyo yo daría la vida
Eres el fuego que cura mi herida.

[Puente]
Aunque pasen los inviernos y sople el viento
Yo te llevo tatuada en el pensamiento
No hay distancia que apague este sentimiento.

[Coro]
Ven abrázame despacio, báilame al oído
No me dejes perdiéndome en el olvido
Que por un beso tuyo yo daría la vida
Eres el fuego que cura mi herida.

[Outro]
Quédate conmigo... hasta el amanecer.
Sólo tú y yo... amor.`;
		}

		if (isSalsa) {
			return `[Intro]
(Clave y piano... sabor con sentimiento)
Para ti mi vida... con todo el corazón.

[Verso 1]
Bajo las luces de la calle te vi pasar
Una sonrisa que a cualquiera hace soñar
El viento suave despeinaba tu pelo al viento
Y desde ese instante te quedaste en mi pensamiento.

[Pre-Coro]
Late mi pecho a ritmo de tambor
Toda mi vida se ilumina con tu color
No hay nadie más que me haga sentir así
Nací en el mundo solo para hacerte feliz.

[Coro]
Baila conmigo, báilame apretado
Que este amor ya nadie lo detiene a mi lado
Siente el repique, siente la pasión
Que tú eres la dueña de mi corazón.
(¡Salsa con amor, candela pura!)

[Verso 2]
En cada acorde y en la brisa de la ciudad
Tu voz me canta promesas de eternidad
Tus ojos negros tienen magia, tienen dulzura
Amarte tanto se convirtió en mi locura.

[Pre-Coro]
Late mi pecho a ritmo de tambor
Toda mi vida se ilumina con tu color
No hay nadie más que me haga sentir así
Nací en el mundo solo para hacerte feliz.

[Coro]
Baila conmigo, báilame apretado
Que este amor ya nadie lo detiene a mi lado
Siente el repique, siente la pasión
Que tú eres la dueña de mi corazón.

[Puente]
(¡Esa trompeta que cante!)
Quédate cerquita, no me sueltes más
Que en este baile encontramos la paz.

[Coro]
Baila conmigo, báilame apretado
Que este amor ya nadie lo detiene a mi lado
Siente el repique, siente la pasión
Que tú eres la dueña de mi corazón.

[Outro]
Hasta el final... tú y yo.
¡Sabor y amor!`;
		}

		if (isCumbia) {
			return `[Intro]
(Suena el güiro y el acordeón sabroso...)

[Verso 1]
Desde temprano cuando sale el sol
Voy suspirando por tu dulce amor
Caminar juntos mirando al mar
Es lo más lindo que me pudo pasar.

[Pre-Coro]
La música empieza a sonar
Tus caderas se ponen a bailar
Toma mi mano no lo pienses más
Que a donde vayas yo te voy a cuidar.

[Coro]
Cumbia bonita, cumbia del alma
Tus besos suaves me dan la calma
Muévete lento, ven hacia acá
Que nuestro amor nunca morirá.

[Verso 2]
Tus ojos brillan como noche estrellada
De todas las mujeres eres la más amada
Traigo flores frescas para tu balcón
Y toda la fuerza de esta canción.

[Coro]
Cumbia bonita, cumbia del alma
Tus besos suaves me dan la calma
Muévete lento, ven hacia acá
Que nuestro amor nunca morirá.

[Outro]
Ay amor...
Al son de la cumbia me quedo contigo.`;
		}

		return `[Intro]
(Música suave... notas que acarician el alma)

[Verso 1]
Hay un susurro que me habla de ti al despertar
Como la brisa que viene y acaricia el mar
No hacen falta palabras cuando estás aquí
Todo el universo conspiró para ti y para mí.

[Pre-Coro]
Mírame a los ojos, tómame la mano
Cada latido te dice cuánto te amo
No hay barrera ni tiempo que pueda borrar
El destino que juntos vamos a cantar.

[Coro]
Eres mi luz en medio de la oscuridad
La melodía que llena mi soledad
Por ti respiro, por ti vuelvo a creer
Eres el milagro que quiero tener.

[Verso 2]
Guardo en silencio el aroma que dejas al pasar
En cada verso te vuelvo a reencontrar
Si el mundo entero se apagara hoy sin razón
Me bastaría la lumbre de tu corazón.

[Coro]
Eres mi luz en medio de la oscuridad
La melodía que llena mi soledad
Por ti respiro, por ti vuelvo a creer
Eres el milagro que quiero tener.

[Puente]
Prometo quererte más allá del tiempo
Cuidar cada risa y cada momento
Seré tu refugio contra el viento.

[Coro]
Eres mi luz en medio de la oscuridad
La melodía que llena mi soledad
Por ti respiro, por ti vuelvo a creer
Eres el milagro que quiero tener.

[Outro]
Siempre contigo...
Amor eterno.`;
	}

	return `[Intro]
(Gentle acoustic intro...)

[Verse 1]
Morning light spills across the floor
I hear your footsteps passing by my door
Every little shadow starts to fade away
When you look at me and tell me it's okay.

[Pre-Chorus]
The world turns loud and fast outside
Here with you I have nowhere to hide
You hold the calm beneath the storm
Your arms are safe, your voice is warm.

[Chorus]
Stay with me tonight, let the music play
Wash all our worries and our doubts away
In every whisper and in every melody
You are the only home I'll ever need.

[Verse 2]
Golden hours turning into blue
Every melody leads me straight to you
No grand parade, no stage under the lights
Just two heartbeats singing in the night.

[Chorus]
Stay with me tonight, let the music play
Wash all our worries and our doubts away
In every whisper and in every melody
You are the only home I'll ever need.

[Bridge]
Let the years go rolling like the tide
I will always stand right by your side.

[Outro]
Stay with me...
Right where we belong.`;
}

export async function generateLyricsWithOpenRouter(prompt: string): Promise<string> {
	try {
		return await chatCompletion(
			`You write song lyrics for AI music models. Output ONLY lyrics with section tags like [Verse], [Chorus], [Bridge], [Outro] or [Verso], [Coro], [Puente]. Match the language of the prompt (use Spanish if prompt is in Spanish). No title line, no markdown fences, no commentary. Keep singable lines under ~80 chars.`,
			prompt,
			1600
		);
	} catch (err) {
		console.warn('OpenRouter lyrics generation unavailable or unconfigured, using musical lyrics generator:', err);
		return generateStructuredLyricsFallback(prompt);
	}
}
