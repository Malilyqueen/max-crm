// utils/say.js
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const LOG = path.join(process.cwd(), 'ia_admin_api', 'agent.log');

export function say(text) {
  try {
    fs.appendFileSync(LOG, `[${new Date().toISOString()}] ${text}\n`);
  } catch (e) {}
  const cmd = `powershell -Command "Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Speak(\\"${text.replace(/"/g,'\\"')}\\" )"`;
  exec(cmd, (err) => {
    if (err) {
      // pas bloquant
      console.error('say exec error (ignored):', err.message);
    }
  });
}
