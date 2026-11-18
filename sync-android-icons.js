const fs = require('fs');
const path = require('path');

const resDir = path.resolve(__dirname, 'android/app/src/main/res');

const iconMap = {
  'mipmap-mdpi': 'icons/icon-48.png',
  'mipmap-hdpi': 'icons/icon-72.png',
  'mipmap-xhdpi': 'icons/icon-96.png',
  'mipmap-xxhdpi': 'icons/icon-144.png',
  'mipmap-xxxhdpi': 'icons/icon-192.png'
};

Object.entries(iconMap).forEach(([folder, iconFile]) => {
  const targetFolder = path.join(resDir, folder);
  if (fs.existsSync(targetFolder) && fs.existsSync(iconFile)) {
    fs.copyFileSync(iconFile, path.join(targetFolder, 'ic_launcher.png'));
    fs.copyFileSync(iconFile, path.join(targetFolder, 'ic_launcher_round.png'));
    fs.copyFileSync(iconFile, path.join(targetFolder, 'ic_launcher_foreground.png'));
    console.log(`Synced icon to ${folder}`);
  }
});

console.log('Android app launcher icons synchronized!');
