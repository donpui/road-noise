(() => {
  "use strict";

  const SAMPLE_INTERVAL = 1000;
  const DB_NAME = "roadnoise-data";
  const DB_VERSION = 1;
  const STORE_NAME = "sessions";

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    body: document.body,
    recordButton: $("#record-button"),
    statusText: $("#status-text"),
    timer: $("#timer"),
    db: $("#db-reading"),
    level: $("#level-label"),
    gauge: $("#gauge-fill"),
    speed: $("#speed-reading"),
    motion: $("#motion-reading"),
    min: $("#min-reading"),
    max: $("#max-reading"),
    avg: $("#avg-reading"),
    chart: $("#noise-chart"),
    emptyChart: $("#empty-chart"),
    tripList: $("#trip-list"),
    dialog: $("#settings-dialog"),
    offset: $("#calibration-offset"),
    offsetOutput: $("#offset-output"),
    calibrationReading: $("#calibration-reading"),
    toast: $("#toast"),
  };

  let dbPromise;
  let audioContext;
  let analyser;
  let mediaStream;
  let animationFrame;
  let sampleTimer;
  let geoWatch;
  let wakeLock;
  let session = null;
  let rawDb = -100;
  let currentDb = null;
  let latestPosition = {};
  let latestMotion = null;
  let calibrationOffset = Number(localStorage.getItem("roadnoise-calibration") || 100);
  let toastTimer;

  function openDatabase() {
    if (!("indexedDB" in window)) return Promise.resolve(null);
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(STORE_NAME)) {
            request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }).catch(() => null);
    }
    return dbPromise;
  }

  async function saveSession(data) {
    const db = await openDatabase();
    if (!db) {
      localStorage.setItem(`roadnoise-session-${data.id}`, JSON.stringify(data));
      return;
    }
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(data);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function getSessions() {
    const db = await openDatabase();
    if (!db) {
      return Object.keys(localStorage)
        .filter((key) => key.startsWith("roadnoise-session-"))
        .map((key) => JSON.parse(localStorage.getItem(key)));
    }
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function deleteSession(id) {
    const db = await openDatabase();
    if (!db) {
      localStorage.removeItem(`roadnoise-session-${id}`);
      return;
    }
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(id);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 3200);
  }

  function formatDuration(milliseconds) {
    const total = Math.max(0, Math.floor(milliseconds / 1000));
    const hours = String(Math.floor(total / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
    const seconds = String(total % 60).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }

  function displayLevel(value) {
    if (value == null || !Number.isFinite(value)) return "Waiting for sound";
    if (value < 50) return "Quiet cabin";
    if (value < 65) return "Comfortable";
    if (value < 75) return "Moderate road noise";
    if (value < 85) return "Loud";
    return "Very loud · protect hearing";
  }

  function analyzeAudio() {
    if (!analyser) return;
    const samples = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(samples);
    let sumSquares = 0;
    for (const sample of samples) sumSquares += sample * sample;
    const rms = Math.sqrt(sumSquares / samples.length);
    rawDb = rms > 0.00001 ? 20 * Math.log10(rms) : -100;
    currentDb = Math.max(20, Math.min(130, rawDb + calibrationOffset));

    const rounded = Math.round(currentDb);
    elements.db.textContent = rounded;
    elements.calibrationReading.textContent = rounded;
    elements.level.textContent = displayLevel(currentDb);
    elements.gauge.style.width = `${Math.max(0, Math.min(100, ((currentDb - 30) / 90) * 100))}%`;
    animationFrame = requestAnimationFrame(analyzeAudio);
  }

  function handleMotion(event) {
    const acceleration = event.acceleration || event.accelerationIncludingGravity;
    if (!acceleration) return;
    const x = Number(acceleration.x) || 0;
    const y = Number(acceleration.y) || 0;
    const z = Number(acceleration.z) || 0;
    let magnitude = Math.sqrt(x * x + y * y + z * z);
    if (!event.acceleration && magnitude > 7) magnitude = Math.abs(magnitude - 9.81);
    latestMotion = Math.min(30, magnitude);
    elements.motion.textContent = latestMotion.toFixed(2);
  }

  async function requestMotionAccess() {
    if (!("DeviceMotionEvent" in window)) return false;
    try {
      if (typeof DeviceMotionEvent.requestPermission === "function") {
        const permission = await DeviceMotionEvent.requestPermission();
        if (permission !== "granted") return false;
      }
      window.addEventListener("devicemotion", handleMotion);
      return true;
    } catch {
      return false;
    }
  }

  function startLocation() {
    if (!("geolocation" in navigator)) return;
    geoWatch = navigator.geolocation.watchPosition(
      ({ coords }) => {
        latestPosition = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          altitude: coords.altitude,
          heading: coords.heading,
          speed: coords.speed,
        };
        const kmh = coords.speed == null ? null : Math.max(0, coords.speed * 3.6);
        elements.speed.textContent = kmh == null ? "--" : Math.round(kmh);
      },
      () => {
        latestPosition = {};
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
  }

  async function requestWakeLock() {
    try {
      if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen");
    } catch {
      wakeLock = null;
    }
  }

  function addSample() {
    if (!session || currentDb == null) return;
    const now = Date.now();
    const sample = {
      timestamp: new Date(now).toISOString(),
      elapsedSeconds: Math.round((now - session.startedAtMs) / 1000),
      db: Number(currentDb.toFixed(1)),
      dbfs: Number(rawDb.toFixed(1)),
      speedKmh: latestPosition.speed == null ? null : Number((Math.max(0, latestPosition.speed) * 3.6).toFixed(1)),
      vibrationMs2: latestMotion == null ? null : Number(latestMotion.toFixed(3)),
      latitude: latestPosition.latitude ?? null,
      longitude: latestPosition.longitude ?? null,
      gpsAccuracyM: latestPosition.accuracy ?? null,
    };
    session.samples.push(sample);
    session.durationMs = now - session.startedAtMs;
    updateSessionStats();
    if (session.samples.length % 10 === 0) saveSession(session).catch(() => {});
  }

  function updateSessionStats() {
    if (!session?.samples.length) return;
    const values = session.samples.map((sample) => sample.db);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    session.summary = { minDb: min, maxDb: max, avgDb: average };
    elements.min.textContent = Math.round(min);
    elements.max.textContent = Math.round(max);
    elements.avg.textContent = `AVG ${Math.round(average)} dB`;
    elements.timer.textContent = formatDuration(Date.now() - session.startedAtMs);
    drawChart();
  }

  function drawChart() {
    const canvas = elements.chart;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const context = canvas.getContext("2d");
    context.scale(ratio, ratio);
    const width = rect.width;
    const height = rect.height;
    const padding = { top: 7, right: 5, bottom: 12, left: 27 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    context.clearRect(0, 0, width, height);
    context.strokeStyle = "rgba(255,255,255,.07)";
    context.fillStyle = "#63716c";
    context.font = "8px system-ui";
    context.textAlign = "right";
    [40, 70, 100].forEach((value) => {
      const y = padding.top + ((110 - value) / 80) * plotHeight;
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(width - padding.right, y);
      context.stroke();
      context.fillText(String(value), padding.left - 6, y + 3);
    });

    const samples = session?.samples.slice(-90) || [];
    elements.emptyChart.hidden = samples.length > 0;
    if (samples.length < 2) return;
    const points = samples.map((sample, index) => ({
      x: padding.left + (index / Math.max(89, samples.length - 1)) * plotWidth,
      y: padding.top + ((110 - Math.max(30, Math.min(110, sample.db))) / 80) * plotHeight,
    }));
    const gradient = context.createLinearGradient(0, padding.top, 0, height);
    gradient.addColorStop(0, "rgba(184,243,74,.30)");
    gradient.addColorStop(1, "rgba(184,243,74,0)");
    context.beginPath();
    context.moveTo(points[0].x, height - padding.bottom);
    points.forEach((point) => context.lineTo(point.x, point.y));
    context.lineTo(points.at(-1).x, height - padding.bottom);
    context.closePath();
    context.fillStyle = gradient;
    context.fill();
    context.beginPath();
    points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
    context.strokeStyle = "#b8f34a";
    context.lineWidth = 2;
    context.lineJoin = "round";
    context.stroke();
  }

  async function startSession() {
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast("Microphone access requires Safari over HTTPS.");
      return;
    }
    elements.recordButton.disabled = true;
    elements.statusText.textContent = "Requesting access…";

    const motionPermission = requestMotionAccess();
    startLocation();
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false,
      });
      await motionPermission;
      await audioContext.resume();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.72;
      audioContext.createMediaStreamSource(mediaStream).connect(analyser);

      const startedAtMs = Date.now();
      session = {
        id: `${startedAtMs}-${Math.random().toString(36).slice(2, 8)}`,
        startedAt: new Date(startedAtMs).toISOString(),
        startedAtMs,
        endedAt: null,
        durationMs: 0,
        complete: false,
        calibrationOffset,
        userAgent: navigator.userAgent,
        samples: [],
        summary: null,
      };
      elements.body.classList.add("recording");
      elements.recordButton.querySelector("span:last-child").textContent = "STOP & SAVE";
      elements.statusText.textContent = "Recording trip";
      elements.recordButton.disabled = false;
      analyzeAudio();
      sampleTimer = setInterval(addSample, SAMPLE_INTERVAL);
      await requestWakeLock();
      saveSession(session).catch(() => {});
    } catch (error) {
      cleanupSensors();
      elements.recordButton.disabled = false;
      elements.statusText.textContent = "Microphone unavailable";
      const denied = error?.name === "NotAllowedError";
      showToast(denied ? "Allow microphone access in Safari settings, then try again." : "Could not start the microphone.");
    }
  }

  function cleanupSensors() {
    clearInterval(sampleTimer);
    cancelAnimationFrame(animationFrame);
    if (geoWatch != null) navigator.geolocation.clearWatch(geoWatch);
    window.removeEventListener("devicemotion", handleMotion);
    mediaStream?.getTracks().forEach((track) => track.stop());
    audioContext?.close().catch(() => {});
    wakeLock?.release().catch(() => {});
    analyser = null;
    mediaStream = null;
    audioContext = null;
    geoWatch = null;
    wakeLock = null;
  }

  async function stopSession() {
    if (!session) return;
    addSample();
    session.endedAt = new Date().toISOString();
    session.durationMs = Date.now() - session.startedAtMs;
    session.complete = true;
    cleanupSensors();
    await saveSession(session);
    const savedSession = session;
    session = null;
    elements.body.classList.remove("recording");
    elements.recordButton.querySelector("span:last-child").textContent = "START RECORDING";
    elements.statusText.textContent = "Trip saved";
    await renderTrips();
    showToast(`${formatDuration(savedSession.durationMs)} trip saved on this device.`);
  }

  function downloadFile(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function sessionFilename(data, extension) {
    return `roadnoise-${data.startedAt.replaceAll(":", "-").replace(".000Z", "Z")}.${extension}`;
  }

  function exportCsv(data) {
    const headers = ["timestamp", "elapsed_seconds", "estimated_db", "dbfs", "speed_kmh", "vibration_ms2", "latitude", "longitude", "gps_accuracy_m"];
    const rows = data.samples.map((sample) => [sample.timestamp, sample.elapsedSeconds, sample.db, sample.dbfs, sample.speedKmh, sample.vibrationMs2, sample.latitude, sample.longitude, sample.gpsAccuracyM].map((value) => value ?? "").join(","));
    downloadFile(sessionFilename(data, "csv"), `${headers.join(",")}\n${rows.join("\n")}`, "text/csv;charset=utf-8");
  }

  function exportJson(data) {
    downloadFile(sessionFilename(data, "json"), JSON.stringify(data, null, 2), "application/json");
  }

  async function renderTrips() {
    const sessions = (await getSessions()).sort((a, b) => b.startedAtMs - a.startedAtMs);
    elements.tripList.replaceChildren();
    if (!sessions.length) {
      elements.tripList.innerHTML = '<div class="empty-state"><strong>No trips recorded yet</strong>Your completed measurements will appear here.</div>';
      return;
    }
    sessions.forEach((data) => {
      const card = document.createElement("article");
      card.className = "trip-card";
      const date = new Date(data.startedAt);
      const average = data.summary?.avgDb == null ? "--" : Math.round(data.summary.avgDb);
      const max = data.summary?.maxDb == null ? "--" : Math.round(data.summary.maxDb);
      card.innerHTML = `
        <div class="trip-card-head"><div><h2>${data.complete ? "Road measurement" : "Recovered measurement"}</h2><time datetime="${data.startedAt}">${date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time></div></div>
        <div class="trip-card-stats"><div><span>DURATION</span><strong>${formatDuration(data.durationMs)}</strong></div><div><span>AVERAGE</span><strong>${average} dB</strong></div><div><span>MAXIMUM</span><strong>${max} dB</strong></div></div>
        <div class="trip-actions"><button type="button" data-action="csv">DOWNLOAD CSV</button><button type="button" data-action="json">DOWNLOAD JSON</button><button class="delete-trip" type="button" data-action="delete" aria-label="Delete trip">×</button></div>`;
      card.addEventListener("click", async (event) => {
        const action = event.target.closest("button")?.dataset.action;
        if (action === "csv") exportCsv(data);
        if (action === "json") exportJson(data);
        if (action === "delete") {
          await deleteSession(data.id);
          await renderTrips();
          showToast("Trip deleted.");
        }
      });
      elements.tripList.append(card);
    });
  }

  function switchView(name) {
    document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === `${name}-view`));
    document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === name));
    if (name === "trips") renderTrips();
    if (name === "meter") requestAnimationFrame(drawChart);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  elements.recordButton.addEventListener("click", () => session ? stopSession() : startSession());
  document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
  $("#settings-button").addEventListener("click", () => elements.dialog.showModal());
  $("#calibrate-link").addEventListener("click", () => elements.dialog.showModal());
  elements.offset.addEventListener("input", () => {
    calibrationOffset = Number(elements.offset.value);
    elements.offsetOutput.textContent = `+${calibrationOffset} dB`;
  });
  $("#reset-calibration").addEventListener("click", () => {
    elements.offset.value = "100";
    elements.offset.dispatchEvent(new Event("input"));
  });
  elements.dialog.addEventListener("close", () => {
    if (elements.dialog.returnValue === "save") {
      localStorage.setItem("roadnoise-calibration", String(calibrationOffset));
      if (session) session.calibrationOffset = calibrationOffset;
      showToast("Calibration saved.");
    } else {
      calibrationOffset = Number(localStorage.getItem("roadnoise-calibration") || 100);
      elements.offset.value = String(calibrationOffset);
      elements.offsetOutput.textContent = `+${calibrationOffset} dB`;
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && session && !wakeLock) requestWakeLock();
  });
  window.addEventListener("resize", drawChart);
  window.addEventListener("beforeunload", () => {
    if (session) saveSession(session).catch(() => {});
  });

  elements.offset.value = String(calibrationOffset);
  elements.offsetOutput.textContent = `+${calibrationOffset} dB`;
  renderTrips();
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
})();
