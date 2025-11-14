// --- NAVIGATION ENTRE SECTIONS ---

const navButtons = document.querySelectorAll(".nav-btn");
const sections = document.querySelectorAll(".section");

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.getAttribute("data-section");

    navButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    sections.forEach((section) => {
      if (section.id === targetId) {
        section.classList.add("active");
      } else {
        section.classList.remove("active");
      }
    });
  });
});

// --- MODULE PVE ---

let mediaRecorder = null;
let recordingChunks = [];
let isRecording = false;
let recordStartTime = null;
let timerInterval = null;

const startBtn = document.getElementById("start-record");
const stopBtn = document.getElementById("stop-record");
const timerEl = document.getElementById("record-timer");
const statusEl = document.getElementById("record-status");
const recordingsList = document.getElementById("recordings-list");

function updateStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function startTimer() {
  recordStartTime = Date.now();
  timerEl.textContent = "00:00";

  timerInterval = setInterval(() => {
    const diff = Math.floor((Date.now() - recordStartTime) / 1000);
    timerEl.textContent = formatTime(diff);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

async function startRecording() {
  if (isRecording) return;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    updateStatus("Votre navigateur ne supporte pas l'enregistrement audio.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    recordingChunks = [];
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordingChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordingChunks, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      appendRecording(url, blob);
      stream.getTracks().forEach((t) => t.stop());
    };

    mediaRecorder.start();
    isRecording = true;
    startTimer();
    updateStatus("Enregistrement en cours… restez attentif à l’ambiance.");
    startBtn.disabled = true;
    stopBtn.disabled = false;
  } catch (err) {
    console.error(err);
    updateStatus("Permission refusée ou erreur lors de l'accès au micro.");
  }
}

function stopRecording() {
  if (!isRecording || !mediaRecorder) return;
  mediaRecorder.stop();
  isRecording = false;
  stopTimer();
  updateStatus("Enregistrement terminé. Écoutez et analysez vos PVE.");
  startBtn.disabled = false;
  stopBtn.disabled = true;
}

function appendRecording(url, blob) {
  const emptyItem = recordingsList.querySelector(".empty-state");
  if (emptyItem) {
    emptyItem.remove();
  }

  const li = document.createElement("li");
  li.className = "recording-item";

  const header = document.createElement("div");
  header.className = "recording-header";

  const title = document.createElement("span");
  const now = new Date();
  const label = `PVE – ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
  title.textContent = label;

  const sizeSpan = document.createElement("span");
  sizeSpan.className = "recording-meta";
  const sizeKb = Math.round(blob.size / 1024);
  sizeSpan.textContent = `${sizeKb} Ko`;

  header.appendChild(title);
  header.appendChild(sizeSpan);

  const audio = document.createElement("audio");
  audio.className = "recording-audio";
  audio.controls = true;
  audio.src = url;

  const meta = document.createElement("div");
  meta.className = "recording-meta";
  meta.textContent = "Conseil : notez les moments où vous percevez quelque chose.";

  li.appendChild(header);
  li.appendChild(audio);
  li.appendChild(meta);

  recordingsList.prepend(li);
}

if (startBtn && stopBtn) {
  startBtn.addEventListener("click", startRecording);
  stopBtn.addEventListener("click", stopRecording);
}

// --- MODULE SPIRIT BOX ---

let audioCtx = null;
let noiseSource = null;
let gainNode = null;
let sweepInterval = null;
let spiritRunning = false;
let fragmentInterval = null;

const spiritStartBtn = document.getElementById("spirit-start");
const spiritStopBtn = document.getElementById("spirit-stop");
const spiritStatus = document.getElementById("spirit-status");
const spiritVolumeSlider = document.getElementById("spirit-volume");
const spiritVolumeValue = document.getElementById("spirit-volume-value");
const spiritSpeedSlider = document.getElementById("spirit-speed");
const spiritSpeedValue = document.getElementById("spirit-speed-value");
const spiritLog = document.getElementById("spirit-log");

const fragmentPool = [
  "oui",
  "non",
  "ici",
  "toi",
  "moi",
  "aide",
  "partir",
  "reste",
  "là",
  "froid",
  "ombre",
  "écoute",
  "douleur",
  "calme",
  "amour",
  "peur",
  "je suis",
  "près",
  "loin",
  "au-dessus",
  "en dessous"
];

function setSpiritStatus(text) {
  if (spiritStatus) spiritStatus.textContent = text;
}

function createNoiseBuffer(ctx, durationSeconds = 2) {
  const sampleRate = ctx.sampleRate;
  const frameCount = sampleRate * durationSeconds;
  const buffer = ctx.createBuffer(1, frameCount, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < frameCount; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  return buffer;
}

function updateSpiritVolume() {
  const value = Number(spiritVolumeSlider.value);
  spiritVolumeValue.textContent = value;
  if (gainNode) {
    gainNode.gain.value = value / 100;
  }
}

function updateSpiritSpeed() {
  const value = Number(spiritSpeedSlider.value);
  spiritSpeedValue.textContent = value;
  if (sweepInterval && spiritRunning) {
    clearInterval(sweepInterval);
    startSweepInterval();
  }
}

function startSweepInterval() {
  const period = Number(spiritSpeedSlider.value);
  if (!gainNode) return;

  sweepInterval = setInterval(() => {
    if (!spiritRunning) return;
    const vol = Number(spiritVolumeSlider.value) / 100;
    gainNode.gain.value = gainNode.gain.value > 0 ? 0 : vol;
  }, period);
}

function appendSpiritFragment() {
  if (!spiritLog) return;

  const empty = spiritLog.querySelector(".empty-state");
  if (empty) empty.remove();

  const fragmentText = fragmentPool[Math.floor(Math.random() * fragmentPool.length)];
  const now = new Date();
  const timeLabel = now.toLocaleTimeString();

  const p = document.createElement("p");
  p.className = "spirit-fragment";

  const timeSpan = document.createElement("span");
  timeSpan.className = "spirit-fragment-time";
  timeSpan.textContent = `[${timeLabel}]`;

  const textSpan = document.createElement("span");
  textSpan.textContent = fragmentText;

  p.appendChild(timeSpan);
  p.appendChild(textSpan);

  spiritLog.prepend(p);
}

function startFragmentStream() {
  fragmentInterval = setInterval(() => {
    if (!spiritRunning) return;
    const chance = Math.random();
    if (chance < 0.6) {
      appendSpiritFragment();
    }
  }, 1800);
}

async function startSpiritBox() {
  if (spiritRunning) return;

  try {
    if (!audioCtx || audioCtx.state === "closed") {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    const buffer = createNoiseBuffer(audioCtx, 2);
    noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    gainNode = audioCtx.createGain();
    gainNode.gain.value = Number(spiritVolumeSlider.value) / 100;

    noiseSource.connect(gainNode).connect(audioCtx.destination);
    noiseSource.start();

    spiritRunning = true;
    startSweepInterval();
    startFragmentStream();

    spiritStartBtn.disabled = true;
    spiritStopBtn.disabled = false;
    setSpiritStatus(
      "Spirit Box en cours… utilisez-la comme support d’écoute et d’intuition, pas comme mesure scientifique."
    );
  } catch (e) {
    console.error(e);
    setSpiritStatus("Erreur lors de l'initialisation audio. Vérifiez votre navigateur.");
  }
}

function stopSpiritBox() {
  spiritRunning = false;

  if (noiseSource) {
    try {
      noiseSource.stop();
    } catch (e) {}
    noiseSource.disconnect();
    noiseSource = null;
  }

  if (sweepInterval) {
    clearInterval(sweepInterval);
    sweepInterval = null;
  }

  if (fragmentInterval) {
    clearInterval(fragmentInterval);
    fragmentInterval = null;
  }

  spiritStartBtn.disabled = false;
  spiritStopBtn.disabled = true;
  setSpiritStatus("Spirit Box arrêtée. Prenez un moment pour noter vos ressentis.");
}

if (spiritStartBtn && spiritStopBtn) {
  spiritStartBtn.addEventListener("click", startSpiritBox);
  spiritStopBtn.addEventListener("click", stopSpiritBox);
}

if (spiritVolumeSlider && spiritVolumeValue) {
  spiritVolumeSlider.addEventListener("input", updateSpiritVolume);
  updateSpiritVolume();
}

if (spiritSpeedSlider && spiritSpeedValue) {
  spiritSpeedSlider.addEventListener("input", updateSpiritSpeed);
  updateSpiritSpeed();
}

// --- MODULE OUI-JA ---

const ouijaBoard = document.getElementById("ouija-board");
const ouijaPlanchette = document.getElementById("ouija-planchette");
const ouijaClearBtn = document.getElementById("ouija-clear");
const ouijaAutoBtn = document.getElementById("ouija-auto");
const ouijaStatus = document.getElementById("ouija-status");
const ouijaCurrentEl = document.getElementById("ouija-current");
const ouijaHistoryEl = document.getElementById("ouija-history");

let ouijaCurrentMessage = "";
let ouijaAutoTimer = null;

function setOuijaStatus(text) {
  if (ouijaStatus) {
    ouijaStatus.textContent = text;
  }
}

function updateOuijaCurrent() {
  if (!ouijaCurrentEl) return;

  if (!ouijaCurrentMessage.trim()) {
    ouijaCurrentEl.textContent = "(aucun symbole pour l’instant)";
  } else {
    ouijaCurrentEl.textContent = ouijaCurrentMessage;
  }
}

function addToOuijaHistory(finalMessage) {
  if (!ouijaHistoryEl) return;

  const empty = ouijaHistoryEl.querySelector(".empty-state");
  if (empty) empty.remove();

  const entry = document.createElement("div");
  entry.className = "ouija-history-entry";

  const now = new Date();
  const timeLabel = now.toLocaleString();

  entry.textContent = `[${timeLabel}] ${finalMessage}`;
  ouijaHistoryEl.prepend(entry);
}

function movePlanchetteToCell(cell) {
  if (!ouijaBoard || !ouijaPlanchette || !cell) return;

  const boardRect = ouijaBoard.getBoundingClientRect();
  const cellRect = cell.getBoundingClientRect();

  const centerX = cellRect.left + cellRect.width / 2 - boardRect.left;
  const centerY = cellRect.top + cellRect.height / 2 - boardRect.top;

  ouijaPlanchette.style.left = `${centerX}px`;
  ouijaPlanchette.style.top = `${centerY}px`;
}

function applyOuijaSymbol(symbol) {
  switch (symbol) {
    case "ESPACE":
      ouijaCurrentMessage += " ";
      setOuijaStatus("Espace ajouté au message.");
      break;
    case "EFFACER":
      ouijaCurrentMessage = ouijaCurrentMessage.slice(0, -1);
      setOuijaStatus("Dernier caractère effacé.");
      break;
    case "FIN":
      if (ouijaCurrentMessage.trim()) {
        addToOuijaHistory(ouijaCurrentMessage.trim());
        setOuijaStatus("Message enregistré dans l’historique. Vous pouvez recommencer.");
        ouijaCurrentMessage = "";
      } else {
        setOuijaStatus("Aucun message à enregistrer pour l’instant.");
      }
      break;
    default:
      if (["OUI", "NON", "MERCI", "DEBUT", "STOP", "?"].includes(symbol)) {
        ouijaCurrentMessage += (ouijaCurrentMessage ? " " : "") + symbol;
      } else {
        ouijaCurrentMessage += symbol;
      }
      setOuijaStatus(`Symbole ajouté : ${symbol}`);
      break;
  }

  updateOuijaCurrent();
}

function handleOuijaCellClick(event) {
  const cell = event.currentTarget;
  const symbol = cell.getAttribute("data-symbol");
  if (!symbol) return;

  movePlanchetteToCell(cell);
  applyOuijaSymbol(symbol);
}

function initOuijaBoard() {
  if (!ouijaBoard) return;

  const cells = ouijaBoard.querySelectorAll(".ouija-cell");
  cells.forEach((cell) => {
    cell.addEventListener("click", handleOuijaCellClick);
  });

  updateOuijaCurrent();
  setOuijaStatus(
    "Cliquez sur une case pour déplacer la planchette et construire un message, ou utilisez le tirage auto."
  );
}

function clearOuijaMessage() {
  ouijaCurrentMessage = "";
  updateOuijaCurrent();
  setOuijaStatus("Message effacé. Vous pouvez recommencer la séquence.");
}

function startOuijaAuto() {
  if (!ouijaBoard) return;

  const cells = Array.from(ouijaBoard.querySelectorAll(".ouija-cell"));
  if (cells.length === 0) return;

  if (ouijaAutoTimer) {
    clearInterval(ouijaAutoTimer);
    ouijaAutoTimer = null;
    ouijaAutoBtn.textContent = "✨ Tirage auto (symbolique)";
    ouijaAutoBtn.disabled = false;
    setOuijaStatus("Tirage auto arrêté. Prenez un moment pour ressentir ce qui a été écrit.");
    return;
  }

  let steps = 0;
  const maxSteps = 12 + Math.floor(Math.random() * 8);

  ouijaAutoBtn.textContent = "⏳ Tirage en cours…";
  ouijaAutoBtn.disabled = true;
  setOuijaStatus(
    "Tirage auto en cours… considérez ce qui s’écrit comme un support projectif, pas comme une vérité absolue."
  );

  ouijaAutoTimer = setInterval(() => {
    steps += 1;
    const randomCell = cells[Math.floor(Math.random() * cells.length)];
    const symbol = randomCell.getAttribute("data-symbol");

    movePlanchetteToCell(randomCell);
    applyOuijaSymbol(symbol || "");

    if (steps >= maxSteps) {
      clearInterval(ouijaAutoTimer);
      ouijaAutoTimer = null;
      ouijaAutoBtn.textContent = "✨ Tirage auto (symbolique)";
      ouijaAutoBtn.disabled = false;
      setOuijaStatus(
        "Tirage auto terminé. Utilisez ce message comme base de lecture, en croisant avec vos ressentis et votre déontologie."
      );
    }
  }, 900);
}

if (ouijaBoard && ouijaPlanchette) {
  initOuijaBoard();
}

if (ouijaClearBtn) {
  ouijaClearBtn.addEventListener("click", clearOuijaMessage);
}

if (ouijaAutoBtn) {
  ouijaAutoBtn.addEventListener("click", startOuijaAuto);
}

// --- MODULE JOURNAL DES SÉANCES ---

const JOURNAL_KEY = "spiritweb_journal_v1";

const journalForm = document.getElementById("journal-form");
const journalDateInput = document.getElementById("journal-date");
const journalTimeInput = document.getElementById("journal-time");
const journalLocationInput = document.getElementById("journal-location");
const journalTypeInput = document.getElementById("journal-type");
const journalUsedPve = document.getElementById("journal-used-pve");
const journalUsedSpiritBox = document.getElementById("journal-used-spiritbox");
const journalUsedOuija = document.getElementById("journal-used-ouija");
const journalUsedAutre = document.getElementById("journal-used-autre");
const journalNotesInput = document.getElementById("journal-notes");
const journalStatus = document.getElementById("journal-status");
const journalList = document.getElementById("journal-list");
const journalClearAllBtn = document.getElementById("journal-clear-all");

let journalEntries = [];

function setJournalStatus(text) {
  if (journalStatus) {
    journalStatus.textContent = text;
  }
}

function loadJournal() {
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    if (!raw) {
      journalEntries = [];
      renderJournalList();
      return;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      journalEntries = parsed;
    } else {
      journalEntries = [];
    }
  } catch (e) {
    console.error("Erreur chargement journal :", e);
    journalEntries = [];
  }
  renderJournalList();
}

function saveJournal() {
  try {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(journalEntries));
  } catch (e) {
    console.error("Erreur sauvegarde journal :", e);
  }
}

function renderJournalList() {
  if (!journalList) return;

  journalList.innerHTML = "";

  if (!journalEntries.length) {
    const p = document.createElement("p");
    p.className = "empty-state";
    p.textContent =
      "Aucune séance enregistrée pour l’instant. Utilisez le formulaire ci-dessus après une séance.";
    journalList.appendChild(p);
    return;
  }

  journalEntries
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((entry) => {
      const wrapper = document.createElement("div");
      wrapper.className = "journal-entry";

      const header = document.createElement("div");
      header.className = "journal-entry-header";

      const left = document.createElement("div");
      const dateLabel = entry.date || "Date inconnue";
      const timeLabel = entry.time || "";
      left.textContent = timeLabel ? `${dateLabel} • ${timeLabel}` : dateLabel;

      const right = document.createElement("div");
      right.className = "journal-entry-meta";
      right.textContent = entry.location ? entry.location : "Lieu non précisé";

      header.appendChild(left);
      header.appendChild(right);

      const main = document.createElement("div");
      main.className = "journal-entry-main";
      main.textContent = entry.type ? entry.type : "Séance sans intitulé";

      const tools = document.createElement("div");
      tools.className = "journal-entry-tools";

      const used = [];
      if (entry.tools?.pve) used.push("PVE");
      if (entry.tools?.spiritbox) used.push("Spirit Box");
      if (entry.tools?.ouija) used.push("Oui-Ja");
      if (entry.tools?.autre) used.push("Autres pratiques");

      tools.textContent = used.length
        ? "Outils : " + used.join(", ")
        : "Outils : non précisés";

      const notes = document.createElement("div");
      notes.className = "journal-entry-meta";
      if (entry.notes && entry.notes.trim()) {
        notes.textContent = entry.notes;
      } else {
        notes.textContent = "(Aucune note enregistrée pour cette séance.)";
      }

      const actions = document.createElement("div");
      actions.className = "journal-entry-actions";

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "journal-delete-btn";
      deleteBtn.textContent = "Supprimer";
      deleteBtn.addEventListener("click", () => {
        journalEntries = journalEntries.filter((e) => e.id !== entry.id);
        saveJournal();
        renderJournalList();
        setJournalStatus("Séance supprimée du journal.");
      });

      actions.appendChild(deleteBtn);

      wrapper.appendChild(header);
      wrapper.appendChild(main);
      wrapper.appendChild(tools);
      wrapper.appendChild(notes);
      wrapper.appendChild(actions);

      journalList.appendChild(wrapper);
    });
}

function handleJournalSubmit(event) {
  event.preventDefault();

  const date = journalDateInput?.value || "";
  const time = journalTimeInput?.value || "";
  const location = journalLocationInput?.value?.trim() || "";
  const type = journalTypeInput?.value?.trim() || "";
  const notes = journalNotesInput?.value?.trim() || "";

  const entry = {
    id: Date.now() + "-" + Math.random().toString(16).slice(2),
    createdAt: Date.now(),
    date,
    time,
    location,
    type,
    notes,
    tools: {
      pve: !!journalUsedPve?.checked,
      spiritbox: !!journalUsedSpiritBox?.checked,
      ouija: !!journalUsedOuija?.checked,
      autre: !!journalUsedAutre?.checked
    }
  };

  journalEntries.push(entry);
  saveJournal();
  renderJournalList();

  if (journalForm) {
    journalForm.reset();
  }

  if (journalDateInput) {
    const today = new Date();
    const iso = today.toISOString().split("T")[0];
    journalDateInput.value = iso;
  }

  setJournalStatus("Séance enregistrée dans le journal local.");
}

function clearAllJournal() {
  if (!confirm("Effacer TOUT le journal sur cet appareil ? Cette action est irréversible.")) {
    return;
  }
  journalEntries = [];
  saveJournal();
  renderJournalList();
  setJournalStatus("Journal entièrement effacé de cet appareil.");
}

function initJournal() {
  if (!journalForm || !journalList) return;

  if (journalDateInput) {
    const today = new Date();
    const iso = today.toISOString().split("T")[0];
    journalDateInput.value = iso;
  }

  loadJournal();

  journalForm.addEventListener("submit", handleJournalSubmit);

  if (journalClearAllBtn) {
    journalClearAllBtn.addEventListener("click", clearAllJournal);
  }

  setJournalStatus(
    "Les séances sont stockées dans le navigateur uniquement. Utilisez ce journal comme trace de travail personnelle."
  );
}

initJournal();

// --- MODULE CAPTEURS & AMBIANCE ---

const sensorsActivateBtn = document.getElementById("sensors-activate");
const sensorsStatus = document.getElementById("sensors-status");
const sensorEnergyValue = document.getElementById("sensor-energy-value");
const sensorAlphaEl = document.getElementById("sensor-alpha");
const sensorBetaEl = document.getElementById("sensor-beta");
const sensorGammaEl = document.getElementById("sensor-gamma");
const sensorMotionEl = document.getElementById("sensor-motion");
const sensorInterpretationEl = document.getElementById("sensor-interpretation");
const sensorGaugeNeedle = document.getElementById("sensor-gauge-needle");
const sensorsLog = document.getElementById("sensors-log");

let sensorsActive = false;
let lastLogTime = 0;

function setSensorsStatus(text) {
  if (sensorsStatus) sensorsStatus.textContent = text;
}

function updateGauge(energy) {
  if (!sensorGaugeNeedle) return;
  const clamped = Math.max(0, Math.min(100, energy));
  const angle = -90 + (clamped / 100) * 180; // -90° à +90°
  sensorGaugeNeedle.style.transform = `rotate(${angle}deg)`;
  if (sensorEnergyValue) {
    sensorEnergyValue.textContent = Math.round(clamped);
  }
}

function interpretEnergy(energy) {
  if (!sensorInterpretationEl) return;
  let text = "";
  if (energy < 15) {
    text = "Ambiance plutôt calme et stable. Moment propice à l’ancrage.";
  } else if (energy < 40) {
    text = "Légères fluctuations. Présences, mouvements ou émotions ordinaires.";
  } else if (energy < 70) {
    text = "Fluctuations marquées. Ambiance plus chargée ou émotionnelle.";
  } else {
    text = "Variations fortes. Interprétez avec prudence et écoutez surtout vos ressentis.";
  }
  sensorInterpretationEl.textContent = text;
}

function logSensorsEvent(energy, motionMag) {
  if (!sensorsLog) return;
  const now = Date.now();
  if (now - lastLogTime < 1500) return; // éviter de spammer
  lastLogTime = now;

  const empty = sensorsLog.querySelector(".empty-state");
  if (empty) empty.remove();

  const entry = document.createElement("div");
  entry.className = "sensors-log-entry";

  const timeLabel = new Date().toLocaleTimeString();
  entry.textContent = `[${timeLabel}] énergie ≈ ${Math.round(
    energy
  )}/100 • mouvement ≈ ${motionMag.toFixed(2)}`;

  sensorsLog.prepend(entry);
}

function handleDeviceOrientation(event) {
  if (!sensorsActive) return;

  const alpha = event.alpha ?? 0;
  const beta = event.beta ?? 0;
  const gamma = event.gamma ?? 0;

  if (sensorAlphaEl) sensorAlphaEl.textContent = alpha.toFixed(0);
  if (sensorBetaEl) sensorBetaEl.textContent = beta.toFixed(0);
  if (sensorGammaEl) sensorGammaEl.textContent = gamma.toFixed(0);
}

function handleDeviceMotion(event) {
  if (!sensorsActive) return;

  const acc = event.accelerationIncludingGravity || event.acceleration;
  if (!acc) return;

  const ax = acc.x || 0;
  const ay = acc.y || 0;
  const az = acc.z || 0;

  const magnitude = Math.sqrt(ax * ax + ay * ay + az * az);

  if (sensorMotionEl) sensorMotionEl.textContent = magnitude.toFixed(2);

  const energy = Math.max(0, Math.min(100, (magnitude / 20) * 100));
  updateGauge(energy);
  interpretEnergy(energy);
  logSensorsEvent(energy, magnitude);
}

async function activateSensors() {
  if (sensorsActive) {
    setSensorsStatus("Capteurs déjà activés. Bougez doucement l’appareil pour voir les variations.");
    return;
  }

  try {
    // iOS nécessite une permission explicite
    const needsPermission =
      typeof DeviceMotionEvent !== "undefined" &&
      typeof DeviceMotionEvent.requestPermission === "function";

    if (needsPermission) {
      const motionPerm = await DeviceMotionEvent.requestPermission();
      const orientPerm =
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function"
          ? await DeviceOrientationEvent.requestPermission()
          : "granted";

      if (motionPerm !== "granted" || orientPerm !== "granted") {
        setSensorsStatus(
          "Permission refusée. Les capteurs ne seront pas disponibles sur cet appareil."
        );
        return;
      }
    }

    window.addEventListener("deviceorientation", handleDeviceOrientation);
    window.addEventListener("devicemotion", handleDeviceMotion);

    sensorsActive = true;
    setSensorsStatus(
      "Capteurs activés. Tenez l’appareil dans la main, puis faites de légers mouvements pour observer les fluctuations symboliques."
    );
  } catch (e) {
    console.error(e);
    setSensorsStatus(
      "Impossible d’activer les capteurs sur cet appareil ou ce navigateur."
    );
  }
}

if (sensorsActivateBtn) {
  sensorsActivateBtn.addEventListener("click", activateSensors);
}
