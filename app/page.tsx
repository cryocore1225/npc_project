'use client'

import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import NextImage from 'next/image'
import { homeTextMap, type Localized } from './i18n/homeText'
import {
  LANG_STORAGE_KEY,
  LOG_STORAGE_KEY,
  type Lang,
  type LabelKey,
  type ObjectClassKey,
} from './i18n/shared'

type ModelStatus = 'idle' | 'loading' | 'ready' | 'missing' | 'error'
type UploadSource = 'local' | 'url' | 'clipboard'
type OrtModule = typeof import('onnxruntime-web')
type OrtSession = import('onnxruntime-web').InferenceSession

type PredictionItem = {
  label: LabelKey
  confidence: number
}
type RawPredictionItem = {
  className: ObjectClassKey
  confidence: number
}
type PredictionAnalysis = {
  mappedTop3: PredictionItem[]
  rawTop3: RawPredictionItem[]
  isUndetermined: boolean
}
type PreviewMeta = {
  width: number
  height: number
}
type InputSource = UploadSource | 'camera'
type InferenceLog = {
  id: string
  timestamp: number
  source: InputSource
  latencyMs: number
  topLabel: LabelKey | null
  topConfidence: number
  undetermined: boolean
  rawTopClass: ObjectClassKey | null
}

const MODEL_PATH = '/model/model.onnx'
const MODEL_VERSION = 'model-v1'
const VERSIONED_MODEL_PATH = `${MODEL_PATH}?v=${MODEL_VERSION}`
const IMAGE_SIZE = 224
const LOW_CONFIDENCE_THRESHOLD = 0.45
const LOG_LIMIT = 200
const supportedLabels: LabelKey[] = [
  'General waste',
  'Food waste',
  'Recyclables',
  'Hazardous waste',
  'Bulk waste',
]
const supportedObjectClasses: ObjectClassKey[] = [
  'battery',
  'biological',
  'brown-glass',
  'cardboard',
  'clothes',
  'green-glass',
  'metal',
  'paper',
  'plastic',
  'shoes',
  'trash',
  'white-glass',
]

export default function Page() {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'zh'
    const saved = localStorage.getItem(LANG_STORAGE_KEY)
    return saved === 'ko' ? 'ko' : 'zh'
  })
  const t = homeTextMap[lang]

  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle')
  const [predictionError, setPredictionError] = useState('')
  const [isPredicting, setIsPredicting] = useState(false)

  const [imageUrl, setImageUrl] = useState('')
  const [remoteImageUrl, setRemoteImageUrl] = useState('')
  const [isUploadPanelOpen, setIsUploadPanelOpen] = useState(false)
  const [uploadSource, setUploadSource] = useState<UploadSource>('local')
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState('')
  const [previewMeta, setPreviewMeta] = useState<PreviewMeta | null>(null)
  const [fileName, setFileName] = useState('')
  const [mainResult, setMainResult] = useState<PredictionItem | null>(null)
  const [topPredictions, setTopPredictions] = useState<PredictionItem[]>([])
  const [rawTopPredictions, setRawTopPredictions] = useState<RawPredictionItem[]>([])
  const [isUndetermined, setIsUndetermined] = useState(false)
  const [modelLoadProgress, setModelLoadProgress] = useState(0)

  const ortRef = useRef<OrtModule | null>(null)
  const modelRef = useRef<OrtSession | null>(null)
  const displayBlobUrlRef = useRef<string | null>(null)
  const capturedBlobUrlRef = useRef<string | null>(null)
  const takePhotoInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  // Camera (desktop) support
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cameraHistoryEntryRef = useRef(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment')
  const [isOpeningCamera, setIsOpeningCamera] = useState(false)

  const supportsCamera =
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

  useEffect(() => {
    localStorage.setItem(LANG_STORAGE_KEY, lang)
  }, [lang])

  useEffect(() => {
    return () => {
      if (displayBlobUrlRef.current) URL.revokeObjectURL(displayBlobUrlRef.current)
      if (capturedBlobUrlRef.current) URL.revokeObjectURL(capturedBlobUrlRef.current)
    }
  }, [])

  const setPreviewImage = useCallback((nextUrl: string, ownedBlobUrl?: string) => {
    if (displayBlobUrlRef.current && displayBlobUrlRef.current !== ownedBlobUrl) {
      URL.revokeObjectURL(displayBlobUrlRef.current)
    }
    displayBlobUrlRef.current = ownedBlobUrl ?? null
    setImageUrl(nextUrl)
  }, [])

  const ensureModelReady = useCallback(async () => {
    if (modelRef.current && ortRef.current) {
      setModelStatus((prev) => (prev === 'ready' ? prev : 'ready'))
      return true
    }

    setModelStatus('loading')
    setModelLoadProgress(0)
    try {
      setModelLoadProgress(15)
      const ort = ortRef.current ?? (await import('onnxruntime-web'))
      ortRef.current = ort
      setModelLoadProgress(45)

      const supportsWebGpu = typeof navigator !== 'undefined' && 'gpu' in navigator
      const model = await ort.InferenceSession.create(VERSIONED_MODEL_PATH, {
        executionProviders: supportsWebGpu ? ['webgpu', 'wasm'] : ['wasm'],
      })
      modelRef.current = model
      setModelStatus('ready')
      setModelLoadProgress(100)
      return true
    } catch (err) {
      const msg = (err as Error)?.message ?? ''
      if (isMissingModelError(msg)) setModelStatus('missing')
      else setModelStatus('error')
      return false
    }
  }, [])

  const runPredictFromUrl = useCallback(
    async (url: string, source: InputSource, defaultErrorMessage = t.predictionError) => {
      const modelReady = await ensureModelReady()
      if (!modelReady || !modelRef.current || !ortRef.current) return
      setIsPredicting(true)
      const startedAt = performance.now()
      try {
        const img = await readImage(url)
        setPreviewMeta({
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
        })
        const analysis = await predictTop3(ortRef.current, modelRef.current, img)
        setTopPredictions(analysis.mappedTop3)
        setRawTopPredictions(analysis.rawTop3)
        setIsUndetermined(analysis.isUndetermined)
        setMainResult(analysis.isUndetermined ? null : (analysis.mappedTop3[0] ?? null))
        const latencyMs = Math.round(performance.now() - startedAt)
        appendInferenceLog({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          source,
          latencyMs,
          topLabel: analysis.mappedTop3[0]?.label ?? null,
          topConfidence: analysis.mappedTop3[0]?.confidence ?? 0,
          undetermined: analysis.isUndetermined,
          rawTopClass: analysis.rawTop3[0]?.className ?? null,
        })
      } catch (err) {
        setPredictionError((err as Error)?.message || defaultErrorMessage)
      } finally {
        setIsPredicting(false)
      }
    },
    [ensureModelReady, t.predictionError],
  )

  useEffect(() => {
    if (!isUploadPanelOpen || uploadSource !== 'clipboard') return

    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items
      if (!items?.length) return

      const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'))
      if (!imageItem) return

      const file = imageItem.getAsFile()
      if (!file) {
        setPredictionError(t.pasteNoImage)
        return
      }

      e.preventDefault()
      const url = URL.createObjectURL(file)
      setPredictionError('')
      setMainResult(null)
      setIsUndetermined(false)
      setPreviewMeta(null)
      setPreviewImage(url, url)
      setFileName(file.name || 'clipboard-image.png')
      void runPredictFromUrl(url, 'clipboard')
    }

    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [isUploadPanelOpen, runPredictFromUrl, setPreviewImage, t.pasteNoImage, uploadSource])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (capturedBlobUrlRef.current) {
      URL.revokeObjectURL(capturedBlobUrlRef.current)
      capturedBlobUrlRef.current = null
    }
    setIsCameraOpen(false)
    setIsOpeningCamera(false)
    setCapturedPreviewUrl('')
  }, [])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  const closeCamera = useCallback(() => {
    stopCamera()
    if (cameraHistoryEntryRef.current && window.history.state?.__cameraOverlay) {
      cameraHistoryEntryRef.current = false
      window.history.back()
    }
  }, [stopCamera])

  useEffect(() => {
    if (!isCameraOpen) return

    if (!cameraHistoryEntryRef.current) {
      window.history.pushState({ ...(window.history.state ?? {}), __cameraOverlay: true }, '')
      cameraHistoryEntryRef.current = true
    }

    function onPopState() {
      if (isCameraOpen) {
        stopCamera()
        cameraHistoryEntryRef.current = false
      }
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [isCameraOpen, stopCamera])

  async function openCamera(nextFacingMode: 'environment' | 'user' = cameraFacingMode) {
    setCameraError('')
    if (!supportsCamera) {
      // Fallback to mobile file input capture or upload
      setCameraError(t.cameraUnsupported)
      takePhotoInputRef.current?.click()
      return
    }
    if (!window.isSecureContext) {
      setCameraError(t.cameraSecureContext)
      takePhotoInputRef.current?.click()
      return
    }

    stopCamera()
    setIsCameraOpen(true)
    setIsOpeningCamera(true)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextFacingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      setCameraFacingMode(nextFacingMode)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch (err) {
      setCameraError(getCameraErrorMessage(err, t))
      setIsCameraOpen(false)
    } finally {
      setIsOpeningCamera(false)
    }
  }

  async function switchCamera() {
    if (capturedPreviewUrl) return
    const nextFacingMode = cameraFacingMode === 'environment' ? 'user' : 'environment'
    await openCamera(nextFacingMode)
  }

  async function captureFromCamera() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (cameraFacingMode === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92),
    )
    if (!blob) return

    const url = URL.createObjectURL(blob)
    if (capturedBlobUrlRef.current) URL.revokeObjectURL(capturedBlobUrlRef.current)
    capturedBlobUrlRef.current = url
    setCapturedPreviewUrl(url)
  }

  function retakeCapturedPhoto() {
    if (capturedBlobUrlRef.current) {
      URL.revokeObjectURL(capturedBlobUrlRef.current)
      capturedBlobUrlRef.current = null
    }
    setCapturedPreviewUrl('')
  }

  async function useCapturedPhoto() {
    if (!capturedPreviewUrl) return
    setPreviewImage(capturedPreviewUrl, capturedBlobUrlRef.current === capturedPreviewUrl ? capturedPreviewUrl : undefined)
    if (capturedBlobUrlRef.current === capturedPreviewUrl) capturedBlobUrlRef.current = null
    setFileName('camera.jpg')
    stopCamera()
    await runPredictFromUrl(capturedPreviewUrl, 'camera')
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setPredictionError('')
    setMainResult(null)
    setIsUndetermined(false)
    setPreviewMeta(null)

    const url = URL.createObjectURL(file)
    setPreviewImage(url, url)
    setFileName(file.name)
    setIsUploadPanelOpen(false)

    await runPredictFromUrl(url, 'local')
  }

  async function loadFromImageUrl() {
    const target = remoteImageUrl.trim()
    if (!isLikelyHttpUrl(target)) {
      setPredictionError(t.urlInvalid)
      return
    }

    setPredictionError('')
    setMainResult(null)
    setIsUndetermined(false)
    setPreviewMeta(null)
    setPreviewImage(target)
    setFileName('remote-image')
    setIsUploadPanelOpen(false)

    await runPredictFromUrl(target, 'url', t.urlLoadFailed)
  }

  async function loadFromClipboard() {
    if (!window.isSecureContext || !navigator.clipboard?.read) {
      setPredictionError(t.clipboardUnsupported)
      return
    }

    try {
      const clipboardItems = await navigator.clipboard.read()
      const imageItem = clipboardItems.find((item) =>
        item.types.some((type) => type.startsWith('image/')),
      )
      if (!imageItem) {
        setPredictionError(t.pasteNoImage)
        return
      }

      const imageType = imageItem.types.find((type) => type.startsWith('image/')) ?? 'image/png'
      const blob = await imageItem.getType(imageType)
      const url = URL.createObjectURL(blob)

      setPredictionError('')
      setMainResult(null)
      setIsUndetermined(false)
      setPreviewMeta(null)
      setPreviewImage(url, url)
      setFileName('clipboard-image.png')
      setIsUploadPanelOpen(false)
      await runPredictFromUrl(url, 'clipboard')
    } catch {
      setPredictionError(t.clipboardUnsupported)
    }
  }

  function openUploadPanel() {
    setPredictionError('')
    setIsUploadPanelOpen(true)
  }

  function closeUploadPanel() {
    setIsUploadPanelOpen(false)
  }

  function dismissCameraError() {
    setCameraError('')
  }

  function chooseLocalFile() {
    setIsUploadPanelOpen(false)
    uploadInputRef.current?.click()
  }

  return (
    <main className="page-shell">
      <section className="hero card">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>{t.appTitle}</h1>
          <p className="hero-intro">{t.intro}</p>
        </div>
        <div className="hero-side">
          <div className="language-switch">
            <button
              className={`lang-button ${lang === 'zh' ? 'active' : ''}`}
              onClick={() => setLang('zh')}
              type="button"
            >
              {t.langZh}
            </button>
            <button
              className={`lang-button ${lang === 'ko' ? 'active' : ''}`}
              onClick={() => setLang('ko')}
              type="button"
            >
              {t.langKo}
            </button>
          </div>

          <div
            className={`status ${
              modelStatus === 'ready'
                ? 'status-ready'
                : modelStatus === 'missing'
                ? 'status-warning'
                : ''
            }`}
          >
            <span className="status-dot" />
            <div>
              <strong>{getStatusText(modelStatus, t)}</strong>
              <small>{getStatusHint(modelStatus, t)}</small>
              {modelStatus === 'loading' ? (
                <div className="model-progress-wrap" aria-label="model loading progress">
                  <div className="model-progress-track">
                    <div className="model-progress-fill" style={{ width: `${Math.max(modelLoadProgress, 6)}%` }} />
                  </div>
                  <small>{modelLoadProgress}%</small>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="content-grid">
        <section className="card action-card">
          <div className="section-heading">
            <h2>{t.actionsTitle}</h2>
            <p>{t.actionHint}</p>
          </div>

          <div className="action-buttons">
              <button
                className="primary-button"
                onClick={() => {
                  void openCamera()
                }}
                disabled={modelStatus === 'loading'}
                type="button"
              >
                {t.takePhotoButton}
            </button>

              <button
                className="secondary-button"
                onClick={openUploadPanel}
                disabled={modelStatus === 'loading'}
                type="button"
              >
                {t.uploadButton}
            </button>
          </div>

          <input
            ref={takePhotoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            disabled={modelStatus === 'loading'}
            hidden
          />
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={modelStatus === 'loading'}
            hidden
          />

          <div className="tip-list">
            <h3>{t.quickTipsTitle}</h3>
            <ul>
              {t.quickTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="card preview-card">
          <div className="section-heading">
            <h2>{t.previewTitle}</h2>
            {fileName ? (
              <p>
                {t.selectedFile}: {fileName}
                {previewMeta ? ` · ${t.resolutionLabel}: ${previewMeta.width}x${previewMeta.height}` : ''}
              </p>
            ) : (
              <p>{t.previewEmpty}</p>
            )}
          </div>

          <div className="preview-frame">
            {imageUrl ? (
              <NextImage
                className="preview-image"
                src={imageUrl}
                alt="Selected waste item preview"
                width={previewMeta?.width ?? 1280}
                height={previewMeta?.height ?? 960}
                unoptimized
              />
            ) : (
              <div className="preview-placeholder">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>
        </section>

        <section className="card result-card">
          <div className="section-heading">
            <h2>{t.resultTitle}</h2>
            <p>
              {isPredicting
                ? t.analyzing
                : isUndetermined
                ? t.undeterminedHint
                : mainResult || topPredictions.length
                ? t.resultReadyHint
                : t.previewEmpty}
            </p>
          </div>

          {predictionError ? <p className="error-text">{predictionError}</p> : null}

          {mainResult ? (
            <>
              <div className={`result-chip chip-${mainResult.label.toLowerCase().replace(' ', '-')}`}>
                {t.labels[mainResult.label]}
              </div>

              <p className="confidence-line">
                {t.confidence} <strong>{formatConfidence(mainResult.confidence)}</strong>
              </p>

              <div className="ranking-list">
                <h3>{t.top3Title}</h3>
                {topPredictions.map((item) => (
                  <div key={item.label} className="ranking-item">
                    <div className="ranking-meta">
                      <span>{t.labels[item.label]}</span>
                      <strong>{formatConfidence(item.confidence)}</strong>
                    </div>
                    <div className="ranking-track">
                      <div className="ranking-fill" style={{ width: `${Math.max(item.confidence * 100, 6)}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="guide-card">
                <h3>{t.guideTitle}</h3>
                <p>{t.descriptions[mainResult.label]}</p>
              </div>
            </>
          ) : isUndetermined && topPredictions.length ? (
            <>
              <div className="result-chip chip-general-waste chip-undetermined">
                {t.undeterminedTitle}
              </div>

              <p className="confidence-line">
                {t.lowConfidenceHint}
                <strong>{formatConfidence(topPredictions[0]?.confidence ?? 0)}</strong>
              </p>

              <div className="ranking-list">
                <h3>{t.top3Title}</h3>
                {topPredictions.map((item) => (
                  <div key={item.label} className="ranking-item">
                    <div className="ranking-meta">
                      <span>{t.labels[item.label]}</span>
                      <strong>{formatConfidence(item.confidence)}</strong>
                    </div>
                    <div className="ranking-track">
                      <div className="ranking-fill" style={{ width: `${Math.max(item.confidence * 100, 6)}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {rawTopPredictions.length ? (
                <div className="ranking-list">
                  <h3>{t.rawTop3Title}</h3>
                  {rawTopPredictions.map((item) => (
                    <div key={item.className} className="ranking-item">
                      <div className="ranking-meta">
                        <span>{t.rawLabels[item.className]}</span>
                        <strong>{formatConfidence(item.confidence)}</strong>
                      </div>
                      <div className="ranking-track">
                        <div className="ranking-fill" style={{ width: `${Math.max(item.confidence * 100, 6)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="guide-card">
                <h3>{t.reasonTitle}</h3>
                <p>{getPredictionReason(rawTopPredictions[0]?.className, t)}</p>
              </div>
            </>
          ) : (
            <div className="empty-result">
              {isPredicting ? <p>{t.analyzing}</p> : <p>{t.previewEmpty}</p>}
            </div>
          )}
        </section>
      </section>

      {isCameraOpen ? (
        <div className="camera-overlay" role="dialog" aria-modal>
          <div className="camera-box">
            <div className="camera-head">
              <button
                className="camera-icon-btn"
                onClick={closeCamera}
                type="button"
                aria-label={t.closeButton}
                title={t.closeButton}
              >
                <svg className="camera-icon-glyph" viewBox="0 0 24 24" aria-hidden>
                  <path d="M6 6L18 18" />
                  <path d="M18 6L6 18" />
                </svg>
              </button>
              <button
                className="camera-icon-btn"
                onClick={switchCamera}
                type="button"
                disabled={isOpeningCamera || !!capturedPreviewUrl}
                aria-label={t.switchCameraButton}
                title={t.switchCameraButton}
              >
                <svg className="camera-icon-glyph" viewBox="0 0 24 24" aria-hidden>
                  <path d="M20 11a8 8 0 0 0-14.8-4" />
                  <path d="M4 4v5h5" />
                  <path d="M4 13a8 8 0 0 0 14.8 4" />
                  <path d="M20 20v-5h-5" />
                </svg>
              </button>
            </div>
            <video
              ref={videoRef}
              className={`camera-video ${cameraFacingMode === 'user' ? 'camera-video-front' : ''}`}
              playsInline
              muted
              autoPlay
            />
            {capturedPreviewUrl ? (
              <NextImage
                className="camera-captured-preview"
                src={capturedPreviewUrl}
                alt="Captured preview"
                width={1280}
                height={720}
                unoptimized
              />
            ) : null}
            {isOpeningCamera ? <p className="camera-hint">{t.cameraLoading}</p> : null}
            {cameraFacingMode === 'user' ? <p className="camera-hint camera-mirror-hint">{t.mirrorHint}</p> : null}
            {cameraError ? <p className="error-text">{cameraError}</p> : null}
            <div className="camera-controls">
              {capturedPreviewUrl ? (
                <div className="camera-confirm-actions">
                  <button className="secondary-button" onClick={retakeCapturedPhoto} type="button">
                    {t.retakeButton}
                  </button>
                  <button className="primary-button" onClick={useCapturedPhoto} type="button">
                    {t.usePhotoButton}
                  </button>
                </div>
              ) : (
                <button
                  className="camera-shutter-btn"
                  onClick={captureFromCamera}
                  type="button"
                  disabled={isOpeningCamera || !!cameraError}
                  aria-label={t.takePhotoButton}
                >
                  <span />
                </button>
              )}
            </div>
          </div>

        </div>
      ) : null}

      {isUploadPanelOpen ? (
        <div className="upload-sheet-overlay" onClick={closeUploadPanel} role="dialog" aria-modal>
          <div className="upload-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="upload-sheet-head">
              <p className="upload-panel-title">{t.uploadPickerTitle}</p>
              <button className="upload-sheet-close" onClick={closeUploadPanel} type="button" aria-label={t.closeButton}>
                ×
              </button>
            </div>
            <div className="upload-source-tabs">
              <button
                className={`upload-source-tab ${uploadSource === 'local' ? 'active' : ''}`}
                onClick={() => setUploadSource('local')}
                type="button"
              >
                {t.uploadFromLocal}
              </button>
              <button
                className={`upload-source-tab ${uploadSource === 'url' ? 'active' : ''}`}
                onClick={() => setUploadSource('url')}
                type="button"
              >
                {t.uploadFromUrl}
              </button>
              <button
                className={`upload-source-tab ${uploadSource === 'clipboard' ? 'active' : ''}`}
                onClick={() => setUploadSource('clipboard')}
                type="button"
              >
                {t.uploadFromClipboard}
              </button>
            </div>

            {uploadSource === 'local' ? (
              <button className="secondary-button upload-sheet-btn" onClick={chooseLocalFile} type="button">
                {t.uploadFromLocal}
              </button>
            ) : null}

            {uploadSource === 'url' ? (
              <div className="url-import-row">
                <input
                  className="url-input"
                  type="url"
                  value={remoteImageUrl}
                  onChange={(e) => setRemoteImageUrl(e.target.value)}
                  placeholder={t.urlPlaceholder}
                  disabled={modelStatus === 'loading'}
                />
                <button
                  className="secondary-button"
                  onClick={loadFromImageUrl}
                  disabled={modelStatus === 'loading'}
                  type="button"
                >
                  {t.loadUrlButton}
                </button>
              </div>
            ) : null}

            {uploadSource === 'clipboard' ? (
              <div className="paste-zone">
                <p className="helper-line">{t.pasteZoneHint}</p>
                <button className="secondary-button upload-sheet-btn" onClick={loadFromClipboard} type="button">
                  {t.pasteButton}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {!isCameraOpen && cameraError ? (
        <div className="alert-overlay" role="dialog" aria-modal>
          <div className="alert-modal card">
            <h3>{t.cameraErrorTitle}</h3>
            <p>{cameraError}</p>
            <button className="primary-button" onClick={dismissCameraError} type="button">
              {t.closeButton}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function getStatusText(modelStatus: ModelStatus, t: Localized) {
  if (modelStatus === 'idle') return t.statusIdle
  if (modelStatus === 'loading') return t.statusLoading
  if (modelStatus === 'ready') return t.statusReady
  if (modelStatus === 'missing') return t.statusMissing
  return t.statusError
}

function getStatusHint(modelStatus: ModelStatus, t: Localized) {
  if (modelStatus === 'idle') return t.statusIdleHint
  if (modelStatus === 'loading') return t.statusLoadingHint
  if (modelStatus === 'ready') return t.statusReadyHint
  if (modelStatus === 'missing') return t.statusMissingHint
  return t.statusErrorHint
}

function isMissingModelError(message: string) {
  const normalized = message.toLowerCase()
  return normalized.includes('404') || normalized.includes('failed to fetch') || normalized.includes('fetch')
}

function formatConfidence(value: number) {
  return `${(value * 100).toFixed(2)}%`
}

async function readImage(src: string): Promise<HTMLImageElement> {
  const image = new Image()
  image.src = src

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('image load failed'))
  })

  return image
}

async function predictTop3(ort: OrtModule, model: OrtSession, source: HTMLImageElement): Promise<PredictionAnalysis> {
  const inputTensor = createInputTensor(ort, model, source)
  const outputMap = await model.run({ [inputTensor.name]: inputTensor.tensor })
  const primaryOutputName = model.outputNames[0]
  const output = primaryOutputName ? outputMap[primaryOutputName] : undefined
  if (!output || !('data' in output)) throw new Error('Unexpected model output.')
  const outputData = output.data as ArrayLike<number> | undefined
  if (!outputData) throw new Error('Unexpected model output.')
  const scores = Array.from(outputData, (value) => Number(value))

  const mappedTop3 = mapScoresToTrashPredictions(scores)
  const rawTop3 = getRawObjectTop3(scores)
  const isUndetermined = (mappedTop3[0]?.confidence ?? 0) < LOW_CONFIDENCE_THRESHOLD

  return {
    mappedTop3,
    rawTop3,
    isUndetermined,
  }
}

function createInputTensor(ort: OrtModule, model: OrtSession, source: HTMLImageElement) {
  const inputName = model.inputNames[0]
  if (!inputName) {
    throw new Error('Model input not found.')
  }

  const metadata = model.inputMetadata[0]
  if (!metadata || !metadata.isTensor) {
    throw new Error('Model input metadata is invalid.')
  }

  const dimensions = metadata.shape
  const isNchw = Number(dimensions[1]) === 3
  const isNhwc = Number(dimensions[3]) === 3
  const layout: 'nchw' | 'nhwc' = isNhwc && !isNchw ? 'nhwc' : 'nchw'
  const targetHeight = getDimensionNumber(layout === 'nchw' ? dimensions[2] : dimensions[1], IMAGE_SIZE)
  const targetWidth = getDimensionNumber(layout === 'nchw' ? dimensions[3] : dimensions[2], IMAGE_SIZE)

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas context unavailable.')
  }
  ctx.drawImage(source, 0, 0, targetWidth, targetHeight)

  const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight).data
  const expectsUint8 = metadata.type === 'uint8'
  const tensorType: 'float32' | 'uint8' = expectsUint8 ? 'uint8' : 'float32'
  const channelCount = 3
  const spatialSize = targetWidth * targetHeight
  const data =
    tensorType === 'uint8'
      ? new Uint8Array(spatialSize * channelCount)
      : new Float32Array(spatialSize * channelCount)

  if (layout === 'nchw') {
    for (let pixelIndex = 0; pixelIndex < spatialSize; pixelIndex += 1) {
      const offset = pixelIndex * 4
      const r = imageData[offset] ?? 0
      const g = imageData[offset + 1] ?? 0
      const b = imageData[offset + 2] ?? 0
      if (tensorType === 'uint8') {
        data[pixelIndex] = r
        data[pixelIndex + spatialSize] = g
        data[pixelIndex + spatialSize * 2] = b
      } else {
        data[pixelIndex] = r / 255
        data[pixelIndex + spatialSize] = g / 255
        data[pixelIndex + spatialSize * 2] = b / 255
      }
    }
  } else {
    for (let pixelIndex = 0; pixelIndex < spatialSize; pixelIndex += 1) {
      const offset = pixelIndex * 4
      const base = pixelIndex * channelCount
      const r = imageData[offset] ?? 0
      const g = imageData[offset + 1] ?? 0
      const b = imageData[offset + 2] ?? 0
      if (tensorType === 'uint8') {
        data[base] = r
        data[base + 1] = g
        data[base + 2] = b
      } else {
        data[base] = r / 255
        data[base + 1] = g / 255
        data[base + 2] = b / 255
      }
    }
  }

  const shape = layout === 'nchw' ? [1, 3, targetHeight, targetWidth] : [1, targetHeight, targetWidth, 3]
  return {
    name: inputName,
    tensor: new ort.Tensor(tensorType, data, shape),
  }
}

function getDimensionNumber(value: number | string | bigint | boolean | null | undefined, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return fallback
}

function mapToTrash(className: string): LabelKey {
  const normalized = className.trim().toLowerCase()

  if (
    normalized === 'brown-glass' ||
    normalized === 'cardboard' ||
    normalized === 'green-glass' ||
    normalized === 'metal' ||
    normalized === 'paper' ||
    normalized === 'plastic' ||
    normalized === 'white-glass'
  ) {
    return 'Recyclables'
  }
  if (normalized === 'biological') return 'Food waste'
  if (normalized === 'battery') return 'Hazardous waste'
  if (normalized === 'clothes' || normalized === 'shoes') return 'Recyclables'
  if (normalized === 'trash') return 'General waste'
  return 'General waste'
}

function mapScoresToTrashPredictions(scores: number[]): PredictionItem[] {
  // Case A: model directly outputs 5 trash classes
  if (scores.length === supportedLabels.length) {
    return scores
      .map((confidence, index) => ({
        label: supportedLabels[index] ?? 'General waste',
        confidence,
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
  }

  // Case B: model outputs object classes (12 classes), then map to trash buckets
  const bucket: Record<LabelKey, number> = {
    'General waste': 0,
    'Food waste': 0,
    Recyclables: 0,
    'Hazardous waste': 0,
    'Bulk waste': 0,
  }

  scores.forEach((score, index) => {
    const className = supportedObjectClasses[index] ?? 'trash'
    const trashLabel = mapToTrash(className)
    bucket[trashLabel] += score
  })

  return supportedLabels
    .map((label) => ({ label, confidence: bucket[label] }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)
}

function getRawObjectTop3(scores: number[]): RawPredictionItem[] {
  if (scores.length !== supportedObjectClasses.length) return []

  return scores
    .map((confidence, index) => ({
      className: supportedObjectClasses[index] ?? 'trash',
      confidence,
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)
}

function getPredictionReason(className: ObjectClassKey | undefined, t: Localized) {
  if (!className) return t.undeterminedHint
  return t.reasonHints[className]
}

function appendInferenceLog(entry: InferenceLog) {
  try {
    const raw = localStorage.getItem(LOG_STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as InferenceLog[]) : []
    const next = [entry, ...parsed].slice(0, LOG_LIMIT)
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Ignore logging failures to avoid blocking prediction flow.
  }
}

function getCameraErrorMessage(err: unknown, t: Localized) {
  const name = (err as DOMException | Error | undefined)?.name

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return t.cameraPermissionDenied
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return t.cameraNoDevice
  if (name === 'NotReadableError' || name === 'TrackStartError') return t.cameraInUse
  if (name === 'SecurityError') return t.cameraSecureContext

  return (err as Error | undefined)?.message || t.cameraOpenFailed
}

function isLikelyHttpUrl(value: string) {
  if (!value) return false

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
