(() => {
  "use strict";

  const SAMPLE_INTERVAL = 1000;
  const DB_NAME = "roadnoise-data";
  const DB_VERSION = 1;
  const STORE_NAME = "sessions";
  // A tiny muted video keeps older iOS Safari builds awake when Screen Wake Lock is unavailable.
  // It is never sent anywhere and contains no audio.
  const KEEP_AWAKE_VIDEO = "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAL/bW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAA+gAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAil0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAA+gAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAIAAAACAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAPoAAAAAAABAAAAAAGhbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAABAAAAAQABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAABTG1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAQxzdGJsAAAAqHN0c2QAAAAAAAAAAQAAAJhhdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAIAAgBIAAAASAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGP//AAAAMmF2Y0MBZAAK/+EAGWdkAAqs2V+IiMBEAAADAAQAAAMACDxIllgBAAZo6+PLIsAAAAAQcGFzcAAAAAEAAAABAAAAGHN0dHMAAAAAAAAAAQAAAAEAAEAAAAAAHHN0c2MAAAAAAAAAAQAAAAEAAAABAAAAAQAAABRzdHN6AAAAAAAAArcAAAABAAAAFHN0Y28AAAAAAAAAAQAAAy8AAABidWR0YQAAAFptZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAAC1pbHN0AAAAJal0b28AAAAdZGF0YQAAAAEAAAAATGF2ZjU4LjI5LjEwMAAAAAhmcmVlAAACv21kYXQAAAKfBgX//5vcRem95tlIt5Ys2CDZI+7veDI2NCAtIGNvcmUgMTUyIC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxNyAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTEgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbnRfbWluPTEgc2NlbmVjdXQ9NDAgaW50cmFfcmVmcmVzaD0wIHJjX2xvb2thaGVhZD00MCByYz1jcmYgbWJ0cmVlPTEgY3JmPTIzLjAgcWNvbXA9MC42MCBxcG1pbj0wIHFwbWF4PTY5IHFwc3RlcD00IGlwX3JhdGlvPTEuNDAgYXE9MToxLjAwAIAAAAAQZYiEABX//vfJ78Cm69vfgQ==";

  const $ = (selector) => document.querySelector(selector);
  function detectDeviceLabel() {
    const userAgent = navigator.userAgent || "";
    const device = /iPad/i.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
      ? "iPad"
      : /iPhone/i.test(userAgent)
        ? "iPhone"
        : /Android/i.test(userAgent)
          ? "Android device"
          : /Macintosh/i.test(userAgent)
            ? "Mac"
            : /Windows/i.test(userAgent)
              ? "Windows PC"
              : "Unknown device";
    const browser = /CriOS/i.test(userAgent)
      ? "Chrome iOS"
      : /FxiOS/i.test(userAgent)
        ? "Firefox iOS"
        : /EdgiOS/i.test(userAgent)
          ? "Edge iOS"
          : /OPiOS/i.test(userAgent)
            ? "Opera iOS"
            : /Edg\//i.test(userAgent)
              ? "Edge"
              : /OPR\//i.test(userAgent)
                ? "Opera"
                : /Firefox\//i.test(userAgent)
                  ? "Firefox"
                  : /Chrome\//i.test(userAgent)
                    ? "Chrome"
                    : /Safari\//i.test(userAgent)
                      ? "Safari"
                      : "Browser";
    const iosVersion = userAgent.match(/OS ([\d_]+) like Mac OS X/i)?.[1]?.replaceAll("_", ".");
    const androidVersion = userAgent.match(/Android ([\d.]+)/i)?.[1];
    const macVersion = userAgent.match(/Mac OS X ([\d_]+)/i)?.[1]?.replaceAll("_", ".");
    const os = iosVersion ? `iOS ${iosVersion}` : androidVersion ? `Android ${androidVersion}` : macVersion ? `macOS ${macVersion}` : "";
    return [device, browser, os].filter(Boolean).join(" · ");
  }
  const elements = {
    body: document.body,
    recordButton: $("#record-button"),
    statusText: $("#status-text"),
    timer: $("#timer"),
    wakeButton: $("#wake-button"),
    deviceLabel: $("#device-label"),
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
    resultsDialog: $("#results-dialog"),
    resultsTitle: $("#results-title"),
    resultsDate: $("#results-date"),
    resultsDevice: $("#results-device"),
    resultsAverage: $("#results-average"),
    resultsP95: $("#results-p95"),
    resultsMax: $("#results-max"),
    resultsChart: $("#results-chart"),
    speedTableBody: $("#speed-table-body"),
    shareCarName: $("#share-car-name"),
    shareTrip: $("#share-trip"),
    shareResult: $("#share-result"),
    shareUrl: $("#share-url"),
    shareCopy: $("#share-copy"),
    shareStatus: $("#share-status"),
    benchmarkList: $("#benchmark-list"),
    benchmarkSearch: $("#bench-search"),
    benchmarkRefresh: $("#bench-refresh"),
    benchmarkNote: $("#bench-note"),
  };

  const supabaseConfig = window.ROADNOISE_SUPABASE || {};
  const supabaseReady = Boolean(supabaseConfig.url && supabaseConfig.anonKey);

  let dbPromise;
  let audioContext;
  let analyser;
  let mediaStream;
  let animationFrame;
  let sampleTimer;
  let geoWatch;
  let wakeLock;
  let keepAwakeVideo;
  let keepAwakeMethod = null;
  let reviewedSession = null;
  let session = null;
  let rawDb = -100;
  let currentDb = null;
  let latestPosition = {};
  let latestMotion = null;
  let recentDbReadings = [];
  let calibrationOffset = Number(localStorage.getItem("roadnoise-calibration") || 100);
  let recordingDevice = localStorage.getItem("roadnoise-device-label") || detectDeviceLabel();
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

  function percentile(values, percentileValue) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const index = (sorted.length - 1) * percentileValue;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  }

  function speedBands(data) {
    const speedSamples = (data.samples || []).filter((sample) => Number.isFinite(sample.speedKmh));
    const highestSpeed = speedSamples.length ? Math.max(...speedSamples.map((sample) => sample.speedKmh)) : 0;
    const highestBand = Math.max(10, Math.floor(highestSpeed / 10) * 10 + 10);
    return Array.from({ length: highestBand / 10 }, (_, index) => {
      const min = index * 10;
      const max = (index + 1) * 10;
      const values = speedSamples.filter((sample) => sample.speedKmh >= min && sample.speedKmh < max).map((sample) => sample.db).filter(Number.isFinite);
      return {
        min,
        max,
        label: `${min}–${max} km/h`,
        samples: values.length,
        averageDb: values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)) : null,
        p95Db: values.length ? Number(percentile(values, .95).toFixed(1)) : null,
        maxDb: values.length ? Number(Math.max(...values).toFixed(1)) : null,
      };
    });
  }

  async function supabaseRequest(resource, options = {}) {
    if (!supabaseReady) throw new Error("Public sharing is not configured yet.");
    const response = await fetch(`${supabaseConfig.url.replace(/\/$/, "")}/rest/v1/${resource}`, {
      ...options,
      headers: {
        apikey: supabaseConfig.anonKey,
        Authorization: `Bearer ${supabaseConfig.anonKey}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || `Supabase request failed (${response.status})`);
    }
    return response.status === 204 ? null : response.json();
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

    recentDbReadings.push(currentDb);
    if (recentDbReadings.length > 90) recentDbReadings.shift();
    const stableDb = percentile(recentDbReadings, .5);
    const rounded = Math.round(stableDb);
    elements.db.textContent = rounded;
    elements.calibrationReading.textContent = rounded;
    elements.level.textContent = displayLevel(stableDb);
    elements.gauge.style.width = `${Math.max(0, Math.min(100, ((stableDb - 30) / 90) * 100))}%`;
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
        const gpsAccuracy = Number(coords.accuracy);
        const usableSpeed = Number.isFinite(gpsAccuracy) && gpsAccuracy <= 30 && Number.isFinite(coords.speed) && coords.speed >= 0 ? coords.speed : null;
        latestPosition = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: gpsAccuracy,
          altitude: coords.altitude,
          heading: coords.heading,
          speed: usableSpeed,
        };
        const kmh = usableSpeed == null ? null : Math.max(0, usableSpeed * 3.6);
        elements.speed.textContent = kmh == null ? "--" : Math.round(kmh);
      },
      () => {
        latestPosition = {};
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
  }

  function updateWakeUi(screenAwake = Boolean(wakeLock || keepAwakeMethod)) {
    if (!session) {
      elements.wakeButton.hidden = true;
      return;
    }
    elements.wakeButton.hidden = screenAwake;
    elements.statusText.textContent = screenAwake
      ? "Recording trip · screen awake"
      : "Recording trip · tap KEEP SCREEN AWAKE";
  }

  async function requestKeepAwake() {
    if (keepAwakeMethod === "video" || wakeLock) return true;
    let videoPlayback;
    try {
      if (!keepAwakeVideo) {
        keepAwakeVideo = document.createElement("video");
        keepAwakeVideo.setAttribute("aria-hidden", "true");
        keepAwakeVideo.setAttribute("playsinline", "");
        keepAwakeVideo.setAttribute("webkit-playsinline", "");
        keepAwakeVideo.muted = true;
        keepAwakeVideo.loop = true;
        keepAwakeVideo.preload = "auto";
        keepAwakeVideo.src = KEEP_AWAKE_VIDEO;
        keepAwakeVideo.style.cssText = "position:fixed;width:2px;height:2px;opacity:.01;pointer-events:none;left:0;bottom:0";
        keepAwakeVideo.addEventListener("pause", () => {
          if (session && keepAwakeMethod === "video") {
            keepAwakeMethod = null;
            updateWakeUi(false);
          }
        });
        keepAwakeVideo.addEventListener("error", () => {
          if (session && keepAwakeMethod === "video") {
            keepAwakeMethod = null;
            updateWakeUi(false);
          }
        });
        document.body.append(keepAwakeVideo);
      }
      // Called from the Start button path so iOS treats this as user-initiated media.
      videoPlayback = keepAwakeVideo.play().then(() => true).catch(() => false);
    } catch {
      videoPlayback = Promise.resolve(false);
    }
    try {
      if ("wakeLock" in navigator) {
        wakeLock = await navigator.wakeLock.request("screen");
        keepAwakeMethod = "native";
        wakeLock.addEventListener("release", () => {
          wakeLock = null;
          if (!session) return;
          updateWakeUi(false);
          if (document.visibilityState === "visible") requestKeepAwake().then(updateWakeUi).catch(() => updateWakeUi(false));
        });
        keepAwakeVideo?.pause();
        keepAwakeVideo?.remove();
        keepAwakeVideo = null;
        return true;
      }
    } catch {
      wakeLock = null;
    }
    const videoStarted = await videoPlayback;
    keepAwakeMethod = videoStarted ? "video" : null;
    if (!videoStarted) showToast("Screen lock is unavailable. Tap KEEP SCREEN AWAKE or set Auto-Lock to Never.");
    return videoStarted;
  }

  function addSample() {
    if (!session || currentDb == null) return;
    const now = Date.now();
    const sample = {
      timestamp: new Date(now).toISOString(),
      elapsedSeconds: Math.round((now - session.startedAtMs) / 1000),
      db: Number((recentDbReadings.length ? percentile(recentDbReadings, .5) : currentDb).toFixed(1)),
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

  function getSpeedScale(samples) {
    const speeds = samples.map((sample) => Number(sample.speedKmh)).filter(Number.isFinite);
    if (!speeds.length) return null;
    return Math.max(40, Math.ceil(Math.max(...speeds) / 20) * 20);
  }

  function drawSpeedTrace(context, samples, padding, plotWidth, plotHeight, width, height, denominator) {
    const speedMax = getSpeedScale(samples);
    if (!speedMax) return;
    let started = false;
    context.beginPath();
    samples.forEach((sample, index) => {
      const speed = Number(sample.speedKmh);
      if (!Number.isFinite(speed)) {
        started = false;
        return;
      }
      const x = padding.left + (index / denominator) * plotWidth;
      const y = padding.top + (1 - Math.min(speedMax, Math.max(0, speed)) / speedMax) * plotHeight;
      if (started) context.lineTo(x, y);
      else context.moveTo(x, y);
      started = true;
    });
    context.strokeStyle = "#62c7dc";
    context.lineWidth = 1.8;
    context.setLineDash([4, 3]);
    context.lineJoin = "round";
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = "#62c7dc";
    context.font = "8px system-ui";
    context.textAlign = "left";
    context.fillText(String(speedMax), width - padding.right + 6, padding.top + 3);
    context.fillText(String(Math.round(speedMax / 2)), width - padding.right + 6, padding.top + plotHeight / 2 + 3);
    context.fillText("0", width - padding.right + 6, height - padding.bottom + 3);
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
    const padding = { top: 7, right: 34, bottom: 12, left: 27 };
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
    drawSpeedTrace(context, samples, padding, plotWidth, plotHeight, width, height, Math.max(89, samples.length - 1));
  }

  function drawResultsChart(data) {
    const canvas = elements.resultsChart;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const context = canvas.getContext("2d");
    context.scale(ratio, ratio);
    const width = rect.width;
    const height = rect.height;
    const padding = { top: 12, right: 41, bottom: 21, left: 31 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    context.clearRect(0, 0, width, height);
    context.strokeStyle = "rgba(255,255,255,.08)";
    context.fillStyle = "#66756f";
    context.font = "9px system-ui";
    context.textAlign = "right";
    [40, 70, 100].forEach((value) => {
      const y = padding.top + ((110 - value) / 80) * plotHeight;
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(width - padding.right, y);
      context.stroke();
      context.fillText(String(value), padding.left - 7, y + 3);
    });
    const samples = data.samples || [];
    if (samples.length < 2) return;
    const points = samples.map((sample, index) => ({
      x: padding.left + (index / (samples.length - 1)) * plotWidth,
      y: padding.top + ((110 - Math.max(30, Math.min(110, sample.db))) / 80) * plotHeight,
    }));
    const gradient = context.createLinearGradient(0, padding.top, 0, height);
    gradient.addColorStop(0, "rgba(184,243,74,.32)");
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
    drawSpeedTrace(context, samples, padding, plotWidth, plotHeight, width, height, samples.length - 1);
    context.fillStyle = "#66756f";
    context.textAlign = "left";
    context.fillText("START", padding.left, height - 5);
    context.textAlign = "right";
    context.fillText(formatDuration(data.durationMs), width - padding.right, height - 5);
  }

  function showResults(data) {
    reviewedSession = data;
    const values = (data.samples || []).map((sample) => sample.db).filter(Number.isFinite);
    const average = data.summary?.avgDb ?? (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null);
    const maximum = data.summary?.maxDb ?? (values.length ? Math.max(...values) : null);
    elements.resultsTitle.textContent = data.complete ? "Road measurement" : "Recovered measurement";
    elements.resultsDate.textContent = `${new Date(data.startedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} · ${formatDuration(data.durationMs)}`;
    elements.resultsDevice.textContent = `Recorded on ${data.recordingDevice || "device not specified"}`;
    elements.resultsAverage.textContent = average == null ? "--" : Math.round(average);
    elements.resultsP95.textContent = percentile(values, .95) == null ? "--" : Math.round(percentile(values, .95));
    elements.resultsMax.textContent = maximum == null ? "--" : Math.round(maximum);

    const bins = speedBands(data);
    elements.speedTableBody.replaceChildren();
    let withSpeed = 0;
    bins.forEach((bin) => {
      withSpeed += bin.samples;
      const row = document.createElement("tr");
      row.innerHTML = `<td>${bin.label}</td><td>${bin.samples || "—"}</td><td>${bin.averageDb == null ? "—" : `${Math.round(bin.averageDb)} dB`}</td><td>${bin.p95Db == null ? "—" : `${Math.round(bin.p95Db)} dB`}</td><td>${bin.maxDb == null ? "—" : `${Math.round(bin.maxDb)} dB`}</td>`;
      elements.speedTableBody.append(row);
    });
    if (!withSpeed) {
      elements.speedTableBody.innerHTML = '<tr><td class="speed-table-empty" colspan="5">No GPS speed samples were recorded for this trip.</td></tr>';
    }
    elements.resultsDialog.showModal();
    elements.shareCarName.value = "";
    elements.shareResult.hidden = true;
    elements.shareUrl.value = "";
    elements.shareStatus.textContent = supabaseReady ? "" : "Public sharing is not configured yet. Add Supabase values to config.js.";
    elements.shareStatus.classList.toggle("error", !supabaseReady);
    requestAnimationFrame(() => drawResultsChart(data));
  }

  async function startSession() {
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast("Microphone access requires Safari over HTTPS.");
      return;
    }
    elements.recordButton.disabled = true;
    elements.statusText.textContent = "Requesting access…";

    // Start this before any permission prompt or await so iOS preserves the tap's user activation.
    const keepAwakeAttempt = requestKeepAwake();
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
        recordingDevice,
        userAgent: navigator.userAgent,
        samples: [],
        summary: null,
      };
      recentDbReadings = [];
      elements.body.classList.add("recording");
      elements.recordButton.querySelector("span:last-child").textContent = "STOP & SAVE";
      elements.statusText.textContent = "Recording trip";
      elements.recordButton.disabled = false;
      analyzeAudio();
      sampleTimer = setInterval(addSample, SAMPLE_INTERVAL);
      const screenAwake = await keepAwakeAttempt;
      updateWakeUi(screenAwake);
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
    keepAwakeVideo?.pause();
    keepAwakeVideo?.remove();
    analyser = null;
    mediaStream = null;
    audioContext = null;
    geoWatch = null;
    wakeLock = null;
    keepAwakeVideo = null;
    keepAwakeMethod = null;
    elements.wakeButton.hidden = true;
    elements.wakeButton.disabled = false;
  }

  async function stopSession() {
    if (!session) return;
    addSample();
    session.endedAt = new Date().toISOString();
    session.durationMs = Date.now() - session.startedAtMs;
    session.complete = true;
    const savedSession = session;
    session = null;
    cleanupSensors();
    await saveSession(savedSession);
    elements.body.classList.remove("recording");
    elements.recordButton.querySelector("span:last-child").textContent = "START RECORDING";
    elements.statusText.textContent = "Trip saved";
    await renderTrips();
    showResults(savedSession);
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

  function csvCell(value) {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  function exportCsv(data) {
    const headers = ["timestamp", "elapsed_seconds", "estimated_db", "dbfs", "speed_kmh", "vibration_ms2", "latitude", "longitude", "gps_accuracy_m", "recording_device"];
    const rows = data.samples.map((sample) => [sample.timestamp, sample.elapsedSeconds, sample.db, sample.dbfs, sample.speedKmh, sample.vibrationMs2, sample.latitude, sample.longitude, sample.gpsAccuracyM, data.recordingDevice].map(csvCell).join(","));
    downloadFile(sessionFilename(data, "csv"), `${headers.join(",")}\n${rows.join("\n")}`, "text/csv;charset=utf-8");
  }

  function exportJson(data) {
    downloadFile(sessionFilename(data, "json"), JSON.stringify(data, null, 2), "application/json");
  }

  async function publishSession(data, carName) {
    const values = (data.samples || []).map((sample) => sample.db).filter(Number.isFinite);
    if (!values.length) throw new Error("This trip has no sound samples to publish.");
    const publicSamples = (data.samples || []).map((sample) => ({
      elapsedSeconds: sample.elapsedSeconds,
      db: sample.db,
      speedKmh: sample.speedKmh,
      vibrationMs2: sample.vibrationMs2,
    }));
    const response = await supabaseRequest("roadnoise_shared", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        car_name: carName.trim(),
        recording_device: data.recordingDevice || null,
        duration_seconds: Math.max(1, Math.round(data.durationMs / 1000)),
        sample_count: publicSamples.length,
        average_db: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)),
        p95_db: Number(percentile(values, .95).toFixed(1)),
        max_db: Number(Math.max(...values).toFixed(1)),
        speed_bands: speedBands(data),
        samples: publicSamples,
      }),
    });
    return Array.isArray(response) ? response[0] : response;
  }

  function publicRecordToSession(record) {
    return {
      id: record.id,
      startedAt: record.created_at,
      durationMs: record.duration_seconds * 1000,
      complete: true,
      recordingDevice: record.recording_device || "",
      samples: record.samples || [],
      summary: { avgDb: Number(record.average_db), p95Db: Number(record.p95_db), maxDb: Number(record.max_db) },
    };
  }

  async function loadSharedRecording(code) {
    if (!supabaseReady) {
      showToast("This shared recording needs Supabase configuration.");
      return;
    }
    try {
      const rows = await supabaseRequest(`roadnoise_shared?select=id,created_at,duration_seconds,average_db,p95_db,max_db,recording_device,samples&share_code=eq.${encodeURIComponent(code)}&limit=1`);
      if (!rows?.length) throw new Error("Shared recording not found.");
      showResults(publicRecordToSession(rows[0]));
    } catch (error) {
      showToast(error.message || "Could not load the shared recording.");
    }
  }

  async function renderBenchmark() {
    elements.benchmarkList.replaceChildren();
    if (!supabaseReady) {
      elements.benchmarkNote.textContent = "Benchmark sharing is ready, but this deployment has no Supabase configuration yet.";
      elements.benchmarkList.innerHTML = '<div class="empty-state"><strong>Public benchmark unavailable</strong>Add the project URL and publishable key to config.js, then redeploy.</div>';
      return;
    }
    try {
      const records = await supabaseRequest("roadnoise_shared?select=id,share_code,car_name,recording_device,created_at,duration_seconds,sample_count,average_db,p95_db,max_db&order=created_at.desc&limit=100");
      const filter = elements.benchmarkSearch.value.trim().toLowerCase();
      const filtered = records.filter((record) => !filter || record.car_name.toLowerCase().includes(filter));
      elements.benchmarkNote.textContent = `${filtered.length} public measurement${filtered.length === 1 ? "" : "s"} · GPS coordinates are never published.`;
      if (!filtered.length) {
        elements.benchmarkList.innerHTML = '<div class="empty-state"><strong>No matching measurements</strong>Be the first to publish a trip.</div>';
        return;
      }
      filtered.forEach((record) => {
        const card = document.createElement("article");
        card.className = "benchmark-card";
        card.innerHTML = `<div class="benchmark-card-head"><div><h2></h2><time></time><small class="benchmark-device"></small></div><span class="sample-count">${record.sample_count} samples</span></div><div class="benchmark-stats"><div><span>AVERAGE</span><strong>${Math.round(record.average_db)} dB</strong></div><div><span>P95</span><strong>${Math.round(record.p95_db)} dB</strong></div><div><span>MAXIMUM</span><strong>${Math.round(record.max_db)} dB</strong></div></div><button class="share-link" type="button">VIEW RECORDING</button>`;
        card.querySelector("h2").textContent = record.car_name;
        card.querySelector("time").textContent = new Date(record.created_at).toLocaleDateString([], { dateStyle: "medium" });
        card.querySelector(".benchmark-device").textContent = record.recording_device || "Device not specified";
        card.querySelector(".share-link").addEventListener("click", () => {
          window.location.href = `${window.location.pathname}?share=${encodeURIComponent(record.share_code)}`;
        });
        elements.benchmarkList.append(card);
      });
    } catch (error) {
      elements.benchmarkNote.textContent = "Could not load public measurements.";
      elements.benchmarkList.innerHTML = `<div class="empty-state"><strong>Benchmark temporarily unavailable</strong>${error.message || "Try again in a moment."}</div>`;
    }
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
        <div class="trip-card-head"><div><h2>${data.complete ? "Road measurement" : "Recovered measurement"}</h2><time datetime="${data.startedAt}">${date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time><small class="trip-device"></small></div></div>
        <div class="trip-card-stats"><div><span>DURATION</span><strong>${formatDuration(data.durationMs)}</strong></div><div><span>AVERAGE</span><strong>${average} dB</strong></div><div><span>MAXIMUM</span><strong>${max} dB</strong></div></div>
        <div class="trip-actions"><button type="button" data-action="review">REVIEW</button><button type="button" data-action="csv">CSV</button><button type="button" data-action="json">JSON</button><button class="delete-trip" type="button" data-action="delete" aria-label="Delete trip">×</button></div>`;
      card.addEventListener("click", async (event) => {
        const action = event.target.closest("button")?.dataset.action;
        if (action === "review") showResults(data);
        if (action === "csv") exportCsv(data);
        if (action === "json") exportJson(data);
        if (action === "delete") {
          await deleteSession(data.id);
          await renderTrips();
          showToast("Trip deleted.");
        }
      });
      card.querySelector(".trip-device").textContent = data.recordingDevice || "Device not specified";
      elements.tripList.append(card);
    });
  }

  function switchView(name) {
    document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === `${name}-view`));
    document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === name));
    if (name === "trips") renderTrips();
    if (name === "bench") renderBenchmark();
    if (name === "meter") requestAnimationFrame(drawChart);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  elements.recordButton.addEventListener("click", () => session ? stopSession() : startSession());
  elements.wakeButton.addEventListener("click", async () => {
    if (!session) return;
    elements.wakeButton.disabled = true;
    const screenAwake = await requestKeepAwake();
    updateWakeUi(screenAwake);
    elements.wakeButton.disabled = false;
  });
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
  $("#results-csv").addEventListener("click", () => reviewedSession && exportCsv(reviewedSession));
  $("#results-json").addEventListener("click", () => reviewedSession && exportJson(reviewedSession));
  elements.shareTrip.addEventListener("click", async () => {
    if (!reviewedSession) return;
    const carName = elements.shareCarName.value.trim();
    if (!carName) {
      elements.shareStatus.textContent = "Enter a car name to publish this trip.";
      elements.shareStatus.classList.add("error");
      elements.shareCarName.focus();
      return;
    }
    if (!supabaseReady) {
      elements.shareStatus.textContent = "Public sharing is not configured for this deployment yet.";
      elements.shareStatus.classList.add("error");
      return;
    }
    elements.shareTrip.disabled = true;
    elements.shareStatus.classList.remove("error");
    elements.shareStatus.textContent = "Publishing…";
    try {
      const record = await publishSession(reviewedSession, carName);
      const shareUrl = `${window.location.origin}${window.location.pathname}?share=${encodeURIComponent(record.share_code)}`;
      elements.shareUrl.value = shareUrl;
      elements.shareResult.hidden = false;
      elements.shareStatus.textContent = `Published: ${shareUrl}`;
      try { await navigator.clipboard.writeText(shareUrl); showToast("Share link copied."); } catch { showToast("Trip published."); }
      await renderBenchmark();
    } catch (error) {
      elements.shareStatus.textContent = error.message || "Could not publish this trip.";
      elements.shareStatus.classList.add("error");
    } finally {
      elements.shareTrip.disabled = false;
    }
  });
  elements.shareCopy.addEventListener("click", async () => {
    const shareUrl = elements.shareUrl.value;
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast("Share link copied.");
    } catch {
      elements.shareUrl.focus();
      elements.shareUrl.select();
      showToast("Select and copy the link.");
    }
  });
  elements.shareCarName.addEventListener("focus", () => {
    window.setTimeout(() => {
      elements.shareCarName.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      const inputRect = elements.shareCarName.getBoundingClientRect();
      const dialogRect = elements.resultsDialog.getBoundingClientRect();
      if (inputRect.bottom > dialogRect.bottom - 24) {
        elements.resultsDialog.scrollTop += inputRect.bottom - dialogRect.bottom + 44;
      }
    }, 180);
  });
  elements.benchmarkRefresh.addEventListener("click", () => renderBenchmark());
  elements.benchmarkSearch.addEventListener("input", () => renderBenchmark());
  elements.dialog.addEventListener("close", () => {
    if (elements.dialog.returnValue === "save") {
      localStorage.setItem("roadnoise-calibration", String(calibrationOffset));
      recordingDevice = elements.deviceLabel.value.trim() || detectDeviceLabel();
      localStorage.setItem("roadnoise-device-label", recordingDevice);
      if (session) {
        session.calibrationOffset = calibrationOffset;
        session.recordingDevice = recordingDevice;
      }
      showToast("Calibration and device label saved.");
    } else {
      calibrationOffset = Number(localStorage.getItem("roadnoise-calibration") || 100);
      elements.offset.value = String(calibrationOffset);
      elements.offsetOutput.textContent = `+${calibrationOffset} dB`;
      elements.deviceLabel.value = recordingDevice;
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && session && !wakeLock && keepAwakeMethod !== "video") {
      requestKeepAwake().then(updateWakeUi).catch(() => updateWakeUi(false));
    }
  });
  window.addEventListener("resize", () => {
    drawChart();
    if (reviewedSession && elements.resultsDialog.open) drawResultsChart(reviewedSession);
  });
  window.addEventListener("beforeunload", () => {
    if (session) saveSession(session).catch(() => {});
  });

  elements.offset.value = String(calibrationOffset);
  elements.offsetOutput.textContent = `+${calibrationOffset} dB`;
  elements.deviceLabel.value = recordingDevice;
  renderTrips();
  const sharedCode = new URLSearchParams(window.location.search).get("share");
  if (sharedCode) loadSharedRecording(sharedCode);
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
})();
