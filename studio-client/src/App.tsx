"use client";
import { useEffect, useRef, useState } from "react";
import lamejs from "@breezystack/lamejs";
import {
  Circle,
  Copy,
  Download,
  Eraser,
  FolderPlus,
  Headphones,
  House,
  History as HistoryIcon,
  Magnet,
  Maximize2,
  Mic,
  Minimize2,
  MousePointer2,
  Music2,
  Layers3,
  MessageSquare,
  Pause,
  Pencil,
  Play,
  Plus,
  Power,
  Redo2,
  RotateCcw,
  Save,
  Scissors,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Square,
  Trash2,
  Undo2,
  Volume2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
type Track = {
  id: number;
  name: string;
  color: string;
  type: string;
  muted: boolean;
  solo: boolean;
  volume: number;
  pan: number;
  url?: string;
  duration?: number;
  peaks?: number[];
  start: number;
  trimEnd: number;
  cuts: number[];
  effects: string[];
};
type DspSettings = {
  lowFreq: number;
  lowGain: number;
  lowAtten: number;
  midFreq: number;
  midGain: number;
  midQ: number;
  highFreq: number;
  highGain: number;
  highAttenFreq: number;
  highAtten: number;
  eqOutput: number;
  threshold: number;
  ratio: number;
  attack: number;
  release: number;
  makeup: number;
};
const defaultDsp: DspSettings = {
  lowFreq: 80,
  lowGain: 0,
  lowAtten: 0,
  midFreq: 1200,
  midGain: 0,
  midQ: 1,
  highFreq: 10000,
  highGain: 0,
  highAttenFreq: 10000,
  highAtten: 0,
  eqOutput: 0,
  threshold: -18,
  ratio: 1,
  attack: 0.01,
  release: 0.18,
  makeup: 0,
};
const presetDsp: Record<string, Partial<DspSettings>> = {
  "EQ Paramétrico 24 bandas": {
    lowFreq: 80,
    lowGain: 0,
    midFreq: 1200,
    midGain: 0,
    midQ: 1,
    highFreq: 10000,
    highGain: 0,
    lowAtten: 0,
    highAttenFreq: 10000,
    highAtten: 0,
    eqOutput: 0,
  },
  "Tube EQP Vintage": {
    lowFreq: 60,
    lowGain: 4.5,
    lowAtten: 1.5,
    midFreq: 3200,
    midGain: 1.5,
    midQ: 0.65,
    highFreq: 10000,
    highGain: 3,
    highAttenFreq: 10000,
    highAtten: 1,
    eqOutput: 0,
  },
  "Bass Tight EQ": {
    lowFreq: 90,
    lowGain: 4,
    lowAtten: 1,
    midFreq: 320,
    midGain: -3.5,
    midQ: 1.3,
    highFreq: 6500,
    highGain: 1,
    highAttenFreq: 12000,
    highAtten: 0,
    eqOutput: 0,
  },
  "Vocal Presence EQ": {
    lowFreq: 110,
    lowGain: -2,
    lowAtten: 0,
    midFreq: 3200,
    midGain: 4,
    midQ: 1.1,
    highFreq: 12000,
    highGain: 2.5,
    highAttenFreq: 12000,
    highAtten: 0.5,
    eqOutput: 0,
  },
  "VCA Punch": {
    threshold: -18,
    ratio: 4,
    attack: 0.01,
    release: 0.12,
    makeup: 3,
  },
  "Opto Smooth": {
    threshold: -15,
    ratio: 3,
    attack: 0.03,
    release: 0.3,
    makeup: 2,
  },
  "FET Fast": {
    threshold: -24,
    ratio: 8,
    attack: 0.001,
    release: 0.08,
    makeup: 5,
  },
  "Bus Glue": {
    threshold: -12,
    ratio: 2,
    attack: 0.03,
    release: 0.2,
    makeup: 1,
  },
};
const eqPresetNames = [
  "EQ Paramétrico 24 bandas",
  "Tube EQP Vintage",
  "Bass Tight EQ",
  "Vocal Presence EQ",
];
const compressorPresetNames = [
  "VCA Punch",
  "Opto Smooth",
  "FET Fast",
  "Bus Glue",
];
const generalPresetNames = [
  "Studio Clean",
  "Warm Vintage",
  "Modern Punch",
  "Vocal Presence",
  "Master Polish",
];
type EffectControl = {
  key: string;
  label: string;
  unit: string;
  value: number;
};
const effectProfiles: Record<
  string,
  { model: string; meter: string; presets: string[]; controls: EffectControl[] }
> = {
  "QAMUZ EQ Pro": {
    model: "EQ-PRO 32",
    meter: "REAL-TIME SPECTRUM · DYNAMIC EQ",
    presets: [
      "Vocal Presence",
      "Bass Tight",
      "Drum Surgical",
      "Master Transparent",
    ],
    controls: [
      { key: "frequency", label: "FREQUENCY", unit: "Hz", value: 52 },
      { key: "gain", label: "GAIN", unit: "dB", value: 50 },
      { key: "q", label: "Q / WIDTH", unit: "Q", value: 38 },
      { key: "threshold", label: "DYN THRESHOLD", unit: "dB", value: 44 },
      { key: "range", label: "DYN RANGE", unit: "dB", value: 30 },
      { key: "sidechain", label: "SIDECHAIN", unit: "%", value: 0 },
    ],
  },
  "QAMUZ Room": {
    model: "ROOM-R1",
    meter: "REVERB ENERGY",
    presets: ["Small Studio", "Live Room", "Drum Chamber", "Large Hall"],
    controls: [{ key: "mix", label: "ROOM MIX", unit: "%", value: 50 }],
  },
  "QAMUZ Plate": {
    model: "PLATE-P1",
    meter: "REVERB TAIL",
    presets: ["Vocal Plate", "Bright Plate", "Dark Plate", "Long Plate"],
    controls: [
      { key: "predelay", label: "PRE-DELAY", unit: "ms", value: 32 },
      { key: "decay", label: "DECAY", unit: "%", value: 62 },
      { key: "tone", label: "TONE", unit: "%", value: 58 },
      { key: "damping", label: "DAMPING", unit: "%", value: 35 },
      { key: "width", label: "WIDTH", unit: "%", value: 88 },
      { key: "mix", label: "DRY / WET", unit: "%", value: 28 },
    ],
  },
  "QAMUZ Delay": {
    model: "DELAY-D2",
    meter: "TEMPO SYNC",
    presets: ["Slap 1/16", "Stereo 1/8", "Quarter Echo", "Dub Feedback"],
    controls: [
      { key: "time", label: "TIME", unit: "ms", value: 42 },
      { key: "feedback", label: "FEEDBACK", unit: "%", value: 36 },
      { key: "lowcut", label: "LOW CUT", unit: "Hz", value: 22 },
      { key: "highcut", label: "HIGH CUT", unit: "kHz", value: 72 },
      { key: "spread", label: "STEREO", unit: "%", value: 78 },
      { key: "mix", label: "DRY / WET", unit: "%", value: 25 },
    ],
  },
  "QAMUZ Chorus": {
    model: "CHORUS-C2",
    meter: "MODULATION",
    presets: ["Subtle Width", "Classic Chorus", "Deep Ensemble", "Wide Vocal"],
    controls: [
      { key: "rate", label: "RATE", unit: "Hz", value: 24 },
      { key: "depth", label: "DEPTH", unit: "%", value: 54 },
      { key: "delay", label: "DELAY", unit: "ms", value: 32 },
      { key: "voices", label: "VOICES", unit: "", value: 48 },
      { key: "width", label: "WIDTH", unit: "%", value: 82 },
      { key: "mix", label: "DRY / WET", unit: "%", value: 35 },
    ],
  },
  "QAMUZ Phaser": {
    model: "PHASE-P4",
    meter: "PHASE SWEEP",
    presets: ["Slow Sweep", "Vintage Phase", "Jet Flanger", "Tempo Motion"],
    controls: [
      { key: "rate", label: "RATE", unit: "Hz", value: 26 },
      { key: "depth", label: "DEPTH", unit: "%", value: 66 },
      { key: "stages", label: "STAGES", unit: "", value: 48 },
      { key: "feedback", label: "FEEDBACK", unit: "%", value: 42 },
      { key: "stereo", label: "STEREO", unit: "%", value: 70 },
      { key: "mix", label: "DRY / WET", unit: "%", value: 40 },
    ],
  },
  "QAMUZ Saturator": {
    model: "SAT-S1",
    meter: "HARMONICS",
    presets: ["Tape Warmth", "Tube Color", "Console Drive", "Hard Clip"],
    controls: [
      { key: "drive", label: "DRIVE", unit: "dB", value: 46 },
      { key: "tone", label: "TONE", unit: "%", value: 55 },
      { key: "bias", label: "BIAS", unit: "%", value: 50 },
      { key: "density", label: "DENSITY", unit: "%", value: 62 },
      { key: "output", label: "OUTPUT", unit: "dB", value: 48 },
      { key: "mix", label: "DRY / WET", unit: "%", value: 70 },
    ],
  },
  "QAMUZ Amp": {
    model: "AMP A97 · AMP / PEDALS / CAB",
    meter: "PEDALS › GATE › DRIVE › AMP › CAB / IR › OUTPUT",
    presets: ["High Gain 0977", "Bass Valve Head", "Clean Green", "Blue Lead"],
    controls: [
      { key: "greenGain", label: "GREEN GAIN", unit: "%", value: 32 },
      { key: "blueGain", label: "BLUE GAIN", unit: "%", value: 62 },
      { key: "low", label: "LOW", unit: "dB", value: 50 },
      { key: "mid", label: "MID", unit: "dB", value: 52 },
      { key: "high", label: "HIGH", unit: "dB", value: 52 },
      { key: "presence", label: "PRESENCE", unit: "dB", value: 51 },
      { key: "resonance", label: "RESONANCE", unit: "dB", value: 56 },
      { key: "gate", label: "GATE THRESHOLD", unit: "%", value: 12 },
      { key: "drive", label: "OD DRIVE", unit: "%", value: 35 },
      { key: "output", label: "OUTPUT", unit: "dB", value: 53 },
    ],
  },
  "QAMUZ Tune": {
    model: "TUNE-T1",
    meter: "PITCH MONITOR",
    presets: ["Natural Vocal", "Modern Tight", "Hard Tune", "Low Male Voice"],
    controls: [
      { key: "input", label: "INPUT GAIN", unit: "dB", value: 50 },
      { key: "output", label: "OUTPUT GAIN", unit: "dB", value: 50 },
      { key: "speed", label: "RETUNE SPEED", unit: "ms", value: 34 },
      { key: "humanize", label: "HUMANIZE", unit: "%", value: 62 },
      { key: "transition", label: "TRANSITION", unit: "%", value: 48 },
      { key: "amount", label: "AMOUNT", unit: "%", value: 88 },
      { key: "vibratoDepth", label: "VIBRATO DEPTH", unit: "%", value: 18 },
      { key: "vibratoRate", label: "VIBRATO RATE", unit: "Hz", value: 35 },
      { key: "vibratoMix", label: "VIBRATO MIX", unit: "%", value: 20 },
    ],
  },
  "QAMUZ De-Esser": {
    model: "DESS-D1",
    meter: "S REDUCTION",
    presets: ["Male Vocal", "Female Vocal", "Soft Control", "Bright Vocal"],
    controls: [
      { key: "frequency", label: "FREQUENCY", unit: "kHz", value: 58 },
      { key: "threshold", label: "THRESHOLD", unit: "dB", value: 44 },
      { key: "range", label: "RANGE", unit: "dB", value: 38 },
      { key: "listen", label: "LISTEN", unit: "%", value: 0 },
      { key: "attack", label: "ATTACK", unit: "ms", value: 18 },
      { key: "release", label: "RELEASE", unit: "ms", value: 42 },
    ],
  },
  "QAMUZ Doubler": {
    model: "DOUBLE-D2",
    meter: "VOICE SPREAD",
    presets: ["Tight Double", "Wide Double", "Vocal Stack", "Micro Pitch"],
    controls: [
      { key: "delay", label: "DELAY", unit: "ms", value: 28 },
      { key: "detune", label: "DETUNE", unit: "ct", value: 34 },
      { key: "voices", label: "VOICES", unit: "", value: 50 },
      { key: "variation", label: "VARIATION", unit: "%", value: 48 },
      { key: "width", label: "WIDTH", unit: "%", value: 90 },
      { key: "mix", label: "DRY / WET", unit: "%", value: 42 },
    ],
  },
  "QAMUZ Gate": {
    model: "GATE-G1",
    meter: "GAIN REDUCTION",
    presets: ["Vocal Clean", "Drum Gate", "Gentle Expander", "Hard Gate"],
    controls: [
      { key: "threshold", label: "THRESHOLD", unit: "dB", value: 42 },
      { key: "range", label: "RANGE", unit: "dB", value: 70 },
      { key: "attack", label: "ATTACK", unit: "ms", value: 12 },
      { key: "hold", label: "HOLD", unit: "ms", value: 36 },
      { key: "release", label: "RELEASE", unit: "ms", value: 48 },
      { key: "hysteresis", label: "HYSTERESIS", unit: "dB", value: 25 },
    ],
  },
  "QAMUZ Limiter": {
    model: "LIMIT-L2",
    meter: "TRUE PEAK",
    presets: [
      "Streaming Safe",
      "Loud Master",
      "Transparent Limit",
      "Broadcast",
    ],
    controls: [
      { key: "ceiling", label: "CEILING", unit: "dBTP", value: 94 },
      { key: "threshold", label: "THRESHOLD", unit: "dB", value: 55 },
      { key: "release", label: "RELEASE", unit: "ms", value: 38 },
      { key: "lookahead", label: "LOOKAHEAD", unit: "ms", value: 24 },
      { key: "stereo", label: "STEREO LINK", unit: "%", value: 85 },
      { key: "oversampling", label: "OVERSAMPLE", unit: "x", value: 50 },
    ],
  },
  "QAMUZ Imager": {
    model: "IMAGE-I2",
    meter: "STEREO FIELD",
    presets: ["Mono Safe", "Natural Width", "Wide Master", "Vocal Focus"],
    controls: [
      { key: "lowwidth", label: "LOW WIDTH", unit: "%", value: 10 },
      { key: "midwidth", label: "MID WIDTH", unit: "%", value: 55 },
      { key: "highwidth", label: "HIGH WIDTH", unit: "%", value: 72 },
      { key: "crossover", label: "CROSSOVER", unit: "Hz", value: 38 },
      { key: "balance", label: "BALANCE", unit: "%", value: 50 },
      { key: "correlation", label: "MONO SAFE", unit: "%", value: 88 },
    ],
  },
  "QAMUZ Trigger": {
    model: "TRIG-T2",
    meter: "TRANSIENT DETECT",
    presets: [
      "Kick Reinforce",
      "Snare Replace",
      "Tom Trigger",
      "Parallel Layer",
    ],
    controls: [
      { key: "threshold", label: "THRESHOLD", unit: "dB", value: 45 },
      { key: "sensitivity", label: "SENSITIVITY", unit: "%", value: 68 },
      { key: "attack", label: "ATTACK", unit: "ms", value: 12 },
      { key: "retrigger", label: "RETRIGGER", unit: "ms", value: 32 },
      { key: "velocity", label: "DYNAMICS", unit: "%", value: 75 },
      { key: "mix", label: "LAYER MIX", unit: "%", value: 60 },
    ],
  },
  "QAMUZ Unmask": {
    model: "UNMASK-U1",
    meter: "SPECTRAL SPACE",
    presets: ["Vocal vs Music", "Kick vs Bass", "Lead Focus", "Gentle Carve"],
    controls: [
      { key: "amount", label: "AMOUNT", unit: "%", value: 45 },
      { key: "sensitivity", label: "SENSITIVITY", unit: "%", value: 62 },
      { key: "focus", label: "FOCUS", unit: "Hz", value: 52 },
      { key: "range", label: "RANGE", unit: "oct", value: 48 },
      { key: "attack", label: "ATTACK", unit: "ms", value: 24 },
      { key: "release", label: "RELEASE", unit: "ms", value: 55 },
    ],
  },
};
const seed: Track[] = [];
const effectLibrary = [
  ["QAMUZ EQ Pro", "Ecualizador paramétrico de 24 bandas", "EQ"],
  ["QAMUZ Tube EQ", "Color analógico y curvas musicales", "EQ"],
  ["QAMUZ Tune", "Afinación y corrección vocal", "VOCAL"],
  ["QAMUZ Compressor", "Control dinámico profesional", "DYNAMICS"],
  ["QAMUZ Gate", "Puerta de ruido y expansión", "DYNAMICS"],
  ["QAMUZ De-Esser", "Control de sibilancia vocal", "VOCAL"],
  ["QAMUZ Chorus", "Modulación estéreo", "MOD"],
  ["QAMUZ Phaser", "Phaser y flanger sincronizable", "MOD"],
  ["QAMUZ Doubler", "Doblaje vocal estéreo", "VOCAL"],
  ["QAMUZ Amp", "Amplificador de guitarra y bajo", "AMP"],
  ["QAMUZ Trigger", "Reemplazo y refuerzo de batería", "DRUM"],
  ["QAMUZ Unmask", "Separación espectral entre pistas", "SMART"],
  ["QAMUZ Saturator", "Saturación, drive y armónicos", "COLOR"],
  ["QAMUZ Room", "Reverb de sala", "SPACE"],
  ["QAMUZ Plate", "Reverb de placa vocal", "SPACE"],
  ["QAMUZ Delay", "Delay estéreo sincronizado al BPM", "SPACE"],
  ["QAMUZ Limiter", "Limitador true-peak para master", "MASTER"],
  ["QAMUZ Imager", "Imagen y amplitud estéreo", "MASTER"],
];
const channelEffects = [
  {
    group: "EQUALIZACIÓN",
    items: [
      ["EQ Paramétrico 24 bandas", "QAMUZ EQ Pro", "Precisión quirúrgica"],
      ["Tube EQP Vintage", "QAMUZ Tube EQ", "Graves y brillo musical"],
      ["Bass Tight EQ", "QAMUZ EQ Pro", "Bajo firme y definido"],
      ["Vocal Presence EQ", "QAMUZ EQ Pro", "Claridad y presencia"],
    ],
  },
  {
    group: "COMPRESORES",
    items: [
      ["VCA Punch", "QAMUZ Compressor", "Ataque moderno"],
      ["Opto Smooth", "QAMUZ Compressor", "Nivelación suave"],
      ["FET Fast", "QAMUZ Compressor", "Control ultrarrápido"],
      ["Bus Glue", "QAMUZ Compressor", "Cohesión de grupo"],
    ],
  },
  {
    group: "COLOR · MOD · SPACE",
    items: [
      ["Drive Saturation", "QAMUZ Saturator", "Armónicos y carácter"],
      ["Chorus", "QAMUZ Chorus", "Modulación estéreo"],
      ["Phaser / Flanger", "QAMUZ Phaser", "Movimiento sincronizado"],
      ["Doubler", "QAMUZ Doubler", "Anchura vocal"],
      ["Amp", "QAMUZ Amp", "Guitarra y bajo"],
      ["Trigger", "QAMUZ Trigger", "Refuerzo de batería"],
      ["Unmask", "QAMUZ Unmask", "Separación espectral"],
      ["Reverb Room", "QAMUZ Room", "Espacio natural"],
      ["Delay", "QAMUZ Delay", "Eco sincronizado"],
    ],
  },
];
const defaultSessionLength = 48;
function getPeaks(buffer: AudioBuffer, buckets = 240) {
  const peaks: number[] = [];
  const step = Math.max(1, Math.floor(buffer.length / buckets));
  for (let i = 0; i < buckets; i++) {
    let peak = 0;
    const from = i * step,
      to = Math.min(buffer.length, from + step),
      stride = Math.max(1, Math.floor(step / 100));
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const data = buffer.getChannelData(c);
      for (let j = from; j < to; j += stride)
        peak = Math.max(peak, Math.abs(data[j]));
    }
    peaks.push(peak);
  }
  const max = Math.max(0.001, ...peaks);
  return peaks.map((x) => Math.max(0.025, x / max));
}
function audioBufferToWav(buffer: AudioBuffer, bitDepth = 24) {
  const channels = buffer.numberOfChannels,
    bytes = bitDepth / 8,
    length = 44 + buffer.length * channels * bytes,
    out = new ArrayBuffer(length),
    view = new DataView(out);
  let offset = 0;
  const str = (s: string) => {
      for (let i = 0; i < s.length; i++)
        view.setUint8(offset++, s.charCodeAt(i));
    },
    u16 = (n: number) => {
      view.setUint16(offset, n, true);
      offset += 2;
    },
    u32 = (n: number) => {
      view.setUint32(offset, n, true);
      offset += 4;
    };
  str("RIFF");
  u32(length - 8);
  str("WAVEfmt ");
  u32(16);
  u16(1);
  u16(channels);
  u32(buffer.sampleRate);
  u32(buffer.sampleRate * channels * bytes);
  u16(channels * bytes);
  u16(bitDepth);
  str("data");
  u32(length - 44);
  for (let i = 0; i < buffer.length; i++)
    for (let c = 0; c < channels; c++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
      if (bitDepth === 16) {
        view.setInt16(offset, s < 0 ? s * 32768 : s * 32767, true);
        offset += 2;
      } else {
        const n = Math.round(s < 0 ? s * 8388608 : s * 8388607);
        view.setUint8(offset++, n & 255);
        view.setUint8(offset++, (n >> 8) & 255);
        view.setUint8(offset++, (n >> 16) & 255);
      }
    }
  return new Blob([out], { type: "audio/wav" });
}
function audioBufferToMp3(buffer: AudioBuffer, bitrate = 320) {
  const channels = Math.min(2, buffer.numberOfChannels),
    encoder = new lamejs.Mp3Encoder(channels, buffer.sampleRate, bitrate),
    chunks: Uint8Array[] = [],
    block = 1152;
  const pcm = Array.from({ length: channels }, (_, channel) => {
    const source = buffer.getChannelData(channel),
      out = new Int16Array(source.length);
    for (let i = 0; i < source.length; i++) {
      const sample = Math.max(-1, Math.min(1, source[i]));
      out[i] = sample < 0 ? sample * 32768 : sample * 32767;
    }
    return out;
  });
  for (let i = 0; i < buffer.length; i += block) {
    const encoded =
      channels === 2
        ? encoder.encodeBuffer(
            pcm[0].subarray(i, i + block),
            pcm[1].subarray(i, i + block),
          )
        : encoder.encodeBuffer(pcm[0].subarray(i, i + block));
    if (encoded.length) chunks.push(encoded);
  }
  const end = encoder.flush();
  if (end.length) chunks.push(end);
  return new Blob(chunks as BlobPart[], { type: "audio/mpeg" });
}
export default function Home() {
  const [tracks, setTracks] = useState(seed),
    [playing, setPlaying] = useState(false),
    [recording, setRecording] = useState(false),
    [tempo, setTempo] = useState(126),
    [time, setTime] = useState(0),
    [project, setProject] = useState("Colores del amor"),
    [metronome, setMetronome] = useState(false),
    [notice, setNotice] = useState("");
  const [studioView, setStudioView] = useState<"edit" | "mix">("edit"),
    [mixerMode, setMixerMode] = useState<"normal" | "compact">("normal");
  const [loop, setLoop] = useState(false);
  const [channelOpen, setChannelOpen] = useState(false),
    [channelTab, setChannelTab] = useState<"eq" | "dynamics" | "inserts">("eq");
  const [tool, setTool] = useState<"select" | "split" | "erase" | "draw">(
      "select",
    ),
    [snap, setSnap] = useState(true),
    [zoom, setZoom] = useState(1),
    [selected, setSelected] = useState<number | null>(null),
    [history, setHistory] = useState<Track[][]>([]),
    [clipboard, setClipboard] = useState<Track | null>(null);
  const [effectsOpen, setEffectsOpen] = useState(false),
    [effectSearch, setEffectSearch] = useState(""),
    [effectCategory, setEffectCategory] = useState("ALL"),
    [insertSlot, setInsertSlot] = useState<number | null>(null),
    [insertMenu, setInsertMenu] = useState<string | null>(null);
  const [activePlugin, setActivePlugin] = useState<string | null>(null),
    [pluginOn, setPluginOn] = useState(true),
    [preset, setPreset] = useState("Studio Clean"),
    [pluginParams, setPluginParams] = useState<Record<string, number>>({
      drive: 42,
      bass: 55,
      mid: 48,
      treble: 62,
      presence: 54,
      output: 72,
      mix: 100,
    });
  const [trackDsp, setTrackDsp] = useState<Record<number, DspSettings>>({});
  const [meterDb, setMeterDb] = useState<Record<number, number>>({}),
    [masterDb, setMasterDb] = useState(-60);
  const [ioOpen, setIoOpen] = useState(false),
    [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]),
    [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]),
    [inputId, setInputId] = useState("default"),
    [outputId, setOutputId] = useState("default"),
    [midiInputs, setMidiInputs] = useState<string[]>([]),
    [midiActive, setMidiActive] = useState(false);
  const [hydrated, setHydrated] = useState(false),
    [saveState, setSaveState] = useState<
      "loading" | "saving" | "saved" | "error"
    >("loading"),
    [auditOpen, setAuditOpen] = useState(false),
    [auditRows, setAuditRows] = useState<
      Array<{
        id: number;
        objectType: string;
        objectId: string;
        action: string;
        revision: number;
        createdAt: string;
        beforeJson?: string | null;
        afterJson?: string | null;
      }>
    >([]),
    [auditRevisions, setAuditRevisions] = useState<
      Array<{ revision: number; action: string; createdAt: string }>
    >([]),
    [selectedAudit, setSelectedAudit] = useState<number | null>(null),
    [activeProjectId, setActiveProjectId] = useState("qamuz-main"),
    [projectList, setProjectList] = useState<
      Array<{ id: string; name: string; revision: number }>
    >([]);
  const [fileMenuOpen, setFileMenuOpen] = useState(false),
    [exportOpen, setExportOpen] = useState(false),
    [exportMode, setExportMode] = useState<"master" | "stems">("master"),
    [exportFormat, setExportFormat] = useState<"wav" | "mp3">("wav"),
    [exportRate, setExportRate] = useState(48000),
    [exportDepth, setExportDepth] = useState(24),
    [importProgress, setImportProgress] = useState(0);
  const [workspaceMode, setWorkspaceMode] = useState<
      "create" | "song" | "studio"
    >("create"),
    [creatorArtist, setCreatorArtist] = useState(""),
    [creatorTitle, setCreatorTitle] = useState(""),
    [creatorPrompt, setCreatorPrompt] = useState(""),
    [creatorInstrumental, setCreatorInstrumental] = useState(false),
    [creatorModel, setCreatorModel] = useState("V5"),
    [songProfile, setSongProfile] = useState<{
      artist: string;
      title: string;
      prompt: string;
      coverUrl?: string;
    } | null>(null),
    [generation, setGeneration] = useState<{
      jobId?: string;
      status: string;
      error?: string;
    }>({ status: "idle" }),
    [chatOpen, setChatOpen] = useState(false),
    [chatText, setChatText] = useState(""),
    [chatMessages, setChatMessages] = useState<string[]>([
      "Soy el Chat Maestro. Puedo preparar pistas, abrir el mixer y organizar tu sesión.",
    ]);
  const actionRef = useRef("autosave");
  const openSaasHome = () => {
    if (window.parent !== window) {
      const targetOrigin = (() => {
        try {
          return document.referrer ? new URL(document.referrer).origin : "*";
        } catch {
          return "*";
        }
      })();
      window.parent.postMessage({ type: "qamuz-studio:home" }, targetOrigin);
      return;
    }

    const requestedHome = new URLSearchParams(window.location.search).get("home");
    try {
      const destination = new URL(requestedHome || "/", window.location.origin);
      window.location.assign(destination.href);
    } catch {
      window.location.assign("/");
    }
  };
  useEffect(() => {
    try {
      const savedUser = JSON.parse(sessionStorage.getItem("qamuz.studio.user") || "{}");
      if (savedUser.name) setCreatorArtist((current) => current || String(savedUser.name));
    } catch {
      // The parent will send the authenticated user again after the Studio is ready.
    }
    const receiveUser = (event: MessageEvent) => {
      if (event.data?.type !== "qamuz-studio:user") return;
      const name = String(event.data.user?.name || "").trim();
      if (name) setCreatorArtist((current) => current || name);
    };
    window.addEventListener("message", receiveUser);
    return () => window.removeEventListener("message", receiveUser);
  }, []);
  const readApiJson = async (response: Response) => {
    const raw = await response.text();
    try {
      return JSON.parse(raw);
    } catch {
      if (response.status === 404)
        throw new Error(
          "El servicio de generación se está actualizando. Intenta nuevamente.",
        );
      throw new Error(
        "El servidor musical respondió temporalmente de forma incorrecta. Intenta nuevamente.",
      );
    }
  };
  const timelineDuration = Math.max(
    defaultSessionLength,
    ...tracks.map(
      (t) => Math.ceil(Math.max(t.trimEnd, t.duration || 0) / 10) * 10,
    ),
  );
  const secondsPerBeat = 60 / tempo,
    secondsPerBar = secondsPerBeat * 4,
    barCount = Math.max(8, Math.ceil(timelineDuration / secondsPerBar)),
    sessionLength = barCount * secondsPerBar;
  const fileRef = useRef<HTMLInputElement>(null),
    recorder = useRef<MediaRecorder | null>(null),
    chunks = useRef<Blob[]>([]),
    audios = useRef(new Map<number, HTMLAudioElement>()),
    analysers = useRef(new Map<number, AnalyserNode>()),
    sources = useRef(new Map<number, MediaElementAudioSourceNode>()),
    dspNodes = useRef(
      new Map<
        number,
        {
          low: BiquadFilterNode;
          mid: BiquadFilterNode;
          high: BiquadFilterNode;
          comp: DynamicsCompressorNode;
          makeup: GainNode;
          pan: StereoPannerNode;
        }
      >(),
    ),
    startTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>()),
    clockStart = useRef(0),
    timeRef = useRef(0),
    audioContext = useRef<AudioContext | null>(null),
    lastTap = useRef(0);
  useEffect(() => {
    timeRef.current = time;
  }, [time]);
  useEffect(() => {
    if (effectsOpen) setChannelOpen(false);
  }, [effectsOpen]);
  useEffect(() => {
    if (!activePlugin) return;
    const available = activePlugin.includes("Tube EQ")
      ? eqPresetNames
      : activePlugin.includes("Compressor")
        ? compressorPresetNames
        : effectProfiles[activePlugin]?.presets || generalPresetNames;
    if (!available.includes(preset)) {
      const first = available[0];
      setPreset(first);
      if (selected && presetDsp[first])
        setTrackDsp((all) => ({
          ...all,
          [selected]: {
            ...(all[selected] || defaultDsp),
            ...presetDsp[first],
          },
        }));
    }
  }, [activePlugin, selected]);
  useEffect(() => {
    fetch("/api/project?list=1")
      .then((r) => r.json())
      .then(({ projects }) => {
        setProjectList(projects || []);
        if (!projects?.length) return null;
        const id = projects?.some((p: { id: string }) => p.id === "qamuz-main")
          ? "qamuz-main"
          : projects?.[0]?.id || "qamuz-main";
        setActiveProjectId(id);
        return fetch(`/api/project?projectId=${encodeURIComponent(id)}`);
      })
      .then((r) => (r ? (r.ok ? r.json() : Promise.reject()) : null))
      .then((payload) => {
        const state = payload?.state;
        if (state) {
          setProject(state.project || "Colores del amor");
          setTempo(state.tempo || 126);
          setTracks(Array.isArray(state.tracks) ? state.tracks : []);
          setTrackDsp(state.trackDsp || {});
          setPluginParams(state.pluginParams || {});
          setPreset(state.preset || "Studio Clean");
          setSongProfile(state.songProfile || null);
          if (state.exportSettings) {
            setExportMode(state.exportSettings.mode || "master");
            setExportFormat(state.exportSettings.format || "wav");
            setExportRate(state.exportSettings.rate || 48000);
            setExportDepth(state.exportSettings.depth || 24);
          }
        }
        setSaveState("saved");
      })
      .catch(() => setSaveState("error"))
      .finally(() => setHydrated(true));
  }, []);
  useEffect(() => {
    if (
      !generation.jobId ||
      [
        "SUCCESS",
        "CREATE_TASK_FAILED",
        "GENERATE_AUDIO_FAILED",
        "CALLBACK_EXCEPTION",
        "SENSITIVE_WORD_ERROR",
      ].includes(generation.status)
    )
      return;
    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch(
            `/api/music/generate?jobId=${encodeURIComponent(generation.jobId!)}`,
          ),
          data = await readApiJson(response);
        if (cancelled) return;
        if (!response.ok)
          throw new Error(data.error || "No se pudo consultar la generación");
        setGeneration({
          jobId: generation.jobId,
          status: data.status,
          error: data.error,
        });
        if (data.status === "SUCCESS" && data.audioUrl) {
          const ctx =
            audioContext.current || (audioContext.current = new AudioContext());
          const raw = await fetch(data.audioUrl).then((r) => r.arrayBuffer()),
            decoded = await ctx.decodeAudioData(raw.slice(0)),
            duration = decoded.duration;
          actionRef.current = "music.generated";
          setTracks((current) => [
            {
              ...(current[0] || {
                id: Date.now(),
                name: "Stereo Master",
                muted: false,
                solo: false,
                volume: 80,
                pan: 0,
                start: 0,
                cuts: [],
                effects: [],
              }),
              name: `${songProfile?.title || data.title || "Canción"} · Stereo Master`,
              color: "#d6aa3d",
              type: "Stereo Master",
              url: data.audioUrl,
              duration,
              trimEnd: duration,
              peaks: getPeaks(decoded),
            },
          ]);
          if (data.imageUrl)
            setSongProfile((current) =>
              current ? { ...current, coverUrl: data.imageUrl } : current,
            );
          message("Canción generada e importada al Stereo Master");
        }
      } catch (error) {
        if (!cancelled)
          setGeneration((g) => ({
            ...g,
            status: "error",
            error:
              error instanceof Error ? error.message : "Error de generación",
          }));
      }
    };
    poll();
    const timer = setInterval(poll, 7000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [generation.jobId, generation.status, songProfile?.title]);
  useEffect(() => {
    if (!hydrated) return;
    setSaveState("saving");
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/project?projectId=${encodeURIComponent(activeProjectId)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: actionRef.current,
              state: {
                project,
                tempo,
                tracks,
                trackDsp,
                pluginParams,
                preset,
                songProfile,
                exportSettings: {
                  mode: exportMode,
                  format: exportFormat,
                  rate: exportRate,
                  depth: exportDepth,
                },
              },
            }),
          },
        );
        if (!response.ok) throw new Error("save failed");
        setSaveState("saved");
        actionRef.current = "autosave";
      } catch {
        setSaveState("error");
      }
    }, 650);
    return () => clearTimeout(timer);
  }, [
    hydrated,
    activeProjectId,
    project,
    tempo,
    tracks,
    trackDsp,
    pluginParams,
    preset,
    songProfile,
    exportMode,
    exportFormat,
    exportRate,
    exportDepth,
  ]);
  useEffect(() => {
    const anySolo = tracks.some((t) => t.solo);
    tracks.forEach((t) => {
      const a = audios.current.get(t.id);
      if (a) {
        a.volume = (t.volume / 100) * (t.muted || (anySolo && !t.solo) ? 0 : 1);
      }
      const nodes = dspNodes.current.get(t.id);
      if (nodes)
        nodes.pan.pan.setTargetAtTime(
          Math.max(-1, Math.min(1, (t.pan ?? 0) / 100)),
          audioContext.current?.currentTime || 0,
          0.01,
        );
    });
  }, [tracks]);
  useEffect(() => {
    dspNodes.current.forEach((nodes, id) => {
      const settings = trackDsp[id] || defaultDsp;
      const track = tracks.find((item) => item.id === id);
      const eqEnabled =
        pluginOn && !!track?.effects.some((name) => name.includes("EQ"));
      const compEnabled =
        pluginOn &&
        !!track?.effects.some((name) => name.includes("Compressor"));
      const now = audioContext.current?.currentTime || 0;
      nodes.low.frequency.setTargetAtTime(settings.lowFreq, now, 0.015);
      nodes.low.gain.setTargetAtTime(
        eqEnabled ? settings.lowGain - settings.lowAtten : 0,
        now,
        0.015,
      );
      nodes.mid.frequency.setTargetAtTime(settings.midFreq, now, 0.015);
      nodes.mid.Q.setTargetAtTime(settings.midQ, now, 0.015);
      nodes.mid.gain.setTargetAtTime(
        eqEnabled ? settings.midGain : 0,
        now,
        0.015,
      );
      nodes.high.frequency.setTargetAtTime(
        (settings.highFreq + settings.highAttenFreq) / 2,
        now,
        0.015,
      );
      nodes.high.gain.setTargetAtTime(
        eqEnabled ? settings.highGain - settings.highAtten : 0,
        now,
        0.015,
      );
      nodes.comp.threshold.setTargetAtTime(
        compEnabled ? settings.threshold : 0,
        now,
        0.015,
      );
      nodes.comp.ratio.setTargetAtTime(
        compEnabled ? settings.ratio : 1,
        now,
        0.015,
      );
      nodes.comp.attack.setTargetAtTime(settings.attack, now, 0.015);
      nodes.comp.release.setTargetAtTime(settings.release, now, 0.015);
      nodes.makeup.gain.setTargetAtTime(
        Math.pow(
          10,
          ((compEnabled ? settings.makeup : 0) +
            (eqEnabled ? settings.eqOutput : 0)) /
            20,
        ),
        now,
        0.015,
      );
    });
  }, [trackDsp, tracks, pluginOn]);
  useEffect(() => {
    if (!playing) return;
    clockStart.current = performance.now() - timeRef.current * 1000;
    const id = setInterval(() => {
      const next = (performance.now() - clockStart.current) / 1000;
      if (next >= sessionLength) {
        if (loop) {
          pauseAll();
          setTime(0);
          syncAudio(0);
          clockStart.current = performance.now();
        } else stopAll();
        return;
      }
      setTime(next);
    }, 30);
    return () => clearInterval(id);
  }, [playing, sessionLength, loop]);
  useEffect(() => {
    let raf = 0;
    const read = () => {
      const next: Record<number, number> = {};
      let sum = 0,
        count = 0;
      analysers.current.forEach((analyser, id) => {
        const data = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(data);
        let power = 0;
        for (const sample of data) power += sample * sample;
        const rms = Math.sqrt(power / data.length),
          db = Math.max(-60, Math.min(0, 20 * Math.log10(rms || 0.001)));
        next[id] = db;
        if (id !== -1 || recording) {
          sum += rms * rms;
          count++;
        }
      });
      setMeterDb(next);
      setMasterDb(
        count
          ? Math.max(
              -60,
              Math.min(0, 20 * Math.log10(Math.sqrt(sum / count) || 0.001)),
            )
          : -60,
      );
      raf = requestAnimationFrame(read);
    };
    read();
    return () => cancelAnimationFrame(raf);
  }, [recording]);
  useEffect(() => {
    if (!playing || !metronome) return;
    const ms = 60000 / tempo;
    const tick = () => {
      const ctx =
          audioContext.current ||
          (audioContext.current = new AudioContext({
            latencyHint: "interactive",
            sampleRate: 48000,
          })),
        o = ctx.createOscillator(),
        g = ctx.createGain();
      o.frequency.value = 1000;
      g.gain.setValueAtTime(0.12, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.05);
    };
    tick();
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  }, [playing, metronome, tempo]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        target.isContentEditable
      )
        return;
      const command = e.ctrlKey || e.metaKey;
      if (command && e.key.toLowerCase() === "c" && selected) {
        e.preventDefault();
        copyClip(selected);
        return;
      }
      if (command && e.key.toLowerCase() === "x" && selected) {
        e.preventDefault();
        cutClip(selected);
        return;
      }
      if (command && e.key.toLowerCase() === "v") {
        e.preventDefault();
        pasteClip();
        return;
      }
      if (command && e.key.toLowerCase() === "d" && selected) {
        e.preventDefault();
        duplicate(selected);
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === "1") setTool("select");
      if (e.key === "2") setTool("split");
      if (e.key === "3") setTool("erase");
      if (e.key === "4") setTool("draw");
      if (e.key.toLowerCase() === "q") setSnap((x) => !x);
      if (e.key.toLowerCase() === "g") setZoom((x) => Math.max(0.6, x - 0.2));
      if (e.key.toLowerCase() === "h") setZoom((x) => Math.min(2.4, x + 0.2));
      if ((e.key === "Delete" || e.key === "Backspace") && selected)
        removeTrack(selected);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  const message = (x: string) => {
    setNotice(x);
    setTimeout(() => setNotice(""), 2400);
  };
  const tapTempo = () => {
    const now = performance.now(),
      delta = now - lastTap.current;
    lastTap.current = now;
    if (delta > 250 && delta < 2000) setTempo(Math.round(60000 / delta));
    message("TAP TEMPO");
  };
  const newAudioContext = () =>
    new AudioContext({ latencyHint: "interactive", sampleRate: 48000 });
  const scanDevices = async () => {
    try {
      await navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((s) => s.getTracks().forEach((t) => t.stop()));
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioInputs(devices.filter((d) => d.kind === "audioinput"));
      setAudioOutputs(devices.filter((d) => d.kind === "audiooutput"));
      setIoOpen(true);
      message("Interfaces de audio detectadas");
    } catch {
      setIoOpen(true);
      message("Permite acceso al micrófono para detectar interfaces");
    }
  };
  const enableMidi = async () => {
    try {
      const access = await (
        navigator as Navigator & {
          requestMIDIAccess: () => Promise<{
            inputs: Map<
              string,
              { name?: string; onmidimessage: ((e: unknown) => void) | null }
            >;
          }>;
        }
      ).requestMIDIAccess();
      const names = Array.from(access.inputs.values()).map(
        (x) => x.name || "MIDI externo",
      );
      access.inputs.forEach(
        (port) => (port.onmidimessage = () => setMidiActive(true)),
      );
      setMidiInputs(names);
      setMidiActive(true);
      message(
        names.length
          ? names.length + " dispositivo(s) MIDI conectado(s)"
          : "MIDI activado; conecta un controlador",
      );
    } catch {
      message("Web MIDI no está disponible en este navegador");
    }
  };
  const selectOutput = async (id: string) => {
    setOutputId(id);
    await Promise.all(
      Array.from(audios.current.values()).map((a) => {
        const deviceAudio = a as HTMLAudioElement & {
          setSinkId?: (x: string) => Promise<void>;
        };
        return deviceAudio.setSinkId?.(id).catch(() => {});
      }),
    );
    message("Salida de audio actualizada");
  };
  const syncAudio = (start: number) => {
    const ctx =
      audioContext.current || (audioContext.current = new AudioContext());
    ctx.resume().catch(() => {});
    tracks.forEach((t) => {
      if (!t.url || start >= t.trimEnd) return;
      let a = audios.current.get(t.id);
      if (!a) {
        a = new Audio(t.url);
        audios.current.set(t.id, a);
      }
      if (!sources.current.has(t.id)) {
        const source = ctx.createMediaElementSource(a),
          low = ctx.createBiquadFilter(),
          mid = ctx.createBiquadFilter(),
          high = ctx.createBiquadFilter(),
          comp = ctx.createDynamicsCompressor(),
          makeup = ctx.createGain(),
          pan = ctx.createStereoPanner(),
          analyser = ctx.createAnalyser();
        low.type = "lowshelf";
        mid.type = "peaking";
        high.type = "highshelf";
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.72;
        const settings = trackDsp[t.id] || defaultDsp;
        low.frequency.value = settings.lowFreq;
        mid.frequency.value = settings.midFreq;
        mid.Q.value = settings.midQ;
        high.frequency.value = (settings.highFreq + settings.highAttenFreq) / 2;
        const eqEnabled =
          pluginOn && t.effects.some((name) => name.includes("EQ"));
        const compEnabled =
          pluginOn && t.effects.some((name) => name.includes("Compressor"));
        low.gain.value = eqEnabled ? settings.lowGain - settings.lowAtten : 0;
        mid.gain.value = eqEnabled ? settings.midGain : 0;
        high.gain.value = eqEnabled
          ? settings.highGain - settings.highAtten
          : 0;
        comp.threshold.value = compEnabled ? settings.threshold : 0;
        comp.ratio.value = compEnabled ? settings.ratio : 1;
        comp.attack.value = settings.attack;
        comp.release.value = settings.release;
        makeup.gain.value = Math.pow(
          10,
          ((compEnabled ? settings.makeup : 0) +
            (eqEnabled ? settings.eqOutput : 0)) /
            20,
        );
        pan.pan.value = Math.max(-1, Math.min(1, (t.pan ?? 0) / 100));
        source
          .connect(low)
          .connect(mid)
          .connect(high)
          .connect(comp)
          .connect(makeup)
          .connect(pan)
          .connect(analyser)
          .connect(ctx.destination);
        sources.current.set(t.id, source);
        analysers.current.set(t.id, analyser);
        dspNodes.current.set(t.id, { low, mid, high, comp, makeup, pan });
      }
      a.currentTime = Math.max(0, Math.min(start - t.start, a.duration || 0));
      const anySolo = tracks.some((x) => x.solo);
      a.volume = (t.volume / 100) * (t.muted || (anySolo && !t.solo) ? 0 : 1);
      if (start < t.start) {
        const timer = setTimeout(
          () => a?.play().catch(() => {}),
          (t.start - start) * 1000,
        );
        startTimers.current.set(t.id, timer);
      } else a.play().catch(() => {});
    });
  };
  const pauseAll = () => {
    startTimers.current.forEach(clearTimeout);
    startTimers.current.clear();
    audios.current.forEach((a) => a.pause());
  };
  const stopAll = () => {
    pauseAll();
    setPlaying(false);
    setTime(0);
    audios.current.forEach((a) => (a.currentTime = 0));
  };
  const startAnotherSong = () => {
    stopAll();
    audios.current.clear();
    analysers.current.clear();
    sources.current.clear();
    dspNodes.current.clear();
    setHydrated(false);
    setTracks([]);
    setTrackDsp({});
    setPluginParams({});
    setSongProfile(null);
    setGeneration({ status: "idle" });
    setCreatorTitle("");
    setCreatorPrompt("");
    setSelected(null);
    setChatOpen(false);
    setWorkspaceMode("create");
  };
  const togglePlay = () => {
    if (playing) {
      pauseAll();
      setPlaying(false);
    } else {
      syncAudio(time);
      setPlaying(true);
    }
  };
  const seek = (n: number) => {
    const next = Math.max(0, Math.min(timelineDuration, n));
    setTime(next);
    tracks.forEach((t) => {
      const a = audios.current.get(t.id);
      if (a && Number.isFinite(a.duration))
        a.currentTime = Math.max(0, Math.min(next - t.start, a.duration));
    });
    if (playing) {
      pauseAll();
      syncAudio(next);
      clockStart.current = performance.now() - next * 1000;
    }
  };
  const toggle = (id: number, key: "muted" | "solo") =>
    setTracks((t) =>
      t.map((x) => (x.id === id ? { ...x, [key]: !x[key] } : x)),
    );
  const commit = (fn: (t: Track[]) => Track[]) => {
    actionRef.current = "track.edit";
    setHistory((h) => [...h.slice(-19), tracks]);
    setTracks(fn(tracks));
  };
  const undo = () => {
    const last = history.at(-1);
    if (last) {
      setTracks(last);
      setHistory((h) => h.slice(0, -1));
      message("Deshacer");
    }
  };
  const removeTrack = (id: number) =>
    commit((t) => t.filter((x) => x.id !== id));
  const laneAction = (id: number, seconds: number) => {
    const grid = secondsPerBeat / 4,
      point = snap ? Math.round(seconds / grid) * grid : seconds;
    setSelected(id);
    if (tool === "split")
      commit((ts) =>
        ts.map((t) =>
          t.id === id && point > t.start && point < t.trimEnd
            ? { ...t, cuts: [...t.cuts, point].sort((a, b) => a - b) }
            : t,
        ),
      );
    if (tool === "erase") removeTrack(id);
    if (tool === "draw")
      commit((ts) =>
        ts.map((t) =>
          t.id === id ? { ...t, start: Math.min(point, t.trimEnd - 0.5) } : t,
        ),
      );
    seek(point);
  };
  const moveClip = (id: number, delta: number) =>
    commit((ts) =>
      ts.map((t) =>
        t.id === id
          ? {
              ...t,
              start: Math.max(0, t.start + delta),
              trimEnd: Math.max(0, t.trimEnd + delta),
              cuts: t.cuts.map((c) => c + delta),
            }
          : t,
      ),
    );
  const copyClip = (id: number) => {
    const source = tracks.find((track) => track.id === id);
    if (source) {
      setClipboard({
        ...source,
        cuts: [...source.cuts],
        effects: [...source.effects],
      });
      message("Clip copiado");
    }
  };
  const cutClip = (id: number) => {
    copyClip(id);
    removeTrack(id);
    setSelected(null);
    message("Clip cortado");
  };
  const pasteClip = () => {
    if (!clipboard) return;
    const grid = secondsPerBeat / 4;
    const target = snap ? Math.round(time / grid) * grid : time;
    const duration = clipboard.trimEnd - clipboard.start;
    const cutOffsets = clipboard.cuts.map((cut) => cut - clipboard.start);
    const id = Date.now();
    commit((all) => [
      ...all,
      {
        ...clipboard,
        id,
        name: clipboard.name + " copia",
        start: target,
        trimEnd: target + duration,
        cuts: cutOffsets.map((offset) => target + offset),
      },
    ]);
    setSelected(id);
    message("Clip pegado en el cabezal");
  };
  const beginClipDrag = (
    event: React.PointerEvent<HTMLDivElement>,
    track: Track,
  ) => {
    if (tool !== "select") return;
    event.stopPropagation();
    event.preventDefault();
    setSelected(track.id);
    const lane = event.currentTarget.parentElement;
    if (!lane) return;
    const rect = lane.getBoundingClientRect();
    const duration = track.trimEnd - track.start;
    const cutOffsets = track.cuts.map((cut) => cut - track.start);
    const grabOffset =
      ((event.clientX - rect.left) / rect.width) * sessionLength - track.start;
    setHistory((items) => [...items.slice(-19), tracks]);
    const onMove = (pointer: PointerEvent) => {
      const raw =
        ((pointer.clientX - rect.left) / rect.width) * sessionLength -
        grabOffset;
      const grid = secondsPerBeat / 4;
      const positioned = snap ? Math.round(raw / grid) * grid : raw;
      const start = Math.max(0, Math.min(sessionLength - duration, positioned));
      setTracks((all) =>
        all.map((item) =>
          item.id === track.id
            ? {
                ...item,
                start,
                trimEnd: start + duration,
                cuts: cutOffsets.map((offset) => start + offset),
              }
            : item,
        ),
      );
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      message(snap ? "Clip ajustado a la rejilla" : "Clip movido libremente");
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  const duplicate = (id: number) => {
    const t = tracks.find((x) => x.id === id);
    if (t)
      commit((ts) => [
        ...ts,
        {
          ...t,
          id: Date.now(),
          name: t.name + " copia",
          start: Math.min(
            timelineDuration - (t.trimEnd - t.start),
            t.start + secondsPerBeat,
          ),
          trimEnd: Math.min(timelineDuration, t.trimEnd + secondsPerBeat),
          cuts: t.cuts.map((c) => c + secondsPerBeat),
        },
      ]);
  };
  const addTrack = (type: string) =>
    commit((t) => [
      ...t,
      {
        id: Date.now(),
        name:
          type === "MIDI"
            ? "Instrumento MIDI"
            : type === "Grupo"
              ? "Grupo"
              : "Nueva pista",
        color:
          type === "MIDI"
            ? "#9d7cff"
            : type === "Grupo"
              ? "#50a7ff"
              : "#55d6be",
        type,
        muted: false,
        solo: false,
        volume: 75,
        pan: 0,
        start: 0,
        trimEnd: 16,
        cuts: [],
        effects: [],
      },
    ]);
  const addEffect = (name: string) => {
    if (!selected) {
      message("Selecciona una pista");
      return;
    }
    const current = tracks.find((t) => t.id === selected);
    if (current && !current.effects.includes(name)) {
      commit((ts) =>
        ts.map((t) => {
          if (t.id !== selected) return t;
          const effects = [...t.effects];
          if (insertSlot !== null) effects[insertSlot] = name;
          else if (effects.length < 4) effects.push(name);
          return { ...t, effects: effects.slice(0, 4) };
        }),
      );
      message(name + " añadido");
    }
    setActivePlugin(name);
  };
  const chooseChannelEffect = (name: string, presetName?: string) => {
    if (selected && presetName && presetDsp[presetName]) {
      setTrackDsp((all) => ({
        ...all,
        [selected]: {
          ...(all[selected] || defaultDsp),
          ...presetDsp[presetName],
        },
      }));
      setPreset(presetName);
    }
    addEffect(name);
    setInsertMenu(null);
    setChannelOpen(false);
    setEffectsOpen(true);
  };
  const removeEffect = (name: string) =>
    selected &&
    commit((ts) =>
      ts.map((t) =>
        t.id === selected
          ? { ...t, effects: t.effects.filter((x) => x !== name) }
          : t,
      ),
    );
  const currentDsp = selected ? trackDsp[selected] || defaultDsp : defaultDsp;
  const currentEffectProfile = activePlugin
    ? effectProfiles[activePlugin]
    : undefined;
  const setDspValue = (key: keyof DspSettings, value: number) => {
    if (!selected) return;
    setTrackDsp((all) => ({
      ...all,
      [selected]: { ...(all[selected] || defaultDsp), [key]: value },
    }));
  };
  const uploadAudio = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    form.append("projectId", activeProjectId);
    const response = await fetch("/api/audio/upload", {
      method: "POST",
      body: form,
    });
    if (!response.ok) throw new Error("No se pudo importar el audio");
    setImportProgress(100);
    return response.json() as Promise<{ id?: string; url: string }>;
  };
  const importFiles = async (files: FileList | null) => {
    if (!files) return;
    setImportProgress(1);
    message("Importando audio…");
    try {
      const additions: Track[] = [],
        ctx =
          audioContext.current || (audioContext.current = new AudioContext());
      for (const [i, f] of Array.from(files).entries()) {
        const raw = await f.arrayBuffer(),
          decoded = await ctx.decodeAudioData(raw.slice(0)),
          { url } = await uploadAudio(f),
          d = decoded.duration;
        additions.push({
          id: Date.now() + i,
          name: f.name.replace(/\.[^.]+$/, ""),
          color: ["#50a7ff", "#f7b955", "#55d6be"][i % 3],
          type: "Audio",
          muted: false,
          solo: false,
          volume: 75,
          pan: 0,
          url,
          duration: d,
          peaks: getPeaks(decoded),
          start: 0,
          trimEnd: d,
          cuts: [],
          effects: [],
        });
      }
      actionRef.current = "audio.import";
      if (workspaceMode === "song" && additions[0]) {
        const stereo = {
          ...additions[0],
          name: `${songProfile?.title || additions[0].name} · Stereo Master`,
          type: "Stereo Master",
          color: "#d6aa3d",
        };
        setHistory((h) => [...h.slice(-19), tracks]);
        setTracks([stereo]);
      } else commit((t) => [...t, ...additions]);
      message(additions.length + " archivo(s) importado(s) y guardado(s)");
    } catch (error) {
      message(
        error instanceof Error ? error.message : "No se pudo importar el audio",
      );
    } finally {
      setImportProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  const record = async () => {
    if (recording) {
      recorder.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: inputId === "default" ? undefined : { exact: inputId },
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            channelCount: 2,
            sampleRate: 48000,
          },
        }),
        ctx =
          audioContext.current || (audioContext.current = newAudioContext()),
        input = ctx.createMediaStreamSource(stream),
        inputAnalyser = ctx.createAnalyser(),
        r = new MediaRecorder(stream);
      inputAnalyser.fftSize = 256;
      inputAnalyser.smoothingTimeConstant = 0.65;
      input.connect(inputAnalyser);
      analysers.current.set(-1, inputAnalyser);
      chunks.current = [];
      r.ondataavailable = (e) => chunks.current.push(e.data);
      r.onstop = async () => {
        analysers.current.delete(-1);
        const blob = new Blob(chunks.current, { type: r.mimeType }),
          file = new File([blob], `grabacion-${Date.now()}.webm`, {
            type: r.mimeType,
          }),
          { url } = await uploadAudio(file),
          a = new Audio(url);
        a.onloadedmetadata = () =>
          commit((t) => [
            ...t,
            {
              id: Date.now(),
              name: "Nueva grabación",
              color: "#ff6d8d",
              type: "Voz",
              muted: false,
              solo: false,
              volume: 80,
              pan: 0,
              url,
              duration: a.duration,
              start: timeRef.current,
              trimEnd: timeRef.current + a.duration,
              cuts: [],
              effects: [],
            },
          ]);
        stream.getTracks().forEach((x) => x.stop());
        message("Grabación añadida");
      };
      r.start(50);
      recorder.current = r;
      setRecording(true);
    } catch {
      message("Revisa la interfaz de entrada y el permiso del micrófono");
    }
  };
  const save = async () => {
    actionRef.current = "manual.save";
    setSaveState("saving");
    try {
      const response = await fetch(
        `/api/project?projectId=${encodeURIComponent(activeProjectId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "manual.save",
            state: {
              project,
              tempo,
              tracks,
              trackDsp,
              pluginParams,
              preset,
              songProfile,
              exportSettings: {
                mode: exportMode,
                format: exportFormat,
                rate: exportRate,
                depth: exportDepth,
              },
            },
          }),
        },
      );
      if (!response.ok) throw new Error();
      setSaveState("saved");
      message("Proyecto guardado con historial");
    } catch {
      setSaveState("error");
      message("No se pudo guardar · vuelve a intentar");
    }
  };
  const openHistory = async () => {
    setAuditOpen(true);
    setSelectedAudit(null);
    try {
      const r = await fetch(
        `/api/history?projectId=${encodeURIComponent(activeProjectId)}`,
      );
      const data = await r.json();
      setAuditRows(data.history || []);
      setAuditRevisions(data.revisions || []);
    } catch {
      setAuditRows([]);
      setAuditRevisions([]);
    }
  };
  const loadProject = async (id: string) => {
    setHydrated(false);
    setSaveState("loading");
    setActiveProjectId(id);
    pauseAll();
    setPlaying(false);
    try {
      const response = await fetch(
          `/api/project?projectId=${encodeURIComponent(id)}`,
        ),
        { state } = await response.json();
      setProject(state?.project || "Proyecto sin título");
      setTempo(state?.tempo || 126);
      setTracks(state?.tracks || []);
      setTrackDsp(state?.trackDsp || {});
      setPluginParams(state?.pluginParams || {});
      setPreset(state?.preset || "Studio Clean");
      setSongProfile(state?.songProfile || null);
      if (state?.exportSettings) {
        setExportMode(state.exportSettings.mode || "master");
        setExportFormat(state.exportSettings.format || "wav");
        setExportRate(state.exportSettings.rate || 48000);
        setExportDepth(state.exportSettings.depth || 24);
      }
      setSelected(null);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    } finally {
      setTimeout(() => setHydrated(true), 0);
    }
  };
  const createProject = async () => {
    const name = window
      .prompt("Nombre del nuevo proyecto", "Nuevo proyecto QAMUZ")
      ?.trim();
    if (!name) return;
    const response = await fetch("/api/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      message("No se pudo crear el proyecto");
      return;
    }
    const { project: created } = await response.json();
    setProjectList((list) => [created, ...list]);
    await loadProject(created.id);
    message("Proyecto creado");
  };
  const restoreRevision = async (revision: number) => {
    if (
      !window.confirm(
        `¿Restaurar la revisión ${revision}? El estado actual quedará guardado en el historial.`,
      )
    )
      return;
    const response = await fetch(
      `/api/history?projectId=${encodeURIComponent(activeProjectId)}&revision=${revision}`,
    );
    if (!response.ok) {
      message("No se pudo cargar la revisión");
      return;
    }
    const { snapshot } = await response.json(),
      state = snapshot.state;
    actionRef.current = `restore.revision.${revision}`;
    setProject(state.project);
    setTempo(state.tempo);
    setTracks(state.tracks || []);
    setTrackDsp(state.trackDsp || {});
    setPluginParams(state.pluginParams || {});
    setPreset(state.preset || "Studio Clean");
    setSongProfile(state.songProfile || null);
    if (state.exportSettings) {
      setExportMode(state.exportSettings.mode || "master");
      setExportFormat(state.exportSettings.format || "wav");
      setExportRate(state.exportSettings.rate || 48000);
      setExportDepth(state.exportSettings.depth || 24);
    }
    setAuditOpen(false);
    message(`Revisión ${revision} restaurada`);
  };
  const renderFile = async (mix: Track[], fileName: string) => {
    const decoded = await Promise.all(
        mix.map(async (t) => {
          const context = new AudioContext();
          return {
            t,
            b: await context.decodeAudioData(
              await (await fetch(t.url!)).arrayBuffer(),
            ),
          };
        }),
      ),
      duration = Math.min(
        sessionLength,
        Math.max(...decoded.map((x) => x.t.trimEnd)),
      ),
      offline = new OfflineAudioContext(
        2,
        Math.ceil(duration * exportRate),
        exportRate,
      );
    decoded.forEach(({ t, b }) => {
      const src = offline.createBufferSource(),
        gain = offline.createGain(),
        pan = offline.createStereoPanner();
      src.buffer = b;
      gain.gain.value = t.volume / 100;
      pan.pan.value = (t.pan || 0) / 100;
      src.connect(gain).connect(pan).connect(offline.destination);
      src.start(t.start, 0, Math.min(b.duration, t.trimEnd - t.start));
    });
    const rendered = await offline.startRendering(),
      blob =
        exportFormat === "mp3"
          ? audioBufferToMp3(rendered, 320)
          : audioBufferToWav(rendered, exportDepth),
      a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName + `.${exportFormat}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const exportMix = async () => {
    const active = tracks.filter((t) => t.url && !t.muted),
      solo = active.filter((t) => t.solo),
      mix = solo.length ? solo : active;
    if (!mix.length) {
      message("Importa o graba audio para exportar");
      return;
    }
    message(
      exportMode === "stems"
        ? `Renderizando stems ${exportFormat.toUpperCase()}…`
        : `Renderizando mezcla ${exportFormat.toUpperCase()}…`,
    );
    try {
      if (exportMode === "stems")
        for (const track of mix)
          await renderFile(
            [track],
            `${project}-${track.name}`.replace(/[^a-z0-9áéíóúñ]+/gi, "-"),
          );
      else await renderFile(mix, project.replace(/[^a-z0-9áéíóúñ]+/gi, "-"));
      setExportOpen(false);
      message(
        exportMode === "stems"
          ? `Stems ${exportFormat.toUpperCase()} exportados`
          : `Mezcla ${exportFormat.toUpperCase()} exportada`,
      );
    } catch {
      message("No se pudo exportar esta mezcla");
    }
  };
  const createNormalSong = async () => {
    const title = creatorTitle.trim() || "Nueva canción",
      artist = creatorArtist.trim() || "Artista QAMUZ",
      prompt = creatorPrompt.trim();
    if (!prompt) {
      message("Describe primero la canción que quieres crear");
      return;
    }
    setSaveState("saving");
    setGeneration({ status: "submitting" });
    try {
      const response = await fetch("/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: title }),
      });
      const projectData = await readApiJson(response);
      if (!response.ok)
        throw new Error(projectData.error || "No se pudo crear el proyecto");
      const { project: created } = projectData,
        profile = { artist, title, prompt },
        stereo: Track = {
          id: Date.now(),
          name: `${title} · Stereo Master`,
          color: "#d6aa3d",
          type: "Stereo Master",
          muted: false,
          solo: false,
          volume: 80,
          pan: 0,
          start: 0,
          trimEnd: 180,
          cuts: [],
          effects: [],
        };
      setHydrated(false);
      setActiveProjectId(created.id);
      setProject(title);
      setTempo(120);
      setTracks([stereo]);
      setTrackDsp({});
      setPluginParams({});
      setSongProfile(profile);
      setProjectList((list) => [created, ...list]);
      setWorkspaceMode("song");
      actionRef.current = "song.created";
      setTimeout(() => setHydrated(true), 0);
      setSaveState("saved");
      const generationResponse = await fetch("/api/music/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: created.id,
            prompt,
            title,
            artist,
            instrumental: creatorInstrumental,
            model: creatorModel,
          }),
        }),
        generationData = await readApiJson(generationResponse);
      if (!generationResponse.ok)
        throw new Error(
          generationData.code === "KIE_NOT_CONFIGURED"
            ? "Falta conectar la clave de Kie para generar audio"
            : generationData.error || "No se pudo iniciar la generación",
        );
      setGeneration({
        jobId: generationData.jobId,
        status: generationData.status || "PENDING",
      });
    } catch (error) {
      setSaveState("error");
      setGeneration({
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear la canción",
      });
      message(
        error instanceof Error ? error.message : "No se pudo crear la canción",
      );
    }
  };
  const sendMasterCommand = () => {
    const command = chatText.trim();
    if (!command) return;
    setChatMessages((messages) => [...messages, `TÚ: ${command}`]);
    setChatText("");
    const lower = command.toLowerCase();
    if (lower.includes("mix") || lower.includes("mezcla")) {
      setStudioView("mix");
      setChatMessages((messages) => [...messages, "MAESTRO: Mixer abierto."]);
      return;
    }
    if (lower.includes("voz") || lower.includes("cantar")) {
      addTrack("Voz");
      setChatMessages((messages) => [
        ...messages,
        "MAESTRO: Pista de voz preparada.",
      ]);
      return;
    }
    if (
      lower.includes("instrument") ||
      lower.includes("guitarra") ||
      lower.includes("piano")
    ) {
      addTrack("Instrumento");
      setChatMessages((messages) => [
        ...messages,
        "MAESTRO: Pista de instrumento preparada.",
      ]);
      return;
    }
    if (lower.includes("master")) {
      setChatMessages((messages) => [
        ...messages,
        "MAESTRO: El módulo de mastering IA será la próxima conexión.",
      ]);
      return;
    }
    setChatMessages((messages) => [
      ...messages,
      "MAESTRO: Guardé la instrucción para el flujo GEN AUDIUS.",
    ]);
  };
  if (workspaceMode === "create")
    return (
      <main className="creator-shell">
        <header>
          <div className="brand">
            <picture>
              <source
                media="(prefers-color-scheme: dark)"
                srcSet="/qamuz-logo-dark.png"
              />
              <img src="/qamuz-logo-light.png" alt="QAMUZ by Gen Audius" />
            </picture>
          </div>
          <div className="shell-actions">
            <button className="home-button" onClick={openSaasHome}>
              <House /> INICIO QAMUZ
            </button>
            <button
              onClick={() => setWorkspaceMode(songProfile ? "song" : "studio")}
            >
              ABRIR ESTUDIO
            </button>
          </div>
        </header>
        <section className="creator-card">
          <div className="creator-intro">
            <span>CREACIÓN NORMAL</span>
            <h1>¿Qué quieres crear?</h1>
            <p>
              Describe tu canción. QAMUZ la generará y preparará un proyecto
              sencillo con una sola pista estéreo.
            </p>
          </div>
          <div className="creator-form">
            <label>
              NOMBRE ARTÍSTICO
              <input
                value={creatorArtist}
                onChange={(e) => setCreatorArtist(e.target.value)}
                placeholder="Tu nombre artístico"
              />
            </label>
            <label>
              TÍTULO DE LA CANCIÓN
              <input
                value={creatorTitle}
                onChange={(e) => setCreatorTitle(e.target.value)}
                placeholder="QAMUZ puede proponerlo"
              />
            </label>
            <label>
              DESCRIPCIÓN / PROMPT
              <textarea
                value={creatorPrompt}
                onChange={(e) => setCreatorPrompt(e.target.value)}
                placeholder="Ejemplo: Bachata romántica moderna, guitarra limpia, voz masculina…"
              />
            </label>
            <div className="creator-options">
              <label>
                MODELO
                <select
                  value={creatorModel}
                  onChange={(e) => setCreatorModel(e.target.value)}
                >
                  <option>V5_5</option>
                  <option>V5</option>
                  <option>V4_5PLUS</option>
                  <option>V4_5</option>
                  <option>V4</option>
                </select>
              </label>
              <label className="instrumental-option">
                <input
                  type="checkbox"
                  checked={creatorInstrumental}
                  onChange={(e) => setCreatorInstrumental(e.target.checked)}
                />
                <span>SOLO INSTRUMENTAL</span>
              </label>
            </div>
            <button
              disabled={generation.status === "submitting"}
              onClick={createNormalSong}
            >
              <Sparkles />{" "}
              {generation.status === "submitting"
                ? "CONECTANDO…"
                : "GENERAR CANCIÓN"}
            </button>
            <small>
              Generación temporal mediante Kie/Suno, lista para migrarse a la
              API central de tu SaaS.
            </small>
          </div>
        </section>
        <footer>GEN AUDIUS IS QAMUZ · CREATE → MIX → MASTER</footer>
      </main>
    );
  if (workspaceMode === "song" && songProfile) {
    const stereo = tracks[0],
      generating =
        !stereo?.url &&
        ![
          "idle",
          "error",
          "CREATE_TASK_FAILED",
          "GENERATE_AUDIO_FAILED",
          "CALLBACK_EXCEPTION",
          "SENSITIVE_WORD_ERROR",
        ].includes(generation.status),
      duration = stereo?.duration || 180,
      progress = Math.max(0, Math.min(100, (time / duration) * 100));
    return (
      <main className="song-shell">
        <header>
          <div className="brand">
            <picture>
              <source
                media="(prefers-color-scheme: dark)"
                srcSet="/qamuz-logo-dark.png"
              />
              <img src="/qamuz-logo-light.png" alt="QAMUZ by Gen Audius" />
            </picture>
          </div>
          <div className="shell-actions">
            <button className="home-button" onClick={openSaasHome}>
              <House /> INICIO QAMUZ
            </button>
            <button onClick={startAnotherSong}>
              <Plus /> CREAR OTRA CANCIÓN
            </button>
          </div>
        </header>
        <section className="song-profile">
          <div className="cover-profile">
            {songProfile.coverUrl ? (
              <img
                className="song-cover"
                src={songProfile.coverUrl}
                alt={`Portada de ${songProfile.title}`}
              />
            ) : (
              <>
                <img
                  className="cover-brand-icon"
                  src="/qamuz-icon.png"
                  alt="QAMUZ"
                />
                <div className="cover-wave">
                  {Array.from({ length: 18 }, (_, i) => (
                    <i key={i} style={{ height: `${20 + ((i * 17) % 70)}%` }} />
                  ))}
                </div>
                <small>GEN AUDIUS</small>
              </>
            )}
          </div>
          <div className="song-data">
            <span>PROYECTO ESTÉREO</span>
            <h1>{songProfile.title}</h1>
            <h2>{songProfile.artist}</h2>
            <p>
              {songProfile.prompt ||
                "Creación musical normal preparada por QAMUZ."}
            </p>
            {generating && (
              <div className="generation-status">
                <i />
                <div>
                  <b>GENERANDO CON IA</b>
                  <small>
                    {generation.status === "FIRST_SUCCESS"
                      ? "Primera versión lista; finalizando archivos…"
                      : "Kie/Suno está componiendo. Puedes dejar esta pantalla abierta."}
                  </small>
                </div>
                <span>{generation.status}</span>
              </div>
            )}
            {generation.error && (
              <div className="generation-error">
                <b>NO SE PUDO GENERAR</b>
                <span>{generation.error}</span>
              </div>
            )}
            <div className="stereo-daw">
              <header>
                <div>
                  <Music2 />
                  <span>
                    <b>{stereo?.name || "Stereo Master"}</b>
                    <small>
                      {stereo?.url
                        ? "AUDIO LISTO · ESTÉREO"
                        : generating
                          ? "GENERACIÓN EN PROGRESO"
                          : "PISTA VACÍA"}
                    </small>
                  </span>
                </div>
                <strong>STEREO MASTER</strong>
              </header>
              <div
                className="stereo-timeline"
                onClick={(e) => {
                  if (stereo?.url) {
                    const box = e.currentTarget.getBoundingClientRect();
                    seek(((e.clientX - box.left) / box.width) * duration);
                  }
                }}
              >
                <div
                  className="stereo-progress"
                  style={{ width: `${progress}%` }}
                />
                <div className="stereo-waveform">
                  {(
                    stereo?.peaks || Array.from({ length: 120 }, () => 0.05)
                  ).map((peak, i) => (
                    <i
                      key={i}
                      style={{ height: `${Math.max(5, peak * 92)}%` }}
                    />
                  ))}
                </div>
                <span
                  className="stereo-playhead"
                  style={{ left: `${progress}%` }}
                />
              </div>
              <footer>
                <button
                  disabled={!stereo?.url}
                  onClick={togglePlay}
                  aria-label={playing ? "Pausar" : "Reproducir"}
                >
                  {playing ? <Pause /> : <Play />}
                </button>
                <button
                  disabled={!stereo?.url}
                  onClick={stopAll}
                  aria-label="Detener"
                >
                  <Square />
                </button>
                <time>
                  {Math.floor(time / 60)
                    .toString()
                    .padStart(2, "0")}
                  :
                  {Math.floor(time % 60)
                    .toString()
                    .padStart(2, "0")}{" "}
                  /{" "}
                  {Math.floor(duration / 60)
                    .toString()
                    .padStart(2, "0")}
                  :
                  {Math.floor(duration % 60)
                    .toString()
                    .padStart(2, "0")}
                </time>
                <div className="stereo-meter">
                  {Array.from({ length: 18 }, (_, i) => (
                    <i
                      key={i}
                      className={masterDb > -60 + i * 3.33 ? "lit" : ""}
                    />
                  ))}
                </div>
                <button
                  className="import-stereo"
                  onClick={() => fileRef.current?.click()}
                >
                  IMPORTAR AUDIO
                </button>
              </footer>
            </div>
            <div className="song-actions">
              <button
                className="primary"
                onClick={() => {
                  stopAll();
                  setWorkspaceMode("studio");
                }}
              >
                <SlidersHorizontal /> ABRIR EDITOR MULTIPISTA
              </button>
              <button
                disabled={!stereo?.url}
                onClick={() => {
                  stopAll();
                  setWorkspaceMode("studio");
                  message("Separación de stems preparada para el módulo IA");
                }}
              >
                <Layers3 /> EXTRAER STEMS Y MEZCLAR
              </button>
            </div>
          </div>
        </section>
        <input
          ref={fileRef}
          hidden
          multiple
          type="file"
          accept="audio/*,.wav,.mp3,.m4a"
          onChange={(e) => importFiles(e.target.files)}
        />
        <footer>
          Cada canción se guarda como un proyecto independiente. El editor
          multipista solo se abre cuando decides mezclar.
        </footer>
      </main>
    );
  }
  return (
    <main className={studioView === "mix" ? "studio mix-view" : "studio"}>
      {notice && <div className="toast">{notice}</div>}
      <button
        className="master-chat-toggle"
        onClick={() => setChatOpen(!chatOpen)}
      >
        <MessageSquare />
        <span>CHAT MAESTRO</span>
      </button>
      {chatOpen && (
        <aside className="master-chat">
          <header>
            <div>
              <MessageSquare />
              <b>CHAT MAESTRO</b>
              <small>CONTROL DEL ESTUDIO</small>
            </div>
            <button onClick={() => setChatOpen(false)}>
              <X />
            </button>
          </header>
          <div className="master-messages">
            {chatMessages.map((message, index) => (
              <p key={index}>{message}</p>
            ))}
          </div>
          <footer>
            <input
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMasterCommand();
              }}
              placeholder="Mezcla, agrega voz, instrumento…"
            />
            <button onClick={sendMasterCommand}>ENVIAR</button>
          </footer>
        </aside>
      )}
      <header className="topbar">
        <div className="brand">
          <picture>
            <source
              media="(prefers-color-scheme: dark)"
              srcSet="/qamuz-logo-dark.png"
            />
            <img src="/qamuz-logo-light.png" alt="QAMUZ by Gen Audius" />
          </picture>
        </div>
        <div className="file-menu-wrap">
          <button
            className="saas-home-button"
            title="Volver al inicio de QAMUZ"
            onClick={openSaasHome}
          >
            <House />
            <span>INICIO</span>
          </button>
          <button
            className={fileMenuOpen ? "file-button active" : "file-button"}
            onClick={() => setFileMenuOpen(!fileMenuOpen)}
          >
            FILE
          </button>
          {fileMenuOpen && (
            <div className="file-dropdown" role="menu">
              <button
                onClick={() => {
                  setFileMenuOpen(false);
                  createProject();
                }}
              >
                <FolderPlus />
                <span>
                  <b>Nuevo proyecto</b>
                  <small>Crear una sesión vacía</small>
                </span>
              </button>
              <button
                onClick={() => {
                  setFileMenuOpen(false);
                  save();
                }}
              >
                <Save />
                <span>
                  <b>Guardar proyecto</b>
                  <small>Guardar y crear revisión</small>
                </span>
              </button>
              <button
                onClick={() => {
                  setFileMenuOpen(false);
                  document
                    .querySelector<HTMLSelectElement>(".project-control select")
                    ?.focus();
                }}
              >
                <FolderPlus />
                <span>
                  <b>Abrir proyecto</b>
                  <small>Seleccionar desde el banco</small>
                </span>
              </button>
              <i />
              <button
                onClick={() => {
                  setFileMenuOpen(false);
                  fileRef.current?.click();
                }}
              >
                <Music2 />
                <span>
                  <b>Importar audio</b>
                  <small>WAV · MP3 · M4A · múltiples pistas</small>
                </span>
              </button>
              <i />
              <button
                onClick={() => {
                  setFileMenuOpen(false);
                  setExportOpen(true);
                }}
              >
                <Download />
                <span>
                  <b>Exportar / Renderizar</b>
                  <small>Master Mix o stems</small>
                </span>
              </button>
            </div>
          )}
        </div>
        <div className="project-control">
          <select
            aria-label="Proyecto activo"
            value={activeProjectId}
            onChange={(e) => loadProject(e.target.value)}
          >
            {projectList.length ? (
              projectList.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))
            ) : (
              <option value="qamuz-main">{project}</option>
            )}
          </select>
          <button title="Crear proyecto" onClick={createProject}>
            <FolderPlus />
          </button>
          <input
            className="project-name"
            value={project}
            onChange={(e) => {
              setProject(e.target.value);
              setProjectList((list) =>
                list.map((item) =>
                  item.id === activeProjectId
                    ? { ...item, name: e.target.value }
                    : item,
                ),
              );
            }}
            aria-label="Nombre del proyecto"
          />
        </div>
        <div className="view-switch" aria-label="Vista del estudio">
          <button
            className={studioView === "edit" ? "active" : ""}
            onClick={() => setStudioView("edit")}
          >
            EDIT
          </button>
          <button
            className={studioView === "mix" ? "active" : ""}
            onClick={() => setStudioView("mix")}
          >
            MIX
          </button>
        </div>
        <div className="header-actions">
          <button title="Deshacer" onClick={undo}>
            <Undo2 />
          </button>
          <button title="Rehacer" disabled>
            <Redo2 />
          </button>
          <button className="save" onClick={save}>
            <Save /> Guardar
          </button>
          <button title="Historial de objetos" onClick={openHistory}>
            <HistoryIcon />
          </button>
          <span className={`save-state ${saveState}`}>
            {saveState === "saving"
              ? "GUARDANDO…"
              : saveState === "saved"
                ? "GUARDADO"
                : saveState === "loading"
                  ? "CARGANDO…"
                  : "SIN CONEXIÓN"}
          </span>
          <button
            title="Configuración de audio, DSP y MIDI"
            onClick={scanDevices}
          >
            <Settings2 />
          </button>
        </div>
      </header>
      {importProgress > 0 && (
        <div className="import-progress">
          <span>IMPORTANDO Y GUARDANDO AUDIO</span>
          <div>
            <i style={{ width: `${importProgress}%` }} />
          </div>
          <b>{importProgress}%</b>
        </div>
      )}
      {exportOpen && (
        <div
          className="export-overlay"
          role="dialog"
          aria-label="Exportar proyecto"
        >
          <section className="export-panel">
            <header>
              <div>
                <Download />
                <span>EXPORTAR PROYECTO</span>
                <b>Configura la mezcla final o los stems</b>
              </div>
              <button onClick={() => setExportOpen(false)}>
                <X />
              </button>
            </header>
            <div className="export-body">
              <fieldset>
                <legend>MODO DE EXPORTACIÓN</legend>
                <label>
                  <input
                    type="radio"
                    checked={exportMode === "master"}
                    onChange={() => setExportMode("master")}
                  />{" "}
                  Master Mix <small>Una mezcla estéreo final</small>
                </label>
                <label>
                  <input
                    type="radio"
                    checked={exportMode === "stems"}
                    onChange={() => setExportMode("stems")}
                  />{" "}
                  Todas las pistas <small>Un archivo separado por pista</small>
                </label>
              </fieldset>
              <div className="export-grid">
                <label>
                  FORMATO
                  <select
                    value={exportFormat}
                    onChange={(e) =>
                      setExportFormat(e.target.value as "wav" | "mp3")
                    }
                  >
                    <option value="wav">WAV PCM</option>
                    <option value="mp3">MP3 320 kbps</option>
                  </select>
                </label>
                <label>
                  SAMPLE RATE
                  <select
                    value={exportRate}
                    onChange={(e) => setExportRate(+e.target.value)}
                  >
                    <option value="44100">44.1 kHz</option>
                    <option value="48000">48 kHz · Video</option>
                    <option value="96000">96 kHz</option>
                  </select>
                </label>
                <label>
                  BIT DEPTH
                  <select
                    value={exportDepth}
                    disabled={exportFormat === "mp3"}
                    onChange={(e) => setExportDepth(+e.target.value)}
                  >
                    <option value="16">16-bit PCM</option>
                    <option value="24">24-bit PCM</option>
                  </select>
                </label>
              </div>
              {exportFormat === "mp3" && (
                <p className="format-warning">
                  Codificación MP3 estéreo real a 320 kbps.
                </p>
              )}
            </div>
            <footer>
              <button onClick={() => setExportOpen(false)}>CANCELAR</button>
              <button className="primary" onClick={exportMix}>
                <Download /> RENDERIZAR {exportFormat.toUpperCase()}
              </button>
            </footer>
          </section>
        </div>
      )}
      {auditOpen && (
        <div
          className="history-overlay"
          role="dialog"
          aria-label="Historial del proyecto"
        >
          <section className="history-panel">
            <header>
              <div>
                <HistoryIcon />
                <span>HISTORIAL DEL PROYECTO</span>
                <b>{project} · cambios por objeto</b>
              </div>
              <button onClick={() => setAuditOpen(false)}>
                <X />
              </button>
            </header>
            <div className="history-workspace">
              <div className="history-list">
                {auditRows.length ? (
                  auditRows.map((row) => (
                    <article
                      className={selectedAudit === row.id ? "selected" : ""}
                      key={row.id}
                      onClick={() => setSelectedAudit(row.id)}
                    >
                      <i>{row.revision}</i>
                      <div>
                        <b>
                          {row.objectType.toUpperCase()} · {row.objectId}
                        </b>
                        <span>{row.action}</span>
                      </div>
                      <time>{new Date(row.createdAt).toLocaleString()}</time>
                    </article>
                  ))
                ) : (
                  <p>Todavía no hay cambios registrados.</p>
                )}
              </div>
              <aside className="history-detail">
                {selectedAudit ? (
                  (() => {
                    const row = auditRows.find((x) => x.id === selectedAudit)!;
                    return (
                      <>
                        <span>COMPARACIÓN · REV {row.revision}</span>
                        <h3>
                          {row.objectType} · {row.objectId}
                        </h3>
                        <div className="compare-grid">
                          <section>
                            <b>ANTES</b>
                            <pre>
                              {row.beforeJson
                                ? JSON.stringify(
                                    JSON.parse(row.beforeJson),
                                    null,
                                    2,
                                  )
                                : "Objeto inexistente"}
                            </pre>
                          </section>
                          <section>
                            <b>DESPUÉS</b>
                            <pre>
                              {row.afterJson
                                ? JSON.stringify(
                                    JSON.parse(row.afterJson),
                                    null,
                                    2,
                                  )
                                : "Objeto eliminado"}
                            </pre>
                          </section>
                        </div>
                        <button onClick={() => restoreRevision(row.revision)}>
                          <RotateCcw /> RESTAURAR REVISIÓN {row.revision}
                        </button>
                      </>
                    );
                  })()
                ) : (
                  <>
                    <HistoryIcon />
                    <h3>Selecciona un cambio</h3>
                    <p>
                      Verás los valores anteriores y posteriores. Restaurar crea
                      una revisión nueva y no borra el historial.
                    </p>
                    {auditRevisions[0] && (
                      <small>
                        {auditRevisions.length} revisiones guardadas
                      </small>
                    )}
                  </>
                )}
              </aside>
            </div>
          </section>
        </div>
      )}
      <input
        ref={fileRef}
        hidden
        multiple
        type="file"
        accept="audio/*,.wav,.mp3,.m4a"
        onChange={(e) => importFiles(e.target.files)}
      />
      {ioOpen && (
        <div
          className="io-overlay"
          role="dialog"
          aria-label="Configuración de dispositivos"
        >
          <section className="io-panel">
            <header>
              <div>
                <Settings2 />
                <span>AUDIO ENGINE</span>
                <b>INTERFACES · DSP · MIDI</b>
              </div>
              <button onClick={() => setIoOpen(false)}>
                <X />
              </button>
            </header>
            <div className="io-status">
              <i className="online" />
              <b>Motor 48 kHz</b>
              <span>Modo baja latencia · procesamiento interactivo</span>
            </div>
            <div className="io-grid">
              <label>
                <span>ENTRADA / MICRÓFONO</span>
                <select
                  value={inputId}
                  onChange={(e) => setInputId(e.target.value)}
                >
                  <option value="default">Entrada predeterminada</option>
                  {audioInputs.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || "Interfaz de audio"}
                    </option>
                  ))}
                </select>
                <small>
                  Interfaz USB, tarjeta de sonido o DSP con driver del sistema
                </small>
              </label>
              <label>
                <span>SALIDA / MONITORES</span>
                <select
                  value={outputId}
                  onChange={(e) => selectOutput(e.target.value)}
                >
                  <option value="default">Salida predeterminada</option>
                  {audioOutputs.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || "Salida de audio"}
                    </option>
                  ))}
                </select>
                <small>Auriculares, monitores o salida de la interfaz</small>
              </label>
              <div className="io-card">
                <span>MEDIDOR DE ENTRADA</span>
                <div className="input-meter">
                  <i
                    style={{
                      width: `${(Math.max(0, (meterDb[-1] ?? -60) + 60) / 60) * 100}%`,
                    }}
                  />
                </div>
                <b>{(meterDb[-1] ?? -60).toFixed(1)} dBFS</b>
                <small>Se activa al grabar desde la entrada seleccionada</small>
              </div>
              <div className="io-card">
                <span>CONTROLADOR MIDI</span>
                <b>{midiActive ? "MIDI ACTIVO" : "SIN CONEXIÓN"}</b>
                <small>
                  {midiInputs.join(" · ") ||
                    "Teclado, pads o superficie de control"}
                </small>
                <button onClick={enableMidi}>Detectar MIDI</button>
              </div>
            </div>
            <footer>
              <span>
                Para DSP externo, selecciona la entrada y salida de esa
                interfaz.
              </span>
              <button onClick={() => setIoOpen(false)}>LISTO</button>
            </footer>
          </section>
        </div>
      )}
      <section className="transport limbus-transport">
        <div className="transport-buttons primary-transport">
          <button title="Return to Zero (Enter)" onClick={() => seek(0)}>
            <RotateCcw />
            <small>RTZ</small>
          </button>
          <button
            title="Retroceder un compás"
            onClick={() => seek(time - secondsPerBar)}
          >
            <span className="step-icon">‹</span>
            <small>BAR</small>
          </button>
          <button title="Stop" onClick={stopAll}>
            <Square fill="currentColor" />
            <small>STOP</small>
          </button>
          <button
            className="play"
            title="Play / Pause (Space)"
            onClick={togglePlay}
          >
            {playing ? <Pause /> : <Play fill="currentColor" />}
            <small>{playing ? "PAUSE" : "PLAY"}</small>
          </button>
          <button
            className={recording ? "record active" : "record"}
            title="Record"
            onClick={record}
          >
            <Circle fill="currentColor" />
            <small>REC</small>
          </button>
          <button
            className={loop ? "loop active" : "loop"}
            title="Loop"
            onClick={() => setLoop(!loop)}
          >
            <span className="loop-icon">↻</span>
            <small>LOOP</small>
          </button>
        </div>
        <div className="position-readout">
          <span>BARS · BEATS</span>
          <b>
            {String(Math.floor(time / secondsPerBar) + 1).padStart(3, "0")} ·{" "}
            {Math.floor((time % secondsPerBar) / secondsPerBeat) + 1} ·{" "}
            {Math.floor(((time % secondsPerBeat) / secondsPerBeat) * 960)
              .toString()
              .padStart(3, "0")}
          </b>
        </div>
        <div className="counter">
          <span>TIME</span>
          <b>
            {String(Math.floor(time / 60)).padStart(2, "0")}:
            {String(Math.floor(time % 60)).padStart(2, "0")}.
            {String(Math.floor((time % 1) * 100)).padStart(2, "0")}
          </b>
        </div>
        <label className="tempo">
          <span>BPM</span>
          <input
            type="number"
            min="40"
            max="240"
            value={tempo}
            onChange={(e) => setTempo(+e.target.value)}
          />
        </label>
        <button className="tap" onClick={tapTempo}>
          TAP
        </button>
        <button
          className={metronome ? "metro enabled" : "metro"}
          onClick={() => setMetronome(!metronome)}
        >
          CLICK
        </button>
        <div className="master-mini">
          <span>MASTER</span>
          <div className="meter" title={`MASTER ${masterDb.toFixed(1)} dBFS`}>
            {Array.from({ length: 8 }, (_, i) => (
              <i key={i} className={masterDb > -60 + i * 7.5 ? "lit" : ""} />
            ))}
          </div>
          <b>{masterDb.toFixed(1)}</b>
        </div>
        <div className="transport-keys">
          <span>
            <kbd>SPACE</kbd> Play/Pause
          </span>
          <span>
            <kbd>ENTER</kbd> Return to Start
          </span>
        </div>
        <button className="export" onClick={() => setExportOpen(true)}>
          <Download /> RENDER
        </button>
      </section>
      {studioView === "edit" && (
        <nav className="editbar">
          <div className="toolset">
            <button
              className={tool === "select" ? "active" : ""}
              title="Selección (1)"
              onClick={() => setTool("select")}
            >
              <MousePointer2 />
            </button>
            <button
              className={tool === "split" ? "active" : ""}
              title="Tijera (2)"
              onClick={() => setTool("split")}
            >
              <Scissors />
            </button>
            <button
              className={tool === "erase" ? "active" : ""}
              title="Borrador (3)"
              onClick={() => setTool("erase")}
            >
              <Eraser />
            </button>
            <button
              className={tool === "draw" ? "active" : ""}
              title="Lápiz (4)"
              onClick={() => setTool("draw")}
            >
              <Pencil />
            </button>
          </div>
          <button
            className={snap ? "active" : ""}
            onClick={() => setSnap(!snap)}
            title="Rejilla magnética (Q)"
          >
            <Magnet /> Snap {snap ? "ON" : "OFF"}
          </button>
          <div className="zoomtools">
            <button onClick={() => setZoom((x) => Math.max(0.6, x - 0.2))}>
              <ZoomOut />
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((x) => Math.min(2.4, x + 0.2))}>
              <ZoomIn />
            </button>
          </div>
          <div className="clipactions">
            <button
              disabled={!selected}
              onClick={() => selected && cutClip(selected)}
            >
              <Scissors /> Cortar
            </button>
            <button
              disabled={!selected}
              onClick={() => selected && copyClip(selected)}
            >
              <Copy /> Copiar
            </button>
            <button disabled={!clipboard} onClick={pasteClip}>
              <Plus /> Pegar
            </button>
            <button
              disabled={!selected}
              onClick={() => selected && duplicate(selected)}
            >
              <Copy /> Duplicar
            </button>
            <button
              disabled={!selected}
              onClick={() => selected && removeTrack(selected)}
            >
              <Trash2 /> Eliminar
            </button>
          </div>
          <div className="tracktypes">
            <button onClick={() => addTrack("Audio")}>+ Audio</button>
            <button onClick={() => addTrack("MIDI")}>+ MIDI</button>
            <button onClick={() => addTrack("Grupo")}>+ Grupo</button>
            <button
              className="fx-open"
              onClick={() => {
                if (!selected) {
                  message("Selecciona una pista");
                  return;
                }
                const track = tracks.find((item) => item.id === selected);
                const slot = track?.effects.findIndex((fx) => !fx) ?? 0;
                const target = slot < 0 ? 0 : slot;
                setInsertSlot(target);
                setStudioView("mix");
                setInsertMenu(`${selected}-${target}`);
              }}
            >
              <Sparkles /> Procesadores
            </button>
          </div>
        </nav>
      )}
      {studioView === "edit" ? (
        <section className="workspace">
          <aside className="library-panel">
            <h3>
              <Music2 /> Biblioteca
            </h3>
            <button
              className="new-track"
              onClick={() => fileRef.current?.click()}
            >
              <Plus /> Añadir audio
            </button>
            <div className="browser-title">INSTRUMENTOS</div>
            {["Batería", "Bajo", "Teclado", "Guitarra", "Percusión"].map(
              (x, i) => (
                <button className="browser-item" key={x}>
                  <span>{["◉", "♬", "▰", "⌁", "✦"][i]}</span>
                  {x}
                  <b>›</b>
                </button>
              ),
            )}
            <div className="browser-title">SESIÓN</div>
            <p className="hint">
              Importa varias pistas y se reproducirán sincronizadas.
            </p>
          </aside>
          <div className="arrangement">
            <div
              className="timeline-inner"
              style={
                {
                  width: `${Math.max(100, zoom * 100)}%`,
                  "--bar": `${100 / barCount}%`,
                  "--beat": `${100 / (barCount * 4)}%`,
                  "--subbeat": `${100 / (barCount * 16)}%`,
                } as React.CSSProperties
              }
            >
              <div className="ruler">
                <div className="corner" />
                <div
                  className="ticks"
                  style={
                    {
                      "--bar": `${100 / barCount}%`,
                      "--beat": `${100 / (barCount * 4)}%`,
                      "--subbeat": `${100 / (barCount * 16)}%`,
                    } as React.CSSProperties
                  }
                  onClick={(e) =>
                    seek(
                      (e.nativeEvent.offsetX / e.currentTarget.clientWidth) *
                        sessionLength,
                    )
                  }
                >
                  {Array.from({ length: barCount }, (_, i) => (
                    <span
                      key={i}
                      className={i % 4 === 0 ? "major" : ""}
                      style={{ left: `${(i / barCount) * 100}%` }}
                    >
                      {i + 1}
                    </span>
                  ))}
                  <i
                    className="playhead-top"
                    style={{ left: `${(time / sessionLength) * 100}%` }}
                  />
                </div>
              </div>
              <div className="track-area">
                {tracks.length === 0 && (
                  <div className="empty-session">
                    <Music2 />
                    <b>PROYECTO VACÍO</b>
                    <span>Importa tus WAV o crea una pista para comenzar</span>
                    <div>
                      <button onClick={() => fileRef.current?.click()}>
                        <Plus /> Importar audio
                      </button>
                      <button onClick={() => addTrack("Audio")}>
                        + Pista de audio
                      </button>
                    </div>
                  </div>
                )}
                {tracks.map((t, index) => (
                  <div
                    className={
                      selected === t.id ? "track-row selected" : "track-row"
                    }
                    key={t.id}
                  >
                    <div
                      className="track-head"
                      onClick={() => setSelected(t.id)}
                      style={{ "--track": t.color } as React.CSSProperties}
                    >
                      <div className="track-icon">
                        {t.type === "Voz" ? <Mic /> : <Music2 />}
                      </div>
                      <div className="track-meta">
                        <b>{t.name}</b>
                        <small>
                          {t.url ? `${(t.duration || 0).toFixed(1)} s` : t.type}
                        </small>
                      </div>
                      <button
                        className={t.muted ? "on" : ""}
                        onClick={() => toggle(t.id, "muted")}
                      >
                        M
                      </button>
                      <button
                        className={t.solo ? "on" : ""}
                        onClick={() => toggle(t.id, "solo")}
                      >
                        S
                      </button>
                      <Volume2 />
                      <input
                        type="range"
                        value={t.volume}
                        onChange={(e) =>
                          setTracks((a) =>
                            a.map((x) =>
                              x.id === t.id
                                ? { ...x, volume: +e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                    </div>
                    <div
                      className="lane"
                      onClick={(e) =>
                        laneAction(
                          t.id,
                          (e.nativeEvent.offsetX /
                            e.currentTarget.clientWidth) *
                            sessionLength,
                        )
                      }
                    >
                      {t.type !== "MIDI" ? (
                        <div
                          className="clip"
                          onPointerDown={(event) => beginClipDrag(event, t)}
                          style={{
                            background: t.color,
                            left: `${(t.start / sessionLength) * 100}%`,
                            width: `${((t.trimEnd - t.start) / sessionLength) * 100}%`,
                          }}
                        >
                          <span>{t.name}</span>
                          <div className={t.peaks ? "wave real-wave" : "wave"}>
                            {(
                              t.peaks ||
                              Array.from(
                                { length: 72 },
                                (_, j) =>
                                  (15 + ((j * 37 + index * 11) % 70)) / 100,
                              )
                            ).map((peak, j) => (
                              <i
                                key={j}
                                style={{ height: `${Math.max(5, peak * 92)}%` }}
                              />
                            ))}
                          </div>
                          {t.cuts.map((c) => (
                            <i
                              className="cutmark"
                              key={c}
                              style={{
                                left: `${((c - t.start) / (t.trimEnd - t.start)) * 100}%`,
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <div
                          className="midi-clip wide-midi"
                          onPointerDown={(event) => beginClipDrag(event, t)}
                          style={{
                            left: `${(t.start / sessionLength) * 100}%`,
                            width: `${((t.trimEnd - t.start) / sessionLength) * 100}%`,
                            background: t.color,
                          }}
                        >
                          <span>{t.name} · Piano Roll</span>
                          {Array.from({ length: 12 }, (_, k) => (
                            <i
                              key={k}
                              style={{
                                top: `${16 + (k % 5) * 14}%`,
                                left: `${4 + k * 7}%`,
                              }}
                            />
                          ))}
                          {t.cuts.map((c) => (
                            <i
                              className="cutmark"
                              key={c}
                              style={{
                                left: `${((c - t.start) / (t.trimEnd - t.start)) * 100}%`,
                              }}
                            />
                          ))}
                        </div>
                      )}
                      <div
                        className="playhead"
                        style={{ left: `${(time / sessionLength) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="add-row">
                  <button onClick={() => fileRef.current?.click()}>
                    <Plus /> Añadir pista
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className={`mix-console ${mixerMode}`}>
          <header className="mix-console-head">
            <div>
              <SlidersHorizontal />
              <span>QAMUZ MIX CONSOLE</span>
              <small>{tracks.length} CANALES · MASTER BUS</small>
            </div>
            <div className="mixer-size">
              <button
                className={mixerMode === "normal" ? "active" : ""}
                title="Vista normal del mezclador"
                onClick={() => setMixerMode("normal")}
              >
                <Maximize2 /> Normal
              </button>
              <button
                className={mixerMode === "compact" ? "active" : ""}
                title="Canales compactos"
                onClick={() => setMixerMode("compact")}
              >
                <Minimize2 /> Compact
              </button>
            </div>
          </header>
          {tracks.length === 0 ? (
            <div className="empty-mix">
              <SlidersHorizontal />
              <b>MIXER VACÍO</b>
              <span>Los canales aparecerán cuando importes o crees tracks</span>
              <div>
                <button onClick={() => fileRef.current?.click()}>
                  <Plus /> Importar tracks
                </button>
                <button
                  onClick={() => {
                    addTrack("Audio");
                    setStudioView("edit");
                  }}
                >
                  + Crear pista
                </button>
              </div>
            </div>
          ) : (
            <div className="console-scroll">
              <div className="console-channels">
                {tracks.map((t) => (
                  <article
                    className={
                      selected === t.id
                        ? "console-strip selected"
                        : "console-strip"
                    }
                    key={t.id}
                    onClick={() => setSelected(t.id)}
                  >
                    <header
                      onClick={() => {
                        setSelected(t.id);
                        setChannelOpen(true);
                      }}
                      title="Abrir canal"
                    >
                      <i style={{ background: t.color }} />
                      <span>{t.type.toUpperCase()}</span>
                      <b>{t.name}</b>
                    </header>
                    <button className="routing">IN 1 · MASTER</button>
                    <button
                      className="process"
                      onClick={() => {
                        setSelected(t.id);
                        setChannelOpen(true);
                      }}
                    >
                      PROCESS
                    </button>
                    <div className="pre-gain">
                      <span>PRE-GAIN</span>
                      <div>
                        <i style={{ width: `${t.volume}%` }} />
                      </div>
                      <small>{(t.volume / 10 - 8).toFixed(1)} dB</small>
                    </div>
                    <div className="console-inserts">
                      <span>INSERTS</span>
                      {[0, 1, 2, 3].map((i) => {
                        const menuKey = `${t.id}-${i}`;
                        return (
                          <div className="insert-slot-wrap" key={i}>
                            <button
                              className={t.effects[i] ? "loaded" : ""}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelected(t.id);
                                setInsertSlot(i);
                                if (t.effects[i]) {
                                  setActivePlugin(t.effects[i]);
                                  setEffectsOpen(true);
                                } else
                                  setInsertMenu(
                                    insertMenu === menuKey ? null : menuKey,
                                  );
                              }}
                            >
                              <em>{i + 1}</em>
                              {t.effects[i] || "ADD"}
                            </button>
                            {insertMenu === menuKey && (
                              <div
                                className="insert-dropdown"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {channelEffects.map((section) => (
                                  <div key={section.group}>
                                    <span>{section.group}</span>
                                    {section.items.map(
                                      ([label, plugin, desc]) => (
                                        <button
                                          key={label}
                                          onClick={() => {
                                            chooseChannelEffect(plugin, label);
                                          }}
                                        >
                                          <b>{label}</b>
                                          <small>{desc}</small>
                                        </button>
                                      ),
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="strip-body">
                      <div className="vertical-meter">
                        <div className="db-scale">
                          <span>0</span>
                          <span>-6</span>
                          <span>-18</span>
                          <span>-36</span>
                          <span>-60</span>
                        </div>
                        <i
                          style={{
                            height: `${(Math.max(0, (meterDb[t.id] ?? -60) + 60) / 60) * 100}%`,
                          }}
                        />
                      </div>
                      <input
                        className="console-fader"
                        type="range"
                        min="0"
                        max="100"
                        value={t.volume}
                        onChange={(e) =>
                          setTracks((a) =>
                            a.map((x) =>
                              x.id === t.id
                                ? { ...x, volume: +e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                      <b>{(meterDb[t.id] ?? -60).toFixed(1)} dBFS</b>
                    </div>
                    <div className="pan">
                      <span>PAN</span>
                      <b>
                        {(t.pan ?? 0) === 0
                          ? "C"
                          : (t.pan ?? 0) < 0
                            ? `L ${Math.abs(t.pan ?? 0)}`
                            : `R ${t.pan}`}
                      </b>
                      <input
                        aria-label={`Paneo de ${t.name}`}
                        type="range"
                        min="-100"
                        max="100"
                        step="1"
                        value={t.pan ?? 0}
                        onDoubleClick={() =>
                          setTracks((all) =>
                            all.map((track) =>
                              track.id === t.id ? { ...track, pan: 0 } : track,
                            ),
                          )
                        }
                        onChange={(e) =>
                          setTracks((all) =>
                            all.map((track) =>
                              track.id === t.id
                                ? { ...track, pan: +e.target.value }
                                : track,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="send-row">
                      <span>
                        REV <b>0</b>
                      </span>
                      <span>
                        DLY <b>0</b>
                      </span>
                    </div>
                    <footer>
                      <button
                        className={t.muted ? "on" : ""}
                        onClick={() => toggle(t.id, "muted")}
                      >
                        M
                      </button>
                      <button
                        className={t.solo ? "on" : ""}
                        onClick={() => toggle(t.id, "solo")}
                      >
                        S
                      </button>
                    </footer>
                  </article>
                ))}
                <article className="console-strip master-strip">
                  <header>
                    <Headphones />
                    <span>OUTPUT</span>
                    <b>MASTER</b>
                  </header>
                  <button
                    className="process"
                    onClick={() => {
                      setSelected(tracks[0]?.id || null);
                      setInsertSlot(null);
                      setEffectsOpen(true);
                    }}
                  >
                    PROCESS
                  </button>
                  <div className="master-meter">
                    <div className="db-scale">
                      <span>0</span>
                      <span>-6</span>
                      <span>-18</span>
                      <span>-36</span>
                      <span>-60</span>
                    </div>
                    <i>
                      <b
                        style={{
                          height: `${(Math.max(0, masterDb + 60) / 60) * 100}%`,
                        }}
                      />
                    </i>
                    <i>
                      <b
                        style={{
                          height: `${(Math.max(0, masterDb + 60) / 60) * 100}%`,
                        }}
                      />
                    </i>
                  </div>
                  <div className="strip-body">
                    <input
                      className="console-fader"
                      type="range"
                      min="0"
                      max="100"
                      defaultValue="82"
                    />
                    <b>{masterDb.toFixed(1)} dBFS</b>
                  </div>
                  <footer>
                    <button>DIM</button>
                    <button>MUTE</button>
                  </footer>
                </article>
              </div>
            </div>
          )}
        </section>
      )}
      {channelOpen &&
        selected &&
        (() => {
          const t = tracks.find((x) => x.id === selected);
          return t ? (
            <div
              className="channel-overlay"
              role="dialog"
              aria-label={`Canal ${t.name}`}
            >
              <section className="channel-panel">
                <header>
                  <div>
                    <i style={{ background: t.color }} />
                    <span>CHANNEL PROCESSING</span>
                    <b>{t.name}</b>
                  </div>
                  <button onClick={() => setChannelOpen(false)}>
                    <X />
                  </button>
                </header>
                <nav>
                  <button
                    className={channelTab === "eq" ? "active" : ""}
                    onClick={() => setChannelTab("eq")}
                  >
                    EQ
                  </button>
                  <button
                    className={channelTab === "dynamics" ? "active" : ""}
                    onClick={() => setChannelTab("dynamics")}
                  >
                    DYNAMICS
                  </button>
                  <button
                    className={channelTab === "inserts" ? "active" : ""}
                    onClick={() => setChannelTab("inserts")}
                  >
                    INSERTS
                  </button>
                </nav>
                {channelTab === "eq" ? (
                  <div className="channel-eq">
                    <div className="eq-graph">
                      {[18, 28, 42, 56, 70, 82].map((h, i) => (
                        <i
                          key={i}
                          style={{
                            left: `${10 + i * 16}%`,
                            bottom: `${h}%`,
                            borderColor: i === 2 ? t.color : "#d9b65d",
                          }}
                        />
                      ))}
                      <svg viewBox="0 0 600 180" preserveAspectRatio="none">
                        <path d="M0 125 C75 125 80 92 145 92 S235 145 310 112 S405 50 470 74 S545 110 600 58" />
                      </svg>
                    </div>
                    <div className="eq-controls">
                      {["LOW", "LOW MID", "HIGH MID", "HIGH"].map((x, i) => (
                        <label key={x}>
                          <span>{x}</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            defaultValue={45 + i * 8}
                          />
                          <b>{[80, 420, 2400, 9000][i]} Hz</b>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : channelTab === "dynamics" ? (
                  <div className="dynamics-panel">
                    <div className="gain-reduction">
                      <span>GAIN REDUCTION</span>
                      <b>-4.2 dB</b>
                      <i />
                    </div>
                    <div className="dyn-controls">
                      {[
                        ["THRESHOLD", 64],
                        ["RATIO", 42],
                        ["ATTACK", 28],
                        ["RELEASE", 58],
                        ["MAKEUP", 48],
                      ].map(([x, v]) => (
                        <label key={x as string}>
                          <span>{x}</span>
                          <input type="range" defaultValue={v as number} />
                          <b>{v}</b>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="channel-rack">
                    <span>INSERT RACK · 4 SLOTS</span>
                    {[0, 1, 2, 3].map((i) => (
                      <button
                        className={t.effects[i] ? "loaded" : ""}
                        key={i}
                        onClick={() => {
                          if (t.effects[i]) {
                            setActivePlugin(t.effects[i]);
                            setEffectsOpen(true);
                          } else {
                            setInsertSlot(i);
                            setChannelOpen(false);
                            setStudioView("mix");
                            setInsertMenu(`${t.id}-${i}`);
                          }
                        }}
                      >
                        <em>{i + 1}</em>
                        <div>
                          <b>{t.effects[i] || "INSERT VACÍO"}</b>
                          <small>
                            {t.effects[i]
                              ? "Pulsar para abrir interfaz"
                              : "Pulsar para añadir efecto"}
                          </small>
                        </div>
                        <Power />
                      </button>
                    ))}
                  </div>
                )}
                <footer>
                  <span>
                    <i /> SIGNAL ACTIVE
                  </span>
                  <button
                    onClick={() => {
                      setChannelOpen(false);
                      const slot = t.effects.findIndex((fx) => !fx);
                      const target = slot < 0 ? 0 : slot;
                      setInsertSlot(target);
                      setStudioView("mix");
                      setInsertMenu(`${t.id}-${target}`);
                    }}
                  >
                    AÑADIR PROCESADOR
                  </button>
                </footer>
              </section>
            </div>
          ) : null;
        })()}
      <footer>
        <span>
          <i className="green" /> Motor multipista listo
        </span>
        <span>44.1 kHz · WAV</span>
        <span>GEN AUDIUS IS QAMUZ</span>
      </footer>
      {effectsOpen && (
        <div
          className="fx-overlay"
          role="dialog"
          aria-label="Biblioteca de efectos QAMUZ"
        >
          <section className="fx-window">
            <header>
              <div>
                <Sparkles />
                <span>BIBLIOTECA DE EFECTOS</span>
                <b>QAMUZ FX RACK</b>
              </div>
              <button onClick={() => setEffectsOpen(false)}>
                <X />
              </button>
            </header>
            <div className="fx-target">
              <span>CANAL SELECCIONADO</span>
              <b>{tracks.find((t) => t.id === selected)?.name || "Ninguno"}</b>
              <div className="rack-slots">
                {[0, 1, 2, 3].map((i) => {
                  const fx = tracks.find((t) => t.id === selected)?.effects[i];
                  return (
                    <div
                      className={fx ? "slot loaded" : "slot"}
                      key={i}
                      onClick={() => fx && setActivePlugin(fx)}
                    >
                      <em>{i + 1}</em>
                      <span>{fx || "INSERT VACÍO"}</span>
                      {fx ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeEffect(fx);
                          }}
                        >
                          <X />
                        </button>
                      ) : (
                        <Power />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="fx-browser">
              <div className="fx-filters">
                <input
                  placeholder="Buscar efecto…"
                  value={effectSearch}
                  onChange={(e) => setEffectSearch(e.target.value)}
                />
                <div>
                  {[
                    "ALL",
                    "EQ",
                    "VOCAL",
                    "DYNAMICS",
                    "MOD",
                    "AMP",
                    "DRUM",
                    "SMART",
                    "COLOR",
                    "SPACE",
                    "MASTER",
                  ].map((c) => (
                    <button
                      className={effectCategory === c ? "active" : ""}
                      onClick={() => setEffectCategory(c)}
                      key={c}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="fx-grid">
                {effectLibrary
                  .filter(
                    ([name, , cat]) =>
                      (effectCategory === "ALL" || cat === effectCategory) &&
                      name.toLowerCase().includes(effectSearch.toLowerCase()),
                  )
                  .map(([name, desc, cat]) => (
                    <button
                      className="fx-card"
                      key={name}
                      onClick={() => addEffect(name)}
                      disabled={
                        (tracks.find((t) => t.id === selected)?.effects
                          .length || 0) >= 4 &&
                        !tracks
                          .find((t) => t.id === selected)
                          ?.effects.includes(name)
                      }
                    >
                      <span>{cat}</span>
                      <Sparkles />
                      <b>{name}</b>
                      <small>{desc}</small>
                      <em>
                        {tracks
                          .find((t) => t.id === selected)
                          ?.effects.includes(name)
                          ? "ABRIR"
                          : "+ INSERT"}
                      </em>
                    </button>
                  ))}
              </div>
            </div>
          </section>
          {activePlugin && (
            <section className="plugin-window">
              <header>
                <div>
                  <span>GEN AUDIUS</span>
                  <b>{activePlugin}</b>
                </div>
                <select
                  aria-label="Preset del efecto"
                  value={preset}
                  onChange={(e) => {
                    const nextPreset = e.target.value;
                    setPreset(nextPreset);
                    if (selected && presetDsp[nextPreset])
                      setTrackDsp((all) => ({
                        ...all,
                        [selected]: {
                          ...(all[selected] || defaultDsp),
                          ...presetDsp[nextPreset],
                        },
                      }));
                    if (currentEffectProfile) {
                      const presetIndex =
                        currentEffectProfile.presets.indexOf(nextPreset);
                      setPluginParams((all) => {
                        const next = { ...all };
                        currentEffectProfile.controls.forEach(
                          (control, index) => {
                            next[`${activePlugin}:${control.key}`] = Math.max(
                              0,
                              Math.min(
                                100,
                                control.value +
                                  (presetIndex - 1.5) * (index % 2 ? 8 : 5),
                              ),
                            );
                          },
                        );
                        return next;
                      });
                    }
                  }}
                >
                  {(activePlugin.includes("Tube EQ")
                    ? eqPresetNames
                    : activePlugin.includes("Compressor")
                      ? compressorPresetNames
                      : currentEffectProfile?.presets || generalPresetNames
                  ).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <button
                  className={pluginOn ? "plugin-power on" : "plugin-power"}
                  onClick={() => setPluginOn(!pluginOn)}
                >
                  <Power />
                </button>
                <button
                  onClick={() => {
                    setActivePlugin(null);
                    setEffectsOpen(false);
                  }}
                >
                  <X />
                </button>
              </header>
              <div
                className={
                  activePlugin.includes("Tube EQ")
                    ? "eqp-stage"
                    : activePlugin.includes("Compressor")
                      ? "compressor-stage"
                      : "qamuz-rack-stage"
                }
              >
                {activePlugin.includes("Tube EQ") ? (
                  <div className="qamuz-eqp">
                    <div className="eqp-heading">
                      <span>QAMUZ</span>
                      <b>EQP-Q1A</b>
                      <small>PROGRAM EQUALIZER</small>
                    </div>
                    <div className="eqp-module low-module">
                      <h3>LOW FREQUENCY</h3>
                      {[
                        ["FREQUENCY", "lowFreq", 20, 160, 1, "CPS"],
                        ["BOOST", "lowGain", -18, 18, 0.1, "dB"],
                        ["ATTEN", "lowAtten", 0, 18, 0.1, "dB"],
                      ].map(([label, key, min, max, step, unit]) => {
                        const value = currentDsp[key as keyof DspSettings];
                        const angle =
                          -135 +
                          ((value - (min as number)) /
                            ((max as number) - (min as number))) *
                            270;
                        return (
                          <label className="eqp-control" key={key as string}>
                            <span>{label}</span>
                            <div
                              className="eqp-knob"
                              style={
                                {
                                  "--angle": `${angle}deg`,
                                } as React.CSSProperties
                              }
                            >
                              <i />
                            </div>
                            <b>
                              {value}
                              <small> {unit}</small>
                            </b>
                            <input
                              aria-label={label as string}
                              type="range"
                              min={min as number}
                              max={max as number}
                              step={step as number}
                              value={value}
                              onChange={(e) =>
                                setDspValue(
                                  key as keyof DspSettings,
                                  +e.target.value,
                                )
                              }
                            />
                          </label>
                        );
                      })}
                    </div>
                    <div className="eqp-module high-module">
                      <h3>HIGH BOOST</h3>
                      {[
                        ["FREQUENCY", "highFreq", 3000, 16000, 100, "KCS"],
                        ["BANDWIDTH", "midQ", 0.2, 12, 0.1, "Q"],
                        ["BOOST", "highGain", -18, 18, 0.1, "dB"],
                      ].map(([label, key, min, max, step, unit]) => {
                        const value = currentDsp[key as keyof DspSettings];
                        const angle =
                          -135 +
                          ((value - (min as number)) /
                            ((max as number) - (min as number))) *
                            270;
                        return (
                          <label className="eqp-control" key={key as string}>
                            <span>{label}</span>
                            <div
                              className="eqp-knob"
                              style={
                                {
                                  "--angle": `${angle}deg`,
                                } as React.CSSProperties
                              }
                            >
                              <i />
                            </div>
                            <b>
                              {unit === "KCS"
                                ? (value / 1000).toFixed(1)
                                : value}
                              <small> {unit}</small>
                            </b>
                            <input
                              aria-label={label as string}
                              type="range"
                              min={min as number}
                              max={max as number}
                              step={step as number}
                              value={value}
                              onChange={(e) =>
                                setDspValue(
                                  key as keyof DspSettings,
                                  +e.target.value,
                                )
                              }
                            />
                          </label>
                        );
                      })}
                    </div>
                    <div className="eqp-module atten-module">
                      <h3>HIGH ATTEN</h3>
                      {[
                        ["FREQUENCY", "highAttenFreq", 5000, 20000, 100, "KCS"],
                        ["ATTEN", "highAtten", 0, 18, 0.1, "dB"],
                      ].map(([label, key, min, max, step, unit]) => {
                        const value = currentDsp[key as keyof DspSettings];
                        const angle =
                          -135 +
                          ((value - (min as number)) /
                            ((max as number) - (min as number))) *
                            270;
                        return (
                          <label className="eqp-control" key={key as string}>
                            <span>{label}</span>
                            <div
                              className="eqp-knob"
                              style={
                                {
                                  "--angle": `${angle}deg`,
                                } as React.CSSProperties
                              }
                            >
                              <i />
                            </div>
                            <b>
                              {unit === "KCS"
                                ? (value / 1000).toFixed(1)
                                : value}
                              <small> {unit}</small>
                            </b>
                            <input
                              aria-label={label as string}
                              type="range"
                              min={min as number}
                              max={max as number}
                              step={step as number}
                              value={value}
                              onChange={(e) =>
                                setDspValue(
                                  key as keyof DspSettings,
                                  +e.target.value,
                                )
                              }
                            />
                          </label>
                        );
                      })}
                    </div>
                    <div className="eqp-footer">
                      <button
                        className={pluginOn ? "eqp-power active" : "eqp-power"}
                        onClick={() => setPluginOn(!pluginOn)}
                      >
                        <i />
                        <span>POWER</span>
                      </button>
                      <div className="eqp-active">
                        <i className={pluginOn ? "on" : ""} />
                        <span>{pluginOn ? "MAINS ACTIVE" : "BYPASS"}</span>
                      </div>
                      <label className="eqp-control output-control">
                        <span>OUTPUT GAIN</span>
                        <div
                          className="eqp-knob small"
                          style={
                            {
                              "--angle": `${-135 + ((currentDsp.eqOutput + 18) / 36) * 270}deg`,
                            } as React.CSSProperties
                          }
                        >
                          <i />
                        </div>
                        <b>
                          {currentDsp.eqOutput.toFixed(1)}
                          <small> dB</small>
                        </b>
                        <input
                          aria-label="Output gain"
                          type="range"
                          min={-18}
                          max={18}
                          step={0.1}
                          value={currentDsp.eqOutput}
                          onChange={(e) =>
                            setDspValue("eqOutput", +e.target.value)
                          }
                        />
                      </label>
                    </div>
                  </div>
                ) : activePlugin.includes("Compressor") ? (
                  <div className="pro-comp-face">
                    <div className="pro-plugin-title">
                      <span>QAMUZ</span>
                      <b>DYN-C1</b>
                      <small>CHANNEL COMPRESSOR · DSP ACTIVE</small>
                    </div>
                    <div className="gr-display">
                      <span>GAIN REDUCTION</span>
                      <strong>
                        {selected
                          ? Math.max(
                              0,
                              -(
                                dspNodes.current.get(selected)?.comp
                                  .reduction || 0
                              ),
                            ).toFixed(1)
                          : "0.0"}
                        <small> dB</small>
                      </strong>
                      <i
                        style={{
                          width: `${selected ? Math.min(100, Math.max(0, -(dspNodes.current.get(selected)?.comp.reduction || 0)) * 5) : 0}%`,
                        }}
                      />
                    </div>
                    <div className="pro-controls comp-grid">
                      {[
                        ["THRESHOLD", "threshold", -60, 0, 0.5, "dB"],
                        ["RATIO", "ratio", 1, 20, 0.1, ":1"],
                        ["ATTACK", "attack", 0.001, 1, 0.001, "s"],
                        ["RELEASE", "release", 0.01, 1, 0.01, "s"],
                        ["MAKEUP", "makeup", 0, 18, 0.1, "dB"],
                      ].map(([label, key, min, max, step, unit]) => (
                        <label key={key as string}>
                          <span>{label}</span>
                          <b>
                            {currentDsp[key as keyof DspSettings]}{" "}
                            <small>{unit}</small>
                          </b>
                          <input
                            type="range"
                            min={min as number}
                            max={max as number}
                            step={step as number}
                            value={currentDsp[key as keyof DspSettings]}
                            onChange={(e) =>
                              setDspValue(
                                key as keyof DspSettings,
                                +e.target.value,
                              )
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="qamuz-rack">
                    <div className="eqp-heading rack-heading">
                      <span>QAMUZ</span>
                      <b>
                        {currentEffectProfile?.model ||
                          activePlugin.replace("QAMUZ ", "")}
                      </b>
                      <small>
                        {activePlugin.replace("QAMUZ ", "").toUpperCase()}{" "}
                        PROCESSOR
                      </small>
                    </div>
                    <div className="rack-meter">
                      <span>
                        {currentEffectProfile?.meter || "INPUT / OUTPUT"}
                      </span>
                      <div className="signal-line">
                        {Array.from({ length: 28 }, (_, i) => (
                          <i
                            key={i}
                            style={{ height: `${18 + ((i * 23) % 70)}%` }}
                          />
                        ))}
                      </div>
                      <b>
                        {activePlugin.includes("Tune")
                          ? "C MINOR"
                          : activePlugin.includes("Delay")
                            ? "1 / 4"
                            : `${masterDb.toFixed(1)} dBFS`}
                      </b>
                    </div>
                    {activePlugin === "QAMUZ Tune" && (
                      <div className="processor-options tune-options">
                        <label>
                          VOCAL RANGE
                          <select>
                            <option>Alto–Tenor</option>
                            <option>Soprano</option>
                            <option>Low Male</option>
                            <option>Instrument</option>
                          </select>
                        </label>
                        <label>
                          ENGINE
                          <select>
                            <option>Auto Adaptive</option>
                            <option>Classic</option>
                            <option>Low Latency</option>
                          </select>
                        </label>
                        <label>
                          KEY
                          <select>
                            <option>C</option>
                            <option>C♯</option>
                            <option>D</option>
                            <option>E♭</option>
                            <option>E</option>
                            <option>F</option>
                            <option>G</option>
                            <option>A</option>
                            <option>B</option>
                          </select>
                        </label>
                        <label>
                          SCALE
                          <select>
                            <option>Major</option>
                            <option>Minor</option>
                            <option>Chromatic</option>
                            <option>Custom</option>
                          </select>
                        </label>
                        <button>SOLO SCALE</button>
                        <button>SNAP CHORD</button>
                        <button>CLEAR</button>
                      </div>
                    )}
                    {activePlugin === "QAMUZ Amp" && (
                      <div className="processor-options amp-options">
                        <button className="active">AMP</button>
                        <button>PEDALS</button>
                        <button>CAB / IR</button>
                        <label>
                          MODEL
                          <select>
                            <option>A97 High Gain</option>
                            <option>QVT Bass Head</option>
                          </select>
                        </label>
                        <button>GREEN</button>
                        <button>BLUE</button>
                        <button>15 W</button>
                        <button>3.5 W</button>
                        <button>PAD</button>
                      </div>
                    )}
                    {activePlugin === "QAMUZ EQ Pro" && (
                      <div className="processor-options eqpro-options">
                        <button className="active">32 BANDS</button>
                        <button>DYNAMIC</button>
                        <button>ANALYZER</button>
                        <label>
                          MODE
                          <select>
                            <option>Stereo</option>
                            <option>Mid</option>
                            <option>Side</option>
                          </select>
                        </label>
                        <label>
                          SIDECHAIN
                          <select>
                            <option>Internal</option>
                            <option>External 1</option>
                            <option>External 2</option>
                          </select>
                        </label>
                      </div>
                    )}
                    <div className="rack-controls">
                      {(
                        currentEffectProfile?.controls ||
                        Object.entries(pluginParams).map(([key, value]) => ({
                          key,
                          label: key.toUpperCase(),
                          unit: "%",
                          value,
                        }))
                      ).map(({ key, label, unit, value: defaultValue }) => {
                        const value =
                          pluginParams[`${activePlugin}:${key}`] ??
                          defaultValue;
                        return (
                          <label className="eqp-control" key={key}>
                            <span>{label}</span>
                            <div
                              className="eqp-knob"
                              style={
                                {
                                  "--angle": `${value * 2.7 - 135}deg`,
                                } as React.CSSProperties
                              }
                            >
                              <i />
                            </div>
                            <b>
                              {value}
                              <small> {unit}</small>
                            </b>
                            <input
                              aria-label={key}
                              type="range"
                              min="0"
                              max="100"
                              value={value}
                              onChange={(e) =>
                                setPluginParams((p) => ({
                                  ...p,
                                  [`${activePlugin}:${key}`]: +e.target.value,
                                }))
                              }
                            />
                          </label>
                        );
                      })}
                    </div>
                    <div className="eqp-footer rack-footer">
                      <button
                        className={pluginOn ? "eqp-power active" : "eqp-power"}
                        onClick={() => setPluginOn(!pluginOn)}
                      >
                        <i />
                        <span>POWER</span>
                      </button>
                      <div className="eqp-active">
                        <i className={pluginOn ? "on" : ""} />
                        <span>{pluginOn ? "MAINS ACTIVE" : "BYPASS"}</span>
                      </div>
                      <strong>{preset}</strong>
                    </div>
                  </div>
                )}
              </div>
              <footer>
                <span>{pluginOn ? "PROCESSING ACTIVE" : "BYPASSED"}</span>
                <b>QAMUZ AUDIO TECHNOLOGY</b>
              </footer>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
