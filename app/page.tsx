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
type TfModule = typeof import('@tensorflow/tfjs')
type TfGraphModel = import('@tensorflow/tfjs').GraphModel

type PredictionItem = {
  label: string
  confidence: number
}
type RawPredictionItem = {
  className: string
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
  topLabel: string | null
  topConfidence: number
  undetermined: boolean
  rawTopClass: string | null
}

const MODEL_PATH = '/model/model.json'
const MODEL_VERSION = 'model-v2'
const VERSIONED_MODEL_PATH = `${MODEL_PATH}?v=${MODEL_VERSION}`
const CLASSES_PATH = '/model/labels.txt'
const VERSIONED_CLASSES_PATH = `${CLASSES_PATH}?v=${MODEL_VERSION}`
const IMAGE_SIZE = 224
const LOW_CONFIDENCE_THRESHOLD = 0.45
const LOW_CONFIDENCE_THRESHOLD_12CLASS = 0.2
const LOG_LIMIT = 200
const supportedLabels: LabelKey[] = [
  'General waste',
  'Food waste',
  'Recyclables',
  'Hazardous waste',
  'Bulk waste',
]
const fallbackObjectClasses: string[] = [
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

  const tfRef = useRef<TfModule | null>(null)
  const modelRef = useRef<TfGraphModel | null>(null)
  const objectClassesRef = useRef<string[]>(fallbackObjectClasses)
  const displayBlobUrlRef = useRef<string | null>(null)
  const capturedBlobUrlRef = useRef<string | null>(null)
  const inferenceRequestIdRef = useRef(0)
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
    if (modelRef.current && tfRef.current) {
      setModelStatus((prev) => (prev === 'ready' ? prev : 'ready'))
      return true
    }

    setModelStatus('loading')
    setModelLoadProgress(0)
    try {
      setModelLoadProgress(15)
      const tf = tfRef.current ?? (await import('@tensorflow/tfjs'))
      tfRef.current = tf
      await tf.ready()
      setModelLoadProgress(45)

      const model = await tf.loadGraphModel(VERSIONED_MODEL_PATH)
      modelRef.current = model
      const classNames = await loadClassNames(VERSIONED_CLASSES_PATH)
      const outputClassCount = getPrimaryOutputClassCount(model)
      objectClassesRef.current = resolveClassNamesForModelOutput(
        outputClassCount,
        classNames,
      )
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
      const requestId = ++inferenceRequestIdRef.current
      setPredictionError('')
      setMainResult(null)
      setTopPredictions([])
      setRawTopPredictions([])
      setIsUndetermined(false)
      const modelReady = await ensureModelReady()
      if (!modelReady || !modelRef.current || !tfRef.current) return
      setIsPredicting(true)
      const startedAt = performance.now()
      try {
        const img = await readImage(url)
        setPreviewMeta({
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
        })
        const analysis = await predictTop3(
          tfRef.current,
          modelRef.current,
          img,
          objectClassesRef.current,
        )
        if (requestId !== inferenceRequestIdRef.current) return
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
        if (requestId !== inferenceRequestIdRef.current) return
        setPredictionError((err as Error)?.message || defaultErrorMessage)
      } finally {
        if (requestId === inferenceRequestIdRef.current) {
          setIsPredicting(false)
        }
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
    e.target.value = ''
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

  const topRawClass = rawTopPredictions[0]?.className

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
                {getDisplayLabel(mainResult.label, t)}
              </div>

              <p className="confidence-line">
                {t.confidence} <strong>{formatConfidence(mainResult.confidence)}</strong>
              </p>
              {topRawClass ? (
                <p className="confidence-line">
                  <strong>{getRawClassLabel(topRawClass, t)}</strong>
                </p>
              ) : null}

              <div className="ranking-list">
                <h3>{t.top3Title}</h3>
                {topPredictions.map((item) => (
                  <div key={item.label} className="ranking-item">
                    <div className="ranking-meta">
                      <span>{getDisplayLabel(item.label, t)}</span>
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
                <p>{getDescriptionText(mainResult.label, t)}</p>
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
              {topRawClass ? (
                <p className="confidence-line">
                  <strong>{getRawClassLabel(topRawClass, t)}</strong>
                </p>
              ) : null}

              <div className="ranking-list">
                <h3>{t.top3Title}</h3>
                {topPredictions.map((item) => (
                  <div key={item.label} className="ranking-item">
                    <div className="ranking-meta">
                      <span>{getDisplayLabel(item.label, t)}</span>
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
                        <span>{getRawClassLabel(item.className, t)}</span>
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
  const safe = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
  return `${(safe * 100).toFixed(2)}%`
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

async function predictTop3(
  tf: TfModule,
  model: TfGraphModel,
  source: HTMLImageElement,
  objectClasses: string[],
): Promise<PredictionAnalysis> {
  const rawScores = await runTfjsInference(tf, model, source)
  const scores = normalizeScores(rawScores)

  const mappedTop3 = mapScoresToTrashPredictions(scores, objectClasses)
  const rawTop3 = getRawObjectTop3(scores, objectClasses)
  const confidenceThreshold =
    scores.length > supportedLabels.length ? LOW_CONFIDENCE_THRESHOLD_12CLASS : LOW_CONFIDENCE_THRESHOLD
  const isUndetermined = (mappedTop3[0]?.confidence ?? 0) < confidenceThreshold

  return {
    mappedTop3,
    rawTop3,
    isUndetermined,
  }
}

async function runTfjsInference(
  tf: TfModule,
  model: TfGraphModel,
  source: HTMLImageElement,
) {
  const inputShape = model.inputs[0]?.shape ?? [null, IMAGE_SIZE, IMAGE_SIZE, 3]
  const targetHeight = Number(inputShape[1]) || IMAGE_SIZE
  const targetWidth = Number(inputShape[2]) || IMAGE_SIZE

  const logits = tf.tidy(() => {
    const pixels = tf.browser.fromPixels(source)
    const resized = tf.image.resizeBilinear(pixels, [targetHeight, targetWidth])
    const batched = resized.toFloat().expandDims(0)
    const prediction = model.predict(batched)
    const outTensor = Array.isArray(prediction) ? prediction[0] : prediction
    if (!outTensor || typeof (outTensor as { data?: unknown }).data !== 'function') {
      throw new Error('Unexpected model output.')
    }
    return tf.clone(outTensor as import('@tensorflow/tfjs').Tensor)
  })

  try {
    const outputData = await logits.data()
    return Array.from(outputData, (value) => Number(value))
  } finally {
    logits.dispose()
  }
}

function getPrimaryOutputClassCount(model: TfGraphModel) {
  const outputShape = model.outputs[0]?.shape ?? []
  const lastDimension = outputShape.length ? outputShape[outputShape.length - 1] : undefined
  return typeof lastDimension === 'number' && Number.isFinite(lastDimension) ? lastDimension : -1
}

function resolveClassNamesForModelOutput(
  outputClassCount: number,
  fromClassesTxt: string[],
) {
  if (outputClassCount > 0) {
    if (fromClassesTxt.length === outputClassCount) return fromClassesTxt
    if (outputClassCount === fallbackObjectClasses.length) return fallbackObjectClasses
    if (outputClassCount === supportedLabels.length) return supportedLabels
  }
  if (fromClassesTxt.length) return fromClassesTxt
  return fallbackObjectClasses
}

function normalizeScores(scores: number[]) {
  if (!scores.length) return scores

  const finiteScores = scores.map((value) => (Number.isFinite(value) ? value : 0))
  const min = Math.min(...finiteScores)
  const max = Math.max(...finiteScores)
  const sum = finiteScores.reduce((acc, value) => acc + value, 0)

  if (min >= 0 && max <= 1 && sum > 0.98 && sum < 1.02) {
    return finiteScores
  }

  if (min >= 0 && sum > 0) {
    return finiteScores.map((value) => value / sum)
  }

  const maxLogit = Math.max(...finiteScores)
  const expScores = finiteScores.map((value) => Math.exp(Math.max(value - maxLogit, -50)))
  const expSum = expScores.reduce((acc, value) => acc + value, 0)
  if (!Number.isFinite(expSum) || expSum <= 0) {
    const uniform = 1 / finiteScores.length
    return finiteScores.map(() => uniform)
  }
  return expScores.map((value) => value / expSum)
}

function mapScoresToTrashPredictions(scores: number[], objectClasses: string[]): PredictionItem[] {
  // Case A: model directly outputs 5 trash classes
  if (scores.length === supportedLabels.length) {
    return scores
      .map((confidence, index) => ({
        label: getDirectOutputLabel(objectClasses[index], index),
        confidence,
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
  }

  // Case B: model outputs N object classes; keep direct class predictions.
  return scores
    .map((confidence, index) => ({
      label: objectClasses[index] ?? `class-${index}`,
      confidence,
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)
}

function getDirectOutputLabel(className: string | undefined, index: number): LabelKey {
  if (className) {
    const mapped = mapLabelAliasToSupported(className)
    if (mapped) return mapped
  }
  return supportedLabels[index] ?? 'General waste'
}

function mapLabelAliasToSupported(label: string): LabelKey | null {
  const normalized = label.trim().toLowerCase()
  if (!normalized) return null
  if (normalized.includes('recycl') || normalized.includes('recycle')) {
    return 'Recyclables'
  }
  if (normalized.includes('food') || normalized.includes('kitchen')) {
    return 'Food waste'
  }
  if (normalized.includes('hazard') || normalized.includes('special')) {
    return 'Hazardous waste'
  }
  if (normalized.includes('bulk') || normalized.includes('large')) {
    return 'Bulk waste'
  }
  if (normalized.includes('general') || normalized.includes('residual')) {
    return 'General waste'
  }
  return null
}

function getRawObjectTop3(scores: number[], objectClasses: string[]): RawPredictionItem[] {
  if (scores.length !== objectClasses.length) return []

  return scores
    .map((confidence, index) => ({
      className: objectClasses[index] ?? 'trash',
      confidence,
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)
}

function getPredictionReason(className: string | undefined, t: Localized) {
  if (!className) return t.undeterminedHint
  if (isKnownObjectClass(className)) return t.reasonHints[className]
  return t.undeterminedHint
}

function getRawClassLabel(className: string, t: Localized) {
  if (isKnownObjectClass(className)) return t.rawLabels[className]
  return className
}

function getDisplayLabel(label: string, t: Localized) {
  if (isSupportedLabelKey(label)) return t.labels[label]
  return label
}

function getDescriptionText(label: string, t: Localized) {
  if (isSupportedLabelKey(label)) return t.descriptions[label]
  return t.undeterminedHint
}

function isSupportedLabelKey(label: string): label is LabelKey {
  return supportedLabels.includes(label as LabelKey)
}

function isKnownObjectClass(className: string): className is ObjectClassKey {
  return fallbackObjectClasses.includes(className)
}

async function loadClassNames(url: string) {
  try {
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) return []
    const text = await response.text()
    const parsed = text
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter(Boolean)
    if (!parsed.length) return []
    return parsed
  } catch {
    return []
  }
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
