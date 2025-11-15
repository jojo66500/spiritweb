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
  if (timerEl) timerEl.textContent = "00:00";

  timerInterval = setInterval(() => {
    const diff = Math.floor((Date.now() - recordStartTime) / 1000);
    if (timerEl) timerEl.textContent = formatTime(diff);
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
    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;
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
  if (startBtn) startBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;
}

function appendRecording(url, blob) {
  if (!recordingsList) return;

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

// --- MODULE SPIRIT BOX (NEUTRE + VOIX OPTIONNELLE) ---

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
const spiritVoiceToggle = document.getElementById("spirit-voice-toggle");

// fragments neutres : syllabes + petits mots non orientés
const spiritSyllables = [
  "ra", "ta", "lo", "mi", "sa", "ko", "di", "ma", "ri", "na",
  "lu", "pe", "to", "cha", "ri", "so", "ve", "ne", "fa", "gu"
];

const spiritNeutralWords = [
  "ici", "là", "plus", "rien", "encore", "déjà", "vite", "lent",
  "un", "une", "des", "oui", "non"
];

function getRandomSpiritFragment() {
  const poolChoice = Math.random();
  if (poolChoice < 0.6) {
    const first = spiritSyllables[Math.floor(Math.random() * spiritSyllables.length)];
    if (Math.random() < 0.4) {
      const second = spiritSyllables[Math.floor(Math.random() * spiritSyllables.length)];
      return first + second;
    }
    return first;
  } else {
    return spiritNeutralWords[Math.floor(Math.random() * spiritNeutralWords.length)];
  }
}

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
  if (!spiritVolumeSlider || !spiritVolumeValue) return;
  const value = Number(spiritVolumeSlider.value);
  spiritVolumeValue.textContent = value;
  if (gainNode) {
    gainNode.gain.value = value / 100;
  }
}

function updateSpiritSpeed() {
  if (!spiritSpeedSlider || !spiritSpeedValue) return;
  const value = Number(spiritSpeedSlider.value);
  spiritSpeedValue.textContent = value;
  if (sweepInterval && spiritRunning) {
    clearInterval(sweepInterval);
    startSweepInterval();
  }
}

function startSweepInterval() {
  if (!spiritSpeedSlider || !gainNode) return;
  const period = Number(spiritSpeedSlider.value);

  sweepInterval = setInterval(() => {
    if (!spiritRunning) return;
    const vol = Number(spiritVolumeSlider.value) / 100;
    gainNode.gain.value = gainNode.gain.value > 0 ? 0 : vol;
  }, period);
}

// Synthèse vocale optionnelle
function speakFragment(text) {
  if (!spiritVoiceToggle || !spiritVoiceToggle.checked) return;
  if (!("speechSynthesis" in window)) return;
  if (window.speechSynthesis.speaking && text.length <= 3) {
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fr-FR";
  utterance.rate = 1.05;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function appendSpiritFragment() {
  if (!spiritLog) return;

  const empty = spiritLog.querySelector(".empty-state");
  if (empty) empty.remove();

  const fragmentText = getRandomSpiritFragment();
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

  speakFragment(fragmentText);
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

    if (spiritStartBtn) spiritStartBtn.disabled = true;
    if (spiritStopBtn) spiritStopBtn.disabled = false;
    setSpiritStatus(
      "Spirit Box en cours… générateur aléatoire neutre. Utilisez-le comme support projectif."
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

  if (spiritStartBtn) spiritStartBtn.disabled = false;
  if (spiritStopBtn) spiritStopBtn.disabled = true;
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
    "Touchez une lettre ou un mot pour déplacer le curseur médiator, ou utilisez le tirage auto."
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
  const maxSteps = 10 + Math.floor(Math.random() * 8);

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
        "Tirage auto terminé. Utilisez ce message comme base de lecture, en le croisant avec vos ressentis."
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
  const angle = -90 + (clamped / 100) * 180;
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
  if (now - lastLogTime < 1500) return;
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

// --- MODULE CAMERA / DÉTECTEUR VISUEL ---

const cameraStartBtn = document.getElementById("camera-start");
const cameraStopBtn = document.getElementById("camera-stop");
const cameraStatusEl = document.getElementById("camera-status");
const cameraVideo = document.getElementById("camera-video");
const cameraCanvas = document.getElementById("camera-canvas");
const cameraScoreEl = document.getElementById("camera-score");
const cameraSensitivitySlider = document.getElementById("camera-sensitivity");
const cameraSensitivityValue = document.getElementById("camera-sensitivity-value");
const cameraInterpretationEl = document.getElementById("camera-interpretation");
const cameraLog = document.getElementById("camera-log");
const cameraScoreLabelEl = document.getElementById("camera-score-label");
const cameraFaceInfoEl = document.getElementById("camera-face-info");
const cameraModeInputs = document.querySelectorAll('input[name="camera-mode"]');

let cameraStream = null;
let cameraCtx = null;
let prevFrameData = null;
let cameraLoopId = null;

// mode courant : "movement" ou "coldspots"
let cameraMode = "movement";

// Détection de visages (API expérimentale)
let faceDetector = null;
let lastFaceCheck = 0;

if ("FaceDetector" in window) {
  try {
    faceDetector = new FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
    if (cameraFaceInfoEl) {
      cameraFaceInfoEl.textContent =
        "API de détection de visages disponible. Analyse en cours…";
    }
  } catch (e) {
    faceDetector = null;
    if (cameraFaceInfoEl) {
      cameraFaceInfoEl.textContent =
        "Erreur lors de l'initialisation de la détection de visages.";
    }
  }
} else {
  if (cameraFaceInfoEl) {
    cameraFaceInfoEl.textContent =
      "Détection de visages non supportée sur ce navigateur.";
  }
}

function setCameraStatus(text) {
  if (cameraStatusEl) cameraStatusEl.textContent = text;
}

function updateCameraSensitivityLabel() {
  if (!cameraSensitivitySlider || !cameraSensitivityValue) return;
  cameraSensitivityValue.textContent = cameraSensitivitySlider.value;
}

updateCameraSensitivityLabel();
if (cameraSensitivitySlider) {
  cameraSensitivitySlider.addEventListener("input", updateCameraSensitivityLabel);
}

// Mise à jour de l’UI selon le mode
function updateCameraModeUI() {
  if (!cameraScoreLabelEl) return;

  if (cameraMode === "movement") {
    cameraScoreLabelEl.textContent = "Niveau d’agitation visuelle :";
    if (cameraInterpretationEl) {
      cameraInterpretationEl.textContent =
        "En mode mouvements, le score reflète la quantité de changements entre les images (mouvements, variations de lumière).";
    }
  } else {
    cameraScoreLabelEl.textContent = "Indice de zones froides (symbolique) :";
    if (cameraInterpretationEl) {
      cameraInterpretationEl.textContent =
        "En mode zones froides, les zones plus sombres sont colorées en bleu comme “froid symbolique”. Ce n’est pas une mesure de température réelle.";
    }
  }
}

if (cameraModeInputs && cameraModeInputs.length) {
  cameraModeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      cameraMode = input.value;
      prevFrameData = null;
      updateCameraModeUI();
    });
  });
}

updateCameraModeUI();

// Interprétation du score selon le mode
function interpretCameraScore(score) {
  if (!cameraInterpretationEl) return;
  let text = "";

  if (cameraMode === "movement") {
    if (score < 8) {
      text = "Scène visuellement stable. Ambiance calme sur le plan des images.";
    } else if (score < 20) {
      text =
        "Légères variations : petits mouvements, changements de lumière ordinaires.";
    } else if (score < 40) {
      text =
        "Variations notables : mouvements, ombres, changements de contraste plus marqués.";
    } else {
      text =
        "Agitation visuelle forte : déplacements, variations lumineuses ou bruit vidéo important. Interprétez cela symboliquement, en priorité avec vos ressentis.";
    }
  } else {
    if (score < 20) {
      text =
        "Peu de zones sombres marquées : la scène est plutôt homogène sur le plan lumineux.";
    } else if (score < 40) {
      text =
        "Quelques zones plus sombres. Elles peuvent être utilisées comme supports symboliques de “froid” dans votre lecture.";
    } else if (score < 70) {
      text =
        "Présence notable de zones sombres. Utilisez ces zones en bleu comme ancrage visuel pour vos ressentis de “densité” ou de “froid symbolique”.";
    } else {
      text =
        "Scène très sombre globalement. Le score élevé signifie surtout une grande proportion de pixels sombres (pas une température réelle).";
    }
  }

  cameraInterpretationEl.textContent = text;
}

function logCameraSpike(score) {
  if (!cameraLog) return;
  const now = new Date();
  const timeLabel = now.toLocaleTimeString();

  const empty = cameraLog.querySelector(".empty-state");
  if (empty) empty.remove();

  const entry = document.createElement("div");
  entry.className = "camera-log-entry";
  entry.textContent = `[${timeLabel}] Pic (${cameraMode === "movement" ? "mouvement" : "froid symbolique"}) ≈ ${Math.round(score)}/100`;
  cameraLog.prepend(entry);
}

// Boucle principale d’analyse
function processCameraFrame() {
  if (!cameraVideo || !cameraCanvas || !cameraCtx || !cameraStream) {
    cameraLoopId = requestAnimationFrame(processCameraFrame);
    return;
  }

  const w = cameraVideo.videoWidth;
  const h = cameraVideo.videoHeight;
  if (!w || !h) {
    cameraLoopId = requestAnimationFrame(processCameraFrame);
    return;
  }

  const targetWidth = 240;
  const ratio = h / w;
  const cw = targetWidth;
  const ch = Math.round(targetWidth * ratio);

  cameraCanvas.width = cw;
  cameraCanvas.height = ch;

  cameraCtx.drawImage(cameraVideo, 0, 0, cw, ch);
  const frame = cameraCtx.getImageData(0, 0, cw, ch);
  const data = frame.data;
  const len = data.length;

  const sensitivity = cameraSensitivitySlider
    ? Number(cameraSensitivitySlider.value)
    : 60;

  let score = 0;

  if (cameraMode === "movement") {
    if (!prevFrameData) {
      prevFrameData = frame.data.slice(0);
      cameraLoopId = requestAnimationFrame(processCameraFrame);
      return;
    }

    const prev = prevFrameData;
    const threshold = (15 * (110 - sensitivity)) / 100;
    let diffSum = 0;
    let count = 0;

    for (let i = 0; i < len; i += 4) {
      const dr = data[i] - prev[i];
      const dg = data[i + 1] - prev[i + 1];
      const db = data[i + 2] - prev[i + 2];

      const dist = Math.sqrt(dr * dr + dg * dg + db * db);
      diffSum += dist;
      count++;

      if (dist > threshold * 3) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 200;
      } else if (dist > threshold) {
        data[i] = 0;
        data[i + 1] = 255;
        data[i + 2] = 170;
        data[i + 3] = 160;
      } else {
        data[i + 3] = 0;
      }
    }

    const avgDiff = diffSum / count;
    score = Math.max(0, Math.min(100, (avgDiff / 70) * 100));
    prevFrameData = frame.data.slice(0);
  } else {
    let sumLum = 0;
    let count = 0;
    const lumArray = new Float32Array(len / 4);

    for (let i = 0, j = 0; i < len; i += 4, j++) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      lumArray[j] = lum;
      sumLum += lum;
      count++;
    }

    const avgLum = sumLum / count;
    let coldCount = 0;

    for (let i = 0, j = 0; i < len; i += 4, j++) {
      const lum = lumArray[j];

      if (lum < avgLum) {
        const factor = (avgLum - lum) / (avgLum || 1);
        data[i] = 20;
        data[i + 1] = 60 + 150 * factor;
        data[i + 2] = 200;
        data[i + 3] = 200;
        coldCount++;
      } else {
        const factor = (lum - avgLum) / (255 - avgLum || 1);
        data[i] = 220;
        data[i + 1] = 120 + 80 * factor;
        data[i + 2] = 40;
        data[i + 3] = 200;
      }
    }

    const coldRatio = coldCount / count;
    score = Math.round(coldRatio * 100);
  }

  if (faceDetector && cameraFaceInfoEl) {
    const nowTs = performance.now();
    if (nowTs - lastFaceCheck > 800) {
      lastFaceCheck = nowTs;
      const clone = new ImageData(
        new Uint8ClampedArray(frame.data),
        frame.width,
        frame.height
      );
      createImageBitmap(clone)
        .then((bitmap) => faceDetector.detect(bitmap))
        .then((faces) => {
          if (!faces || !faces.length) {
            cameraFaceInfoEl.textContent = "Aucun visage détecté pour le moment.";
          } else {
            cameraFaceInfoEl.textContent =
              "Visages ou formes similaires détectés : " + faces.length;
          }
        })
        .catch(() => {
          cameraFaceInfoEl.textContent =
            "Erreur lors de la détection des visages (API expérimentale).";
        });
    }
  }

  if (cameraScoreEl) {
    cameraScoreEl.textContent = Math.round(score);
  }

  interpretCameraScore(score);
  cameraCtx.putImageData(frame, 0, 0);

  if (score > 35) {
    logCameraSpike(score);
  }

  cameraLoopId = requestAnimationFrame(processCameraFrame);
}

async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setCameraStatus("Caméra non supportée sur ce navigateur.");
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });

    cameraVideo.srcObject = cameraStream;
    cameraVideo.onloadedmetadata = () => {
      cameraVideo.play();
      if (!cameraCtx && cameraCanvas) {
        cameraCtx = cameraCanvas.getContext("2d");
      }
      prevFrameData = null;
      if (cameraLoopId) cancelAnimationFrame(cameraLoopId);
      cameraLoopId = requestAnimationFrame(processCameraFrame);
    };

    if (cameraStartBtn) cameraStartBtn.disabled = true;
    if (cameraStopBtn) cameraStopBtn.disabled = false;

    setCameraStatus(
      "Caméra active. Adaptez le mode (mouvements / zones froides symboliques) selon votre pratique."
    );
  } catch (e) {
    console.error(e);
    setCameraStatus("Impossible d’accéder à la caméra (permission refusée ou erreur).");
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((t) => t.stop());
    cameraStream = null;
  }
  if (cameraLoopId) {
    cancelAnimationFrame(cameraLoopId);
    cameraLoopId = null;
  }
  prevFrameData = null;

  if (cameraCtx && cameraCanvas) {
    cameraCtx.clearRect(0, 0, cameraCanvas.width, cameraCanvas.height);
  }

  if (cameraStartBtn) cameraStartBtn.disabled = false;
  if (cameraStopBtn) cameraStopBtn.disabled = true;

  setCameraStatus("Caméra inactive.");
}

if (cameraStartBtn && cameraStopBtn && cameraVideo && cameraCanvas) {
  cameraStartBtn.addEventListener("click", startCamera);
  cameraStopBtn.addEventListener("click", stopCamera);
}
