/**
 * Propedik - Medical Propedeutics Educational Platform
 * Author: Yan Sitdikov (Ситдиков Ян)
 * MIT License
 */

document.addEventListener('DOMContentLoaded', () => {
  // ================= 1. НАВИГАЦИЯ И ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК =================
  const tabButtons = document.querySelectorAll('.nav-tab-btn');
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

  function switchTab(targetPanelId, updateHash = true) {
    tabButtons.forEach(btn => {
      const isActive = btn.getAttribute('data-target') === targetPanelId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
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
      const target = btn.getAttribute('data-target');
      switchTab(target);
    });
  });

  function handleHashNavigation() {
    const hash = window.location.hash.toLowerCase();
    if (hash && tabMap[hash]) {
      switchTab(tabMap[hash], false);
    } else {
      switchTab('panel-auscultation', false);
    }
  }

  window.addEventListener('hashchange', handleHashNavigation);
  handleHashNavigation();

  // ================= 2. УВЕДОМЛЕНИЯ И КОПИРОВАНИЕ =================
  const toast = document.getElementById('toast');
  let toastTimer = null;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }
  window.showToast = showToast;

  window.copyText = function (text, successMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(successMsg || 'Скопировано в буфер обмена');
      }).catch(() => {
        fallbackCopy(text, successMsg);
      });
    } else {
      fallbackCopy(text, successMsg);
    }
  };

  function fallbackCopy(text, successMsg) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    showToast(successMsg || 'Скопировано в буфер обмена');
  }

  // ================= 3. ИНТЕРАКТИВНАЯ АУСКУЛЬТАЦИЯ ЛЕГКИХ =================
  const breathingDatabase = {
    'vesicular-normal': {
      title: 'Везикулярное дыхание (норма)',
      group: 'vesicular',
      formula: 'Слышен весь вдох и начальная 1/3 выдоха (соотношение 3 : 1). Мягкий дующий шум («ф»).',
      mechanism: 'Колебания эластичных стенок альвеол при их быстром растяжении поступающим воздухом во время вдоха.',
      conditions: 'Физиологическая норма у здоровых взрослых людей при спокойном дыхании.',
      audio: {
        cycleDuration: 4.2,
        inhaleRatio: 0.65,
        exhaleRatio: 0.35,
        cutoffInhale: 400,
        cutoffExhale: 280,
        volume: 0.85,
        type: 'vesicular'
      }
    },
    'vesicular-increased': {
      title: 'Усиленное везикулярное дыхание',
      group: 'vesicular',
      formula: 'Обе фазы дыхания (особенно вдох) выслушиваются громче и глубже, соотношение фаз сохраняется (3 : 1).',
      mechanism: 'Увеличение дыхательного объема и скорости прохождения воздуха через альвеолы, повышенная амплитуда колебаний стенок.',
      conditions: 'Физиологическое: после физической нагрузки, эмоционального напряжения, у лиц астенического телосложения с тонкой грудной стенкой.',
      audio: {
        cycleDuration: 3.2,
        inhaleRatio: 0.65,
        exhaleRatio: 0.35,
        cutoffInhale: 520,
        cutoffExhale: 360,
        volume: 1.0,
        type: 'vesicular'
      }
    },
    'vesicular-decreased': {
      title: 'Ослабленное везикулярное дыхание',
      group: 'vesicular',
      formula: 'Дыхательный шум тихий, приглушенный, выдох практически не улавливается стетоскопом.',
      mechanism: 'Снижение проведения звуковых колебаний через массивную грудную стенку или поверхностная экскурсия грудной клетки.',
      conditions: 'Физиологическое: у лиц гиперстенического телосложения, при выраженном развитии мышц плечевого пояса или избыточной подкожно-жировой клетчатке.',
      audio: {
        cycleDuration: 4.8,
        inhaleRatio: 0.72,
        exhaleRatio: 0.28,
        cutoffInhale: 260,
        cutoffExhale: 190,
        volume: 0.45,
        type: 'vesicular'
      }
    },
    'vesicular-puerile': {
      title: 'Пуэрильное дыхание у подростков',
      group: 'vesicular',
      formula: 'Громкое, звонкое дыхание; выдох выслушивается значительно дольше и отчетливее, чем у взрослых (наполовину или 2/3 выдоха).',
      mechanism: 'Тонкая, эластичная грудная стенка, меньший диаметр бронхов и высокая эластичность альвеолярной ткани.',
      conditions: 'Физиологическая норма у детей и подростков в возрасте до 12–14 лет (от лат. puerilis — детский, отроческий).',
      audio: {
        cycleDuration: 3.5,
        inhaleRatio: 0.55,
        exhaleRatio: 0.45,
        cutoffInhale: 650,
        cutoffExhale: 480,
        volume: 0.95,
        type: 'puerile'
      }
    },
    'bronchial-normal': {
      title: 'Физиологическое бронхиальное дыхание',
      group: 'bronchial',
      formula: 'Грубый трубный шум («х»). Слышен на всем протяжении вдоха и выдоха, при этом выдох громче, грубее и длиннее вдоха.',
      mechanism: 'Турбулентное вихревое движение воздушного потока через голосовую щель и просвет крупных хрящевых дыхательных путей.',
      conditions: 'В норме выслушивается строго над гортанью, трахеей, рукояткой грудины спереди и сзади в межлопаточной области (Th3–Th4, C7).',
      audio: {
        cycleDuration: 4.0,
        inhaleRatio: 0.45,
        exhaleRatio: 0.55,
        cutoffInhale: 800,
        cutoffExhale: 950,
        volume: 0.95,
        type: 'bronchial'
      }
    }
  };

  // База данных топографических проекций (Передняя, Задняя, Боковая) по методическим пособиям ЮУГМУ
  const projectionDatabase = {
    anterior: {
      name: 'Передняя группа (Спереди)',
      xrayTitle: 'Обзорная рентгенограмма легких (прямая проекция) — Передняя группа точек',
      imageSrc: 'image/нормальная рентгенограмма легких.png',
      isLateral: false,
      legendVesicular: '<strong>Везикулярное дыхание:</strong> 8 симметричных точек спереди (верхушки, ключицы, I–III м/р по среднеключичной линии)',
      legendBronchial: '<strong>Бронхиальное дыхание:</strong> 3 точки по срединной линии (гортань, трахея, рукоятка грудины)',
      topographyVesicular: 'Спереди в симметричных точках: над верхушками легких (надключичные ямки), непосредственно по ключицам (I межреберье) и по среднеключичным линиям во II и III межреберьях (точки V1–V8).',
      topographyBronchial: 'Спереди над областью гортани, трахеи (над яремной вырезкой грудины) и над рукояткой грудины (проекция бифуркации трахеи спереди, Th3–Th4) (точки B1–B3).'
    },
    posterior: {
      name: 'Задняя группа (Сзади)',
      xrayTitle: 'Обзорная рентгенограмма легких (прямая проекция) — Задняя группа точек',
      imageSrc: 'image/нормальная рентгенограмма легких.png',
      isLateral: false,
      legendVesicular: '<strong>Везикулярное дыхание:</strong> 12 симметричных точек сзади (надлопаточные, межлопаточные и VII–IX м/р по лопаточной линии)',
      legendBronchial: '<strong>Бронхиальное дыхание:</strong> 2 точки по срединной линии (остистый отросток C7 и межлопаточная бифуркация Th3–Th4)',
      topographyVesicular: 'Сзади в симметричных точках: надлопаточные области (fossa supraspinata), межлопаточное пространство в верхних и нижних отделах, подлопаточные области по лопаточным и заднеподмышечным линиям с VII по IX межреберья (точки V1–V12).',
      topographyBronchial: 'Сзади по срединной линии: в межлопаточном пространстве на уровне остей лопаток (Th3–Th4, проекция бифуркации трахеи сзади) и над остистым отростком VII шейного позвонка (C7, vertebra prominens) (точки B1–B2).'
    },
    lateral: {
      name: 'Боковая группа (Сбоку)',
      xrayTitle: 'Боковая рентгенограмма легких (левая боковая проекция) — Боковая группа точек',
      imageSrc: 'image/Нормальная рентгенограмма сбоку.jpg',
      isLateral: true,
      legendVesicular: '<strong>Везикулярное дыхание:</strong> 3 точки по среднеподмышечной линии (IV, V и VI межреберья)',
      legendBronchial: '<strong>Бронхиальное дыхание:</strong> в норме в боковых отделах отсутствует',
      topographyVesicular: 'В боковых областях по среднеподмышечным линиям (linea axillaris media) в IV, V и VI межреберьях при поднятых вверх руках или заложенных за голову ладонях (точки L1–L3).',
      topographyBronchial: 'В норме физиологическое бронхиальное дыхание в боковых отделах легких отсутствует (точки не описаны в пособии). Его появление здесь указывает на патологический синдром уплотнения легочной ткани, полость или компрессионный ателектаз.'
    }
  };

  const projectionButtons = document.querySelectorAll('.proj-tab-btn');
  const xrayHeaderTitle = document.getElementById('xrayHeaderTitle');
  const legendTextVesicular = document.getElementById('legendTextVesicular');
  const legendTextBronchial = document.getElementById('legendTextBronchial');

  const breathingTypeButtons = document.querySelectorAll('.breathing-type-btn');
  const auscultationPoints = document.querySelectorAll('.auscultation-point');
  const playerTitle = document.getElementById('playerTitle');
  const infoCardTitle = document.getElementById('infoCardTitle');
  const infoParamPoints = document.getElementById('infoParamPoints');
  const infoParamFormula = document.getElementById('infoParamFormula');
  const infoParamMechanism = document.getElementById('infoParamMechanism');
  const infoParamConditions = document.getElementById('infoParamConditions');
  const toggleLabelsBtn = document.getElementById('toggleLabelsBtn');
  const toggleInvertBtn = document.getElementById('toggleInvertBtn');
  const xrayCanvasBox = document.getElementById('xrayCanvasBox');
  const xrayImage = document.getElementById('xrayImage');

  let currentProjection = 'anterior';
  let currentBreathingKey = 'vesicular-normal';

  // Обновление видимости точек: точки прошлой проекции исчезают полностью
  function updatePointsDisplay() {
    const bData = breathingDatabase[currentBreathingKey];
    const currentGroup = bData ? bData.group : 'vesicular';

    auscultationPoints.forEach(pt => {
      const ptProj = pt.getAttribute('data-projection');
      const ptGroup = pt.getAttribute('data-group');

      if (ptProj === currentProjection) {
        // Точка текущей проекции видна
        pt.style.display = 'flex';
        const isAct = ptGroup === currentGroup;
        pt.classList.toggle('group-active', isAct);
      } else {
        // Точки других проекций полностью скрываются
        pt.style.display = 'none';
        pt.classList.remove('group-active');
      }
    });
  }

  // Обновление клинической топографии точек
  function updateClinicalTopography() {
    const bData = breathingDatabase[currentBreathingKey];
    const currentGroup = bData ? bData.group : 'vesicular';
    const projData = projectionDatabase[currentProjection];

    if (infoParamPoints && projData) {
      infoParamPoints.textContent = currentGroup === 'vesicular'
        ? projData.topographyVesicular
        : projData.topographyBronchial;
    }
  }

  // Переключение топографической проекции (Передняя / Задняя / Боковая)
  function setProjection(projKey) {
    if (!projectionDatabase[projKey]) return;

    currentProjection = projKey;
    const projData = projectionDatabase[projKey];

    // 1. Обновление кнопок проекций
    projectionButtons.forEach(btn => {
      const isAct = btn.getAttribute('data-projection') === projKey;
      btn.classList.toggle('active', isAct);
      btn.setAttribute('aria-selected', isAct ? 'true' : 'false');
    });

    // 2. Смена картинки с лаконичной приятной анимацией
    const currentSrc = xrayImage.getAttribute('src');
    if (currentSrc !== projData.imageSrc) {
      xrayImage.classList.add('fade-transition');
      setTimeout(() => {
        xrayImage.src = projData.imageSrc;
        xrayCanvasBox.classList.toggle('is-lateral', projData.isLateral);
        setTimeout(() => {
          xrayImage.classList.remove('fade-transition');
        }, 120);
      }, 200);
    } else {
      xrayCanvasBox.classList.toggle('is-lateral', projData.isLateral);
    }

    // 3. Обновление заголовка вьювера
    if (xrayHeaderTitle) {
      xrayHeaderTitle.textContent = projData.xrayTitle;
    }

    // 4. Обновление легенды
    if (legendTextVesicular) {
      legendTextVesicular.innerHTML = projData.legendVesicular;
    }
    if (legendTextBronchial) {
      legendTextBronchial.innerHTML = projData.legendBronchial;
    }

    // 5. Точки прошлой проекции исчезают, активные подсвечиваются
    updatePointsDisplay();

    // 6. Обновление клинической топографии
    updateClinicalTopography();
  }

  projectionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const projKey = btn.getAttribute('data-projection');
      setProjection(projKey);
    });
  });

  // Выбор типа дыхания
  function selectBreathingType(key) {
    const data = breathingDatabase[key];
    if (!data) return;

    currentBreathingKey = key;

    breathingTypeButtons.forEach(btn => {
      const isSelected = btn.getAttribute('data-type') === key;
      btn.classList.toggle('active', isSelected);
    });

    // Обновление подсветки точек в текущей проекции
    updatePointsDisplay();

    // Обновление метаданных плеера и справки
    if (playerTitle) playerTitle.textContent = data.title;
    if (infoCardTitle) infoCardTitle.textContent = `Клиническая характеристика: ${data.title}`;
    if (infoParamFormula) infoParamFormula.textContent = data.formula;
    if (infoParamMechanism) infoParamMechanism.textContent = data.mechanism;
    if (infoParamConditions) infoParamConditions.textContent = data.conditions;

    updateClinicalTopography();
    updateAudioProfile(data.audio);
  }

  breathingTypeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const typeKey = btn.getAttribute('data-type');
      selectBreathingType(typeKey);
    });
  });

  // Клик по точкам для отображения названия
  auscultationPoints.forEach(pt => {
    pt.addEventListener('click', () => {
      const tt = pt.querySelector('.point-tooltip');
      const core = pt.querySelector('.point-core');
      if (tt && core) {
        showToast(`${core.textContent}: ${tt.textContent}`);
      }
    });
  });

  if (toggleLabelsBtn && xrayCanvasBox) {
    toggleLabelsBtn.addEventListener('click', () => {
      const isShowing = xrayCanvasBox.classList.toggle('show-labels');
      toggleLabelsBtn.classList.toggle('active', isShowing);
    });
  }

  if (toggleInvertBtn && xrayImage) {
    toggleInvertBtn.addEventListener('click', () => {
      const isInverted = xrayImage.classList.toggle('invert');
      toggleInvertBtn.classList.toggle('active', isInverted);
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
      const wave = Math.sin(progress * Math.PI * 4 + cycleElapsed * 6) * Math.sin(progress * Math.PI);
      const noise = (Math.random() - 0.5) * 8 * intensity;
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

  // ================= 4. БАЗА ДАННЫХ ПАТОЛОГИЙ ДЫХАТЕЛЬНОЙ СИСТЕМЫ =================
  // Никакой нумерации синдромов в заголовках и объектах (требование: не нумеровать синдромы)
  const syndromesData = {
    'bronchitic': {
      id: 'bronchitic',
      name: 'Бронхитический синдром',
      category: 'Поражение бронхов',
      definition: 'Острое или хроническое диффузное воспаление слизистой оболочки бронхов.',
      complaints: 'Кашель сухой или с отделением слизистой / слизисто-гнойной мокроты, одышка смешанного характера при физической нагрузке, общая слабость, познабливание, субфебрильная или фебрильная температура тела.',
      inspection: 'При остром процессе — без выраженных изменений. При хроническом бронхите — диффузный «теплый» цианоз, деформация концевых фаланг пальцев («барабанные палочки») и ногтей («часовые стекла»).',
      palpation: 'Не диагностична. Голосовое дрожание сохранено, проводится одинаково с обеих сторон.',
      percussion: 'Ясный легочный звук над всей поверхностью легких. Границы легких и подвижность нижнего края не изменены.',
      auscultation: 'При остром бронхите — везикулярное дыхание с рассеянными сухими хрипами. При хроническом — жесткое дыхание с удлиненным выдохом, обилие сухих хрипов (басовых жужжащих и дискантовых свистящих), влажные среднепузырчатые хрипы, меняющиеся после кашля.',
      additional: 'ОАК: умеренный лейкоцитоз со сдвигом влево, ускорение СОЭ. Анализ мокроты: слизистый или гнойный характер, лейкоциты, макрофаги, клетки цилиндрического мерцательного эпителия.',
      xrayImg: 'image/Бронхитический синдром.jpg',
      xrayDesc: 'Усиление и сетчатая деформация легочного рисунка вследствие перибронхиального склероза и утолщения стенок бронхов («симптом трамвайных рельсов» в продольном сечении и «симптом кольца» в поперечном сечении).',
      soundTitle: 'Жесткое дыхание и рассеянные сухие хрипы',
      soundDesc: 'Жесткое дыхание (громкий вдох и весь выдох) с рассеянными жужжащими и свистящими сухими хрипами, возникающими при колебании вязкого экссудата в просвете бронхов.',
      soundAudioFile: 'audio/Бронхитический синдром.mp3',
      synthType: 'bronchitic'
    },

    'obstruction': {
      id: 'obstruction',
      name: 'Синдром бронхиальной обструкции',
      category: 'Поражение бронхов',
      definition: 'Генерализованное нарушение бронхиальной проходимости, обусловленное бронхоспазмом, отеком слизистой оболочки, гиперсекрецией вязкой слизи и склерозом бронхиальной стенки.',
      complaints: 'Приступообразная экспираторная одышка (затрудненный выдох, чувство удушья), мучительный кашель с трудноотделяемой стекловидной мокротой, дистанционные свистящие хрипы.',
      inspection: 'Экспираторная одышка, участие вспомогательной мускулатуры плечевого пояса, бочкообразная грудная клетка, вынужденное положение сидя с фиксацией рук («поза кучера»).',
      palpation: 'Повышенная ригидность грудной клетки, голосовое дрожание равномерно ослаблено над обоими легкими.',
      percussion: 'Громкий коробочный перкуторный звук над всеми легочными полями, смещение нижних границ легких вниз, ограничение дыхательной экскурсии.',
      auscultation: 'Ослабленное везикулярное дыхание с резко удлиненным выдохом, обилие сухих свистящих (дискантовых) хрипов высокой тональности, слышимых на значительном расстоянии.',
      additional: 'Спирометрия: снижение ОФВ1, падение индекса Тиффно < 70%, прирост после ингаляции бронхолитика > 12%. ОАК и мокрота: выраженная эозинофилия, спирали Куршмана, кристаллы Шарко–Лейдена.',
      xrayImg: 'image/Синдром бронхиальной обструкции.jpeg',
      xrayDesc: 'Признаки гиперинфляции и острой эмфиземы: повышенная прозрачность легочных полей, обеднение сосудистого рисунка на периферии, низкое стояние и уплощение диафрагмы, расширение межреберий.',
      soundTitle: 'Свистящие дискантовые хрипы на удлиненном выдохе',
      soundDesc: 'Высокочастотные свистящие хрипы (wheezing), возникающие при турбулентном прохождении воздушной струи через спазмированные и отечные мелкие бронхиолы во время форсированного выдоха.',
      soundAudioFile: 'audio/Синдром бронхиальной обструкции.mp3',
      synthType: 'obstruction'
    },

    'consolidation_inflam': {
      id: 'consolidation_inflam',
      name: 'Синдром уплотнения легочной ткани воспалительного генеза',
      category: 'Поражение паренхимы легких',
      definition: 'Заполнение альвеол воспалительным экссудатом (фибрин, лейкоциты, эритроциты) с потерей воздушности участка легочной ткани (долевая, очаговая пневмония, инфильтративный туберкулез).',
      complaints: 'Кашель вначале сухой, затем с вязкой слизисто-гнойной или «ржавой» мокротой, острые колющие боли в боку при глубоком вдохе, фебрильная лихорадка с ознобом, одышка.',
      inspection: 'Отставание пораженной половины грудной клетки в акте дыхания, гиперемия щеки на стороне воспаления, цианоз носогубного треугольника, тахипноэ.',
      palpation: 'Резкое усиление голосового дрожания над зоной уплотнения (безвоздушная плотная легочная ткань лучше проводит звуковые колебания от гортани).',
      percussion: 'Притупленный или тупой перкуторный звук над проекцией воспалительного очага.',
      auscultation: 'В фазу разгара — патологическое бронхиальное дыхание, звучные влажные мелкопузырчатые хрипы, резкое усиление бронхофонии. В фазы начала и разрешения — ослабленное везикулярное дыхание и крепитация (crepitatio indux et redux).',
      additional: 'ОАК: нейтрофильный лейкоцитоз со сдвигом влево, ускорение СОЭ, высокий С-реактивный белок (СРБ). Анализ мокроты: скопления лейкоцитов, эритроциты, патогенная микрофлора.',
      xrayImg: 'image/Синдром уплотнения легочной ткани воспалительного генеза.jpg',
      xrayDesc: 'Интенсивное затемнение легочной ткани долевой, сегментарной или очаговой локализации с нечеткими наружными контурами и визуализацией полосок бронхиального просвета внутри инфильтрата («симптом воздушной бронхографии»).',
      soundTitle: 'Патологическое бронхиальное дыхание и звучная крепитация',
      soundDesc: 'Трубный грубый звук бронхиального дыхания над безвоздушной плотной тканью в сочетании с конечно-инспираторной крепитацией, возникающей при разлипании альвеолярных стенок на пике вдоха.',
      soundAudioFile: 'audio/Синдром уплотнения легочной ткани воспалительного генеза.mp3',
      synthType: 'consolidation'
    },

    'atelectasis': {
      id: 'atelectasis',
      name: 'Синдром уплотнения легочной ткани невоспалительного генеза (ателектаз)',
      category: 'Поражение паренхимы легких',
      definition: 'Спадение альвеол и потеря воздушности доли или сегмента вследствие обтурации дренирующего бронха (опухоль, инородное тело, слизистая пробка) или сдавления легкого извне (компрессионный ателектаз).',
      complaints: 'Остро возникшая инспираторная одышка, чувство стеснения в груди, сухой надсадный рефлекторный кашель, цианоз.',
      inspection: 'Западение пораженной половины грудной клетки, сужение межреберных промежутков, резкое отставание при дыхании, смещение трахеи в сторону поражения.',
      palpation: 'При обтурационном ателектазе — резкое ослабление или полное отсутствие голосового дрожания. При компрессионном ателектазе — умеренное усиление голосового дрожания.',
      percussion: 'Тупой перкуторный звук над областью спадения, смещение границ органов средостения в больную сторону.',
      auscultation: 'При обтурационном ателектазе — полное отсутствие дыхательных шумов («немая зона») и бронхофонии. При компрессионном ателектазе — тихое компрессионное бронхиальное дыхание.',
      additional: 'Бронхоскопия: выявление эндобронхиальной обтурации с забором биопсии. КТ органов грудной клетки: точная локализация спавшейся доли и культи бронха.',
      xrayImg: 'image/Синдром уплотнения легочной ткани невоспалительного генеза (ателектаз).jpg',
      xrayDesc: 'Интенсивное гомогенное клиновидное/треугольное затемнение доли с четкими вогнутыми границами, смещение средостения и трахеи в сторону поражения, высокое стояние купола диафрагмы.',
      soundTitle: 'Резкое ослабление дыхания («немая зона»)',
      soundDesc: 'При полной обтурации просвета бронха воздух не проникает в спавшуюся паренхиму, что приводит к полному исчезновению дыхательных шумов над областью ателектаза.',
      soundAudioFile: 'audio/Синдром уплотнения легочной ткани невоспалительного генеза (ателектаз).mp3',
      synthType: 'silent'
    },

    'emphysema': {
      id: 'emphysema',
      name: 'Синдром эмфиземы легких',
      category: 'Поражение паренхимы легких',
      definition: 'Патологическое расширение воздушных пространств дистальнее терминальных бронхиол с деструкцией альвеолярных перегородок и утратой эластичности легких.',
      complaints: 'Постоянная экспираторная одышка при минимальной нагрузке, кашель с трудноотделяемой мокротой, дыхание через сложенные трубочкой губы («пыхтящее» дыхание).',
      inspection: 'Бочкообразная грудная клетка: расширение передне-заднего размера, сглаженность надключичных ямок, тупой эпигастральный угол (>90°), малая дыхательная экскурсия.',
      palpation: 'Выраженная ригидность грудной клетки, голосовое дрожание диффузно и равномерно ослаблено над всеми полями.',
      percussion: 'Громкий коробочный перкуторный звук над всеми легочными полями, смещение нижних границ легких вниз на 1–2 ребра, уменьшение абсолютной тупости сердца, экскурсия края легких не более 1–2 см.',
      auscultation: 'Резко ослабленное везикулярное дыхание с удлиненным выдохом над всеми отделами; приглушение сердечных тонов из-за эмфизематозных краев легких.',
      additional: 'Спирометрия: падение ОФВ1, отношение ОФВ1/ФЖЕЛ < 0.70, значительное увеличение остаточного объема легких (ООЛ) и общей емкости легких (ОЕЛ).',
      xrayImg: 'image/Синдром эмфиземы легких.jpg',
      xrayDesc: 'Диффузное повышение прозрачности легочных полей («светлые поля»), обеднение и истончение легочного рисунка на периферии, низкое стояние и уплощение диафрагмы с острыми синусами, «капельное» сердце.',
      soundTitle: 'Резко ослабленное везикулярное дыхание',
      soundDesc: 'Глухой, едва различимый респираторный шум вследствие критической утраты эластичности альвеол и малой амплитуды их колебаний, с удлиненным выдохом.',
      soundAudioFile: 'audio/Синдром эмфиземы легких.mp3',
      synthType: 'emphysema'
    },

    'alveolitis': {
      id: 'alveolitis',
      name: 'Синдром идиопатического интерстициального пневмонита (альвеолита)',
      category: 'Поражение паренхимы легких',
      definition: 'Прогрессирующее фиброзирующее воспаление интерстиция межальвеолярных перегородок с развитием диффузного фиброза и «сотового легкого».',
      complaints: 'Неуклонно прогрессирующая инспираторная одышка, упорный сухой надсадный кашель, снижение массы тела, утомляемость, артралгии.',
      inspection: 'Диффузный «пепельно-серый» цианоз кожных покровов, деформация концевых фаланг («барабанные палочки») и ногтей («часовые стекла»), тахипноэ при малейшей нагрузке.',
      palpation: 'Голосовое дрожание может быть умеренно усилено в нижне-базальных отделах.',
      percussion: 'Укорочение перкуторного звука преимущественно в нижне-задних отделах обоих легких; ограничение подвижности диафрагмы.',
      auscultation: 'Патогномоничный признак — нежная сухая конечно-инспираторная крепитация (звук «треска целлофана» или расстегивания липучки Velcro) над базальными отделами обоих легких.',
      additional: 'КТ высокого разрешения (ВРКТ): субплевральные ретикулярные изменения, симптом «матового стекла», тракционные бронхоэктазы и кистозные просветления («сотовое легкое»). Спирометрия: рестриктивные нарушения, падение диффузионной емкости легких (DLCO).',
      xrayImg: 'image/Синдром идиопатического интерстициального пневмонита (альвеолита).jpeg',
      xrayDesc: 'Двустороннее симметричное диффузное усиление интерстициального легочного рисунка по сетчатому типу, преимущественно в базальных отделах, уменьшение объемов легких, симптом «сотового легкого».',
      soundTitle: 'Конечно-инспираторная крепитация («треск целлофана» / Velcro)',
      soundDesc: 'Высокочастотная сухая крепитация на пике вдоха, обусловленная раскрытием ригидных фиброзированных альвеолярных стенок при максимальном расширении легких.',
      soundAudioFile: 'audio/Синдром идиопатического интерстициального пневмонита (альвеолита).mp3',
      synthType: 'velcro'
    },

    'cavity': {
      id: 'cavity',
      name: 'Синдром полости в легком',
      category: 'Поражение паренхимы легких',
      definition: 'Формирование в легочной паренхиме замкнутой полости вследствие некроза и распада ткани с последующим дренированием в бронх (абсцесс легкого, каверна, распадающаяся опухоль).',
      complaints: 'Откашливание обильной гнойной мокроты (нередко «полным ртом» при прорыве абсцесса), кровохарканье, фебрильная гектическая лихорадка с потрясающим ознобом и проливным потом, одышка.',
      inspection: 'Бледность кожных покровов с землистым оттенком, отставание пораженной половины грудной клетки при дыхании; при хроническом течении — симптомы гиппократовых пальцев.',
      palpation: 'Резкое усиление голосового дрожания над полостью (если она более 4 см в диаметре, лежит субплеврально, содержит воздух и сообщается с дренирующим бронхом).',
      percussion: 'Тимпанический или металлический перкуторный звук над полостью; изменение перкуторного тона при открытом и закрытом рте (симптом Винтриха).',
      auscultation: 'Патологическое амфорическое дыхание (напоминающее звук дутья над узким горлышком пустого кувшина), звонкие средне- и крупнопузырчатые влажные хрипы, резкое усиление бронхофонии.',
      additional: 'ОАК: высокий лейкоцитоз со сдвигом влево, токсическая зернистость нейтрофилов, высокое СОЭ. Мокрота при отстаивании разделяется на 2–3 слоя; микроскопия: эластические волокна, аморфный детрит, кристаллы гематоидина.',
      xrayImg: 'image/Синдром полости в легком.png',
      xrayDesc: 'Округлая кольцевидная тень с четким внутренним контуром, зоной перифокальной инфильтрации и типичным горизонтальным уровнем жидкости на фоне газа внутри полости.',
      soundTitle: 'Амфорическое дыхание и влажные крупнопузырчатые хрипы',
      soundDesc: 'Низкочастотный резонирующий дующий звук амфорического дыхания, возникающий при резонансе звуковой волны в крупной гладкостенной полости, сообщающейся с бронхом.',
      soundAudioFile: 'audio/Синдром полости в легком.mp3',
      synthType: 'amphoric'
    },

    'lv_failure': {
      id: 'lv_failure',
      name: 'Синдром изменений в легких при левожелудочковой недостаточности',
      category: 'Поражение паренхимы легких',
      definition: 'Гемодинамический застой крови в малом круге кровообращения с интерстициальным и альвеолярным отеком легких из-за систолической или диастолической дисфункции левого желудочка.',
      complaints: 'Приступы удушья в положении лежа (сердечная астма / пароксизмальная ночная одышка), кашель вначале сухой, затем с обильной жидкой пенистой розовой мокротой (альвеолярный отек), сердцебиение.',
      inspection: 'Вынужденное положение сидя с опущенными ногами (ортопноэ), акроцианоз, холодный липкий пот, набухание шейных вен, частое клокочущее дыхание.',
      palpation: 'Смещение верхушечного толчка влево и вниз, тахикардия, пульс альтернирующий.',
      percussion: 'Притупление перкуторного звука в симметричных нижне-базальных отделах обоих легких из-за застойного отека и сопутствующего гидроторакса.',
      auscultation: 'Ослабленное везикулярное дыхание; в нижних отделах обоих легких — обильные незвучные влажные мелко- и среднепузырчатые («застойные») хрипы, не исчезающие после кашля.',
      additional: 'ЭКГ: признаки гипертрофии и перегрузки левых отделов сердца. ЭхоКГ: дилатация левого предсердия и желудочка, падение фракции выброса (ФВ < 50%). Анализ крови: повышение натрийуретического пептида (BNP / NT-proBNP).',
      xrayImg: 'image/Синдром изменений в легких при левожелудочковой недостаточности.jpg',
      xrayDesc: 'Расширение и смазанность структуры корней легких («застойные корни»), усиление легочного рисунка по венозному типу, кардиомегалия, септальные линии Керли В, симптом «крыльев бабочки» при альвеолярном отеке.',
      soundTitle: 'Обильные застойные влажные хрипы в базальных отделах',
      soundDesc: 'Множественные незвучные мелкопузырчатые влажные хрипы над базальными отделами обоих легких, вызванные скоплением жидкого транссудата в просвете терминальных бронхов и альвеол.',
      soundAudioFile: 'audio/Синдром изменений в легких при левожелудочковой недостаточности.mp3',
      synthType: 'congestive'
    },

    'hydrothorax': {
      id: 'hydrothorax',
      name: 'Синдром гидроторакса',
      category: 'Поражение плевры',
      definition: 'Скопление невоспалительной (транссудат) или воспалительной (экссудат при плеврите) жидкости в плевральной полости с компрессией легкого.',
      complaints: 'Инспираторная одышка, нарастающее чувство тяжести и распирания в соответствующей половине груди, сухой рефлекторный кашель при перемене положения тела.',
      inspection: 'Асимметрия грудной клетки: увеличение объема и выбухание пораженной половины, сглаженность межреберных промежутков, резкое отставание при дыхании; вынужденное положение лежа на больном боку.',
      palpation: 'Резкое ослабление или полное исчезновение голосового дрожания над областью скопления жидкости (жидкость экранирует звуковые волны).',
      percussion: 'Бедренная тупость (абсолютно тупой перкуторный звук) над зоной жидкости с дугообразной косой верхней границей (линия Эллиса–Дамуазо–Соколова), треугольники Гарлянда и Раухфуса–Грокко.',
      auscultation: 'Полное отсутствие дыхательных шумов («мертвая тишина») и бронхофонии над зоной тупости. Непосредственно над верхней границей жидкости (зона компрессионного ателектаза) — тихое компрессионное бронхиальное дыхание.',
      additional: 'Плевральная пункция: эвакуация жидкости, дифференциация транссудата и экссудата (проба Ривальта, белок > 30 г/л для экссудата, уровень ЛДГ).',
      xrayImg: 'image/Синдром гидроторакса.jpg',
      xrayDesc: 'Интенсивное гомогенное затемнение нижней части легочного поля с четкой косой верхней дугообразной границей, направленной кнаружи и кверху; смещение средостения и сердца в здоровую сторону; синусы не дифференцируются.',
      soundTitle: 'Полное отсутствие дыхательных шумов («мертвая тишина»)',
      soundDesc: 'Массивный слой свободной жидкости в плевральной полости блокирует распространение звуковых колебаний, формируя зону абсолютного беззвучия над областью выпота.',
      soundAudioFile: 'audio/Синдром гидроторакса.mp3',
      synthType: 'silent'
    },

    'dry_pleurisy': {
      id: 'dry_pleurisy',
      name: 'Синдром фибринозного плеврита («сухой» плеврит)',
      category: 'Поражение плевры',
      definition: 'Воспаление плевральных листков с отложением на их поверхности нитей фибрина без выраженного накопления свободного жидкого выпота.',
      complaints: 'Острая интенсивная колющая боль в грудной клетке на стороне поражения, резко усиливающаяся при глубоком вдохе, кашле и наклоне туловища в здоровую сторону; сухой рефлекторный кашель, субфебрилитет.',
      inspection: 'Частое поверхностное дыхание (болевое щажение), отставание пораженной половины грудной клетки; вынужденное положение лежа на больном боку (иммобилизация листков плевры снижает боль).',
      palpation: 'При массивных фибринозных наложениях ладонью может ощущаться грубая вибрация от трения плевральных листков при дыхании.',
      percussion: 'Ясный легочный звук над легкими; ограничение подвижности нижнего легочного края на стороне поражения из-за болевого щажения.',
      auscultation: 'Патогномоничный феномен — шум трения плевры. Выслушивается в обе фазы дыхания (вдох и выдох), напоминает скрип снега, хруст кожи или шелест шелка. Не исчезает после кашля, усиливается при надавливании стетоскопом.',
      additional: 'ОАК: умеренный нейтрофильный лейкоцитоз, умеренное ускорение СОЭ. УЗИ плевры: утолщение и неровность листков плевры, визуализация фибрина без свободного анэхогенного выпота.',
      xrayImg: 'image/Синдром фибринозного плеврита («сухой» плеврит).jpg',
      xrayDesc: 'Рентгенологические признаки часто минимальны: умеренное снижение прозрачности латеральных отделов легочного поля, утолщение плевры, высокое стояние и малоподвижность купола диафрагмы на стороне поражения.',
      soundTitle: 'Патогномоничный шум трения плевры',
      soundDesc: 'Грубый скребущий шум, напоминающий скрип снега под ногами или трение новой кожи, выслушиваемый при скольжении шероховатых листков плевры, покрытых фибрином, во время вдоха и выдоха.',
      soundAudioFile: 'audio/Синдром фибринозного плеврита («сухой» плеврит).mp3',
      synthType: 'pleural_rub'
    },

    'pneumothorax': {
      id: 'pneumothorax',
      name: 'Синдром пневмоторакса',
      category: 'Поражение плевры',
      definition: 'Скопление свободного воздуха или газа в плевральной полости с коллапсом (компрессией) легочной ткани и смещением средостения (спонтанный, травматический или ятрогенный).',
      complaints: 'Внезапная резкая («кинжальная») боль в грудной клетке на стороне повреждения, нарастающая инспираторная одышка, чувство нехватки воздуха, сухой кашель, тахикардия, чувство страха.',
      inspection: 'Асимметрия грудной клетки: выбухание и расширение межреберий на стороне поражения, отсутствие дыхательных движений пораженной половины; бледность, холодный пот, акроцианоз.',
      palpation: 'Голосовое дрожание над областью пневмоторакса полностью отсутствует (воздушная подушка плевральной полости блокирует звуковую волну); смещение верхушечного толчка в здоровую сторону.',
      percussion: 'Громкий тимпанический перкуторный звук (при клапанном или напряженном пневмотораксе — тимпанический с металлическим оттенком) над всей пораженной половиной груди.',
      auscultation: 'Резкое ослабление или полное отсутствие дыхательных шумов (везикулярного дыхания) над всей половиной грудной клетки; бронхофония не проводится.',
      additional: 'Торакоцентез: эвакуация воздуха под давлением. Рентгеноскопия: отсутствие легочного рисунка на периферии, линия висцеральной плевры коллабированного легкого.',
      xrayImg: 'image/Синдром пневмоторакса.jpg',
      xrayDesc: 'Обширная зона абсолютного просветления по периферии легочного поля, полностью лишенная легочного рисунка, с четкой полоской висцеральной плевры коллабированного легкого; смещение средостения и сердца в здоровую сторону.',
      soundTitle: 'Резкое беззвучие над зоной свободного газа',
      soundDesc: 'Полная афония легкого: воздушный резервуар плевральной полости препятствует проведению респираторных звуковых колебаний на грудную клетку.',
      soundAudioFile: 'audio/Синдром пневмоторакса.mp3',
      synthType: 'silent'
    }
  };

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

    // Активация окна с анимацией
    if (syndromeModalOverlay) {
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
      case 'velcro':
        synFilterNode.type = 'highpass';
        synFilterNode.frequency.value = 950;
        synFilterNode.Q.value = 3.0;
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
      } else if (syn.synthType === 'velcro') {
        const crackle = Math.random() > 0.6 ? 1.2 : 0.2;
        g *= crackle;
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
        const wave = Math.sin(p * Math.PI * 6 + now * 0.008) * Math.sin(p * Math.PI);
        const noise = (Math.random() - 0.5) * 10 * intensity;
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

  // ================= ФОРМАТ 1: СЛЕПОЕ ПРОСЛУШИВАНИЕ =================
  const blindAudioPool = [
    {
      id: 'norm_vesicular',
      title: 'Везикулярное дыхание (Норма)',
      isNormal: true,
      soundAudioFile: 'audio/везикулярное дыхание.mp3',
      synthType: 'vesicular',
      explanation: 'Везикулярное дыхание — нормальный дыхательный шум, возникающий в результате колебания эластических стенок альвеол в момент их расправления при поступлении воздуха. Мягкий дующий звук, напоминающий тихий звук «ф». Выслушивается на протяжении всего вдоха и в первой трети выдоха (соотношение фаз вдох:выдох = 3:1).'
    },
    {
      id: 'norm_bronchial',
      title: 'Физиологическое бронхиальное дыхание (Норма)',
      isNormal: true,
      soundAudioFile: 'audio/бронхиальное дыхание.mp3',
      synthType: 'bronchial',
      explanation: 'Физиологическое бронхиальное дыхание — грубый ларинготрахеальный шум, напоминающий звук «х». Возникает при прохождении воздуха через голосовую щель. В норме выслушивается строго над гортанью, трахеей и в межлопаточной области на уровне Th3–Th4. Выдох значительно громче и продолжительнее вдоха (соотношение 4:5).'
    },
    {
      id: 'norm_puerile',
      title: 'Пуэрильное дыхание (Норма у подростков)',
      isNormal: true,
      soundAudioFile: 'audio/пуэрильное дыхание.mp3',
      synthType: 'puerile',
      explanation: 'Пуэрильное дыхание — физиологический вариант везикулярного дыхания у детей и подростков до 12–14 лет. Характеризуется большей громкостью, резкостью и более продолжительным выдохом из-за тонкой грудной стенки, высокой эластичности межальвеолярных перегородок и относительно узкого просвета бронхов.'
    },
    {
      id: 'bronchitis_acute',
      title: 'Бронхитический синдром (острый бронхит)',
      isNormal: false,
      soundAudioFile: 'audio/Бронхитический синдром.mp3',
      synthType: 'bronchitic',
      explanation: 'При бронхитическом синдроме на фоне воспаления слизистой оболочки бронхов выслушивается везикулярное или жесткое дыхание с рассеянными сухими гудящими и жужжащими хрипами. Хрипы образуются вследствие колебания вязкого экссудата и нитей слизи в просвете бронхов среднего и крупного калибра.'
    },
    {
      id: 'bronchitis_chronic',
      title: 'Бронхитический синдром (хронический бронхит)',
      isNormal: false,
      soundAudioFile: 'audio/Бронхитический синдром (хронический).mp3',
      synthType: 'bronchitic',
      explanation: 'При хроническом бронхите постоянная воспалительная инфильтрация, перибронхиальный склероз и гипертрофия слизистой приводят к жесткому дыханию с усиленным и удлиненным выдохом, а также обилию разнотембровых сухих и влажных среднепузырчатых хрипов, меняющих локализацию и тембр после покашливания.'
    },
    {
      id: 'obstruction',
      title: 'Синдром бронхиальной обструкции',
      isNormal: false,
      soundAudioFile: 'audio/Синдром бронхиальной обструкции.mp3',
      synthType: 'obstruction',
      explanation: 'Синдром бронхиальной обструкции (бронхиальная астма, ХОБЛ): генерализованное сужение бронхов мелкого и среднего калибра за счет бронхоспазма, отека слизистой и вязкого секрета. Аускультативно: резкое удлинение фазы выдоха (экспираторная одышка), ослабленное везикулярное дыхание и обилие высокотональных свистящих хрипов (wheezing).'
    },
    {
      id: 'consolidation_inflam',
      title: 'Синдром уплотнения легочной ткани (пневмония)',
      isNormal: false,
      soundAudioFile: 'audio/Синдром уплотнения легочной ткани воспалительного генеза.mp3',
      synthType: 'consolidation',
      explanation: 'Во II стадию крупозной пневмонии (стадия опеченения) альвеолы полностью заполнены фибринозным экссудатом, ткань легкого становится плотной и безвоздушной. Над зоной инфильтрации выслушивается громкое патологическое бронхиальное дыхание и звучные влажные хрипы; голосовое дрожание и бронхофония резко усилены.'
    },
    {
      id: 'consolidation_crepitation',
      title: 'Синдром воспалительного уплотнения (крепитация)',
      isNormal: false,
      soundAudioFile: 'audio/Крепитация.mp3',
      synthType: 'crepitation',
      explanation: 'Крепитация (crepitatio indux в I стадию прилива и redux в III стадию разрешения крупозной пневмонии) возникает исключительно на высоте глубокого вдоха в результате одномоментного разлипания стенок альвеол, потерявших сурфактант и смоченных экссудатом. Звук напоминает растирание пряди волос над ухом.'
    },
    {
      id: 'cavity',
      title: 'Синдром полости в легком',
      isNormal: false,
      soundAudioFile: 'audio/Синдром полости в легком.mp3',
      synthType: 'amphoric',
      explanation: 'При дренированной гладкостенной полости диаметром более 4 см, сообщающейся с крупным бронхом (абсцесс после вскрытия, туберкулезная каверна), акустический резонанс создает характерное амфорическое дыхание (гулкий пустой звук) и крупнопузырчатые влажные звучные хрипы.'
    },
    {
      id: 'dry_pleurisy',
      title: 'Синдром фибринозного («сухого») плеврита',
      isNormal: false,
      soundAudioFile: 'audio/Синдром фибринозного плеврита («сухой» плеврит).mp3',
      synthType: 'pleural_rub',
      explanation: 'Отложение фибрина делает листки плевры шероховатыми. При дыхательных экскурсиях трение листков вызывает шум трения плевры (хруст снега / скрип новой кожи), который выслушивается в обе фазы дыхания (вдох и выдох), усиливается при надавливании стетоскопом и не изменяется после кашля.'
    },
    {
      id: 'emphysema',
      title: 'Синдром эмфиземы легких',
      isNormal: false,
      soundAudioFile: 'audio/ослабленное везикулярное.mp3',
      synthType: 'weakened',
      explanation: 'При эмфиземе легких в результате деструкции межальвеолярных перегородок снижается эластичность легочной ткани и уменьшается экскурсия альвеол. При аускультации определяется резко ослабленное везикулярное дыхание над всеми легочными полями с удлиненным глухим выдохом.'
    },
    {
      id: 'atelectasis',
      title: 'Синдром ателектаза (обтурационный коллапс)',
      isNormal: false,
      soundAudioFile: null,
      synthType: 'silent',
      explanation: 'При полной обтурации крупного бронха опухолью или инородным телом воздух дистальнее препятствия рассасывается, легочная ткань спадается и перестает вентилироваться. Аускультативно над зоной ателектаза дыхательные шумы полностью отсутствуют (зона абсолютного беззвучия).'
    },
    {
      id: 'hydrothorax',
      title: 'Синдром гидроторакса (плевральный выпот)',
      isNormal: false,
      soundAudioFile: null,
      synthType: 'silent',
      explanation: 'Скопление жидкости (экссудата или транссудата) в плевральной полости оттесняет и сдавливает легкое. Плотный слой жидкости полностью поглощает акустические колебания, поэтому ниже косой линии Дамуазо дыхание не проводится и дыхательные шумы полностью отсутствуют.'
    },
    {
      id: 'alveolitis',
      title: 'Синдром альвеолита (интерстициального пневмонита)',
      isNormal: false,
      soundAudioFile: null,
      synthType: 'velcro',
      explanation: 'При фиброзирующем альвеолите фиброзная перестройка межальвеолярных стенок сопровождается формированием нежной двусторонней крепитации типа «липучки» (Velcro) или «треска целлофана» в конце вдоха преимущественно в заднебазальных сегментах.'
    }
  ];

  let blindCurrentTarget = null;
  let blindScore = 0;
  let blindTotal = 0;
  let blindAnswered = false;
  let blindIsPlaying = false;
  let currentBlindAudio = null;
  let blindSynthAnimId = null;
  let blindNoiseNode = null;
  let blindFilterNode = null;
  let blindGainNode = null;
  let blindMasterGain = null;

  const blindStatsScoreEl = document.getElementById('blindStatsScore');
  const blindStatsTotalEl = document.getElementById('blindStatsTotal');
  const blindStatsPercentEl = document.getElementById('blindStatsPercent');
  const blindResetStatsBtn = document.getElementById('blindResetStatsBtn');

  const blindAudioLabelEl = document.getElementById('blindAudioLabel');
  const blindPhaseBadgeEl = document.getElementById('blindPhaseBadge');
  const blindPlayBtn = document.getElementById('blindPlayBtn');
  const blindPlayIcon = document.getElementById('blindPlayIcon');
  const blindPauseIcon = document.getElementById('blindPauseIcon');
  const blindAudioCanvas = document.getElementById('blindAudioCanvas');
  const blindVolumeSlider = document.getElementById('blindVolumeSlider');
  const blindCanvasCtx = blindAudioCanvas ? blindAudioCanvas.getContext('2d') : null;

  const blindOptionsGrid = document.getElementById('blindOptionsGrid');
  const blindFeedbackBox = document.getElementById('blindFeedbackBox');
  const blindFeedbackBadge = document.getElementById('blindFeedbackBadge');
  const blindFeedbackTitle = document.getElementById('blindFeedbackTitle');
  const blindFeedbackDesc = document.getElementById('blindFeedbackDesc');
  const blindNextBtn = document.getElementById('blindNextBtn');

  function updateBlindStats() {
    if (blindStatsScoreEl) blindStatsScoreEl.textContent = blindScore;
    if (blindStatsTotalEl) blindStatsTotalEl.textContent = blindTotal;
    const pct = blindTotal > 0 ? Math.round((blindScore / blindTotal) * 100) : 0;
    if (blindStatsPercentEl) blindStatsPercentEl.textContent = `${pct}%`;
  }

  function loadNewBlindQuestion() {
    stopBlindAudio();
    blindAnswered = false;

    if (blindFeedbackBox) blindFeedbackBox.style.display = 'none';

    let candidates = blindAudioPool;
    if (blindCurrentTarget && blindAudioPool.length > 1) {
      candidates = blindAudioPool.filter(item => item.id !== blindCurrentTarget.id);
    }
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    blindCurrentTarget = target;

    const otherPool = blindAudioPool.filter(item => item.id !== target.id);
    const shuffledOthers = [...otherPool].sort(() => 0.5 - Math.random());
    const distractors = shuffledOthers.slice(0, 3);
    const options = [target, ...distractors].sort(() => 0.5 - Math.random());

    if (blindPhaseBadgeEl) {
      blindPhaseBadgeEl.textContent = 'Готов к воспроизведению';
      blindPhaseBadgeEl.className = 'player-phase-badge';
    }

    if (blindAudioLabelEl) {
      blindAudioLabelEl.textContent = 'Случайная аудиозапись дыхания';
    }

    if (blindOptionsGrid) {
      blindOptionsGrid.innerHTML = '';
      while (blindOptionsGrid.firstChild) blindOptionsGrid.removeChild(blindOptionsGrid.firstChild);
      const letters = ['А', 'Б', 'В', 'Г'];
      options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-option-choice';
        btn.setAttribute('data-id', opt.id);
        btn.innerHTML = `
          <span class="choice-letter">${letters[idx]}</span>
          <span>${opt.title}</span>
        `;
        btn.addEventListener('click', () => handleBlindOptionSelect(opt, btn));
        blindOptionsGrid.appendChild(btn);
      });
    }

    drawBlindCanvasIdle();
  }

  function handleBlindOptionSelect(selectedOption, clickedBtn) {
    if (blindAnswered || !blindCurrentTarget) return;
    blindAnswered = true;
    blindTotal++;

    const isCorrect = selectedOption.id === blindCurrentTarget.id;
    if (isCorrect) {
      blindScore++;
      clickedBtn.classList.add('correct');
      if (blindFeedbackBadge) {
        blindFeedbackBadge.textContent = 'Верно!';
        blindFeedbackBadge.className = 'feedback-badge correct';
      }
      showToast('Верно! Диагноз подтвержден');
    } else {
      clickedBtn.classList.add('wrong');
      const correctBtn = blindOptionsGrid.querySelector(`[data-id="${blindCurrentTarget.id}"]`);
      if (correctBtn) correctBtn.classList.add('correct');
      if (blindFeedbackBadge) {
        blindFeedbackBadge.textContent = 'Неверно!';
        blindFeedbackBadge.className = 'feedback-badge wrong';
      }
      showToast('Неверно. Ознакомьтесь с обоснованием');
    }

    const allBtns = blindOptionsGrid.querySelectorAll('.quiz-option-choice');
    allBtns.forEach(b => b.classList.add('disabled'));

    if (blindFeedbackTitle) blindFeedbackTitle.textContent = blindCurrentTarget.title;
    if (blindFeedbackDesc) blindFeedbackDesc.textContent = blindCurrentTarget.explanation;
    if (blindFeedbackBox) blindFeedbackBox.style.display = 'block';

    updateBlindStats();
  }

  function drawBlindCanvasIdle() {
    if (!blindCanvasCtx || !blindAudioCanvas) return;
    const w = blindAudioCanvas.width = blindAudioCanvas.offsetWidth || 300;
    const h = blindAudioCanvas.height = blindAudioCanvas.offsetHeight || 56;
    blindCanvasCtx.clearRect(0, 0, w, h);
    blindCanvasCtx.strokeStyle = '#334155';
    blindCanvasCtx.lineWidth = 1.5;
    blindCanvasCtx.beginPath();
    blindCanvasCtx.moveTo(0, h / 2);
    blindCanvasCtx.lineTo(w, h / 2);
    blindCanvasCtx.stroke();
  }

  function toggleBlindPlayback() {
    if (!blindCurrentTarget) return;
    initAudioContext();

    if (blindIsPlaying) {
      stopBlindAudio();
    } else {
      playBlindAudio();
    }
  }

  function playBlindAudio() {
    if (!blindCurrentTarget) return;
    initAudioContext();
    blindIsPlaying = true;

    if (blindPlayIcon) blindPlayIcon.style.display = 'none';
    if (blindPauseIcon) blindPauseIcon.style.display = 'block';
    if (blindPlayBtn) blindPlayBtn.classList.add('playing');

    const vol = blindVolumeSlider ? parseFloat(blindVolumeSlider.value) / 100 : 0.85;

    if (blindCurrentTarget.soundAudioFile) {
      if (!currentBlindAudio) {
        currentBlindAudio = new Audio(blindCurrentTarget.soundAudioFile);
        currentBlindAudio.loop = true;
      }
      currentBlindAudio.volume = vol;
      currentBlindAudio.play().catch(() => {
        startBlindSynthesis(blindCurrentTarget);
      });
      runBlindVisualizerLoop(blindCurrentTarget);
    } else {
      startBlindSynthesis(blindCurrentTarget);
      runBlindVisualizerLoop(blindCurrentTarget);
    }
  }

  function startBlindSynthesis(item) {
    if (!audioCtx) return;

    try {
      if (blindNoiseNode) { blindNoiseNode.stop(); blindNoiseNode.disconnect(); blindNoiseNode = null; }
    } catch (e) {}

    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.4;
    }

    blindNoiseNode = audioCtx.createBufferSource();
    blindNoiseNode.buffer = noiseBuffer;
    blindNoiseNode.loop = true;

    blindFilterNode = audioCtx.createBiquadFilter();
    blindGainNode = audioCtx.createGain();
    blindMasterGain = audioCtx.createGain();

    const vol = blindVolumeSlider ? parseFloat(blindVolumeSlider.value) / 100 : 0.85;
    blindMasterGain.gain.value = vol;

    switch (item.synthType) {
      case 'pleural_rub':
        blindFilterNode.type = 'bandpass';
        blindFilterNode.frequency.value = 540;
        blindFilterNode.Q.value = 3.6;
        break;
      case 'consolidation':
        blindFilterNode.type = 'bandpass';
        blindFilterNode.frequency.value = 760;
        blindFilterNode.Q.value = 2.8;
        break;
      case 'obstruction':
        blindFilterNode.type = 'bandpass';
        blindFilterNode.frequency.value = 880;
        blindFilterNode.Q.value = 4.5;
        break;
      case 'velcro':
        blindFilterNode.type = 'highpass';
        blindFilterNode.frequency.value = 920;
        blindFilterNode.Q.value = 3.0;
        break;
      case 'amphoric':
        blindFilterNode.type = 'bandpass';
        blindFilterNode.frequency.value = 320;
        blindFilterNode.Q.value = 5.2;
        break;
      case 'silent':
        blindFilterNode.type = 'lowpass';
        blindFilterNode.frequency.value = 150;
        blindFilterNode.Q.value = 1.0;
        break;
      default:
        blindFilterNode.type = 'lowpass';
        blindFilterNode.frequency.value = 450;
        blindFilterNode.Q.value = 1.5;
        break;
    }

    blindNoiseNode.connect(blindFilterNode);
    blindFilterNode.connect(blindGainNode);
    blindGainNode.connect(blindMasterGain);
    blindMasterGain.connect(audioCtx.destination);

    blindNoiseNode.start(0);
  }

  function stopBlindAudio() {
    if (!isAppInitialized) return;
    blindIsPlaying = false;
    if (blindPlayIcon) blindPlayIcon.style.display = 'block';
    if (blindPauseIcon) blindPauseIcon.style.display = 'none';
    if (blindPlayBtn) blindPlayBtn.classList.remove('playing');

    if (currentBlindAudio) {
      currentBlindAudio.pause();
      currentBlindAudio.currentTime = 0;
      currentBlindAudio = null;
    }

    if (blindGainNode && audioCtx) {
      try { blindGainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05); } catch (e) {}
    }

    if (blindNoiseNode) {
      try { blindNoiseNode.stop(); } catch (e) {}
      try { blindNoiseNode.disconnect(); } catch (e) {}
      blindNoiseNode = null;
    }

    cancelAnimationFrame(blindSynthAnimId);

    if (blindPhaseBadgeEl) {
      blindPhaseBadgeEl.textContent = 'Готов к воспроизведению';
      blindPhaseBadgeEl.className = 'player-phase-badge';
    }

    drawBlindCanvasIdle();
  }

  function runBlindVisualizerLoop(item) {
    if (!blindIsPlaying) return;

    const now = performance.now();
    const cycle = (now / 1000) % 3.6;
    const progress = cycle / 3.6;
    const intensity = Math.sin(progress * Math.PI);

    if (blindGainNode && audioCtx) {
      let g = intensity * 0.8;
      if (item.synthType === 'silent') g *= 0.1;
      else if (item.synthType === 'pleural_rub') {
        const friction = Math.sin(now * 0.03) > 0.2 ? 1.0 : 0.25;
        g *= friction;
      } else if (item.synthType === 'velcro') {
        const crackle = Math.random() > 0.6 ? 1.2 : 0.2;
        g *= crackle;
      }
      blindGainNode.gain.setTargetAtTime(Math.max(0, g), audioCtx.currentTime, 0.03);
    }

    if (blindPhaseBadgeEl) {
      if (progress < 0.55) {
        blindPhaseBadgeEl.textContent = 'Фаза вдоха';
        blindPhaseBadgeEl.className = 'player-phase-badge inhale';
      } else {
        blindPhaseBadgeEl.textContent = 'Фаза выдоха';
        blindPhaseBadgeEl.className = 'player-phase-badge exhale';
      }
    }

    if (blindCanvasCtx && blindAudioCanvas) {
      const w = blindAudioCanvas.width = blindAudioCanvas.offsetWidth;
      const h = blindAudioCanvas.height = blindAudioCanvas.offsetHeight;

      blindCanvasCtx.clearRect(0, 0, w, h);

      blindCanvasCtx.strokeStyle = '#334155';
      blindCanvasCtx.lineWidth = 1;
      blindCanvasCtx.beginPath();
      blindCanvasCtx.moveTo(0, h / 2);
      blindCanvasCtx.lineTo(w, h / 2);
      blindCanvasCtx.stroke();

      blindCanvasCtx.lineWidth = 2.5;
      blindCanvasCtx.strokeStyle = '#14b8a6';
      blindCanvasCtx.beginPath();

      const points = 70;
      const step = w / points;

      for (let i = 0; i <= points; i++) {
        const x = i * step;
        const p = i / points;
        const wave = Math.sin(p * Math.PI * 6 + now * 0.008) * Math.sin(p * Math.PI);
        const noise = (Math.random() - 0.5) * 12 * intensity;
        const y = (h / 2) - (wave * (h * 0.38) * intensity) + noise;

        if (i === 0) blindCanvasCtx.moveTo(x, y);
        else blindCanvasCtx.lineTo(x, y);
      }
      blindCanvasCtx.stroke();
    }

    blindSynthAnimId = requestAnimationFrame(() => runBlindVisualizerLoop(item));
  }

  if (blindPlayBtn) {
    blindPlayBtn.addEventListener('click', toggleBlindPlayback);
  }

  if (blindVolumeSlider) {
    blindVolumeSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) / 100;
      if (currentBlindAudio) currentBlindAudio.volume = val;
      if (blindMasterGain && audioCtx) {
        blindMasterGain.gain.setTargetAtTime(val, audioCtx.currentTime, 0.05);
      }
    });
  }

  if (blindNextBtn) {
    blindNextBtn.addEventListener('click', loadNewBlindQuestion);
  }

  if (blindResetStatsBtn) {
    blindResetStatsBtn.addEventListener('click', () => {
      blindScore = 0;
      blindTotal = 0;
      updateBlindStats();
      showToast('Статистика слепого теста сброшена');
    });
  }

  // ================= ФОРМАТ 2: ТЕОРЕТИЧЕСКИЙ ТЕСТ =================
  const theoryQuestionsBank = [
    {
      question: 'К общим методикам рентгенологического исследования органов дыхания относятся:',
      options: [
        'Бронхография',
        'Флюорография',
        'Ангиопульмонография',
        'Плеврография'
      ],
      correct: 1,
      title: 'Методики лучевой диагностики органов дыхания',
      explanation: 'Согласно учебному пособию кафедры пропедевтики (стр. 4–5), к общим методикам рентгенологического исследования относятся рентгеноскопия, обзорная и прицельная рентгенография, линейная томография и профилактическая флюорография. Бронхография, ангиопульмонография и плеврография — это специальные методики, требующие искусственного введения рентгеноконтрастных веществ.'
    },
    {
      question: 'На обзорной рентгенограмме грудной клетки в прямой проекции четко визуализируются анатомические границы между всеми долями и сегментами легких:',
      options: [
        'Верно, границы очерчены междолевой плеврой',
        'Неверно, рентгеновские лучи не разделяют паренхиму на доли без специальных проекций и ориентиров',
        'Верно только для правого легкого',
        'Верно только при выполнении снимка на форсированном выдохе'
      ],
      correct: 1,
      title: 'Рентгеновская анатомия долей и сегментов',
      explanation: 'Неверно. Рентгеновские лучи, проходя через легочную паренхиму, четко не выделяют топографические границы между долями и сегментами. Врачи-рентгенологи определяют их проекцию по костным анатомическим маркерам (Th3, 4-е ребро, купола диафрагмы) и обязательно исследуют снимок в боковой проекции (пособие, стр. 9).'
    },
    {
      question: 'К основным рентгенологическим синдромам поражения органов дыхания НЕ относится:',
      options: [
        'Синдром ограниченного затемнения',
        'Синдром круглой тени',
        'Синдром диссеминированных костных изменений',
        'Синдром обширного просветления'
      ],
      correct: 2,
      title: 'Рентгенологические синдромы в пульмонологии',
      explanation: 'В академическую классификацию синдромов поражения легочной паренхимы (пособие, стр. 11–12) входят: синдромы обширного и ограниченного затемнения, круглой тени, очаговой диссеминации, обширного и ограниченного просветления, изменения легочного рисунка и корней. Костные диссеминации не относятся к пульмонологическим синдромам.'
    },
    {
      question: 'В чем заключается принципиальное диагностическое преимущество метода компьютерной томографии (КТ) легких?',
      options: [
        'В получении послойного изображения структур легких без эффекта суммации (наложения) теней',
        'В прямой визуализации капиллярного кровотока в эритроцитах',
        'В измерении давления в малом круге методом импульсного допплера',
        'В оптическом исследовании слизистой трахеобронхиального дерева'
      ],
      correct: 0,
      title: 'Принцип и преимущества компьютерной томографии',
      explanation: 'КТ заключается в получении тонких послойных срезов высокой разрешающей способности. Это устраняет эффект суммации анатомических теней, свойственный плоской рентгенографии, и позволяет визуализировать очаги размером от 1 мм, стенки бронхов и сосуды малого круга (пособие, стр. 13).'
    },
    {
      question: 'На каком анатомическом уровне в норме визуализируется правый купол диафрагмы на обзорном рентгеновском снимке?',
      options: [
        'На уровне 4-го ребра',
        'На уровне 5-го ребра',
        'На уровне 6-го ребра',
        'На уровне 8-го ребра'
      ],
      correct: 2,
      title: 'Рентгенографическая норма куполов диафрагмы',
      explanation: 'На обзорной рентгенограмме грудной клетки правый купол диафрагмы в норме расположен спереди на уровне 6-го ребра, а левый купол — на 1 ребро ниже (на уровне 7-го ребра) вследствие анатомического давления печени справа (пособие, стр. 7).'
    },
    {
      question: 'Что из перечисленного НЕ относится к причинам синдрома воспалительного уплотнения легочной ткани?',
      options: [
        'Микробная пневмония (долевая или очаговая)',
        'Обтурационный ателектаз легкого',
        'Инфильтративный туберкулез легких',
        'Инфаркт-пневмония при тромбоэмболии легочной артерии'
      ],
      correct: 1,
      title: 'Генез уплотнения легочной ткани',
      explanation: 'Ателектаз — это синдром спадения легочной ткани НЕвоспалительного генеза (обтурационного или компрессионного). Микробная пневмония, туберкулез и инфаркт-пневмония представляют собой воспалительную инфильтрацию альвеол (пособие, стр. 20, 23).'
    },
    {
      question: 'Какой рентгенологический феномен характерен для воспалительной инфильтрации (микробной пневмонии) на рентгенограмме и КТ?',
      options: [
        'Интенсивная гомогенная тень со смещением средостения в больную сторону',
        'Неоднородное затемнение, на фоне которого видны воздушные полоски просветов бронхов (симптом воздушной бронхографии)',
        'Полное отсутствие легочного рисунка с тонким контуром спавшегося легкого',
        'Округлое тонкостенное просветление с горизонтальным уровнем жидкости'
      ],
      correct: 1,
      title: 'Симптом воздушной бронхографии (Air bronchogram)',
      explanation: 'При микробной пневмонии экссудат заполняет альвеолы, в то время как хрящевые и мышечные бронхи сохраняют просвет. На фоне интенсивного затенения визуализируются разветвленные полоски воздуха — признак воздушной бронхографии (пособие, стр. 21–22).'
    },
    {
      question: 'Рентгенологическая картина «матового стекла» (двустороннее мелкосетчатое усиление легочного рисунка) патогномонична:',
      options: [
        'Для сухого фибринозного плеврита',
        'Для гидроторакса',
        'Для идиопатического интерстициального пневмонита (альвеолита)',
        'Для напряженного пневмоторакса'
      ],
      correct: 2,
      title: 'Интерстициальный пневмонит (альвеолит)',
      explanation: 'Двустороннее сетчатое усиление легочного рисунка по типу «матового стекла» с исходом в кистозную трансформацию («сотовое легкое») характерно для диффузного воспаления межальвеолярного интерстиция при альвеолитах (пособие, стр. 27–29).'
    },
    {
      question: 'В какую сторону смещаются органы средостения при напряженном (клапанном) пневмотораксе?',
      options: [
        'В здоровую сторону (противоположную поражению)',
        'В сторону поражения (за счет спадения легкого)',
        'Средостение остается строго неподвижным',
        'Смещается только купол диафрагмы кверху'
      ],
      correct: 0,
      title: 'Смещение средостения при напряженном пневмотораксе',
      explanation: 'При клапанном пневмотораксе воздух при каждом вдохе накапливается в плевральной полости, формируя высокое положительное давление. Это вызывает спадение легкого (компрессионный ателектаз), уплощение диафрагмы книзу и резкое смещение средостения в ЗДОРОВУЮ сторону (пособие, стр. 38–40).'
    },
    {
      question: 'Куда смещаются органы средостения при массивном гидротораксе (плевральном выпоте)?',
      options: [
        'В сторону поражения',
        'В здоровую сторону',
        'Средостение не смещается',
        'Смещается строго кзади к позвоночнику'
      ],
      correct: 1,
      title: 'Топография средостения при гидротораксе',
      explanation: 'Скопление значительного объема жидкости в плевральной полости оттесняет легкое и органы средостения в сторону, противоположную выпоту (в здоровую сторону), что клинически выявляется образованием притупления в треугольнике Раухфуса-Грокко (пособие, стр. 35–36, 40).'
    },
    {
      question: 'В какую фазу дыхания и почему выслушивается истинная крепитация (crepitatio indux / redux)?',
      options: [
        'В фазу выдоха за счет колебания густого секрета в бронхиолах',
        'Исключительно на высоте глубокого вдоха вследствие одномоментного разлипания смоченных экссудатом альвеол',
        'В обе фазы дыхания за счет шероховатости плевральных листков',
        'В начале вдоха из-за колебания голосовых складок'
      ],
      correct: 1,
      title: 'Механизм образования крепитации',
      explanation: 'Крепитация — чисто альвеолярный феномен. В фазу выдоха пораженные альвеолы спадаются и склеиваются экссудатом, а на высоте максимального вдоха под давлением входящего воздуха одновременно отлипают, порождая хрустящий звук, подобный треску сухих волос (МП_1, стр. 34–35).'
    },
    {
      question: 'Как изменяются голосовое дрожание и бронхофония при синдроме уплотнения легочной ткани (II стадия долевой пневмонии)?',
      options: [
        'Резко ослабляются или исчезают',
        'Резко усиливаются над областью уплотнения',
        'Остаются строго нормальными и симметричными',
        'Приобретают металлический пуэрильный тембр'
      ],
      correct: 1,
      title: 'Физикальные свойства уплотненной легочной ткани',
      explanation: 'Плотная безвоздушная легочная ткань является великолепным проводником звука по сравнению с пористой воздушной тканью здорового легкого. Поэтому голосовое дрожание (пальпация) и бронхофония (аускультация) резко усиливаются над очагом инфильтрации (пособие, стр. 21).'
    },
    {
      question: 'Какой перкуторный звук характерен для синдрома эмфиземы легких?',
      options: [
        'Абсолютно тупой (бедренный)',
        'Притупленный',
        'Коробочный перкуторный звук',
        'Звук треснувшего горшка'
      ],
      correct: 2,
      title: 'Перкуторные признаки эмфиземы легких',
      explanation: 'При эмфиземе легких в результате деструкции межальвеолярных перегородок воздушность ткани резко возрастает, а ее эластическое напряжение падает. При перкуссии выслушивается громкий, низкий звук с характерным тимпаническим оттенком — коробочный звук (пособие, стр. 26).'
    },
    {
      question: 'Какие аускультативные феномены выслушиваются над крупной дренированной полостью в легком (после вскрытия абсцесса)?',
      options: [
        'Полное отсутствие дыхательных шумов и хрипов',
        'Патологическое бронхиальное (амфорическое) дыхание и крупнопузырчатые звонкие влажные хрипы',
        'Пуэрильное дыхание без хрипов',
        'Ослабленное везикулярное дыхание и нежная крепитация'
      ],
      correct: 1,
      title: 'Аускультация синдрома полости в легком',
      explanation: 'Опорожненная полость диаметром более 4 см с гладкими стенками, сообщающаяся с бронхом, работает как акустический резонатор, создавая амфорическое бронхиальное дыхание. Наличие жидкого секрета у устья бронха обуславливает влажные крупнопузырчатые звучные хрипы (пособие, стр. 30).'
    },
    {
      question: 'Каков решающий клинический признак, позволяющий отличить шум трения плевры от влажных хрипов и крепитации?',
      options: [
        'Шум трения плевры выслушивается только на выдохе и исчезает в положении сидя',
        'Шум трения плевры выслушивается в обе фазы дыхания (вдох и выдох), усиливается при надавливании стетоскопом и не изменяется после покашливания',
        'Шум трения плевры полностью исчезает при форсированном глубоком дыхании',
        'Шум трения плевры выслушивается строго над верхушками легких'
      ],
      correct: 1,
      title: 'Дифференциальная диагностика плевральных шумов',
      explanation: 'Шум трения плевры возникает вне бронхиального дерева при трении листков париетальной и висцеральной плевры. Он слышен и на вдохе, и на выдохе, усиливается при надавливании головкой стетоскопа, сохраняется при имитации дыхания животом с зажатым ртом и носом и никогда не меняется после кашля (МП_1, стр. 37).'
    }
  ];

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

  // Первоначальный запуск тестов
  loadNewBlindQuestion();
  loadTheoryQuestion(0);

  // Ресайз холста при изменении окна
  window.addEventListener('resize', () => {
    if (!blindIsPlaying) drawBlindCanvasIdle();
  });

  // Первоначальная инициализация аускультации
  setProjection('anterior');
  selectBreathingType('vesicular-normal');

  isAppInitialized = true;
});
