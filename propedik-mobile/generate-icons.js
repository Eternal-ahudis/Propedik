const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 1. Full Composited Icon SVG (for PWA, Web, and Legacy/Standalone Launcher Icons)
const fullIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#14b8a6" stop-opacity="0.35"/>
      <stop offset="60%" stop-color="#0f172a" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#091b24"/>
      <stop offset="45%" stop-color="#0b2b33"/>
      <stop offset="100%" stop-color="#05332c"/>
    </linearGradient>
    <linearGradient id="chromeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="35%" stop-color="#e2e8f0"/>
      <stop offset="65%" stop-color="#94a3b8"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>
    <linearGradient id="darkMetal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#64748b"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
    <linearGradient id="tubeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2dd4bf"/>
      <stop offset="35%" stop-color="#0d9488"/>
      <stop offset="75%" stop-color="#0f766e"/>
      <stop offset="100%" stop-color="#115e59"/>
    </linearGradient>
    <radialGradient id="diaphragmGrad" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#5eead4"/>
      <stop offset="45%" stop-color="#0d9488"/>
      <stop offset="85%" stop-color="#042f2e"/>
      <stop offset="100%" stop-color="#021c1b"/>
    </radialGradient>
    <filter id="chestDrop" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000000" flood-opacity="0.6" />
    </filter>
    <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Base Circle Background -->
  <circle cx="256" cy="256" r="244" fill="url(#bgGrad)"/>
  <circle cx="256" cy="256" r="244" fill="url(#bgGlow)"/>

  <!-- Stylish Medical Tech Rings -->
  <circle cx="256" cy="256" r="238" fill="none" stroke="#14b8a6" stroke-width="3" stroke-opacity="0.5"/>
  <circle cx="256" cy="256" r="230" fill="none" stroke="#2dd4bf" stroke-width="1.2" stroke-opacity="0.25"/>

  <!-- Background Auscultation Sound / Heartbeat Wave -->
  <path d="M70 290 L150 290 L168 250 L188 335 L208 270 L220 290 L442 290" 
        fill="none" stroke="#14b8a6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.25"/>

  <!-- Main Phonendoscope Stethoscope Graphic -->
  <g filter="url(#chestDrop)">
    
    <!-- Acoustic wave rings radiating from diaphragm -->
    <circle cx="342" cy="328" r="68" fill="none" stroke="#2dd4bf" stroke-width="2" stroke-opacity="0.35" stroke-dasharray="6 5"/>
    <circle cx="342" cy="328" r="86" fill="none" stroke="#14b8a6" stroke-width="1.5" stroke-opacity="0.2" stroke-dasharray="8 6"/>

    <!-- Ear Tips -->
    <ellipse cx="184" cy="114" rx="9" ry="7" fill="#1e293b" stroke="url(#chromeGrad)" stroke-width="1.5" transform="rotate(-22 184 114)"/>
    <ellipse cx="328" cy="114" rx="9" ry="7" fill="#1e293b" stroke="url(#chromeGrad)" stroke-width="1.5" transform="rotate(22 328 114)"/>

    <!-- Left Binaural Metallic Tube -->
    <path d="M184 118 C184 165 210 205 248 220" 
          fill="none" stroke="url(#chromeGrad)" stroke-width="12" stroke-linecap="round"/>
    
    <!-- Right Binaural Metallic Tube -->
    <path d="M328 118 C328 165 302 205 264 220" 
          fill="none" stroke="url(#chromeGrad)" stroke-width="12" stroke-linecap="round"/>

    <!-- Tension Spring Arch -->
    <path d="M200 160 Q256 174 312 160" 
          fill="none" stroke="url(#darkMetal)" stroke-width="5" stroke-linecap="round"/>
    <path d="M200 160 Q256 174 312 160" 
          fill="none" stroke="url(#chromeGrad)" stroke-width="2.5" stroke-linecap="round"/>

    <!-- Binaural Y-Junction piece -->
    <path d="M246 216 L266 216 L262 236 L250 236 Z" fill="url(#chromeGrad)"/>

    <!-- Flexible Tubing: dynamic 3D shaded loop -->
    <!-- Base dark shadow tube underlay -->
    <path d="M256 234 C256 280 185 305 160 355 C132 410 170 452 225 448 C280 444 290 385 334 344" 
          fill="none" stroke="#042022" stroke-width="22" stroke-linecap="round"/>
    <!-- Outer teal vinyl tube -->
    <path d="M256 234 C256 280 185 305 160 355 C132 410 170 452 225 448 C280 444 290 385 334 344" 
          fill="none" stroke="url(#tubeGrad)" stroke-width="15" stroke-linecap="round"/>
    <!-- Inner glossy sheen reflection highlight on tube -->
    <path d="M256 234 C256 280 185 305 160 355 C132 410 170 452 225 448 C280 444 290 385 334 344" 
          fill="none" stroke="#5eead4" stroke-width="2.5" stroke-linecap="round" stroke-opacity="0.45"/>

    <!-- Chestpiece Stem (Connector between tube and bell) -->
    <path d="M326 352 L338 338" stroke="url(#chromeGrad)" stroke-width="14" stroke-linecap="round"/>

    <!-- Acoustic Chestpiece (Головка фонендоскопа) -->
    <!-- Outer Chrome Metallic Rim -->
    <circle cx="342" cy="328" r="48" fill="url(#chromeGrad)"/>
    <circle cx="342" cy="328" r="42" fill="#0f172a"/>

    <!-- Inner Metallic Ring -->
    <circle cx="342" cy="328" r="40" fill="url(#chromeGrad)"/>
    <circle cx="342" cy="328" r="36" fill="#0f172a"/>

    <!-- Diaphragm Membrane with luminous medical gradient -->
    <circle cx="342" cy="328" r="34" fill="url(#diaphragmGrad)" filter="url(#subtleGlow)"/>

    <!-- Inner Retaining Diaphragm Ridge -->
    <circle cx="342" cy="328" r="22" fill="none" stroke="#5eead4" stroke-width="1.5" stroke-opacity="0.6"/>

    <!-- Center Acoustic Core point -->
    <circle cx="342" cy="328" r="9" fill="url(#chromeGrad)"/>
    <circle cx="342" cy="328" r="4" fill="#0d9488"/>

    <!-- Specular Reflection Glare on Diaphragm and Rim -->
    <path d="M318 308 A 30 30 0 0 1 358 302" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.75"/>
    <path d="M326 348 A 30 30 0 0 1 314 326" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
  </g>
</svg>
`;

// 2. Android Adaptive Icon Foreground Layer (Centered within 72x72 safe zone of 108x108 viewport)
// Scaled & centered specifically for Android adaptive launcher masks
const androidForegroundSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="512" height="512">
  <defs>
    <linearGradient id="afChrome" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="40%" stop-color="#e2e8f0"/>
      <stop offset="75%" stop-color="#94a3b8"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>
    <linearGradient id="afTube" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2dd4bf"/>
      <stop offset="35%" stop-color="#0d9488"/>
      <stop offset="75%" stop-color="#0f766e"/>
      <stop offset="100%" stop-color="#115e59"/>
    </linearGradient>
    <radialGradient id="afDiaphragm" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#5eead4"/>
      <stop offset="45%" stop-color="#0d9488"/>
      <stop offset="85%" stop-color="#042f2e"/>
      <stop offset="100%" stop-color="#021c1b"/>
    </radialGradient>
    <filter id="afDrop" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.5" />
    </filter>
  </defs>

  <g filter="url(#afDrop)" transform="translate(54, 54) scale(0.185) translate(-256, -256)">
    <!-- Acoustic wave rings radiating from diaphragm -->
    <circle cx="342" cy="328" r="68" fill="none" stroke="#2dd4bf" stroke-width="2.5" stroke-opacity="0.45" stroke-dasharray="6 5"/>
    <circle cx="342" cy="328" r="86" fill="none" stroke="#14b8a6" stroke-width="2" stroke-opacity="0.3" stroke-dasharray="8 6"/>

    <!-- Ear Tips -->
    <ellipse cx="184" cy="114" rx="10" ry="8" fill="#1e293b" stroke="url(#afChrome)" stroke-width="2" transform="rotate(-22 184 114)"/>
    <ellipse cx="328" cy="114" rx="10" ry="8" fill="#1e293b" stroke="url(#afChrome)" stroke-width="2" transform="rotate(22 328 114)"/>

    <!-- Left Binaural Metallic Tube -->
    <path d="M184 118 C184 165 210 205 248 220" 
          fill="none" stroke="url(#afChrome)" stroke-width="14" stroke-linecap="round"/>
    
    <!-- Right Binaural Metallic Tube -->
    <path d="M328 118 C328 165 302 205 264 220" 
          fill="none" stroke="url(#afChrome)" stroke-width="14" stroke-linecap="round"/>

    <!-- Tension Spring Arch -->
    <path d="M200 160 Q256 174 312 160" 
          fill="none" stroke="#334155" stroke-width="6" stroke-linecap="round"/>
    <path d="M200 160 Q256 174 312 160" 
          fill="none" stroke="url(#afChrome)" stroke-width="3" stroke-linecap="round"/>

    <!-- Binaural Y-Junction piece -->
    <path d="M246 216 L266 216 L262 236 L250 236 Z" fill="url(#afChrome)"/>

    <!-- Flexible Tubing -->
    <path d="M256 234 C256 280 185 305 160 355 C132 410 170 452 225 448 C280 444 290 385 334 344" 
          fill="none" stroke="#042022" stroke-width="24" stroke-linecap="round"/>
    <path d="M256 234 C256 280 185 305 160 355 C132 410 170 452 225 448 C280 444 290 385 334 344" 
          fill="none" stroke="url(#afTube)" stroke-width="17" stroke-linecap="round"/>
    <path d="M256 234 C256 280 185 305 160 355 C132 410 170 452 225 448 C280 444 290 385 334 344" 
          fill="none" stroke="#5eead4" stroke-width="3.5" stroke-linecap="round" stroke-opacity="0.5"/>

    <!-- Chestpiece Stem -->
    <path d="M326 352 L338 338" stroke="url(#afChrome)" stroke-width="16" stroke-linecap="round"/>

    <!-- Acoustic Chestpiece -->
    <circle cx="342" cy="328" r="50" fill="url(#afChrome)"/>
    <circle cx="342" cy="328" r="43" fill="#0f172a"/>
    <circle cx="342" cy="328" r="41" fill="url(#afChrome)"/>
    <circle cx="342" cy="328" r="37" fill="#0f172a"/>
    <circle cx="342" cy="328" r="35" fill="url(#afDiaphragm)"/>
    <circle cx="342" cy="328" r="23" fill="none" stroke="#5eead4" stroke-width="2" stroke-opacity="0.7"/>
    <circle cx="342" cy="328" r="9" fill="url(#afChrome)"/>
    <circle cx="342" cy="328" r="4" fill="#0d9488"/>

    <!-- Highlight Reflection -->
    <path d="M318 308 A 30 30 0 0 1 358 302" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" opacity="0.8"/>
  </g>
</svg>
`;

async function main() {
  console.log('Generating medical phonendoscope icon set...');

  // Save SVGs
  fs.writeFileSync(path.join(__dirname, 'icons', 'stethoscope.svg'), fullIconSvg);
  fs.writeFileSync(path.join(__dirname, 'icons', 'stethoscope_adaptive_foreground.svg'), androidForegroundSvg);

  const fullSvgBuf = Buffer.from(fullIconSvg);
  const fgSvgBuf = Buffer.from(androidForegroundSvg);

  // 1. Web / PWA sizes in icons/
  const pwaSizes = [
    { name: 'icon-48.png', size: 48 },
    { name: 'icon-72.png', size: 72 },
    { name: 'icon-96.png', size: 96 },
    { name: 'icon-144.png', size: 144 },
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 }
  ];

  for (const s of pwaSizes) {
    const outPath = path.join(__dirname, 'icons', s.name);
    await sharp(fullSvgBuf).resize(s.size, s.size).png().toFile(outPath);
    console.log(`Generated ${outPath}`);
  }

  // Also save a master 512x512 favicon / app icon
  await sharp(fullSvgBuf).resize(256, 256).png().toFile(path.join(__dirname, 'icons', 'favicon.png'));

  // 2. Android mipmap density folders
  const androidDensities = [
    { folder: 'mipmap-mdpi', size: 48, fgSize: 108 },
    { folder: 'mipmap-hdpi', size: 72, fgSize: 162 },
    { folder: 'mipmap-xhdpi', size: 96, fgSize: 216 },
    { folder: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
    { folder: 'mipmap-xxxhdpi', size: 192, fgSize: 432 }
  ];

  for (const d of androidDensities) {
    const dir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res', d.folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // ic_launcher.png (square / standard)
    await sharp(fullSvgBuf)
      .resize(d.size, d.size)
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));

    // ic_launcher_round.png (round icon)
    await sharp(fullSvgBuf)
      .resize(d.size, d.size)
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    // ic_launcher_foreground.png (adaptive foreground)
    await sharp(fgSvgBuf)
      .resize(d.fgSize, d.fgSize)
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));

    console.log(`Updated Android ${d.folder}`);
  }

  console.log('All icons generated successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
