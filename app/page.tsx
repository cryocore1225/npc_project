'use client'

import { ChangeEvent, useEffect, useRef, useState } from 'react'
import * as tf from '@tensorflow/tfjs'

type Lang = 'zh' | 'ko'
type LabelKey = 'Plastic' | 'Paper' | 'Metal' | 'Food waste'
type ModelStatus = 'loading' | 'ready' | 'missing' | 'error'

type PredictionItem = {
  label: LabelKey
  confidence: number
}

type Localized = {
  eyebrow: string
  appTitle: string
  intro: string
  languageLabel: string
  langZh: string
  langKo: string
  statusLoading: string
  statusLoadingHint: string
  statusReady: string
  statusReadyHint: string
  statusMissing: string
  statusMissingHint: string
  statusError: string
  statusErrorHint: string
  actionsTitle: string
  actionHint: string
  takePhotoButton: string
  uploadButton: string
  previewTitle: string
  previewEmpty: string
  selectedFile: string
  analyzing: string
  resultTitle: string
  confidence: string
  top3Title: string
  guideTitle: string
  quickTipsTitle: string
  quickTips: string[]
  predictionError: string
  labels: Record<LabelKey, string>
  descriptions: Record<LabelKey, string>
}

const MODEL_PATH = '/model/model.json'
const IMAGE_SIZE = 224
const supportedLabels: LabelKey[] = ['Plastic', 'Paper', 'Metal', 'Food waste']

const textMap: Record<Lang, Localized> = {
  zh: {
    eyebrow: 'N.P.C 智能分类',
    appTitle: '垃圾分类助手',
    intro:
      '拍照或上传图片，使用 TensorFlow.js 在浏览器中识别垃圾类型，并给出分类建议。',
    languageLabel: '语言',
    langZh: '中文',
    langKo: '한국어',
    statusLoading: '正在加载模型...',
    statusLoadingHint:
      '首次打开页面时会从浏览器下载 TensorFlow 和模型文件，请耐心等待。',
    statusReady: '模型已就绪，可以开始识别。',
    statusReadyHint: '选择或拍摄一张图片，系统会给出 Top 3 结果。',
    statusMissing: '未找到模型文件。',
    statusMissingHint:
      '请把从 Teachable Machine 导出的 model.json 放到 public/model/ 目录。',
    statusError: '模型加载失败。',
    statusErrorHint: '请检查网络连接或模型文件是否完整，然后重试。',
    actionsTitle: '开始操作',
    actionHint: '可以直接拍照（电脑/手机摄像头）或从本地上传。',
    takePhotoButton: '拍照识别',
    uploadButton: '上传图片',
    previewTitle: '图片预览',
    previewEmpty: '尚未选择图片。',
    selectedFile: '已选择',
    analyzing: '正在分析图片...',
    resultTitle: '识别结果',
    confidence: '置信度',
    top3Title: 'Top 3 候选',
    guideTitle: '投放指南',
    quickTipsTitle: '快速提示',
    quickTips: [
      '拍摄时尽量保证光线充足、主体清晰。',
      '避免强烈反光或过多杂物干扰。',
      '结果仅供参考，请结合当地分类标准。',
    ],
    predictionError: '识别时出现错误，请稍后重试。',
    labels: {
      Plastic: '塑料',
      Paper: '纸类',
      Metal: '金属',
      'Food waste': '厨余垃圾',
    },
    descriptions: {
      Plastic: '清洗干净，沥干后投放可回收物。',
      Paper: '保持干燥，去除胶带或塑封后回收。',
      Metal: '尽量压扁，锋利边缘注意安全。',
      'Food waste': '沥干水分，去除塑料袋后投入厨余桶。',
    },
  },
  ko: {
    eyebrow: 'N.P.C 스마트 분류',
    appTitle: '쓰레기 분류 도우미',
    intro:
      '사진을 촬영하거나 업로드하면 브라우저에서 TensorFlow.js로 분류하고 안내를 제공합니다.',
    languageLabel: '언어',
    langZh: '中文',
    langKo: '한국어',
    statusLoading: '모델을 불러오는 중...',
    statusLoadingHint: '첫 실행 시 TensorFlow와 모델 파일을 다운로드합니다.',
    statusReady: '모델 준비 완료. 분석을 시작할 수 있어요.',
    statusReadyHint: '사진을 선택하거나 촬영하면 Top 3 결과를 보여드립니다.',
    statusMissing: '모델 파일을 찾을 수 없습니다.',
    statusMissingHint:
      'Teachable Machine에서 내보낸 model.json을 public/model/ 폴더에 넣어주세요.',
    statusError: '모델 로딩에 실패했습니다.',
    statusErrorHint: '네트워크 또는 모델 파일을 확인한 뒤 다시 시도하세요.',
    actionsTitle: '시작하기',
    actionHint: '카메라 촬영(PC/모바일) 또는 파일 업로드가 가능합니다.',
    takePhotoButton: '사진 촬영',
    uploadButton: '이미지 업로드',
    previewTitle: '미리보기',
    previewEmpty: '선택된 이미지가 없습니다.',
    selectedFile: '선택한 파일',
    analyzing: '이미지 분석 중...',
    resultTitle: '분류 결과',
    confidence: '신뢰도',
    top3Title: 'Top 3 후보',
    guideTitle: '배출 가이드',
    quickTipsTitle: '빠른 팁',
    quickTips: [
      '충분한 조명과 깔끔한 배경에서 촬영하세요.',
      '강한 반사와 잡동사니를 피하면 더 정확합니다.',
      '지역별 분리배출 기준을 함께 참고하세요.',
    ],
    predictionError: '분석 중 오류가 발생했습니다. 잠시 후 다시 시도하세요.',
    labels: {
      Plastic: '플라스틱',
      Paper: '종이',
      Metal: '금속',
      'Food waste': '음식물쓰레기',
    },
    descriptions: {
      Plastic: '깨끗이 헹궈 물기를 제거한 뒤 재활용으로 배출.',
      Paper: '마른 상태로 테이프/코팅을 제거하고 배출.',
      Metal: '가능하면 눌러 부피를 줄이고, 날카로운 부분 주의.',
      'Food waste': '물기를 빼고 비닐을 제거한 뒤 음식물 전용통에.',
    },
  },
}

export default function Page() {
  const [lang, setLang] = useState<Lang>('zh')
  const t = textMap[lang]

  const [modelStatus, setModelStatus] = useState<ModelStatus>('loading')
  const [predictionError, setPredictionError] = useState('')
  const [isPredicting, setIsPredicting] = useState(false)

  const [imageUrl, setImageUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [mainResult, setMainResult] = useState<PredictionItem | null>(null)
  const [topPredictions, setTopPredictions] = useState<PredictionItem[]>([])

  const modelRef = useRef<tf.LayersModel | null>(null)
  const takePhotoInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  // Camera (desktop) support
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const supportsCamera =
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        await tf.ready()
        const model = await tf.loadLayersModel(MODEL_PATH)
        if (!mounted) return
        modelRef.current = model
        setModelStatus('ready')
      } catch (err) {
        if (!mounted) return
        const msg = (err as Error)?.message ?? ''
        if (isMissingModelError(msg)) setModelStatus('missing')
        else setModelStatus('error')
      }
    })()
    return () => {
      mounted = false
      stopCamera()
    }
  }, [])

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setIsCameraOpen(false)
  }

  async function openCamera() {
    setCameraError('')
    if (!supportsCamera) {
      // Fallback to mobile file input capture or upload
      takePhotoInputRef.current?.click()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setIsCameraOpen(true)
    } catch (err) {
      setCameraError((err as Error)?.message || '无法打开摄像头。')
    }
  }

  async function captureFromCamera() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92),
    )
    if (!blob) return

    const url = URL.createObjectURL(blob)
    setImageUrl(url)
    setFileName('camera.jpg')

    stopCamera()
    await runPredictFromUrl(url)
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setPredictionError('')
    setMainResult(null)

    const url = URL.createObjectURL(file)
    setImageUrl(url)
    setFileName(file.name)

    await runPredictFromUrl(url)
  }

  async function runPredictFromUrl(url: string) {
    if (!modelRef.current) return
    setIsPredicting(true)
    try {
      const img = await readImage(url)
      const results = await predictTop3(modelRef.current, img)
      setTopPredictions(results)
      setMainResult(results[0] ?? null)
    } catch (err) {
      setPredictionError((err as Error)?.message || t.predictionError)
    } finally {
      setIsPredicting(false)
    }
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
              onClick={openCamera}
              disabled={modelStatus !== 'ready'}
              type="button"
            >
              {t.takePhotoButton}
            </button>

            <button
              className="secondary-button"
              onClick={() => uploadInputRef.current?.click()}
              disabled={modelStatus !== 'ready'}
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
            disabled={modelStatus !== 'ready'}
            hidden
          />
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={modelStatus !== 'ready'}
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
            {fileName ? <p>{t.selectedFile}: {fileName}</p> : <p>{t.previewEmpty}</p>}
          </div>

          {imageUrl ? (
            <img className="preview-image" src={imageUrl} alt="Selected waste item preview" />
          ) : (
            <div className="preview-placeholder">
              <span />
              <span />
              <span />
            </div>
          )}
        </section>

        <section className="card result-card">
          <div className="section-heading">
            <h2>{t.resultTitle}</h2>
            <p>{isPredicting ? t.analyzing : mainResult ? t.descriptions[mainResult.label] : t.previewEmpty}</p>
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
          ) : (
            <div className="empty-result">
              {isPredicting ? <p>{t.analyzing}</p> : <p>{t.previewEmpty}</p>}
            </div>
          )}
        </section>
      </section>

      {isCameraOpen ? (
        <div className="camera-overlay" role="dialog" aria-modal>
          <div className="camera-box card">
            <video ref={videoRef} className="camera-video" playsInline muted />
            {cameraError ? <p className="error-text">{cameraError}</p> : null}
            <div className="camera-controls">
              <button className="secondary-button" onClick={captureFromCamera} type="button">
                {t.takePhotoButton}
              </button>
              <button className="danger-button" onClick={stopCamera} type="button">关闭</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function getStatusText(modelStatus: ModelStatus, t: Localized) {
  if (modelStatus === 'loading') return t.statusLoading
  if (modelStatus === 'ready') return t.statusReady
  if (modelStatus === 'missing') return t.statusMissing
  return t.statusError
}

function getStatusHint(modelStatus: ModelStatus, t: Localized) {
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

async function predictTop3(model: tf.LayersModel, source: HTMLImageElement): Promise<PredictionItem[]> {
  const tensor = tf.tidy(() => {
    const pixels = tf.browser.fromPixels(source)
    const resized = tf.image.resizeBilinear(pixels, [IMAGE_SIZE, IMAGE_SIZE])
    const normalized = resized.toFloat().div(255)
    return normalized.expandDims(0)
  })

  const output = model.predict(tensor)

  if (!output || Array.isArray(output)) {
    tensor.dispose()
    throw new Error('Unexpected model output.')
  }

  const scores = Array.from(await output.data())

  tensor.dispose()
  output.dispose()

  return scores
    .map((confidence, index) => ({
      label: supportedLabels[index] ?? 'Plastic',
      confidence,
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)
}