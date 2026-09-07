# RoadNoise

RoadNoise is a privacy-first car cabin noise recorder designed for Safari on iPhone. It records estimated sound level, GPS speed, location, GPS accuracy, and device vibration once per second. Microphone audio is analyzed live and is never stored.

## Run locally

Sensor APIs require a secure context. `localhost` is accepted for desktop development:

```sh
python3 -m http.server 8080
```

Open `http://localhost:8080`. Testing microphone, motion, and GPS on iPhone requires HTTPS, so the deployed GitHub Pages URL is the simplest test target.

## Deploy to GitHub Pages

1. Create a GitHub repository and push these files to its `main` branch.
2. Open **Settings → Pages** in GitHub.
3. Set **Source** to **GitHub Actions**.
4. Open the URL shown by the `Deploy to GitHub Pages` workflow.

On iPhone, open that URL in Safari. Use **Share → Add to Home Screen** for an app-like experience.

## Measurement limits

Web browsers expose microphone samples but do not provide the microphone's factory SPL calibration. The displayed dB value is therefore an estimate based on the saved calibration offset. For comparable results:

- place the phone in the same mount and orientation each time;
- keep the microphone opening clear and away from vents;
- calibrate beside a trusted sound-level meter in a steady sound field;
- start recording while parked, then leave the phone alone while driving;
- keep the page visible because iOS can suspend browser sensors in the background.

Trip samples remain in IndexedDB on the device until deleted. Each trip can be exported as CSV or JSON.
