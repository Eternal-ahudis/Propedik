const fs = require('fs');
const path = require('path');

const targetDir = path.resolve(__dirname, 'www');

// Clean and recreate www/
if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true, force: true });
}
fs.mkdirSync(targetDir, { recursive: true });

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else if (exists) {
    fs.copyFileSync(src, dest);
  }
}

const itemsToCopy = [
  'index.html',
  'manifest.json',
  'css',
  'js',
  'data',
  'audio',
  'image',
  'icons'
];

itemsToCopy.forEach(item => {
  const srcPath = path.resolve(__dirname, item);
  const destPath = path.resolve(targetDir, item);
  if (fs.existsSync(srcPath)) {
    copyRecursiveSync(srcPath, destPath);
    console.log(`Copied ${item} to www/`);
  } else {
    console.warn(`Warning: ${item} not found!`);
  }
});

console.log('Mobile web assets successfully prepared in www/');
