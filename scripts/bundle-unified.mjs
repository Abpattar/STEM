import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'voice_agent', 'public');

function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach((element) => {
    const stat = fs.lstatSync(path.join(from, element));
    if (stat.isFile()) {
      fs.copyFileSync(path.join(from, element), path.join(to, element));
    } else if (stat.isDirectory()) {
      copyFolderSync(path.join(from, element), path.join(to, element));
    }
  });
}

console.log('Bundling static apps into voice_agent/public for single-domain deployment...');

// 1. Copy main_explaino/dist -> voice_agent/public/main
const mainDist = path.join(rootDir, 'main_explaino', 'dist');
const targetMain = path.join(publicDir, 'main');
if (fs.existsSync(mainDist)) {
  copyFolderSync(mainDist, targetMain);
  console.log('✓ Bundled main_explaino into voice_agent/public/main');
}

// 2. Copy scratchpad_notebook/frontend/dist -> voice_agent/public/scratchpad
const scratchDist = path.join(rootDir, 'scratchpad_notebook', 'frontend', 'dist');
const targetScratch = path.join(publicDir, 'scratchpad');
if (fs.existsSync(scratchDist)) {
  copyFolderSync(scratchDist, targetScratch);
  console.log('✓ Bundled scratchpad into voice_agent/public/scratchpad');
}

// 3. Copy digital_lab/dist -> voice_agent/public/digitallab
const labDist = path.join(rootDir, 'digital_lab', 'dist');
const targetLab = path.join(publicDir, 'digitallab');
if (fs.existsSync(labDist)) {
  copyFolderSync(labDist, targetLab);
  console.log('✓ Bundled digital_lab into voice_agent/public/digitallab');
}

console.log('Unified bundle complete!');
