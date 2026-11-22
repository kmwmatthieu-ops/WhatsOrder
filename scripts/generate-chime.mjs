import fs from "fs";

const sampleRate = 22050;
const duration = 0.8;
const numSamples = Math.floor(sampleRate * duration);
const buffer = Buffer.alloc(44 + numSamples * 2);

buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + numSamples * 2, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(1, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(numSamples * 2, 40);

for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  const env1 = Math.max(0, Math.exp(-t * 8));
  const s1 = Math.sin(2 * Math.PI * 1318.51 * t) * env1 * 0.35;

  const t2 = t - 0.12;
  const env2 = t2 > 0 ? Math.max(0, Math.exp(-t2 * 6)) : 0;
  const s2 = Math.sin(2 * Math.PI * 1661.22 * Math.max(0, t2)) * env2 * 0.4;

  const t3 = t - 0.25;
  const env3 = t3 > 0 ? Math.max(0, Math.exp(-t3 * 4.5)) : 0;
  const s3 = Math.sin(2 * Math.PI * 2093.0 * Math.max(0, t3)) * env3 * 0.3;

  const sample = Math.max(-1, Math.min(1, s1 + s2 + s3));
  buffer.writeInt16LE(Math.floor(sample * 32767), 44 + i * 2);
}

const base64Wav = buffer.toString("base64");
const fileContent = `export const CHIME_BASE64_WAV = "data:audio/wav;base64,${base64Wav}";\n`;
fs.writeFileSync("src/lib/chime-sound.ts", fileContent);
console.log("Generated src/lib/chime-sound.ts successfully! Size: " + base64Wav.length + " bytes");
