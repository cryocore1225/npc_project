# NPC Trash Classifier

Browser-based trash classification demo built with Next.js and TensorFlow.js.

## Overview

This project classifies waste in two stages:

1. The model predicts 8 object classes.
2. The app maps those classes into 5 trash categories.

It also includes:

- camera capture with retake/confirm flow
- upload by file, URL, or clipboard
- low-confidence fallback (`undetermined`)
- bilingual UI (Chinese/Korean)
- local analytics logs with `/admin` dashboard

## Tech Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- TensorFlow.js (`@tensorflow/tfjs`)

## Routes

- `/` main classifier page
- `/admin` local analytics dashboard

## Setup

```bash
npm install
npm run dev
```

Production:

```bash
npm run build
npm run start
```

## Model Files

Put model files in:

- `public/model/model.json`
- `public/model/weights.bin`

The app loads with version query for cache busting:

- `MODEL_VERSION = "model-v2"` in `app/page.tsx`
- actual URL: `/model/model.json?v=model-v2`

When you deploy a new model, update `MODEL_VERSION`.

## Required Output Order (8 classes)

Model output order must match exactly:

1. `can`
2. `bottle`
3. `food`
4. `battery`
5. `paper`
6. `plastic`
7. `furniture`
8. `background`

## Mapping Rules (8 -> 5)

- `can / bottle / paper / plastic` -> `Recyclables`
- `food` -> `Food waste`
- `battery` -> `Hazardous waste`
- `furniture` -> `Bulk waste`
- everything else (including `background`) -> `General waste`

## Confidence Strategy

- Threshold: `LOW_CONFIDENCE_THRESHOLD = 0.45`
- If mapped Top1 confidence is below 45%:
  - show `undetermined`
  - ask user to retake or change angle
  - avoid forcing a wrong category

## Main UX Features

### Upload Modal

- centered modal (not bottom sheet)
- source tabs:
  - local file
  - image URL
  - clipboard image

### Camera Flow

- open camera
- take shot
- preview captured frame
- actions: `retake` or `use photo`

### Camera Error Modal

- if camera fails (permission, busy device, missing device), a centered modal is shown
- this is clearer on desktop than inline text

### Preview Quality

- uses `next/image`
- preview style uses `object-fit: contain`
- shows original resolution (`width x height`)

## Admin Dashboard (`/admin`)

Data source: browser `localStorage` key `npc_inference_logs_v1`.

Each inference log stores:

- timestamp
- input source (`camera/local/url/clipboard`)
- latency (ms)
- mapped Top1 label + confidence
- `undetermined` flag
- raw Top1 class

Dashboard features:

- total requests
- low-confidence rate
- average latency
- detailed table
- filter by source
- filter only `undetermined`
- CSV export for current filtered result

Language behavior:

- home page stores language in `localStorage` key `npc_lang`
- `/admin` follows the same language key automatically

## Troubleshooting

### Runtime error: `Cannot find module './xxx.js'`

Usually caused by stale `.next` cache in dev mode.

```bash
cmd /c "rmdir /s /q .next"
npm run dev
```

### Camera cannot open

- ensure camera permission is granted
- ensure HTTPS or localhost
- close other apps that may occupy the camera

### Model load failed

- verify both `model.json` and `weights.bin` exist
- verify output class order matches the required 8-class order

## Notes

- The project currently keeps `src/App.tsx` for template compatibility.
- Main product page is `app/page.tsx`.
