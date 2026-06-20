const TASKS = [
  {
    key: 'task1',
    label: 'Task 1',
    title: 'Giving Advice',
    prep: 30,
    speak: 90,
    type: 'text',
    instructions: 'Paste the full advice prompt for Task 1.'
  },
  {
    key: 'task2',
    label: 'Task 2',
    title: 'Talking about a Personal Experience',
    prep: 30,
    speak: 60,
    type: 'text',
    instructions: 'Paste the full personal experience prompt for Task 2.'
  },
  {
    key: 'task3',
    label: 'Task 3',
    title: 'Describing a Scene',
    prep: 30,
    speak: 60,
    type: 'image',
    instructions: 'Paste the prompt and upload the image for Task 3.'
  },
  {
    key: 'task4',
    label: 'Task 4',
    title: 'Making Predictions',
    prep: 30,
    speak: 60,
    type: 'image',
    instructions: 'Paste the prediction prompt. You may reuse the same image from Task 3 or upload another one.'
  },
  {
    key: 'task5',
    label: 'Task 5',
    title: 'Comparing and Persuading',
    prep: 60,
    speak: 60,
    type: 'task5',
    instructions: 'Upload the two images and enter the option details before starting Task 5.'
  },
  {
    key: 'task6',
    label: 'Task 6',
    title: 'Dealing with a Difficult Situation',
    prep: 60,
    speak: 60,
    type: 'text',
    instructions: 'Paste the difficult situation prompt for Task 6.'
  },
  {
    key: 'task7',
    label: 'Task 7',
    title: 'Expressing Opinions',
    prep: 30,
    speak: 90,
    type: 'text',
    instructions: 'Paste the opinion question for Task 7.'
  },
  {
    key: 'task8',
    label: 'Task 8',
    title: 'Describing an Unusual Situation',
    prep: 30,
    speak: 60,
    type: 'image',
    instructions: 'Paste the unusual situation prompt and upload the picture for Task 8.'
  }
];

const STORAGE_KEY = 'celpip-speaking-simulator-node16';

function emptyTaskData() {
  return {
    prompt: '',
    notes: '',
    image: '',
    imageName: '',
    optionA: {
      title: '',
      description: '',
      image: '',
      imageName: ''
    },
    optionB: {
      title: '',
      description: '',
      image: '',
      imageName: ''
    },
    selectedOption: 'A',
    choiceMadeAt: null,
    recordingUrl: '',
    recordingBlob: null,
    recordingMimeType: '',
    durationSeconds: 0,
    transcript: '',
    transcriptSegments: [],
    interimTranscript: '',
    transcriptStatus: 'idle',
    transcriptError: '',
    status: 'pending'
  };
}

function buildDefaultState() {
  const taskData = {};
  TASKS.forEach((task) => {
    taskData[task.key] = emptyTaskData();
  });

  return {
    view: 'welcome',
    currentTaskIndex: 0,
    phase: 'idle',
    phaseSecondsLeft: 0,
    timerId: null,
    media: {
      stream: null,
      recorder: null,
      chunks: [],
      mimeType: '',
      startAtMs: null
    },
    tasks: taskData,
    completedTaskKeys: []
  };
}

let state = loadState();
const app = document.getElementById('app');
let audioContext = null;
let analyser = null;
let vuAnimation = null;
let speechRecognition = null;
let activeTranscriptTaskKey = '';
let transcriptKeepAlive = false;
let transcriptStartMs = 0;
let pendingSegmentStartSec = null;
let transcriptRestartTimer = null;
let transcriptWatchdog = null;

render();

function loadState() {
  const fresh = buildDefaultState();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved) return fresh;

    TASKS.forEach((task) => {
      const incoming = saved.tasks && saved.tasks[task.key] ? saved.tasks[task.key] : {};
      fresh.tasks[task.key] = {
        ...emptyTaskData(),
        ...incoming,
        recordingBlob: null,
        recordingUrl: ''
      };
    });

    fresh.view = saved.view || 'welcome';
    fresh.currentTaskIndex = typeof saved.currentTaskIndex === 'number' ? saved.currentTaskIndex : 0;
    fresh.phase = 'idle';
    fresh.phaseSecondsLeft = 0;
    fresh.completedTaskKeys = Array.isArray(saved.completedTaskKeys) ? saved.completedTaskKeys : [];
    return fresh;
  } catch {
    return fresh;
  }
}

function persist() {
  const copy = JSON.parse(JSON.stringify(state));
  copy.timerId = null;
  if (copy.media) {
    copy.media = {
      stream: null,
      recorder: null,
      chunks: [],
      mimeType: '',
      startAtMs: null
    };
  }
  Object.keys(copy.tasks).forEach((key) => {
    copy.tasks[key].recordingBlob = null;
    copy.tasks[key].recordingUrl = '';
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(copy));
}

function currentTask() {
  return TASKS[state.currentTaskIndex];
}

function currentTaskData() {
  return state.tasks[currentTask().key];
}

function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function revokeRecordingUrl(taskKey) {
  const task = state.tasks[taskKey];
  if (task && task.recordingUrl) {
    try { URL.revokeObjectURL(task.recordingUrl); } catch (_) {}
    task.recordingUrl = '';
  }
}

function getDisplayRecordingUrl(taskKey) {
  const task = state.tasks[taskKey];
  if (!task || !task.recordingBlob) return '';
  if (!task.recordingUrl) {
    task.recordingUrl = URL.createObjectURL(task.recordingBlob);
  }
  return task.recordingUrl;
}


function getSpeechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function joinTranscript(base, addition) {
  const left = String(base || '').trim();
  const right = String(addition || '').trim();
  if (!left) return right;
  if (!right) return left;
  return `${left} ${right}`.replace(/\s+/g, ' ').trim();
}

function formatStamp(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// Light tidy-up: trim, collapse spaces, capitalise the first letter of the chunk.
function cleanSegmentText(raw) {
  let text = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  text = text.charAt(0).toUpperCase() + text.slice(1);
  return text;
}

// Builds the timestamped transcript from captured segments, e.g.
// "(0:00) Hi Maria, how have you been? (0:07) Moving is tough."
function buildTimestampedTranscript(taskData) {
  const segments = Array.isArray(taskData.transcriptSegments) ? taskData.transcriptSegments : [];
  return segments
    .filter((seg) => seg && String(seg.text || '').trim())
    .map((seg) => `(${formatStamp(seg.t)}) ${cleanSegmentText(seg.text)}`)
    .join(' ')
    .trim();
}

// Post-process raw Web Speech text to fix the most common recognizer glitches.
function polishTranscriptText(raw) {
  let t = String(raw || '').trim();
  if (!t) return '';

  // 1. Collapse multiple spaces / line-breaks.
  t = t.replace(/\s+/g, ' ');

  // 2. Remove duplicated consecutive words (e.g. "I I want" → "I want").
  //    The Web Speech API occasionally emits a word twice at a session boundary.
  t = t.replace(/\b(\w+)(\s+\1)+\b/gi, '$1');

  // 3. Remove very short "words" that are just recognizer noise (1 char, not "I" or "a").
  t = t.replace(/\b([b-hj-z])\b/gi, '').replace(/\s+/g, ' ').trim();

  // 4. Capitalize the first letter after .  ?  !
  t = t.replace(/([.?!]\s+)([a-z])/g, (_, punct, ch) => punct + ch.toUpperCase());

  // 5. Capitalize the very first character.
  t = t.charAt(0).toUpperCase() + t.slice(1);

  // 6. Fix missing space after comma/period if a letter immediately follows.
  t = t.replace(/([,.:;?!])([a-zA-Z])/g, '$1 $2');

  return t.trim();
}

function isSpeakingPhase() {
  return state.phase === 'speak' || state.phase === 'task5-speak';
}

function transcriptStatusText(taskData) {
  switch (taskData.transcriptStatus) {
    case 'listening': return 'Listening';
    case 'ready': return 'Transcript ready';
    case 'empty': return 'No transcript captured';
    case 'unsupported': return 'Transcript unavailable';
    case 'error': return 'Transcript issue';
    default: return 'Waiting';
  }
}

function transcriptDisplayText(taskData) {
  if (!taskData) return '';
  const finalText = String(taskData.transcript || '').trim();
  const interim = String(taskData.interimTranscript || '').trim();
  if (finalText && interim) return `${finalText}

${interim}`;
  return finalText || interim || '';
}

function updateTranscriptUI(taskKey) {
  const taskData = state.tasks[taskKey];
  if (!taskData) return;

  const transcriptText = transcriptDisplayText(taskData);
  const helperText = taskData.transcriptError || (transcriptText ? 'Each line is timestamped from the start of your recording. Copy the full transcript after the task ends.' : 'A timestamped transcript will appear here while you speak (works best in Chrome or Edge).');
  const canCopy = Boolean(String(taskData.transcript || '').trim());

  document.querySelectorAll(`[data-transcript-status="${taskKey}"]`).forEach((node) => {
    node.textContent = transcriptStatusText(taskData);
  });

  document.querySelectorAll(`[data-transcript-output="${taskKey}"]`).forEach((node) => {
    if ('value' in node) {
      node.value = transcriptText;
    } else {
      node.textContent = transcriptText;
    }
  });

  document.querySelectorAll(`[data-transcript-helper="${taskKey}"]`).forEach((node) => {
    node.textContent = helperText;
  });

  document.querySelectorAll(`[data-transcript-copy="${taskKey}"]`).forEach((node) => {
    node.disabled = !canCopy;
  });
}

function finalizeTranscript(taskKey) {
  const taskData = state.tasks[taskKey];
  if (!taskData) return;

  if (!Array.isArray(taskData.transcriptSegments)) taskData.transcriptSegments = [];

  // Capture any trailing words that were still interim when the phase ended.
  const trailing = polishTranscriptText(taskData.interimTranscript);
  if (trailing) {
    const startSec = pendingSegmentStartSec !== null ? pendingSegmentStartSec : elapsedTranscriptSeconds();
    taskData.transcriptSegments.push({ t: startSec, text: trailing });
  }
  pendingSegmentStartSec = null;

  taskData.transcript = buildTimestampedTranscript(taskData);
  taskData.interimTranscript = '';

  if (String(taskData.transcript || '').trim()) {
    taskData.transcriptStatus = 'ready';
  } else if (taskData.transcriptStatus !== 'unsupported') {
    taskData.transcriptStatus = 'empty';
  }
  persist();
  updateTranscriptUI(taskKey);
}

function stopTranscription(forceAbort = false) {
  transcriptKeepAlive = false;
  const taskKey = activeTranscriptTaskKey;
  activeTranscriptTaskKey = '';

  if (transcriptRestartTimer) {
    window.clearTimeout(transcriptRestartTimer);
    transcriptRestartTimer = null;
  }
  if (transcriptWatchdog) {
    window.clearInterval(transcriptWatchdog);
    transcriptWatchdog = null;
  }

  const recognition = speechRecognition;
  speechRecognition = null;

  if (!recognition) {
    if (taskKey) finalizeTranscript(taskKey);
    return;
  }

  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;

  try {
    if (forceAbort) {
      recognition.abort();
    } else {
      recognition.stop();
    }
  } catch (_) {}

  if (taskKey) finalizeTranscript(taskKey);
}

function elapsedTranscriptSeconds() {
  if (!transcriptStartMs) return 0;
  return Math.max(0, (Date.now() - transcriptStartMs) / 1000);
}

// Resilient restart: retries a few times so a stray InvalidStateError or a
// late onend during a brief silence does not permanently kill the transcript.
function restartRecognition(recognition, taskKey, attempt = 0) {
  if (speechRecognition !== recognition || !transcriptKeepAlive || activeTranscriptTaskKey !== taskKey || !isSpeakingPhase()) return;
  try {
    recognition.start();
    const target = state.tasks[taskKey];
    if (target) {
      target.transcriptStatus = 'listening';
      updateTranscriptUI(taskKey);
    }
  } catch (_) {
    if (attempt < 5) {
      transcriptRestartTimer = window.setTimeout(() => restartRecognition(recognition, taskKey, attempt + 1), 250);
    } else {
      speechRecognition = null;
      activeTranscriptTaskKey = '';
      finalizeTranscript(taskKey);
    }
  }
}

function startTranscription(taskKey) {
  const taskData = state.tasks[taskKey];
  if (!taskData) return;

  stopTranscription(true);
  taskData.transcript = '';
  taskData.transcriptSegments = [];
  taskData.interimTranscript = '';
  taskData.transcriptError = '';

  const SpeechCtor = getSpeechRecognitionCtor();
  if (!SpeechCtor) {
    taskData.transcriptStatus = 'unsupported';
    persist();
    updateTranscriptUI(taskKey);
    return;
  }

  const recognition = new SpeechCtor();
  speechRecognition = recognition;
  activeTranscriptTaskKey = taskKey;
  transcriptKeepAlive = true;
  transcriptStartMs = Date.now();
  pendingSegmentStartSec = null;

  recognition.lang = 'en-CA';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 3;

  taskData.transcriptStatus = 'listening';
  persist();
  updateTranscriptUI(taskKey);

  recognition.onresult = (event) => {
    const target = state.tasks[taskKey];
    if (!target) return;
    if (!Array.isArray(target.transcriptSegments)) target.transcriptSegments = [];

    let interimChunk = '';

    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      // Pick the alternative with the highest confidence score.
      const result = event.results[i];
      let bestText = '';
      let bestConfidence = -1;
      for (let a = 0; a < result.length; a += 1) {
        const alt = result[a];
        const conf = typeof alt.confidence === 'number' ? alt.confidence : 0;
        if (conf > bestConfidence || bestText === '') {
          bestConfidence = conf;
          bestText = String(alt.transcript || '').trim();
        }
      }
      const piece = polishTranscriptText(bestText);
      if (!piece) continue;

      // Mark the start time of this spoken segment when its first words arrive.
      if (pendingSegmentStartSec === null) {
        pendingSegmentStartSec = elapsedTranscriptSeconds();
      }

      if (result.isFinal) {
        target.transcriptSegments.push({ t: pendingSegmentStartSec, text: piece });
        pendingSegmentStartSec = null;
      } else {
        interimChunk = joinTranscript(interimChunk, piece);
      }
    }

    target.transcript = buildTimestampedTranscript(target);
    target.interimTranscript = interimChunk;
    target.transcriptStatus = 'listening';
    persist();
    updateTranscriptUI(taskKey);
  };

  recognition.onerror = (event) => {
    const target = state.tasks[taskKey];
    if (!target) return;

    // Recoverable errors: onend will auto-restart, so do not surface a scary message.
    if (event.error === 'aborted' || event.error === 'no-speech' || event.error === 'network') return;

    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      transcriptKeepAlive = false;
      target.transcriptError = 'Microphone access is blocked, so the transcript could not run.';
    } else if (event.error === 'audio-capture') {
      target.transcriptError = 'Audio capture issue affected part of the transcript.';
    } else {
      target.transcriptError = `Transcript issue: ${event.error}`;
    }
    persist();
    updateTranscriptUI(taskKey);
  };

  recognition.onend = () => {
    const target = state.tasks[taskKey];
    if (!target) return;
    if (speechRecognition !== recognition) return;

    // Keep transcribing across Chrome's periodic auto-stops until the phase ends.
    if (transcriptKeepAlive && activeTranscriptTaskKey === taskKey && isSpeakingPhase()) {
      transcriptRestartTimer = window.setTimeout(() => restartRecognition(recognition, taskKey), 160);
      return;
    }

    speechRecognition = null;
    activeTranscriptTaskKey = '';
    finalizeTranscript(taskKey);
  };

  try {
    recognition.start();
  } catch (_) {
    speechRecognition = null;
    activeTranscriptTaskKey = '';
    transcriptKeepAlive = false;
    taskData.transcriptStatus = 'error';
    taskData.transcriptError = 'Live transcript could not start in this browser session.';
    persist();
    updateTranscriptUI(taskKey);
    return;
  }

  // Watchdog: if recognition silently dies while we still expect it, revive it.
  if (transcriptWatchdog) window.clearInterval(transcriptWatchdog);
  transcriptWatchdog = window.setInterval(() => {
    if (!transcriptKeepAlive || activeTranscriptTaskKey !== taskKey || !isSpeakingPhase()) {
      window.clearInterval(transcriptWatchdog);
      transcriptWatchdog = null;
      return;
    }
    if (speechRecognition === recognition) {
      try { recognition.start(); } catch (_) { /* already running - expected */ }
    }
  }, 4000);
}

async function copyTranscript(taskKey, button) {
  const taskData = state.tasks[taskKey];
  const text = String(taskData?.transcript || '').trim();
  if (!text) return;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }

    if (button) {
      const original = button.textContent;
      button.textContent = 'Copied';
      window.setTimeout(() => {
        button.textContent = original;
      }, 1400);
    }
  } catch (_) {
    alert('Copy failed. You can still select the transcript text manually.');
  }
}

function getMimeType() {
  const choices = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4'
  ];
  if (typeof MediaRecorder === 'undefined') return '';
  return choices.find((type) => {
    try { return MediaRecorder.isTypeSupported(type); } catch (_) { return false; }
  }) || '';
}

async function ensureMic() {
  if (state.media.stream) return state.media.stream;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Your browser does not support microphone recording here.');
  }

  // Request high-quality, clean audio — noise suppression and echo cancellation
  // feed a cleaner signal to the browser's speech recognizer and reduce mishearings.
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: { ideal: 48000 },
      channelCount: { ideal: 1 }
    }
  }).catch(() =>
    // Fall back to basic audio if constrained request is denied/unsupported.
    navigator.mediaDevices.getUserMedia({ audio: true })
  );
  state.media.stream = stream;
  setupVuMeter(stream);
  return stream;
}

function setupVuMeter(stream) {
  try {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      audioContext = new AudioCtx();
    }
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    animateVu();
  } catch (_) {}
}

function animateVu() {
  cancelAnimationFrame(vuAnimation);
  const bar = document.getElementById('vu-bar');
  if (!bar || !analyser) return;

  const draw = () => {
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) {
      const normalized = (data[i] - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / data.length);
    const percent = Math.min(100, Math.max(3, Math.round(rms * 210)));
    bar.style.width = `${percent}%`;
    vuAnimation = requestAnimationFrame(draw);
  };
  draw();
}

function stopVuAnimation() {
  cancelAnimationFrame(vuAnimation);
  const bar = document.getElementById('vu-bar');
  if (bar) bar.style.width = '3%';
}

async function startRecording() {
  const stream = await ensureMic();
  const mimeType = getMimeType();
  state.media.chunks = [];
  state.media.mimeType = mimeType;
  state.media.startAtMs = Date.now();

  if (state.media.recorder && state.media.recorder.state !== 'inactive') {
    state.media.recorder.stop();
  }

  state.media.recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  state.media.recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) state.media.chunks.push(event.data);
  };
  state.media.recorder.onstop = saveCurrentTaskRecording;
  state.media.recorder.start();
}

function stopRecording() {
  const recorder = state.media.recorder;
  if (recorder && recorder.state !== 'inactive') {
    recorder.stop();
  } else {
    saveCurrentTaskRecording();
  }
}

function saveCurrentTaskRecording() {
  const taskKey = currentTask().key;
  const taskData = state.tasks[taskKey];
  if (!state.media.chunks.length) {
    taskData.recordingBlob = null;
    taskData.recordingMimeType = '';
    taskData.durationSeconds = currentTask().speak;
    taskData.status = 'done';
    persist();
    render();
    return;
  }

  revokeRecordingUrl(taskKey);
  taskData.recordingBlob = new Blob(state.media.chunks, { type: state.media.mimeType || 'audio/webm' });
  taskData.recordingMimeType = state.media.mimeType || 'audio/webm';
  taskData.durationSeconds = Math.max(1, Math.round((Date.now() - (state.media.startAtMs || Date.now())) / 1000));
  taskData.status = 'done';
  state.media.chunks = [];
  state.media.mimeType = '';
  state.media.startAtMs = null;
  persist();
  render();
}

function stopMediaTracks() {
  if (state.media.stream) {
    state.media.stream.getTracks().forEach((track) => track.stop());
  }
  state.media.stream = null;
  state.media.recorder = null;
  state.media.chunks = [];
  state.media.mimeType = '';
  state.media.startAtMs = null;
  stopVuAnimation();
}

function clearTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function startPrepPhase() {
  clearTimer();
  stopTranscription(true);
  const task = currentTask();
  const data = currentTaskData();

  revokeRecordingUrl(task.key);
  data.recordingBlob = null;
  data.recordingMimeType = '';
  data.durationSeconds = 0;
  data.transcript = '';
  data.transcriptSegments = [];
  data.interimTranscript = '';
  data.transcriptStatus = 'idle';
  data.transcriptError = '';

  if (task.type === 'task5') {
    data.selectedOption = data.selectedOption || 'A';
  }

  state.view = 'exam';
  state.phase = task.key === 'task5' ? 'task5-choose' : 'prep';
  state.phaseSecondsLeft = task.prep;
  persist();
  render();

  state.timerId = setInterval(() => {
    state.phaseSecondsLeft -= 1;
    updateRuntimeUI();
    if (state.phaseSecondsLeft <= 0) {
      clearTimer();
      handlePhaseEnd();
    }
  }, 1000);
}

function startSpeakingPhase() {
  clearTimer();
  const task = currentTask();
  const taskKey = task.key;
  state.phase = task.key === 'task5' ? 'task5-speak' : 'speak';
  state.phaseSecondsLeft = task.speak;
  persist();
  render();

  startRecording().then(() => {
    startTranscription(taskKey);
    state.timerId = setInterval(() => {
      state.phaseSecondsLeft -= 1;
      updateRuntimeUI();
      if (state.phaseSecondsLeft <= 0) {
        clearTimer();
        stopTranscription();
        stopRecording();
        finishTask();
      }
    }, 1000);
  }).catch((error) => {
    alert(error.message || 'Microphone permission is required.');
    state.phase = task.key === 'task5' ? 'task5-part2-prep' : 'prep';
    state.phaseSecondsLeft = task.prep;
    persist();
    render();
  });
}

function startTask5Part2Prep() {
  clearTimer();
  state.view = 'exam';
  state.phase = 'task5-part2-prep';
  state.phaseSecondsLeft = currentTask().prep;
  persist();
  render();

  state.timerId = setInterval(() => {
    state.phaseSecondsLeft -= 1;
    updateRuntimeUI();
    if (state.phaseSecondsLeft <= 0) {
      clearTimer();
      startSpeakingPhase();
    }
  }, 1000);
}

function handlePhaseEnd() {
  const task = currentTask();
  if (task.key === 'task5') {
    if (state.phase === 'task5-choose') {
      const data = currentTaskData();
      if (!data.selectedOption) data.selectedOption = 'A';
      data.choiceMadeAt = new Date().toISOString();
      persist();
      startTask5Part2Prep();
      return;
    }
    if (state.phase === 'task5-part2-prep') {
      startSpeakingPhase();
      return;
    }
  }

  if (state.phase === 'prep') {
    startSpeakingPhase();
  }
}

function finishTask() {
  clearTimer();
  const task = currentTask();
  const data = currentTaskData();
  data.status = 'done';
  if (!state.completedTaskKeys.includes(task.key)) {
    state.completedTaskKeys.push(task.key);
  }
  state.view = 'task-complete';
  state.phase = 'done';
  state.phaseSecondsLeft = 0;
  persist();
  render();
}

function moveToNextTask() {
  clearTimer();
  if (state.currentTaskIndex < TASKS.length - 1) {
    state.currentTaskIndex += 1;
    state.view = 'setup';
    state.phase = 'idle';
    state.phaseSecondsLeft = 0;
    persist();
    render();
  } else {
    state.view = 'summary';
    state.phase = 'idle';
    state.phaseSecondsLeft = 0;
    persist();
    render();
  }
}

function downloadTaskRecording(taskKey) {
  const task = state.tasks[taskKey];
  if (!task || !task.recordingBlob) return;
  const url = getDisplayRecordingUrl(taskKey);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${taskKey}-recording.webm`;
  link.click();
}

function resetAll() {
  clearTimer();
  stopTranscription(true);
  TASKS.forEach((task) => revokeRecordingUrl(task.key));
  stopMediaTracks();
  state = buildDefaultState();
  persist();
  render();
}

function markTaskSetupSaved() {
  const task = currentTask();
  const data = currentTaskData();
  if (task.type === 'text') {
    if (!data.prompt.trim()) {
      alert('Please paste the question first.');
      return false;
    }
  }

  if (task.type === 'image') {
    if (!data.prompt.trim()) {
      alert('Please paste the question first.');
      return false;
    }
    if (!data.image && task.key !== 'task4') {
      alert('Please upload the image for this task.');
      return false;
    }
  }

  if (task.type === 'task5') {
    if (!data.prompt.trim()) {
      alert('Please paste the main Task 5 instructions first.');
      return false;
    }
    if (!data.optionA.title.trim() || !data.optionB.title.trim()) {
      alert('Please enter both option titles for Task 5.');
      return false;
    }
    if (!data.optionA.description.trim() || !data.optionB.description.trim()) {
      alert('Please enter both option descriptions for Task 5.');
      return false;
    }
    if (!data.optionA.image || !data.optionB.image) {
      alert('Please upload both Task 5 images.');
      return false;
    }
  }

  return true;
}

function updateRuntimeUI() {
  const timeText = formatTime(Math.max(0, state.phaseSecondsLeft));
  const phaseText = phaseLabel();
  const timerValue = document.getElementById('timer-value');
  const phaseValue = document.getElementById('phase-value');
  const timerMetric = document.getElementById('timer-metric');

  if (timerValue) timerValue.textContent = timeText;
  if (phaseValue) phaseValue.textContent = phaseText;

  document.querySelectorAll('[data-runtime-timer]').forEach((node) => {
    node.textContent = timeText;
  });
  document.querySelectorAll('[data-runtime-phase]').forEach((node) => {
    node.textContent = phaseText;
  });

  const alertOn = state.phaseSecondsLeft <= 10;
  if (timerMetric) {
    if (alertOn) {
      timerMetric.classList.add('alert');
    } else {
      timerMetric.classList.remove('alert');
    }
  }

  document.querySelectorAll('[data-runtime-box]').forEach((node) => {
    if (alertOn) {
      node.classList.add('runtime-alert');
    } else {
      node.classList.remove('runtime-alert');
    }
  });
}

function phaseLabel() {
  switch (state.phase) {
    case 'prep': return 'Preparation';
    case 'speak': return 'Recording';
    case 'task5-choose': return 'Task 5 Part 1';
    case 'task5-part2-prep': return 'Task 5 Part 2 Preparation';
    case 'task5-speak': return 'Task 5 Part 2 Recording';
    case 'done': return 'Completed';
    default: return 'Idle';
  }
}

function taskDescriptor(task) {
  if (task.key === 'task5') return 'Part 1: 60s choose, Part 2: 60s prep, 60s speak';
  return `${task.prep}s prep, ${task.speak}s speak`;
}

function renderWelcome() {
  return `
    <div class="app-shell">
      <div class="topbar">
        <div class="brand">
          <h1>CELPIP Speaking Simulator</h1>
          <p>Realistic, task-by-task speaking practice with official-style timings, local microphone recording, image tasks, and prep notes.</p>
        </div>
        <div class="badge"><span class="badge-dot"></span>Mic required · recordings stay in your browser</div>
      </div>

      <section class="panel hero">
        <div class="hero-grid">
          <div>
            <span class="hero-kicker">8-Task Speaking Test</span>
            <h2>Practice the full <span class="accent">CELPIP Speaking</span> test, exactly as it flows</h2>
            <p>This simulator follows the official 8-task order with standard timings. It moves automatically from preparation to speaking, supports prompt pasting and image uploads, records your voice locally, and lets you review or download every task when you finish.</p>
            <div class="button-row" style="margin-top:22px;">
              <button class="btn primary lg" data-action="start-exam">Start speaking simulator</button>
              <button class="btn" data-action="reset-all">Clear everything</button>
            </div>
          </div>
          <div class="info-grid">
            <div class="info-card"><div class="ic">🖼️</div><strong>Task 3 &amp; 4</strong><span>Image-based scene description and prediction practice.</span></div>
            <div class="info-card"><div class="ic">⚖️</div><strong>Task 5</strong><span>Two-option compare and persuade flow with two images.</span></div>
            <div class="info-card"><div class="ic">📝</div><strong>Prep notes</strong><span>Stay visible during prep and while you speak.</span></div>
            <div class="info-card"><div class="ic">⬇️</div><strong>Downloads</strong><span>Save each task recording with its transcript.</span></div>
          </div>
        </div>

        <div class="steps">
          <div class="step"><div class="num">1</div><strong>Set up the task</strong><span>Paste the question and add any image before the timer starts.</span></div>
          <div class="step"><div class="num">2</div><strong>Prep &amp; speak</strong><span>The simulator counts down prep, then records your answer automatically.</span></div>
          <div class="step"><div class="num">3</div><strong>Review results</strong><span>Play back, download, and read the transcript for every task.</span></div>
        </div>
      </section>
    </div>`;
}

function renderSetup() {
  const task = currentTask();
  const data = currentTaskData();
  const previewImage = task.key === 'task4' && !data.image ? state.tasks.task3.image : data.image;
  const previewImageName = task.key === 'task4' && !data.image ? state.tasks.task3.imageName : data.imageName;

  return `
    <div class="app-shell">
      <div class="topbar">
        <div class="brand">
          <h1>${task.label}: ${task.title}</h1>
          <p>${task.instructions}</p>
        </div>
        <div class="badge"><span class="badge-dot"></span>${taskDescriptor(task)}</div>
      </div>

      <main class="main">
        <section class="panel card">
          <div class="section-title">
            <div>
              <h3>Setup this task</h3>
              <div class="sub">Enter only the current task now. After completion, the simulator will open the next task setup screen.</div>
            </div>
          </div>

          <div class="field">
            <label>Question / prompt</label>
            <textarea id="prompt-input" placeholder="Paste the full question here...">${escapeHtml(data.prompt)}</textarea>
          </div>

          ${task.type === 'image' ? `
            <div class="field">
              <label>${task.key === 'task4' ? 'Image (optional if you want to reuse Task 3 image)' : 'Image upload'}</label>
              <div class="upload-line">
                <input type="file" id="single-image-input" accept="image/*" />
                ${task.key === 'task4' && state.tasks.task3.image ? `<button class="btn" data-action="reuse-task3-image">Use Task 3 image</button>` : ''}
              </div>
              <div class="hint">${previewImage ? `Loaded image: ${escapeHtml(previewImageName || 'selected image')}` : 'No image selected yet.'}</div>
            </div>
            <div class="image-stage">${previewImage ? `<img src="${previewImage}" alt="Task image preview" />` : `<div class="muted">Image preview will appear here.</div>`}</div>` : ''}

          ${task.type === 'task5' ? renderTask5Setup(data) : ''}

          <div class="button-row" style="margin-top:18px;">
            <button class="btn primary" data-action="save-start-task">Start prep timer</button>
            ${state.currentTaskIndex < TASKS.length - 1 ? `<button class="btn" data-action="skip-task">Skip to next task →</button>` : ''}
            <button class="btn" data-action="back-welcome">Back</button>
            <button class="btn danger" data-action="reset-all">Reset all</button>
          </div>
        </section>
      </main>
    </div>`;
}

function renderTask5Setup(data) {
  return `
    <div class="hr"></div>
    <div class="field">
      <label>Option A title</label>
      <input id="optionA-title" type="text" value="${escapeHtml(data.optionA.title)}" placeholder="Example: Hiking" />
    </div>
    <div class="field">
      <label>Option A details</label>
      <textarea id="optionA-description" placeholder="Paste the option details here...">${escapeHtml(data.optionA.description)}</textarea>
    </div>
    <div class="field">
      <label>Option A image</label>
      <input type="file" id="optionA-image" accept="image/*" />
      <div class="hint">${data.optionA.image ? `Loaded image: ${escapeHtml(data.optionA.imageName || 'Option A image')}` : 'No image selected yet.'}</div>
      <div class="image-stage" style="margin-top:10px;">${data.optionA.image ? `<img src="${data.optionA.image}" alt="Option A preview" />` : `<div class="muted">Option A image preview</div>`}</div>
    </div>
    <div class="hr"></div>
    <div class="field">
      <label>Option B title</label>
      <input id="optionB-title" type="text" value="${escapeHtml(data.optionB.title)}" placeholder="Example: Biking" />
    </div>
    <div class="field">
      <label>Option B details</label>
      <textarea id="optionB-description" placeholder="Paste the option details here...">${escapeHtml(data.optionB.description)}</textarea>
    </div>
    <div class="field">
      <label>Option B image</label>
      <input type="file" id="optionB-image" accept="image/*" />
      <div class="hint">${data.optionB.image ? `Loaded image: ${escapeHtml(data.optionB.imageName || 'Option B image')}` : 'No image selected yet.'}</div>
      <div class="image-stage" style="margin-top:10px;">${data.optionB.image ? `<img src="${data.optionB.image}" alt="Option B preview" />` : `<div class="muted">Option B image preview</div>`}</div>
    </div>`;
}

function renderExam() {
  const task = currentTask();
  const data = currentTaskData();
  return `
    <div class="app-shell">
      <div class="topbar">
        <div class="brand">
          <h1>${task.label}: ${task.title}</h1>
          <p>Automatic exam flow is running. Prep notes stay visible during your speaking phase.</p>
        </div>
        <div class="topbar-actions">
          <button class="btn danger" data-action="exit-to-summary">Exit mock test</button>
          ${state.currentTaskIndex < TASKS.length - 1 ? `<button class="btn" data-action="skip-task">Skip task →</button>` : ''}
          <div class="badge"><span class="badge-dot"></span>${phaseLabel()}</div>
        </div>
      </div>

      <main class="main">
        <section class="panel exam-bar">
          <div class="metrics">
            <div class="metric"><div class="label">Task</div><div class="value">${task.label}</div></div>
            <div class="metric"><div class="label">Type</div><div class="value" style="font-size:17px;">${task.title}</div></div>
            <div class="metric"><div class="label">Phase</div><div id="phase-value" class="value" style="font-size:17px;">${phaseLabel()}</div></div>
            <div class="metric timer ${state.phaseSecondsLeft <= 10 ? 'alert' : ''}" id="timer-metric"><div class="label">Time left</div><div id="timer-value" class="value">${formatTime(Math.max(0, state.phaseSecondsLeft))}</div></div>
          </div>
        </section>

        ${task.key === 'task5' ? renderTask5Exam(task, data) : renderRegularExam(task, data)}
      </main>
    </div>`;
}

function renderRegularExam(task, data) {
  const taskImage = task.key === 'task4' && !data.image ? state.tasks.task3.image : data.image;
  return `
    <section class="panel card question-box">
      <div class="label">Question</div>
      <div class="content">${escapeHtml(data.prompt || 'No prompt entered.')}</div>
    </section>

    <div class="two-col">
      <section class="panel card sticky-top">
        ${taskImage ? `<div class="image-stage" style="margin-bottom:14px;"><img src="${taskImage}" alt="Task illustration" /></div>` : ''}
        <h3>Prep notes</h3>
        <div class="sub muted" style="margin-bottom:12px;">You can type notes during prep and still see them while recording.</div>
        <textarea id="notes-input" class="notes-box" placeholder="Write quick bullets here...">${escapeHtml(data.notes)}</textarea>
      </section>

      <section class="panel card response-panel">
        <div>
          <h3>Recording area</h3>
          <div class="muted">Recording starts automatically when prep time ends.</div>
        </div>
        ${renderRecordingRuntimeBox()}
        <div class="audio-card">
          <div class="mini-row" style="justify-content:space-between; margin-bottom:12px;">
            <strong>Mic level</strong>
            <span class="rec-indicator"><span class="live-dot"></span>Local only</span>
          </div>
          <div class="vu-track"><div id="vu-bar" class="vu-fill"></div></div>
        </div>
        <div class="button-row">
          <button class="btn warning" data-action="stop-now">Stop this task now</button>
        </div>
      </section>
    </div>`;
}

function renderTask5Exam(task, data) {
  const selected = data.selectedOption === 'B' ? 'B' : 'A';
  const other = selected === 'A' ? 'B' : 'A';

  if (state.phase === 'task5-choose') {
    return `
      <section class="panel card question-box">
        <div class="label">Task 5 · Part 1 — Choose</div>
        <div class="content">${escapeHtml(data.prompt || 'No prompt entered.')}</div>
      </section>

      <section class="panel card">
        <div class="section-title">
          <div>
            <h3>Choose your option</h3>
            <div class="sub">If you do not choose one before time ends, the simulator keeps Option A by default.</div>
          </div>
          <div class="choice-chip">Current choice: Option ${selected}</div>
        </div>
        <div class="option-grid">
          ${renderOptionCard('A', data.optionA, selected)}
          ${renderOptionCard('B', data.optionB, selected)}
        </div>
      </section>

      <section class="panel card">
        <h3>Prep notes</h3>
        <div class="muted" style="margin-bottom:12px;">You do not need to speak in Part 1, but your notes stay visible in Part 2.</div>
        <textarea id="notes-input" class="notes-box" placeholder="Why is your choice better? Write quick bullets here...">${escapeHtml(data.notes)}</textarea>
      </section>`;
  }

  return `
    <section class="panel card question-box">
      <div class="label">Task 5 · Part 2 — Persuade</div>
      <div class="content">Persuade the other supervisor that your chosen activity is the better choice by comparing the two options.</div>
    </section>

    <section class="panel card">
      <div class="section-title">
        <div>
          <h3>Compare and persuade</h3>
          <div class="sub">Left card is the other option. Right card is your chosen option.</div>
        </div>
        <div class="choice-chip">Your choice: ${selected === 'A' ? escapeHtml(data.optionA.title || 'Option A') : escapeHtml(data.optionB.title || 'Option B')}</div>
      </div>
      <div class="option-grid">
        ${renderOptionCard(other, data[`option${other}`], selected, true)}
        ${renderOptionCard(selected, data[`option${selected}`], selected, false, true)}
      </div>
    </section>

    <div class="two-col">
      <section class="panel card">
        <h3>Prep notes</h3>
        <div class="muted" style="margin-bottom:12px;">Your notes remain visible while you speak.</div>
        <textarea id="notes-input" class="notes-box" placeholder="Write quick bullets here...">${escapeHtml(data.notes)}</textarea>
      </section>
      <section class="panel card response-panel">
        <div>
          <h3>Recording area</h3>
          <div class="muted">Recording starts automatically after Part 2 prep.</div>
        </div>
        ${renderRecordingRuntimeBox()}
        <div class="audio-card">
          <div class="mini-row" style="justify-content:space-between; margin-bottom:12px;">
            <strong>Mic level</strong>
            <span class="rec-indicator"><span class="live-dot"></span>Local only</span>
          </div>
          <div class="vu-track"><div id="vu-bar" class="vu-fill"></div></div>
        </div>
        <div class="button-row">
          <button class="btn warning" data-action="stop-now">Stop this task now</button>
        </div>
      </section>
    </div>`;
}


function renderTranscriptCard(taskKey, compact = false) {
  const taskData = state.tasks[taskKey];
  const transcriptText = transcriptDisplayText(taskData);
  const helperText = taskData.transcriptError || (transcriptText ? 'Each line is timestamped from the start of your recording. Copy the full transcript after the task ends.' : 'A timestamped transcript will appear here while you speak (works best in Chrome or Edge).');
  return `
    <div class="audio-card transcript-card ${compact ? 'compact' : ''}">
      <div class="mini-row" style="justify-content:space-between; margin-bottom:12px;">
        <strong>Transcript</strong>
        <span class="muted small-text" data-transcript-status="${taskKey}">${transcriptStatusText(taskData)}</span>
      </div>
      <textarea class="transcript-box" data-transcript-output="${taskKey}" readonly placeholder="Transcript will appear here...">${escapeHtml(transcriptText)}</textarea>
      <div class="footer-note" data-transcript-helper="${taskKey}">${escapeHtml(helperText)}</div>
      <div class="button-row" style="margin-top:12px;">
        <button class="btn" data-action="copy-transcript" data-task-key="${taskKey}" data-transcript-copy="${taskKey}" ${String(taskData.transcript || '').trim() ? '' : 'disabled'}>Copy transcript</button>
      </div>
    </div>`;
}

function renderRecordingRuntimeBox() {
  return `
    <div class="recording-runtime" data-runtime-box>
      <div class="runtime-chip">
        <div class="label">Phase</div>
        <div class="value" data-runtime-phase>${phaseLabel()}</div>
      </div>
      <div class="runtime-chip">
        <div class="label">Time left</div>
        <div class="value" data-runtime-timer>${formatTime(Math.max(0, state.phaseSecondsLeft))}</div>
      </div>
    </div>`;
}

function renderOptionCard(key, option, selected, isOther = false, highlightChoice = false) {
  const titleText = option.title || `Option ${key}`;
  const isSelected = (selected === key && !isOther) || highlightChoice;
  let tag = `Option ${key}`;
  if (isOther) tag = 'Other option';
  if (highlightChoice) tag = 'Your choice';
  return `
    <div class="option-card ${isSelected ? 'selected' : ''}" data-option-card="${key}">
      <div class="image-wrap">${option.image ? `<img src="${option.image}" alt="${escapeHtml(titleText)}" />` : `<div class="muted">No image</div>`}</div>
      <div class="body">
        <span class="pill-tag">${tag}</span>
        <h4>${escapeHtml(titleText)}</h4>
        <div class="desc">${escapeHtml(option.description || '(no details entered)')}</div>
        ${state.phase === 'task5-choose' ? `<div class="button-row" style="margin-top:14px;"><button class="btn ${selected === key ? 'primary' : ''}" data-action="select-option" data-option="${key}">${selected === key ? '✓ Selected' : 'Choose this option'}</button></div>` : ''}
      </div>
    </div>`;
}

function renderTaskComplete() {
  const task = currentTask();
  const data = currentTaskData();
  const url = getDisplayRecordingUrl(task.key);
  return `
    <div class="app-shell">
      <div class="topbar">
        <div class="brand">
          <h1>${task.label} completed</h1>
          <p>You can review the recording, download it, and then continue to the next task setup.</p>
        </div>
        <div class="badge"><span class="badge-dot"></span>Ready for next step</div>
      </div>

      <main class="main">
        <section class="panel card question-box">
          <div class="label">Question</div>
          <div class="content">${task.key === 'task5' ? 'Task 5 Part 1 and Part 2 have been completed.' : escapeHtml(data.prompt || 'No prompt entered.')}</div>
        </section>

        <section class="panel card">
          <div class="section-title">
            <div>
              <h3>Your recording</h3>
              <div class="sub">Recording length: about ${data.durationSeconds || task.speak} seconds</div>
            </div>
          </div>
          ${url ? `<audio controls src="${url}"></audio>` : `<div class="muted">No recording is available for this task.</div>`}
          <div class="button-row" style="margin-top:16px;">
            <button class="btn ${url ? 'success' : ''}" data-action="download-current" ${url ? '' : 'disabled'}>Download this task</button>
            <button class="btn primary" data-action="next-task">${state.currentTaskIndex < TASKS.length - 1 ? 'Continue to next task' : 'Go to summary'}</button>
            <button class="btn" data-action="replay-task-setup">Back to this task setup</button>
            <button class="btn warning" data-action="exit-to-summary">Finish mock test here</button>
          </div>
          <div style="margin-top:16px;">
            ${renderTranscriptCard(task.key)}
          </div>
        </section>
      </main>
    </div>`;
}

function renderSummary() {
  const allDone = state.completedTaskKeys.length === TASKS.length;
  return `
    <div class="app-shell">
      <div class="topbar">
        <div class="brand">
          <h1>Speaking session ${allDone ? 'summary' : 'results'}</h1>
          <p>${allDone ? 'All 8 tasks are complete.' : `${state.completedTaskKeys.length} of 8 tasks completed.`} You can download any finished recording from here.</p>
        </div>
        <div class="badge"><span class="badge-dot"></span>${allDone ? 'Session finished' : 'Ended early'}</div>
      </div>

      <section class="panel card" style="margin-bottom:18px;">
        <div class="metrics">
          <div class="metric"><div class="label">Tasks completed</div><div class="value">${state.completedTaskKeys.length}</div></div>
          <div class="metric"><div class="label">Image tasks</div><div class="value">3</div></div>
          <div class="metric"><div class="label">Task 5</div><div class="value" style="font-size:18px;">2-part flow</div></div>
          <div class="metric"><div class="label">Storage</div><div class="value" style="font-size:18px;">Local browser only</div></div>
        </div>
      </section>

      <section class="summary-grid">
        ${TASKS.map((task) => {
          const data = state.tasks[task.key];
          const url = getDisplayRecordingUrl(task.key);
          return `
            <div class="panel card recording-item">
              <h3>${task.label}: ${task.title}</h3>
              <div class="muted small-text" style="margin-bottom:10px;">${taskDescriptor(task)}</div>
              <div class="small-text" style="white-space:pre-wrap; margin-bottom:12px;">${escapeHtml(task.key === 'task5' ? 'Task 5 compare and persuade completed.' : (data.prompt || '(no prompt saved)'))}</div>
              ${url ? `<audio controls src="${url}"></audio>` : `<div class="muted">No recording saved.</div>`}
              <div class="button-row" style="margin-top:12px;">
                <button class="btn ${url ? 'success' : ''}" data-action="download-task" data-task-key="${task.key}" ${url ? '' : 'disabled'}>Download</button>
                <button class="btn" data-action="copy-transcript" data-task-key="${task.key}" data-transcript-copy="${task.key}" ${String(data.transcript || '').trim() ? '' : 'disabled'}>Copy transcript</button>
              </div>
              <div style="margin-top:12px;">
                <div class="small-text muted" data-transcript-status="${task.key}">${transcriptStatusText(data)}</div>
                <textarea class="transcript-box compact" data-transcript-output="${task.key}" readonly placeholder="Transcript will appear here...">${escapeHtml(transcriptDisplayText(data))}</textarea>
                <div class="footer-note" data-transcript-helper="${task.key}">${escapeHtml(data.transcriptError || (transcriptDisplayText(data) ? 'Transcript saved for this task.' : 'No transcript saved for this task yet.'))}</div>
              </div>
            </div>`;
        }).join('')}
      </section>

      <div class="button-row" style="margin-top:18px;">
        <button class="btn" data-action="restart-summary-to-setup">Practice again from Task 1</button>
        <button class="btn danger" data-action="reset-all">Clear everything</button>
      </div>
    </div>`;
}

function render() {
  if (state.view === 'welcome') {
    app.innerHTML = renderWelcome();
  } else if (state.view === 'setup') {
    app.innerHTML = renderSetup();
  } else if (state.view === 'exam') {
    app.innerHTML = renderExam();
    updateRuntimeUI();
    animateVu();
  } else if (state.view === 'task-complete') {
    app.innerHTML = renderTaskComplete();
    updateTranscriptUI(currentTask().key);
  } else if (state.view === 'summary') {
    app.innerHTML = renderSummary();
    TASKS.forEach((task) => updateTranscriptUI(task.key));
  }

  bindEvents();
}

function bindEvents() {
  const promptInput = document.getElementById('prompt-input');
  if (promptInput) {
    promptInput.addEventListener('input', (event) => {
      currentTaskData().prompt = event.target.value;
      persist();
    });
  }

  const notesInput = document.getElementById('notes-input');
  if (notesInput) {
    notesInput.addEventListener('input', (event) => {
      currentTaskData().notes = event.target.value;
      persist();
    });
  }

  const singleImageInput = document.getElementById('single-image-input');
  if (singleImageInput) {
    singleImageInput.addEventListener('change', async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const dataUrl = await readFileAsDataUrl(file);
      const taskData = currentTaskData();
      taskData.image = dataUrl;
      taskData.imageName = file.name;
      persist();
      render();
    });
  }

  const optionATitle = document.getElementById('optionA-title');
  if (optionATitle) {
    optionATitle.addEventListener('input', (event) => {
      currentTaskData().optionA.title = event.target.value;
      persist();
    });
  }

  const optionADescription = document.getElementById('optionA-description');
  if (optionADescription) {
    optionADescription.addEventListener('input', (event) => {
      currentTaskData().optionA.description = event.target.value;
      persist();
    });
  }

  const optionBTitle = document.getElementById('optionB-title');
  if (optionBTitle) {
    optionBTitle.addEventListener('input', (event) => {
      currentTaskData().optionB.title = event.target.value;
      persist();
    });
  }

  const optionBDescription = document.getElementById('optionB-description');
  if (optionBDescription) {
    optionBDescription.addEventListener('input', (event) => {
      currentTaskData().optionB.description = event.target.value;
      persist();
    });
  }

  const optionAImage = document.getElementById('optionA-image');
  if (optionAImage) {
    optionAImage.addEventListener('change', async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const dataUrl = await readFileAsDataUrl(file);
      const data = currentTaskData();
      data.optionA.image = dataUrl;
      data.optionA.imageName = file.name;
      persist();
      render();
    });
  }

  const optionBImage = document.getElementById('optionB-image');
  if (optionBImage) {
    optionBImage.addEventListener('change', async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const dataUrl = await readFileAsDataUrl(file);
      const data = currentTaskData();
      data.optionB.image = dataUrl;
      data.optionB.imageName = file.name;
      persist();
      render();
    });
  }

  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const action = button.dataset.action;

      if (action === 'start-exam') {
        state.view = 'setup';
        state.currentTaskIndex = 0;
        persist();
        render();
      }

      if (action === 'back-welcome') {
        clearTimer();
        state.view = 'welcome';
        persist();
        render();
      }

      if (action === 'save-start-task') {
        if (!markTaskSetupSaved()) return;
        startPrepPhase();
      }

      if (action === 'reuse-task3-image') {
        const source = state.tasks.task3;
        const taskData = currentTaskData();
        taskData.image = source.image;
        taskData.imageName = source.imageName || 'Task 3 image';
        persist();
        render();
      }

      if (action === 'select-option') {
        currentTaskData().selectedOption = button.dataset.option;
        persist();
        render();
      }

      if (action === 'stop-now') {
        clearTimer();
        stopTranscription();
        stopRecording();
        finishTask();
      }

      if (action === 'skip-task') {
        clearTimer();
        stopTranscription();
        stopMediaTracks();
        moveToNextTask();
      }

      if (action === 'exit-to-summary') {
        clearTimer();
        stopTranscription();
        stopMediaTracks();
        state.view = 'summary';
        persist();
        render();
      }

      if (action === 'copy-transcript') {
        copyTranscript(button.dataset.taskKey || currentTask().key, button);
      }

      if (action === 'download-current') {
        downloadTaskRecording(currentTask().key);
      }

      if (action === 'download-task') {
        downloadTaskRecording(button.dataset.taskKey);
      }

      if (action === 'next-task') {
        moveToNextTask();
      }

      if (action === 'replay-task-setup') {
        clearTimer();
        state.view = 'setup';
        state.phase = 'idle';
        persist();
        render();
      }

      if (action === 'restart-summary-to-setup') {
        clearTimer();
        state.currentTaskIndex = 0;
        state.view = 'setup';
        state.phase = 'idle';
        persist();
        render();
      }

      if (action === 'reset-all') {
        resetAll();
      }
    });
  });
}

window.addEventListener('beforeunload', () => {
  clearTimer();
  stopTranscription(true);
  stopMediaTracks();
});
