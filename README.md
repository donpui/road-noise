# RoadNoise

RoadNoise is a privacy-first car cabin noise recorder designed for Safari on iPhone. It records estimated sound level, GPS speed, location, GPS accuracy, and device vibration once per second. Microphone audio is analyzed live and is never stored.

## Run locally

Sensor APIs require a secure context. `localhost` is accepted for desktop development:

```sh
python3 -m http.server 8080
```

Open `http://localhost:8080`. Testing microphone, motion, and GPS on iPhone requires HTTPS, so the deployed GitHub Pages URL is the simplest test target.

The checked-in CSV in [`example/`](./example/) keeps the original measurement values but has blank latitude, longitude, and GPS accuracy fields so it cannot identify the original recording location.

## Deploy to GitHub Pages

1. Create a GitHub repository and push these files to its `main` branch.
2. Open **Settings → Pages** in GitHub.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**, then save.
4. Open the **Actions** tab and rerun the workflow (or push another commit).
5. Open the URL shown by the `Deploy to GitHub Pages` workflow.

The Pages setting must be enabled once before the first deployment. Otherwise `configure-pages` reports `HttpError: Not Found` because the repository does not have a Pages site yet.

On iPhone, open that URL in Safari. Use **Share → Add to Home Screen** for an app-like experience.

## Measurement limits

Web browsers expose microphone samples but do not provide the microphone's factory SPL calibration. The displayed dB value is therefore an estimate based on the saved calibration offset. For comparable results:

- place the phone in the same mount and orientation each time;
- keep the microphone opening clear and away from vents;
- calibrate beside a trusted sound-level meter in a steady sound field;
- start recording while parked, then leave the phone alone while driving;
- keep the page visible because iOS can suspend browser sensors in the background.

Trip samples remain in IndexedDB on the device until deleted. Each trip can be exported as CSV or JSON.

## Optional public sharing and benchmark

Public sharing is opt-in. A shared record contains the car name, aggregate noise statistics, 10 km/h speed-band statistics, and the noise/vibration samples needed to replay the graph. GPS coordinates, headings, altitude, exact recording timestamps, and raw microphone data are not published.

To enable it:

1. Create a Supabase project.
2. Run [`supabase.sql`](./supabase.sql) in the Supabase SQL Editor.
3. In **Project Settings → Data API**, expose the `roadnoise_shared` table if your project does not expose new public tables automatically.
4. Copy the project URL and publishable/anon key into [`config.js`](./config.js), then commit and redeploy.

The **Bench** tab lists public measurements. Each published record gets a URL such as `?share=<code>` that opens the full shared recording. Do not put a Supabase `service_role` or secret key in `config.js`; only the browser-safe publishable/anon key belongs there.
