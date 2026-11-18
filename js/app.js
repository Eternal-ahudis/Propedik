// ==========================================================================
// PROPEDIK — Clinical Propedeutics Interactive Medical Simulator
// Engine: MVC Navigation, Web Audio Synth, Adaptive SVG Hotspots,
// Leitner Spaced Repetition System & Mobile First Ergonomics.
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Проверка готовности базы клинических данных
  if (!window.PROPEDIK_DATA) {
    console.error('[PROPEDIK] Критическая ошибка: База данных window.PROPEDIK_DATA не загружена!');
    return;
  }

  const {
    breathingDatabase,
    projectionDatabase,
    syndromesDatabase: syndromesData,
    blindAudioPool,
    theoryQuestionsBank
  } = window.PROPEDIK_DATA;

  // ================= 1. НАВИГАЦИЯ И ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК =================
  const tabButtons = document.querySelectorAll('.nav-tab-btn');
  const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
  const tabPanels = document.querySelectorAll('.tab-panel');

  const tabMap = {
    '#auscultation': 'panel-auscultation',
    '#pathologies': 'panel-pathologies',
    '#test': 'panel-test',
    '#about': 'panel-about'
  };

  const reverseMap = {
    'panel-auscultation': '#auscultation',
    'panel-pathologies': '#pathologies',
    'panel-test': '#test',
    'panel-about': '#about'
  };

  let isAppInitialized = false;

  function triggerHaptic(duration) {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(duration || 12);
      } catch (e) {}
    }
  }

  function switchTab(targetPanelId, updateHash) {
    if (updateHash === undefined) updateHash = true;

    tabButtons.forEach(btn => {
      const isActive = btn.getAttribute('data-target') === targetPanelId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    mobileNavItems.forEach(item => {
      const isActive = item.getAttribute('data-target') === targetPanelId;
      item.classList.toggle('active', isActive);
      item.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    tabPanels.forEach(panel => {
      const isActive = panel.id === targetPanelId;
      panel.classList.toggle('active', isActive);
    });

    if (updateHash && reverseMap[targetPanelId]) {
      history.replaceState(null, '', reverseMap[targetPanelId]);
    }

    if (isAppInitialized) {
      if (targetPanelId !== 'panel-test' && typeof stopBlindAudio === 'function') {
        stopBlindAudio();
      }
      if (targetPanelId === 'panel-test' && typeof drawBlindCanvasIdle === 'function') {
        setTimeout(() => {
          if (!blindIsPlaying) drawBlindCanvasIdle();
        }, 50);
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      triggerHaptic(10);
      const target = btn.getAttribute('data-target');
      switchTab(target);
    });
  });

  mobileNavItems.forEach(item => {
    item.addEventListener('click', () => {
      triggerHaptic(10);
      const target = item.getAttribute('data-target');
      switchTab(target);
    });
  });

  // ================= 2. УВЕДОМЛЕНИЯ И КОПИРОВАНИЕ =================
  const toast = document.getElementById('toast');
  let toastTimeout = null;

  function showToast(message, duration) {
    if (!toast) return;
    if (duration === undefined) duration = 2800;
    toast.textContent = message;
    toast.classList.add('visible');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('visible');
    }, duration);
  }

  const shareBtn = document.getElementById('shareAppBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      triggerHaptic(15);
      const url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
          showToast('Ссылка на тренажер скопирована в буфер обмена');
        }).catch(() => {
          copyFallback(url);
        });
      } else {
        copyFallback(url);
      }
    });
  }

  function copyFallback(text) {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    try {
      document.execCommand('copy');
      showToast('Ссылка скопирована в буфер');
    } catch (e) {
      showToast('Не удалось скопировать ссылку');
    }
    document.body.removeChild(input);
  }


  // ================= 3. ИНТЕРАКТИВНАЯ АУСКУЛЬТАЦИЯ ЛЕГКИХ =================
  let currentProjection = 'anterior';
  let currentGroup = 'vesicular';
  let currentPointId = null;

  const xrayImage = document.getElementById('xrayImage');
  const hotspotsGroup = document.getElementById('hotspotsGroup');
  const projectionButtons = document.querySelectorAll('.proj-btn');
  const breathingTypeButtons = document.querySelectorAll('.breath-btn');
  const toggleLabelsBtn = document.getElementById('toggleLabelsBtn');
  const toggleInvertBtn = document.getElementById('toggleInvertBtn');

  const infoParamPoints = document.getElementById('infoParamPoints');
  const infoParamAuscultation = document.getElementById('infoParamAuscultation');
  const infoParamFormula = document.getElementById('infoParamFormula');
  const infoParamMechanism = document.getElementById('infoParamMechanism');
  const infoParamConditions = document.getElementById('infoParamConditions');
  const infoParamSoundProfile = document.getElementById('infoParamSoundProfile');

  function renderSvgHotspots() {
    if (!hotspotsGroup) return;
    const proj = projectionDatabase[currentProjection];
    if (!proj) return;

    hotspotsGroup.innerHTML = '';
    const points = proj.hotspots || proj.points || [];

    points.forEach(pt => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const isGrpActive = pt.group === currentGroup;
      g.setAttribute('class', 'svg-hotspot group-' + pt.group + (isGrpActive ? ' active' : ''));
      g.setAttribute('data-point-id', pt.id);
      g.setAttribute('data-group', pt.group);
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      const lbl = pt.label || pt.num || '';
      const tip = pt.tooltip || pt.name || '';
      g.setAttribute('aria-label', lbl + '. ' + tip);

      // Coordinates in projectionDatabase are already in 0..1000 viewBox scale
      const cx = (pt.x <= 100) ? pt.x * 10 : pt.x;
      const cy = (pt.y <= 100) ? pt.y * 10 : pt.y;

      const pulse = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pulse.setAttribute('class', 'hotspot-pulse');
      pulse.setAttribute('cx', cx);
      pulse.setAttribute('cy', cy);
      pulse.setAttribute('r', '22');

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('class', 'hotspot-circle');
      circle.setAttribute('cx', cx);
      circle.setAttribute('cy', cy);
      circle.setAttribute('r', '15');

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('class', 'hotspot-label');
      text.setAttribute('x', cx);
      text.setAttribute('y', cy + 4);
      text.textContent = lbl;

      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      const groupName = pt.group === 'vesicular' ? 'Везикулярное' : 'Бронхиальное';
      title.textContent = lbl + '. ' + tip + ' (' + groupName + ')';

      g.appendChild(pulse);
      g.appendChild(circle);
      g.appendChild(text);
      g.appendChild(title);

      g.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerHaptic(12);
        selectHotspot(pt);
      });

      hotspotsGroup.appendChild(g);
    });
  }

  function selectHotspot(pt) {
    currentPointId = pt.id;
    const lbl = pt.label || pt.num || '';
    const tip = pt.tooltip || pt.name || '';
    const groupName = pt.group === 'vesicular' ? 'Везикулярное' : 'Бронхиальное';
    showToast(lbl + '. ' + tip + ' (' + groupName + ')');

    if (hotspotsGroup) {
      const allG = hotspotsGroup.querySelectorAll('.svg-hotspot');
      allG.forEach(g => {
        const isMatch = g.getAttribute('data-point-id') === pt.id;
        g.classList.toggle('selected', isMatch);
      });
    }

    if (pt.group && pt.group !== currentGroup) {
      selectBreathingType(pt.group === 'vesicular' ? 'vesicular-normal' : 'bronchial-physio');
    } else {
      updateInfoCards();
    }
  }

  function updateInfoCards() {
    const curTypeObj = breathingDatabase[currentBreathingType];
    if (!curTypeObj) return;

    if (infoParamPoints) {
      infoParamPoints.textContent = currentGroup === 'vesicular'
        ? 'Все точки аускультации легких (передняя, задняя, боковые поверхности), кроме проекции крупных дыхательных путей.'
        : 'Точки проекции гортани, трахеи, бифуркации трахеи (спереди рукоятка грудины, сзади C7–Th4 межлопаточная зона).';
    }
    if (infoParamAuscultation) infoParamAuscultation.textContent = curTypeObj.title;
    if (infoParamFormula) infoParamFormula.textContent = curTypeObj.formula;
    if (infoParamMechanism) infoParamMechanism.textContent = curTypeObj.mechanism;
    if (infoParamConditions) infoParamConditions.textContent = curTypeObj.conditions;
    if (infoParamSoundProfile) {
      const aud = curTypeObj.audio;
      infoParamSoundProfile.textContent = 'Длительность цикла: ' + aud.cycleDuration + 'с (вдох ' + Math.round(aud.inhaleRatio * 100) + '%, выдох ' + Math.round(aud.exhaleRatio * 100) + '%), фильтр: ' + (aud.type === 'bronchial' ? 'Bandpass ' : 'Lowpass ') + aud.cutoffInhale + 'Гц';
    }
  }

  let currentBreathingType = 'vesicular-normal';

  function selectBreathingType(typeKey) {
    if (!breathingDatabase[typeKey]) return;
    currentBreathingType = typeKey;
    const typeObj = breathingDatabase[typeKey];
    currentGroup = typeObj.group;

    breathingTypeButtons.forEach(btn => {
      const isSelected = btn.getAttribute('data-type') === typeKey;
      btn.classList.toggle('active', isSelected);
      btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    });

    if (hotspotsGroup) {
      const allG = hotspotsGroup.querySelectorAll('.svg-hotspot');
      allG.forEach(g => {
        const grp = g.getAttribute('data-group');
        g.classList.toggle('active', grp === currentGroup);
      });
    }

    updateInfoCards();
    if (isPlaying) {
      updateAudioProfile(typeObj.audio);
    }
  }

  function setProjection(projKey) {
    if (!projectionDatabase[projKey]) return;
    currentProjection = projKey;
    const proj = projectionDatabase[projKey];

    projectionButtons.forEach(btn => {
      const isAct = btn.getAttribute('data-projection') === projKey;
      btn.classList.toggle('active', isAct);
      btn.setAttribute('aria-selected', isAct ? 'true' : 'false');
    });

    const xrayHeaderTitle = document.getElementById('xrayHeaderTitle');
    if (xrayHeaderTitle && (proj.xrayTitle || proj.name)) {
      xrayHeaderTitle.textContent = proj.xrayTitle || proj.name;
    }

    if (xrayImage) {
      xrayImage.src = proj.imageSrc || proj.image || 'image/normal_chest_xray.png';
      xrayImage.alt = proj.name || proj.xrayTitle || 'Рентгенограмма легких';
    }

    renderSvgHotspots();
  }

  projectionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      triggerHaptic(10);
      const projKey = btn.getAttribute('data-projection');
      setProjection(projKey);
    });
  });

  breathingTypeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      triggerHaptic(10);
      const typeKey = btn.getAttribute('data-type');
      selectBreathingType(typeKey);
    });
  });

  if (toggleInvertBtn && xrayImage) {
    toggleInvertBtn.addEventListener('click', () => {
      triggerHaptic(8);
      const isInverted = xrayImage.classList.toggle('inverted');
      toggleInvertBtn.classList.toggle('active', isInverted);
    });
  }

  let labelsVisible = true;
  if (toggleLabelsBtn && hotspotsGroup) {
    toggleLabelsBtn.addEventListener('click', () => {
      triggerHaptic(8);
      labelsVisible = !labelsVisible;
      toggleLabelsBtn.classList.toggle('active', !labelsVisible);
      hotspotsGroup.style.display = labelsVisible ? 'block' : 'none';
    });
  }

  // Аудиосинтезатор для вкладки 1
  let audioCtx = null;
  let noiseNode = null;
  let filterNode = null;
  let gainNode = null;
  let masterGain = null;
  let isPlaying = false;
  let animFrameId = null;
  let cycleStartTime = 0;
  let elapsedSeconds = 0;
  let timerInterval = null;

  const playBreathBtn = document.getElementById('playBreathBtn');
  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  const playerPhaseBadge = document.getElementById('playerPhaseBadge');
  const playerTimer = document.getElementById('playerTimer');
  const volumeSlider = document.getElementById('volumeSlider');
  const breathCanvas = document.getElementById('breathCanvas');
  const canvasCtx = breathCanvas ? breathCanvas.getContext('2d') : null;

  function initAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();

      const bufferSize = audioCtx.sampleRate * 2;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }

      noiseNode = audioCtx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      noiseNode.loop = true;

      filterNode = audioCtx.createBiquadFilter();
      filterNode.type = 'lowpass';
      filterNode.frequency.value = 400;
      filterNode.Q.value = 1.2;

      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0;

      masterGain = audioCtx.createGain();
      const currentVol = volumeSlider ? volumeSlider.value / 100 : 0.8;
      masterGain.gain.value = currentVol;

      noiseNode.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(masterGain);
      masterGain.connect(audioCtx.destination);

      noiseNode.start(0);
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function updateAudioProfile(profile) {
    if (!profile) return;
    if (filterNode && audioCtx) {
      filterNode.type = profile.type === 'bronchial' ? 'bandpass' : 'lowpass';
      filterNode.Q.value = profile.type === 'bronchial' ? 2.5 : 1.2;
    }
  }

  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) / 100;
      if (masterGain && audioCtx) {
        masterGain.gain.setTargetAtTime(val, audioCtx.currentTime, 0.05);
      }
    });
  }

  function runBreathingLoop() {
    if (!isPlaying) return;

    const data = breathingDatabase[currentBreathingKey];
    const profile = data.audio;
    const cycleDuration = profile.cycleDuration;
    const inhaleDuration = cycleDuration * profile.inhaleRatio;
    const exhaleDuration = cycleDuration * profile.exhaleRatio;

    const now = performance.now();
    const cycleElapsed = ((now - cycleStartTime) / 1000) % cycleDuration;

    let isInhale = cycleElapsed < inhaleDuration;
    let phaseProgress = 0;
    let breathIntensity = 0;

    if (isInhale) {
      phaseProgress = cycleElapsed / inhaleDuration;
      breathIntensity = Math.sin(phaseProgress * Math.PI);
      if (playerPhaseBadge) {
        playerPhaseBadge.textContent = 'Вдох (Inspirium)';
        playerPhaseBadge.className = 'player-phase-badge phase-inhale';
      }
      if (filterNode && audioCtx) {
        filterNode.frequency.setTargetAtTime(profile.cutoffInhale, audioCtx.currentTime, 0.05);
      }
    } else {
      phaseProgress = (cycleElapsed - inhaleDuration) / exhaleDuration;
      if (profile.type === 'vesicular') {
        const audiblePart = Math.max(0, 1 - phaseProgress * 2.8);
        breathIntensity = Math.sin(phaseProgress * Math.PI) * audiblePart * 0.4;
      } else if (profile.type === 'puerile') {
        const audiblePart = Math.max(0, 1 - phaseProgress * 1.5);
        breathIntensity = Math.sin(phaseProgress * Math.PI) * audiblePart * 0.75;
      } else {
        breathIntensity = Math.sin(phaseProgress * Math.PI) * 1.15;
      }

      if (playerPhaseBadge) {
        playerPhaseBadge.textContent = 'Выдох (Exspirium)';
        playerPhaseBadge.className = 'player-phase-badge phase-exhale';
      }
      if (filterNode && audioCtx) {
        filterNode.frequency.setTargetAtTime(profile.cutoffExhale, audioCtx.currentTime, 0.05);
      }
    }

    if (gainNode && audioCtx) {
      const targetGain = Math.max(0, breathIntensity * profile.volume);
      gainNode.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.03);
    }

    drawBreathWave(cycleElapsed, cycleDuration, isInhale, breathIntensity, profile.type);
    animFrameId = requestAnimationFrame(runBreathingLoop);
  }

  function drawBreathWave(cycleElapsed, cycleDuration, isInhale, intensity, soundType) {
    if (!canvasCtx || !breathCanvas) return;

    const w = breathCanvas.width = breathCanvas.offsetWidth;
    const h = breathCanvas.height = breathCanvas.offsetHeight;

    canvasCtx.clearRect(0, 0, w, h);

    canvasCtx.strokeStyle = '#e2e8f0';
    canvasCtx.lineWidth = 1;
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, h / 2);
    canvasCtx.lineTo(w, h / 2);
    canvasCtx.stroke();

    canvasCtx.lineWidth = 2.5;
    canvasCtx.strokeStyle = soundType === 'bronchial' ? '#0284c7' : '#0d9488';
    canvasCtx.beginPath();

    const points = 80;
    const step = w / points;

    for (let i = 0; i <= points; i++) {
      const x = i * step;
      const progress = i / points;
      const wave = Math.sin(progress * Math.PI * 4 + cycleElapsed * 1.8) * Math.sin(progress * Math.PI);
      const noise = (Math.random() - 0.5) * 4 * intensity;
      const y = (h / 2) - (wave * (h * 0.38) * intensity) + noise;

      if (i === 0) canvasCtx.moveTo(x, y);
      else canvasCtx.lineTo(x, y);
    }
    canvasCtx.stroke();
  }

  function togglePlayback() {
    initAudioContext();
    isPlaying = !isPlaying;

    if (isPlaying) {
      cycleStartTime = performance.now();
      elapsedSeconds = 0;
      if (playIcon) playIcon.style.display = 'none';
      if (pauseIcon) pauseIcon.style.display = 'block';
      if (playBreathBtn) playBreathBtn.classList.add('playing');

      timerInterval = setInterval(() => {
        elapsedSeconds++;
        const mins = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
        const secs = String(elapsedSeconds % 60).padStart(2, '0');
        if (playerTimer) playerTimer.textContent = `${mins}:${secs}`;
      }, 1000);

      runBreathingLoop();
      showToast('Воспроизведение дыхания начато');
    } else {
      if (playIcon) playIcon.style.display = 'block';
      if (pauseIcon) pauseIcon.style.display = 'none';
      if (playBreathBtn) playBreathBtn.classList.remove('playing');

      if (gainNode && audioCtx) {
        gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
      }

      cancelAnimationFrame(animFrameId);
      clearInterval(timerInterval);

      if (canvasCtx && breathCanvas) {
        canvasCtx.clearRect(0, 0, breathCanvas.width, breathCanvas.height);
      }
      if (playerPhaseBadge) {
        playerPhaseBadge.textContent = 'Остановлено';
        playerPhaseBadge.className = 'player-phase-badge';
      }
      showToast('Воспроизведение остановлено');
    }
  }

  if (playBreathBtn) {
    playBreathBtn.addEventListener('click', togglePlayback);
  }

  const syndromeKeys = [
    'bronchitic',
    'obstruction',
    'consolidation_inflam',
    'atelectasis',
    'emphysema',
    'alveolitis',
    'cavity',
    'lv_failure',
    'hydrothorax',
    'dry_pleurisy',
    'pneumothorax'
  ];

  let currentSyndromeKey = 'bronchitic';

  // DOM-элементы вкладки 2
  const syndromeCards = document.querySelectorAll('.syndrome-card-preview');
  const filterPillBtns = document.querySelectorAll('.filter-pill-btn');
  const syndromeCardSearch = document.getElementById('syndromeCardSearch');

  const syndromeModalOverlay = document.getElementById('syndromeModalOverlay');
  const syndromeModalClose = document.getElementById('syndromeModalClose');
  const modalSynCategory = document.getElementById('modalSynCategory');
  const modalSynTitle = document.getElementById('modalSynTitle');
  const modalSynDefinition = document.getElementById('modalSynDefinition');

  const modalTabBtns = document.querySelectorAll('.modal-tab-btn');
  const modalSubpanels = {
    criteria: document.getElementById('modalSubpanelCriteria'),
    xray: document.getElementById('modalSubpanelXray'),
    sound: document.getElementById('modalSubpanelSound')
  };

  const modalParamComplaints = document.getElementById('modalParamComplaints');
  const modalParamInspection = document.getElementById('modalParamInspection');
  const modalParamPalpation = document.getElementById('modalParamPalpation');
  const modalParamPercussion = document.getElementById('modalParamPercussion');
  const modalParamAuscultation = document.getElementById('modalParamAuscultation');
  const modalParamAdditional = document.getElementById('modalParamAdditional');

  const modalXrayImage = document.getElementById('modalXrayImage');
  const modalXrayDescription = document.getElementById('modalXrayDescription');
  const modalXrayInvertBtn = document.getElementById('modalXrayInvertBtn');
  const modalXrayZoomBtn = document.getElementById('modalXrayZoomBtn');
  const modalXrayImgWrap = document.getElementById('modalXrayImgWrap');

  const modalPlaySoundBtn = document.getElementById('modalPlaySoundBtn');
  const modalPlayIcon = document.getElementById('modalPlayIcon');
  const modalPauseIcon = document.getElementById('modalPauseIcon');
  const modalSoundTitle = document.getElementById('modalSoundTitle');
  const modalSoundFileStatus = document.getElementById('modalSoundFileStatus');
  const modalSoundStatusText = document.getElementById('modalSoundStatusText');
  const modalSoundPhaseBadge = document.getElementById('modalSoundPhaseBadge');
  const modalSoundCanvas = document.getElementById('modalSoundCanvas');
  const modalCanvasCtx = modalSoundCanvas ? modalSoundCanvas.getContext('2d') : null;
  const modalVolumeSlider = document.getElementById('modalVolumeSlider');
  const modalSoundDescription = document.getElementById('modalSoundDescription');

  const modalPrevSynBtn = document.getElementById('modalPrevSynBtn');
  const modalNextSynBtn = document.getElementById('modalNextSynBtn');

  // Переключение подвкладок статьи (Диагностические критерии / Рентгенограмма / Аускультативный звук)
  modalTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const subtab = btn.getAttribute('data-subtab');
      modalTabBtns.forEach(b => b.classList.toggle('active', b === btn));
      Object.keys(modalSubpanels).forEach(key => {
        if (modalSubpanels[key]) {
          modalSubpanels[key].classList.toggle('active', key === subtab);
        }
      });
    });
  });

  // Открытие модального окна статьи синдрома
  function openSyndromeModal(key) {
    const syn = syndromesData[key];
    if (!syn) return;

    currentSyndromeKey = key;

    // Шапка и Определение из методички (первым элементом статьи)
    if (modalSynCategory) modalSynCategory.textContent = syn.category;
    if (modalSynTitle) modalSynTitle.textContent = syn.name;
    if (modalSynDefinition) modalSynDefinition.textContent = syn.definition;

    // Диагностические критерии (без номеров)
    if (modalParamComplaints) modalParamComplaints.textContent = syn.complaints;
    if (modalParamInspection) modalParamInspection.textContent = syn.inspection;
    if (modalParamPalpation) modalParamPalpation.textContent = syn.palpation;
    if (modalParamPercussion) modalParamPercussion.textContent = syn.percussion;
    if (modalParamAuscultation) modalParamAuscultation.textContent = syn.auscultation;
    if (modalParamAdditional) modalParamAdditional.textContent = syn.additional;

    // Рентгенограмма (БЕЗ отображения технических названий файлов)
    if (modalXrayImage) {
      modalXrayImage.src = syn.xrayImg;
      modalXrayImage.alt = syn.name;
      modalXrayImage.classList.remove('invert');
      if (modalXrayInvertBtn) modalXrayInvertBtn.classList.remove('active');
    }
    if (modalXrayDescription) modalXrayDescription.textContent = syn.xrayDesc;

    // Аускультативный звук
    if (modalSoundTitle) modalSoundTitle.textContent = syn.soundTitle;
    if (modalSoundDescription) modalSoundDescription.textContent = syn.soundDesc;

    // Сброс звука и проверка источника
    stopSyndromeAudio();
    checkAudioFileAvailability(syn.soundAudioFile, syn.name);

    // Активация окна с анимацией и сбросом скролла
    if (syndromeModalOverlay) {
      syndromeModalOverlay.scrollTop = 0;
      const modalBody = syndromeModalOverlay.querySelector('.syndrome-modal-body');
      if (modalBody) modalBody.scrollTop = 0;
      syndromeModalOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeSyndromeModal() {
    if (syndromeModalOverlay) {
      syndromeModalOverlay.classList.remove('active');
    }
    document.body.style.overflow = '';
    stopSyndromeAudio();
  }

  // Закрытие модального окна по кнопке, клику на подложку и Escape
  if (syndromeModalClose) {
    syndromeModalClose.addEventListener('click', closeSyndromeModal);
  }

  if (syndromeModalOverlay) {
    syndromeModalOverlay.addEventListener('click', (e) => {
      if (e.target === syndromeModalOverlay) {
        closeSyndromeModal();
      }
    });
  }

  // Навигация «Предыдущий / Следующий синдром» внутри модального окна
  function navigateSyndrome(step) {
    const currentIndex = syndromeKeys.indexOf(currentSyndromeKey);
    if (currentIndex === -1) return;
    let newIndex = currentIndex + step;
    if (newIndex < 0) newIndex = syndromeKeys.length - 1;
    else if (newIndex >= syndromeKeys.length) newIndex = 0;
    openSyndromeModal(syndromeKeys[newIndex]);
  }

  if (modalPrevSynBtn) modalPrevSynBtn.addEventListener('click', () => navigateSyndrome(-1));
  if (modalNextSynBtn) modalNextSynBtn.addEventListener('click', () => navigateSyndrome(1));

  // Клик по превью-карточкам синдромов
  syndromeCards.forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      openSyndromeModal(id);
    });
  });

  // Фильтрация и поиск по карточкам синдромов
  let currentFilter = 'all';
  let currentSearchQuery = '';

  function applySyndromeFilter() {
    syndromeCards.forEach(card => {
      const category = card.getAttribute('data-category');
      const nameEl = card.querySelector('.syndrome-card-name');
      const name = nameEl ? nameEl.textContent.toLowerCase() : '';

      const matchesFilter = (currentFilter === 'all') || (category === currentFilter);
      const matchesSearch = !currentSearchQuery || name.includes(currentSearchQuery);

      if (matchesFilter && matchesSearch) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }

  filterPillBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterPillBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
      applySyndromeFilter();
    });
  });

  if (syndromeCardSearch) {
    syndromeCardSearch.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value.toLowerCase().trim();
      applySyndromeFilter();
    });
  }

  // Инверсия и увеличение рентгенограммы в модальном окне
  if (modalXrayInvertBtn && modalXrayImage) {
    modalXrayInvertBtn.addEventListener('click', () => {
      const inv = modalXrayImage.classList.toggle('invert');
      modalXrayInvertBtn.classList.toggle('active', inv);
    });
  }

  if (modalXrayZoomBtn && modalXrayImage) {
    modalXrayZoomBtn.addEventListener('click', () => {
      const syn = syndromesData[currentSyndromeKey];
      if (syn) openImageModal(syn.xrayImg, syn.name);
    });
  }

  if (modalXrayImgWrap && modalXrayImage) {
    modalXrayImgWrap.addEventListener('click', () => {
      const syn = syndromesData[currentSyndromeKey];
      if (syn) openImageModal(syn.xrayImg, syn.name);
    });
  }

  // Аудиоплеер для модального окна синдрома
  let currentSyndromeAudio = null;
  let isSyndromePlaying = false;
  let hasRealAudioFile = false;
  let synSynthAnimId = null;
  let synGainNode = null;
  let synMasterGain = null;
  let synFilterNode = null;
  let synNoiseNode = null;

  function checkAudioFileAvailability(filePath, syndromeName) {
    const testAudio = new Audio();
    hasRealAudioFile = false;

    testAudio.addEventListener('canplaythrough', () => {
      hasRealAudioFile = true;
      if (modalSoundFileStatus) {
        modalSoundFileStatus.className = 'sound-file-status found';
        if (modalSoundStatusText) modalSoundStatusText.textContent = 'Аудиозапись найдена и готова к воспроизведению';
      }
    });

    testAudio.addEventListener('error', () => {
      hasRealAudioFile = false;
      if (modalSoundFileStatus) {
        modalSoundFileStatus.className = 'sound-file-status simulated';
        if (modalSoundStatusText) modalSoundStatusText.textContent = 'Акустическая симуляция феномена';
      }
    });

    testAudio.src = filePath;
  }

  function toggleSyndromePlayback() {
    if (isSyndromePlaying) {
      stopSyndromeAudio();
      showToast('Воспроизведение звука остановлено');
    } else {
      startSyndromeAudio();
      showToast('Воспроизведение аускультативного звука');
    }
  }

  function startSyndromeAudio() {
    initAudioContext();
    const syn = syndromesData[currentSyndromeKey];
    if (!syn) return;

    isSyndromePlaying = true;
    if (modalPlayIcon) modalPlayIcon.style.display = 'none';
    if (modalPauseIcon) modalPauseIcon.style.display = 'block';
    if (modalPlaySoundBtn) modalPlaySoundBtn.classList.add('playing');

    if (hasRealAudioFile) {
      if (!currentSyndromeAudio) {
        currentSyndromeAudio = new Audio(syn.soundAudioFile);
        currentSyndromeAudio.loop = true;
      }
      const vol = modalVolumeSlider ? modalVolumeSlider.value / 100 : 0.85;
      currentSyndromeAudio.volume = vol;
      currentSyndromeAudio.play().catch(() => {
        startSyndromeSynthesis(syn);
      });
      runSyndromeVisualizerLoop(syn);
    } else {
      startSyndromeSynthesis(syn);
      runSyndromeVisualizerLoop(syn);
    }
  }

  function startSyndromeSynthesis(syn) {
    if (!audioCtx) return;

    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.4;
    }

    synNoiseNode = audioCtx.createBufferSource();
    synNoiseNode.buffer = noiseBuffer;
    synNoiseNode.loop = true;

    synFilterNode = audioCtx.createBiquadFilter();
    synGainNode = audioCtx.createGain();
    synMasterGain = audioCtx.createGain();

    const vol = modalVolumeSlider ? modalVolumeSlider.value / 100 : 0.85;
    synMasterGain.gain.value = vol;

    switch (syn.synthType) {
      case 'pleural_rub':
        synFilterNode.type = 'bandpass';
        synFilterNode.frequency.value = 520;
        synFilterNode.Q.value = 3.5;
        break;
      case 'consolidation':
        synFilterNode.type = 'bandpass';
        synFilterNode.frequency.value = 750;
        synFilterNode.Q.value = 2.8;
        break;
      case 'obstruction':
        synFilterNode.type = 'bandpass';
        synFilterNode.frequency.value = 850;
        synFilterNode.Q.value = 4.2;
        break;
      case 'crepitation':
      case 'velcro':
        synFilterNode.type = 'bandpass';
        synFilterNode.frequency.value = 650;
        synFilterNode.Q.value = 2.4;
        break;
      case 'amphoric':
        synFilterNode.type = 'bandpass';
        synFilterNode.frequency.value = 320;
        synFilterNode.Q.value = 5.0;
        break;
      case 'silent':
        synFilterNode.type = 'lowpass';
        synFilterNode.frequency.value = 150;
        synFilterNode.Q.value = 1.0;
        break;
      default:
        synFilterNode.type = 'lowpass';
        synFilterNode.frequency.value = 450;
        synFilterNode.Q.value = 1.5;
        break;
    }

    synNoiseNode.connect(synFilterNode);
    synFilterNode.connect(synGainNode);
    synGainNode.connect(synMasterGain);
    synMasterGain.connect(audioCtx.destination);

    synNoiseNode.start(0);
  }

  function stopSyndromeAudio() {
    isSyndromePlaying = false;
    if (modalPlayIcon) modalPlayIcon.style.display = 'block';
    if (modalPauseIcon) modalPauseIcon.style.display = 'none';
    if (modalPlaySoundBtn) modalPlaySoundBtn.classList.remove('playing');

    if (currentSyndromeAudio) {
      currentSyndromeAudio.pause();
      currentSyndromeAudio.currentTime = 0;
      currentSyndromeAudio = null;
    }

    if (synGainNode && audioCtx) {
      try {
        synGainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
      } catch (e) {}
    }

    if (synNoiseNode) {
      try { synNoiseNode.stop(); } catch (e) {}
      try { synNoiseNode.disconnect(); } catch (e) {}
      synNoiseNode = null;
    }

    cancelAnimationFrame(synSynthAnimId);

    if (modalCanvasCtx && modalSoundCanvas) {
      modalCanvasCtx.clearRect(0, 0, modalSoundCanvas.width, modalSoundCanvas.height);
    }

    if (modalSoundPhaseBadge) {
      modalSoundPhaseBadge.textContent = 'Дыхательный шум';
      modalSoundPhaseBadge.className = 'player-phase-badge';
    }
  }

  if (modalPlaySoundBtn) {
    modalPlaySoundBtn.addEventListener('click', toggleSyndromePlayback);
  }

  if (modalVolumeSlider) {
    modalVolumeSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) / 100;
      if (currentSyndromeAudio) currentSyndromeAudio.volume = val;
      if (synMasterGain && audioCtx) {
        synMasterGain.gain.setTargetAtTime(val, audioCtx.currentTime, 0.05);
      }
    });
  }

  function runSyndromeVisualizerLoop(syn) {
    if (!isSyndromePlaying) return;

    const now = performance.now();
    const cycle = (now / 1000) % 3.6;
    const progress = cycle / 3.6;
    const intensity = Math.sin(progress * Math.PI);

    if (synGainNode && audioCtx) {
      let g = intensity * 0.8;
      if (syn.synthType === 'silent') g *= 0.12;
      else if (syn.synthType === 'pleural_rub') {
        const friction = Math.sin(now * 0.03) > 0.2 ? 1.0 : 0.25;
        g *= friction;
      } else if (syn.synthType === 'velcro' || syn.synthType === 'crepitation') {
        // Мелкопузырчатая сухая крепитация строго на высоте вдоха
        if (progress >= 0.35 && progress <= 0.52) {
          const pop = Math.random() > 0.45 ? (0.6 + Math.random() * 0.4) : 0.15;
          g = intensity * pop;
        } else if (progress < 0.35) {
          g = intensity * 0.25;
        } else {
          g = intensity * 0.08;
        }
      }
      synGainNode.gain.setTargetAtTime(Math.max(0, g), audioCtx.currentTime, 0.03);
    }

    if (modalSoundPhaseBadge) {
      if (progress < 0.55) {
        modalSoundPhaseBadge.textContent = 'Фаза вдоха';
        modalSoundPhaseBadge.className = 'player-phase-badge phase-inhale';
      } else {
        modalSoundPhaseBadge.textContent = 'Фаза выдоха';
        modalSoundPhaseBadge.className = 'player-phase-badge phase-exhale';
      }
    }

    if (modalCanvasCtx && modalSoundCanvas) {
      const w = modalSoundCanvas.width = modalSoundCanvas.offsetWidth;
      const h = modalSoundCanvas.height = modalSoundCanvas.offsetHeight;

      modalCanvasCtx.clearRect(0, 0, w, h);

      modalCanvasCtx.strokeStyle = '#e2e8f0';
      modalCanvasCtx.lineWidth = 1;
      modalCanvasCtx.beginPath();
      modalCanvasCtx.moveTo(0, h / 2);
      modalCanvasCtx.lineTo(w, h / 2);
      modalCanvasCtx.stroke();

      modalCanvasCtx.lineWidth = 2.5;
      modalCanvasCtx.strokeStyle = '#0d9488';
      modalCanvasCtx.beginPath();

      const points = 70;
      const step = w / points;

      for (let i = 0; i <= points; i++) {
        const x = i * step;
        const p = i / points;
        const wave = Math.sin(p * Math.PI * 5 + now * 0.002) * Math.sin(p * Math.PI);
        const noise = (Math.random() - 0.5) * 4 * intensity;
        const y = (h / 2) - (wave * (h * 0.35) * intensity) + noise;

        if (i === 0) modalCanvasCtx.moveTo(x, y);
        else modalCanvasCtx.lineTo(x, y);
      }
      modalCanvasCtx.stroke();
    }

    synSynthAnimId = requestAnimationFrame(() => runSyndromeVisualizerLoop(syn));
  }

  // ================= 5. МОДАЛЬНОЕ ОКНО ПРОСМОТРА РЕНТГЕНОГРАММ (ЛАЙТБОКС) =================
  const modal = document.getElementById('imageModal');
  const modalImg = document.getElementById('modalImage');
  const modalTitle = document.getElementById('modalTitle');
  const modalClose = document.getElementById('modalClose');

  window.openImageModal = function (src, title) {
    if (!modal || !modalImg) return;
    modalImg.src = src;
    modalTitle.textContent = title || 'Медицинская рентгенограмма';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('active');
    // Если модальное окно синдрома открыто, сохраняем блокировку скролла
    if (!syndromeModalOverlay || !syndromeModalOverlay.classList.contains('active')) {
      document.body.style.overflow = '';
    }
  }

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // Закрытие окон по Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modal && modal.classList.contains('active')) {
        closeModal();
      } else if (syndromeModalOverlay && syndromeModalOverlay.classList.contains('active')) {
        closeSyndromeModal();
      }
    }
  });

  // ================= 6. ТЕСТИРОВАНИЕ ЗНАНИЙ (2 ФОРМАТА) =================

  // --- Переключение форматов (1. Слепое прослушивание / 2. Теоретический тест) ---
  const testFormatBtns = document.querySelectorAll('.test-format-btn');
  const testSectionAudio = document.getElementById('testSectionAudio');
  const testSectionTheory = document.getElementById('testSectionTheory');

  testFormatBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-test-mode');
      testFormatBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      if (mode === 'audio') {
        if (testSectionAudio) testSectionAudio.classList.add('active');
        if (testSectionTheory) testSectionTheory.classList.remove('active');
      } else {
        stopBlindAudio();
        if (testSectionAudio) testSectionAudio.classList.remove('active');
        if (testSectionTheory) testSectionTheory.classList.add('active');
      }
    });
  });


  // ================= ФОРМАТ 1: СЛЕПОЕ ПРОСЛУШИВАНИЕ (LEITNER СИСТЕМА) =================
  const SR_STORAGE_KEY = 'propedik_sr_progress_v2';
  let srProgress = {};

  function loadSrProgress() {
    try {
      const saved = localStorage.getItem(SR_STORAGE_KEY);
      if (saved) {
        srProgress = JSON.parse(saved);
      }
    } catch (e) {
      srProgress = {};
    }
    blindAudioPool.forEach(item => {
      if (!srProgress[item.id]) {
        srProgress[item.id] = { box: 1, corrects: 0, mistakes: 0, lastTested: 0 };
      }
    });
  }

  function saveSrProgress() {
    try {
      localStorage.setItem(SR_STORAGE_KEY, JSON.stringify(srProgress));
    } catch (e) {}
  }

  function updateSrTrackerUI() {
    const total = blindAudioPool.length;
    let masteredCount = 0;
    Object.keys(srProgress).forEach(id => {
      if (srProgress[id].box >= 4) masteredCount++;
    });

    const masteredEl = document.getElementById('srMasteredCount');
    const totalEl = document.getElementById('srTotalCount');
    const barEl = document.getElementById('srProgressBar');
    const statusEl = document.getElementById('srAdaptiveStatus');

    if (masteredEl) masteredEl.textContent = masteredCount;
    if (totalEl) totalEl.textContent = total;
    if (barEl) {
      const pct = Math.round((masteredCount / total) * 100);
      barEl.style.width = pct + '%';
    }
    if (statusEl) {
      if (masteredCount === total) {
        statusEl.textContent = '🌟 Великолепно! Все 14 звуков полностью освоены!';
      } else if (masteredCount > total / 2) {
        statusEl.textContent = '🔥 Отличный темп. Система чаще предлагает проблемные звуки.';
      } else {
        statusEl.textContent = '🎯 Адаптивный алгоритм отслеживает ошибки и повторяет сложные шумы.';
      }
    }
  }

  function selectAdaptiveTargetSound() {
    // Веса коробок Лейтнера (ящик 1 = частый повтор, ящик 5 = освоено)
    const boxWeights = { 1: 16, 2: 8, 3: 4, 4: 2, 5: 1 };
    let pool = [];
    blindAudioPool.forEach(item => {
      const st = srProgress[item.id] || { box: 1 };
      const weight = boxWeights[st.box] || 4;
      for (let i = 0; i < weight; i++) {
        pool.push(item);
      }
    });

    // Исключаем повторение того же звука подряд, если возможно
    let filtered = pool.filter(item => !blindCurrentTarget || item.id !== blindCurrentTarget.id);
    if (filtered.length === 0) filtered = pool;

    const chosen = filtered[Math.floor(Math.random() * filtered.length)];
    return chosen;
  }

  let blindCurrentTarget = null;
  let blindOptions = [];
  let blindSelectedOption = null;
  let blindIsPlaying = false;
  let blindAudioElement = null;
  let blindSynthAnimId = null;

  const blindCanvas = document.getElementById('blindAudioCanvas');
  const blindCanvasCtx = blindCanvas ? blindCanvas.getContext('2d') : null;
  const blindPlayBtn = document.getElementById('blindPlayBtn');
  const blindPlayIcon = document.getElementById('blindPlayIcon');
  const blindPauseIcon = document.getElementById('blindPauseIcon');
  const blindStatusText = document.getElementById('blindAudioStatus');
  const blindOptionsGrid = document.getElementById('blindOptionsGrid');
  const blindSubmitBtn = document.getElementById('blindSubmitBtn');
  const blindNextBtn = document.getElementById('blindNextBtn');
  const blindFeedbackCard = document.getElementById('blindFeedbackCard');
  const blindFeedbackTitle = document.getElementById('blindFeedbackTitle');
  const blindFeedbackText = document.getElementById('blindFeedbackText');
  const blindFeedbackDesc = document.getElementById('blindFeedbackDesc');
  const blindResetStatsBtn = document.getElementById('blindResetStatsBtn');

  function initBlindTestQuestion() {
    stopBlindAudio();
    blindSelectedOption = null;
    if (blindFeedbackCard) blindFeedbackCard.classList.remove('active', 'correct', 'error');
    if (blindSubmitBtn) {
      blindSubmitBtn.disabled = true;
      blindSubmitBtn.style.display = 'inline-flex';
    }
    if (blindNextBtn) blindNextBtn.style.display = 'none';

    blindCurrentTarget = selectAdaptiveTargetSound();

    // Формируем 4 варианта ответа
    let poolCopy = blindAudioPool.filter(it => it.id !== blindCurrentTarget.id);
    poolCopy.sort(() => Math.random() - 0.5);
    blindOptions = [blindCurrentTarget, poolCopy[0], poolCopy[1], poolCopy[2]];
    blindOptions.sort(() => Math.random() - 0.5);

    renderBlindOptions();
    drawBlindCanvasIdle();
    updateSrTrackerUI();
  }

  function renderBlindOptions() {
    if (!blindOptionsGrid) return;
    blindOptionsGrid.innerHTML = '';
    blindOptions.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'blind-option-btn';
      btn.type = 'button';
      btn.setAttribute('data-id', opt.id);

      const indicator = document.createElement('span');
      indicator.className = 'blind-option-indicator';

      const text = document.createElement('span');
      text.className = 'blind-option-text';
      text.textContent = opt.optionName;

      btn.appendChild(indicator);
      btn.appendChild(text);

      btn.addEventListener('click', () => {
        triggerHaptic(10);
        selectBlindOption(opt, btn);
      });

      blindOptionsGrid.appendChild(btn);
    });
  }

  function selectBlindOption(opt, btn) {
    if (blindFeedbackCard && blindFeedbackCard.classList.contains('active')) return;
    blindSelectedOption = opt;
    const allBtns = blindOptionsGrid.querySelectorAll('.blind-option-btn');
    allBtns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    if (blindSubmitBtn) blindSubmitBtn.disabled = false;
  }

  function handleBlindSubmit() {
    if (!blindSelectedOption || !blindCurrentTarget) return;
    triggerHaptic(18);

    const isCorrect = blindSelectedOption.id === blindCurrentTarget.id;
    const itemSt = srProgress[blindCurrentTarget.id] || { box: 1, corrects: 0, mistakes: 0 };

    if (isCorrect) {
      itemSt.corrects++;
      itemSt.box = Math.min(5, itemSt.box + 1);
    } else {
      itemSt.mistakes++;
      itemSt.box = 1; // Возвращаем в первый ящик для активного повторения
    }
    itemSt.lastTested = Date.now();
    srProgress[blindCurrentTarget.id] = itemSt;
    saveSrProgress();
    updateSrTrackerUI();

    // Подсветка кнопок
    const allBtns = blindOptionsGrid.querySelectorAll('.blind-option-btn');
    allBtns.forEach(b => {
      const bId = b.getAttribute('data-id');
      if (bId === blindCurrentTarget.id) {
        b.classList.add('correct');
      } else if (bId === blindSelectedOption.id && !isCorrect) {
        b.classList.add('error');
      }
    });

    if (blindFeedbackCard) {
      blindFeedbackCard.classList.remove('correct', 'error');
      blindFeedbackCard.classList.add('active', isCorrect ? 'correct' : 'error');
    }

    if (blindFeedbackTitle) {
      blindFeedbackTitle.textContent = isCorrect
        ? '✓ Верно! Диагностический признак распознан'
        : '✕ Ошибка! Требуется клинический разбор';
    }

    if (blindFeedbackText) {
      blindFeedbackText.textContent = isCorrect
        ? 'Правильный ответ: ' + blindCurrentTarget.optionName + ' (Уровень запоминания: ' + itemSt.box + ' из 5).'
        : 'Правильный ответ: ' + blindCurrentTarget.optionName + '. Звук будет чаще предложен алгоритмом для повторения.';
    }

    if (blindFeedbackDesc) {
      blindFeedbackDesc.textContent = blindCurrentTarget.clinicalExplanation || '';
    }

    if (blindSubmitBtn) blindSubmitBtn.style.display = 'none';
    if (blindNextBtn) {
      blindNextBtn.style.display = 'inline-flex';
      blindNextBtn.focus();
    }
  }

  if (blindSubmitBtn) blindSubmitBtn.addEventListener('click', handleBlindSubmit);
  if (blindNextBtn) blindNextBtn.addEventListener('click', () => {
    triggerHaptic(10);
    initBlindTestQuestion();
  });

  if (blindResetStatsBtn) {
    blindResetStatsBtn.addEventListener('click', () => {
      triggerHaptic(15);
      if (confirm('Сбросить весь прогресс запоминания звуков?')) {
        srProgress = {};
        blindAudioPool.forEach(item => {
          srProgress[item.id] = { box: 1, corrects: 0, mistakes: 0, lastTested: 0 };
        });
        saveSrProgress();
        updateSrTrackerUI();
        showToast('Прогресс интервального повторения сброшен');
      }
    });
  }

  function toggleBlindAudio() {
    triggerHaptic(12);
    if (blindIsPlaying) {
      stopBlindAudio();
    } else {
      playBlindAudio();
    }
  }

  function playBlindAudio() {
    if (!blindCurrentTarget) return;
    blindIsPlaying = true;
    if (blindPlayIcon) blindPlayIcon.style.display = 'none';
    if (blindPauseIcon) blindPauseIcon.style.display = 'inline-block';
    if (blindStatusText) blindStatusText.textContent = 'Воспроизведение аускультативного шума...';

    if (blindCurrentTarget.audioFile) {
      if (!blindAudioElement) {
        blindAudioElement = new Audio();
        blindAudioElement.loop = true;
      }
      blindAudioElement.src = blindCurrentTarget.audioFile;
      blindAudioElement.play().then(() => {
        runBlindCanvasLoop();
      }).catch(err => {
        console.warn('Audio file play fallback to synth:', err);
        playBlindSynth(blindCurrentTarget);
      });
    } else {
      playBlindSynth(blindCurrentTarget);
    }
  }

  function stopBlindAudio() {
    blindIsPlaying = false;
    if (blindPlayIcon) blindPlayIcon.style.display = 'inline-block';
    if (blindPauseIcon) blindPauseIcon.style.display = 'none';
    if (blindStatusText) blindStatusText.textContent = 'Звук остановлен. Нажмите для воспроизведения.';

    if (blindAudioElement) {
      try {
        blindAudioElement.pause();
        blindAudioElement.currentTime = 0;
      } catch (e) {}
    }
    stopBlindSynth();
    drawBlindCanvasIdle();
  }

  if (blindPlayBtn) blindPlayBtn.addEventListener('click', toggleBlindAudio);

  let blindAudioCtx = null;
  let blindNoiseNode = null;
  let blindFilterNode = null;
  let blindGainNode = null;

  function playBlindSynth(target) {
    stopBlindSynth();
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      blindAudioCtx = new AudioCtx();

      const bufferSize = blindAudioCtx.sampleRate * 2;
      const buffer = blindAudioCtx.createBuffer(1, bufferSize, blindAudioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      blindNoiseNode = blindAudioCtx.createBufferSource();
      blindNoiseNode.buffer = buffer;
      blindNoiseNode.loop = true;

      blindFilterNode = blindAudioCtx.createBiquadFilter();
      blindFilterNode.type = target.synthType === 'bronchial' ? 'bandpass' : 'lowpass';
      blindFilterNode.frequency.value = target.cutoff || 400;
      blindFilterNode.Q.value = target.synthType === 'bronchial' ? 2.5 : 1.2;

      blindGainNode = blindAudioCtx.createGain();
      blindGainNode.gain.value = 0.4;

      blindNoiseNode.connect(blindFilterNode);
      blindFilterNode.connect(blindGainNode);
      blindGainNode.connect(blindAudioCtx.destination);

      blindNoiseNode.start(0);
      runBlindCanvasLoop();
    } catch (e) {
      console.warn('Web Audio blind synth err:', e);
    }
  }

  function stopBlindSynth() {
    if (blindSynthAnimId) {
      cancelAnimationFrame(blindSynthAnimId);
      blindSynthAnimId = null;
    }
    if (blindNoiseNode) {
      try { blindNoiseNode.stop(); } catch (e) {}
      blindNoiseNode = null;
    }
    if (blindAudioCtx) {
      try { blindAudioCtx.close(); } catch (e) {}
      blindAudioCtx = null;
    }
  }

  function drawBlindCanvasIdle() {
    if (!blindCanvasCtx || !blindCanvas) return;
    const w = blindCanvas.width;
    const h = blindCanvas.height;
    blindCanvasCtx.clearRect(0, 0, w, h);
    blindCanvasCtx.fillStyle = '#0f172a';
    blindCanvasCtx.fillRect(0, 0, w, h);

    blindCanvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    blindCanvasCtx.lineWidth = 1;
    blindCanvasCtx.beginPath();
    blindCanvasCtx.moveTo(0, h / 2);
    blindCanvasCtx.lineTo(w, h / 2);
    blindCanvasCtx.stroke();
  }

  function runBlindCanvasLoop() {
    if (!blindIsPlaying) return;
    if (!blindCanvasCtx || !blindCanvas) return;
    const w = blindCanvas.width;
    const h = blindCanvas.height;
    blindCanvasCtx.fillStyle = 'rgba(15, 23, 42, 0.25)';
    blindCanvasCtx.fillRect(0, 0, w, h);

    const time = Date.now() * 0.0014;
    blindCanvasCtx.strokeStyle = '#0284c7';
    blindCanvasCtx.lineWidth = 2.5;
    blindCanvasCtx.beginPath();

    for (let x = 0; x < w; x += 4) {
      const amp = (Math.sin(x * 0.05 + time) * Math.cos(x * 0.02 - time * 0.5) + (Math.random() - 0.5) * 0.35);
      const y = h / 2 + amp * (h * 0.35);
      if (x === 0) blindCanvasCtx.moveTo(x, y);
      else blindCanvasCtx.lineTo(x, y);
    }
    blindCanvasCtx.stroke();

    blindSynthAnimId = requestAnimationFrame(runBlindCanvasLoop);
  }


  let theoryCurrentIndex = 0;
  let theoryScore = 0;
  let theoryAnswered = false;

  const theoryProgressText = document.getElementById('theoryProgressText');
  const theoryScoreVal = document.getElementById('theoryScoreVal');
  const theoryProgressBar = document.getElementById('theoryProgressBar');
  const theoryQuestionCard = document.getElementById('theoryQuestionCard');
  const theoryQuestionText = document.getElementById('theoryQuestionText');
  const theoryOptionsList = document.getElementById('theoryOptionsList');
  const theoryFeedbackBox = document.getElementById('theoryFeedbackBox');
  const theoryFeedbackBadge = document.getElementById('theoryFeedbackBadge');
  const theoryFeedbackTitle = document.getElementById('theoryFeedbackTitle');
  const theoryFeedbackDesc = document.getElementById('theoryFeedbackDesc');
  const theoryNextBtn = document.getElementById('theoryNextBtn');

  const theoryResultCard = document.getElementById('theoryResultCard');
  const finalScoreVal = document.getElementById('finalScoreVal');
  const finalTotalVal = document.getElementById('finalTotalVal');
  const finalPercentVal = document.getElementById('finalPercentVal');
  const finalFeedbackText = document.getElementById('finalFeedbackText');
  const theoryRestartBtn = document.getElementById('theoryRestartBtn');

  function loadTheoryQuestion(index) {
    theoryAnswered = false;
    const total = theoryQuestionsBank.length;
    const q = theoryQuestionsBank[index];

    if (theoryProgressText) theoryProgressText.textContent = `Вопрос ${index + 1} из ${total}`;
    if (theoryScoreVal) theoryScoreVal.textContent = theoryScore;
    if (theoryProgressBar) theoryProgressBar.style.width = `${((index + 1) / total) * 100}%`;

    if (theoryQuestionText) theoryQuestionText.textContent = q.question;
    if (theoryFeedbackBox) theoryFeedbackBox.style.display = 'none';

    if (theoryQuestionCard) theoryQuestionCard.style.display = 'block';
    if (theoryResultCard) theoryResultCard.style.display = 'none';

    if (theoryOptionsList) {
      theoryOptionsList.innerHTML = '';
      while (theoryOptionsList.firstChild) theoryOptionsList.removeChild(theoryOptionsList.firstChild);
      const letters = ['А', 'Б', 'В', 'Г'];
      q.options.forEach((optText, optIdx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-option-choice';
        btn.setAttribute('data-idx', optIdx);
        btn.innerHTML = `
          <span class="choice-letter">${letters[optIdx]}</span>
          <span>${optText}</span>
        `;
        btn.addEventListener('click', () => handleTheoryOptionSelect(optIdx, btn, q));
        theoryOptionsList.appendChild(btn);
      });
    }
  }

  function handleTheoryOptionSelect(selectedIdx, clickedBtn, q) {
    if (theoryAnswered) return;
    theoryAnswered = true;

    const isCorrect = selectedIdx === q.correct;
    if (isCorrect) {
      theoryScore++;
      clickedBtn.classList.add('correct');
      if (theoryFeedbackBadge) {
        theoryFeedbackBadge.textContent = 'Верно!';
        theoryFeedbackBadge.className = 'feedback-badge correct';
      }
      if (theoryScoreVal) theoryScoreVal.textContent = theoryScore;
      showToast('Правильный ответ!');
    } else {
      clickedBtn.classList.add('wrong');
      const correctBtn = theoryOptionsList.querySelector(`[data-idx="${q.correct}"]`);
      if (correctBtn) correctBtn.classList.add('correct');
      if (theoryFeedbackBadge) {
        theoryFeedbackBadge.textContent = 'Неверно!';
        theoryFeedbackBadge.className = 'feedback-badge wrong';
      }
      showToast('Неверно. Изучите обоснование');
    }

    const allBtns = theoryOptionsList.querySelectorAll('.quiz-option-choice');
    allBtns.forEach(b => b.classList.add('disabled'));

    if (theoryFeedbackTitle) theoryFeedbackTitle.textContent = q.title || 'Обоснование по методическому пособию';
    if (theoryFeedbackDesc) theoryFeedbackDesc.textContent = q.explanation;

    const isLast = theoryCurrentIndex === theoryQuestionsBank.length - 1;
    if (theoryNextBtn) {
      if (isLast) {
        theoryNextBtn.innerHTML = '<span>Завершить тест и посмотреть результаты</span> <span>&rarr;</span>';
      } else {
        theoryNextBtn.innerHTML = '<span>Следующий вопрос</span> <span>&rarr;</span>';
      }
    }

    if (theoryFeedbackBox) theoryFeedbackBox.style.display = 'block';
  }

  function showTheoryResults() {
    if (theoryQuestionCard) theoryQuestionCard.style.display = 'none';
    if (theoryFeedbackBox) theoryFeedbackBox.style.display = 'none';
    if (theoryResultCard) theoryResultCard.style.display = 'block';

    const total = theoryQuestionsBank.length;
    const pct = Math.round((theoryScore / total) * 100);

    if (finalScoreVal) finalScoreVal.textContent = theoryScore;
    if (finalTotalVal) finalTotalVal.textContent = total;
    if (finalPercentVal) finalPercentVal.textContent = `${pct}%`;

    let feedback = '';
    if (pct >= 85) {
      feedback = 'Отличный результат! Вы продемонстрировали глубокие знания рентгенологических и физикальных синдромов в строгом соответствии с академической программой кафедры пропедевтики внутренних болезней.';
    } else if (pct >= 65) {
      feedback = 'Хороший уровень подготовки! Базовые клинические паттерны усвоены уверенно. Рекомендуется повторить дифференциальную диагностику плевральных выпотов и ателектазов по пособиям в разделе «О проекте».';
    } else {
      feedback = 'Тест пройден. Для систематизации знаний рекомендуем изучить иллюстрированные методические пособия во вкладке «О проекте» и отработать аускультативные феномены на интерактивных рентгенограммах.';
    }

    if (finalFeedbackText) finalFeedbackText.textContent = feedback;
  }

  if (theoryNextBtn) {
    theoryNextBtn.addEventListener('click', () => {
      if (theoryCurrentIndex < theoryQuestionsBank.length - 1) {
        theoryCurrentIndex++;
        loadTheoryQuestion(theoryCurrentIndex);
      } else {
        showTheoryResults();
      }
    });
  }

  if (theoryRestartBtn) {
    theoryRestartBtn.addEventListener('click', () => {
      theoryCurrentIndex = 0;
      theoryScore = 0;
      loadTheoryQuestion(0);
      showToast('Теоретический тест перезапущен');
    });
  }


  // ================= 7. ИНИЦИАЛИЗАЦИЯ ПРИ ЗАПУСКЕ =================
  loadSrProgress();
  setProjection('anterior');
  selectBreathingType('vesicular-normal');
  initBlindTestQuestion();
  loadTheoryQuestion(0);

  // Ресайз холста при изменении окна
  window.addEventListener('resize', () => {
    if (!blindIsPlaying && typeof drawBlindCanvasIdle === 'function') drawBlindCanvasIdle();
  });

  isAppInitialized = true;

  // Хэш-роутинг
  const initialHash = window.location.hash || '#auscultation';
  const targetId = tabMap[initialHash] || 'panel-auscultation';
  switchTab(targetId, false);

  window.addEventListener('hashchange', () => {
    const curHash = window.location.hash;
    const pId = tabMap[curHash];
    if (pId) switchTab(pId, false);
  });
});
