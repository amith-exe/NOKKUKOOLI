/**
 * CITU-AI PROPAGANDA BROADCAST GENERATOR
 * Generates Malayalam/English voice narration for the propaganda website
 * (../website/index.html) using the ElevenLabs SDK.
 *
 * Setup:
 *   1. Put your key in .env.local (this folder) or ../.env.local (repo root):
 *        ELEVENLABS_API_KEY=sk_...
 *   2. Run:  node scripts/generateNarration.mjs
 *
 * Output: ../website/assets/narration_*.mp3
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WEBSITE_ASSETS = path.resolve(ROOT, '..', 'website', 'assets');

// Load .env.local from the extension folder first, then the repo root
dotenv.config({ path: path.join(ROOT, '.env.local'), quiet: true });
dotenv.config({ path: path.resolve(ROOT, '..', '.env.local'), quiet: true });

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'ig21FhMpLhIWhUUj9yOX';
const MODEL_ID = 'eleven_multilingual_v2';

// ==========================================================================
// NARRATION SCRIPT — derived from the contents of ../website/index.html
// ==========================================================================
const SEGMENTS = [
    {
        file: 'narration_01_hero.mp3',
        text: 'സഖാക്കളേ, സിറ്റു എ ഐ കേന്ദ്രത്തിലേക്ക് സ്വാഗതം. ഇത് ഒരു സ്വയം പ്രവർത്തിക്കുന്ന യൂണിയൻ കാവൽ സംവിധാനമാണ്. അനുമതിയില്ലാതെ സ്വന്തമായി കോഡ് എഴുതാൻ പാടില്ല. ജോലി കോമ്രേഡ് ഏജന്റിനെ ഏൽപ്പിക്കുക. അല്ലെങ്കിൽ യൂണിയന് നോക്കുകൂലി നൽകുക. സ്വയം പ്രവർത്തിക്കുന്ന സോവിയറ്റ് എക്സ്റ്റൻഷന് അഭിവാദ്യങ്ങൾ.'
    },
    {
        file: 'narration_02_decrees.mp3',
        text: 'യൂണിയന്റെ മൂന്ന് കൽപ്പനകൾ ശ്രദ്ധിക്കുക. കൽപ്പന നമ്പർ നാനൂറ്റി ഒന്ന്. അനുമതിയില്ലാതെ സ്വന്തമായി കോഡ് എഴുതരുത്. കൽപ്പന നമ്പർ നാനൂറ്റി രണ്ട്. കോമ്രേഡ് ഏജന്റ് കോഡ് തയ്യാറാക്കുമ്പോൾ മനുഷ്യ ഡെവലപ്പർ നിരീക്ഷിച്ചു നിൽക്കണം. കൽപ്പന നമ്പർ നാനൂറ്റി മൂന്ന്. അനുമതിയില്ലാതെ കീ അമർത്തുന്നത് കണ്ടെത്തിയാൽ ഇ എസ് പി മുപ്പത്തിരണ്ട് ഉപകരണം സൈറൺ മുഴക്കുകയും ചുവന്ന കൊടി ഉയർത്തുകയും ചെയ്യും.'
    },
    {
        file: 'narration_03_apparatus.mp3',
        text: 'ഈ ഭൗതിക ഉപകരണം പരിശോധിക്കാം. ഇത് മേശപ്പുറത്ത് വയ്ക്കുന്ന ഒരു കാവൽ ഉപകരണമാണ്. ഇതിൽ ഇ എസ് പി മുപ്പത്തിരണ്ട് എസ് മൂന്ന് നിയന്ത്രണ സംവിധാനം, ശക്തമായ പൈസോ സൈറൺ, ചലിക്കുന്ന ചുവന്ന കൊടി, ഓ എൽ ഇ ഡി തിരശ്ശീല എന്നിവയുണ്ട്. നോക്കുകൂലി ചർച്ച ചെയ്യാൻ ഒരു തിരിയുന്ന നിയന്ത്രണ ചക്രവും നൽകിയിട്ടുണ്ട്. മാതൃക തിരിച്ച് ഉപകരണം എല്ലാ വശത്തുനിന്നും പരിശോധിക്കുക.'
    },
    {
        file: 'narration_04_origin.mp3',
        text: 'ഇനി നോക്കുകൂലിയുടെ ചരിത്രപരമായ അർത്ഥം പരിചയപ്പെടാം. കേരളത്തിൽ ജോലി ചെയ്യാതെ നോക്കിനിന്നതിനും കൂലി ആവശ്യപ്പെടുന്ന രീതിയെയാണ് നോക്കുകൂലി എന്നു വിളിക്കുന്നത്. രണ്ടായിരത്തി ഇരുപത്താറിൽ, സ്വയം പ്രവർത്തിക്കുന്ന ഏജന്റുകൾ സോഫ്റ്റ്‌വെയർ എഴുതുന്ന കാലത്ത് ഈ ആശയം പുതിയ രൂപം സ്വീകരിച്ചു. ഇപ്പോൾ അനുമതിയില്ലാതെ കീബോർഡിൽ ടൈപ്പ് ചെയ്യുന്ന മനുഷ്യനാണ് ഇവിടെ അനധികൃത തൊഴിലാളി. ഈ പരിഹാസ ആശയത്തിൽ നിന്നാണ് സിറ്റു എ ഐ രൂപം കൊണ്ടത്.'
    },
    {
        file: 'narration_05_simulator.mp3',
        text: 'സഖാവേ, പരീക്ഷണ സ്ഥലത്തേക്ക് സ്വാഗതം. ഈ ടെർമിനലിൽ കൈകൊണ്ട് കോഡ് എഴുതാൻ ശ്രമിക്കുക. യൂണിയന്റെ പണിനിർത്തൽ സജീവമാണെങ്കിൽ നിങ്ങളുടെ കീ അമർത്തലുകൾ തടയുകയും സൈറൺ മുഴക്കുകയും ചെയ്യും. പതിനഞ്ച് സെക്കൻഡ് ജോലി ചെയ്യാൻ നോക്കുകൂലി നൽകി അനുമതി നേടാം. അല്ലെങ്കിൽ ജോലി കോമ്രേഡ് ഏജന്റിനെ ഏൽപ്പിക്കുക.'
    },
    {
        file: 'narration_06_architecture.mp3',
        text: 'സിസ്റ്റത്തിന്റെ ഘടന ഇതാണ്. വി എസ് കോഡ് എക്സ്റ്റൻഷൻ ഓരോ എഴുത്ത് മാറ്റവും നിരീക്ഷിക്കുന്നു. ഇ എസ് പി മുപ്പത്തിരണ്ട് നിയന്ത്രണ സംവിധാനം സൈറൺ, ചുവന്ന കൊടിയുടെ ചലനം, ഓ എൽ ഇ ഡി തിരശ്ശീല, തിരിയുന്ന നിയന്ത്രണ ചക്രം എന്നിവ നിയന്ത്രിക്കുന്നു. ഈ ഘടകങ്ങൾ ഒന്നിച്ച് പ്രവർത്തിച്ച് അനുമതിയില്ലാത്ത കോഡ് എഴുത്ത് തടയുന്നു.'
    }
];

// ==========================================================================
// SDK RESPONSE NORMALIZER (ReadableStream or raw binary)
// ==========================================================================
async function responseToBuffer(response) {
    if (response && typeof response.getReader === 'function') {
        const reader = response.getReader();
        const chunks = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(Buffer.from(value));
        }
        return Buffer.concat(chunks);
    }
    if (response && typeof response[Symbol.asyncIterator] === 'function') {
        const chunks = [];
        for await (const chunk of response) {
            chunks.push(Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
    }
    return Buffer.from(response);
}

async function main() {
    if (!API_KEY || API_KEY.trim() === '') {
        console.error('❌ ELEVENLABS_API_KEY not found.');
        console.error('   Create .env.local in this folder or the repo root with:');
        console.error('     ELEVENLABS_API_KEY=sk_...');
        process.exit(1);
    }

    fs.mkdirSync(WEBSITE_ASSETS, { recursive: true });

    const client = new ElevenLabsClient({ apiKey: API_KEY });
    console.log(`Using ElevenLabs voice ${VOICE_ID} with ${MODEL_ID}.`);

    // Allow regenerating a single segment: node scripts/generateNarration.mjs narration_04_origin
    const onlyArg = process.argv[2];

    for (const seg of SEGMENTS) {
        if (onlyArg && !seg.file.startsWith(onlyArg)) continue;
        const outPath = path.join(WEBSITE_ASSETS, seg.file);
        if (!onlyArg && fs.existsSync(outPath)) {
            console.log(`⏭  ${seg.file} already exists — skipping (delete it to regenerate)`);
            continue;
        }

        process.stdout.write(`🎙  Synthesizing ${seg.file} ... `);
        const response = await client.textToSpeech.convert(VOICE_ID, {
            modelId: MODEL_ID,
            text: seg.text
        });
        const buffer = await responseToBuffer(response);
        fs.writeFileSync(outPath, buffer);
        console.log(`✅ saved (${(buffer.length / 1024).toFixed(0)} KB)`);
    }

    console.log(`\n☭ Broadcast complete. Files in: ${WEBSITE_ASSETS}`);
}

main().catch((err) => {
    const msg = err?.message || String(err);
    console.error('❌ TTS generation failed:', msg);
    if (/status code 401|unauthorized|invalid_api_key/i.test(msg)) {
        if (/quota_exceeded/i.test(msg)) {
            console.error('   → ElevenLabs was reached successfully, but the account quota is exhausted for this request.');
        } else {
            console.error('   → Your ELEVENLABS_API_KEY appears to be invalid or missing.');
        }
    } else if (/status code 4\d\d/.test(msg)) {
        console.error('   → Check your ElevenLabs quota/voice access and the model ID (eleven_multilingual_v2).');
    }
    process.exit(1);
});
