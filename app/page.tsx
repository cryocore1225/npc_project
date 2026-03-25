'use client'

import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'

type Lang = 'zh' | 'ko'
type LabelKey = 'General waste' | 'Food waste' | 'Recyclables' | 'Hazardous waste' | 'Bulk waste'
type ModelStatus = 'idle' | 'loading' | 'ready' | 'missing' | 'error'
type UploadSource = 'local' | 'url' | 'clipboard'
type TfModule = typeof import('@tensorflow/tfjs')
type TfLayersModel = import('@tensorflow/tfjs').LayersModel
type ObjectClassKey =
  | 'can'
  | 'bottle'
  | 'food'
  | 'battery'
  | 'paper'
  | 'plastic'
  | 'furniture'
  | 'background'

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
  statusIdle: string
  statusIdleHint: string
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
  uploadPickerTitle: string
  uploadFromLocal: string
  uploadFromUrl: string
  uploadFromClipboard: string
  pasteZoneHint: string
  pasteButton: string
  clipboardUnsupported: string
  pasteHint: string
  urlPlaceholder: string
  loadUrlButton: string
  urlInvalid: string
  urlLoadFailed: string
  pasteNoImage: string
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
  cameraLoading: string
  cameraOpenFailed: string
  cameraUnsupported: string
  cameraSecureContext: string
  cameraPermissionDenied: string
  cameraNoDevice: string
  cameraInUse: string
  closeButton: string
  switchCameraButton: string
  mirrorHint: string
  labels: Record<LabelKey, string>
  descriptions: Record<LabelKey, string>
}

const MODEL_PATH = '/model/model.json'
const IMAGE_SIZE = 224
const supportedLabels: LabelKey[] = [
  'General waste',
  'Food waste',
  'Recyclables',
  'Hazardous waste',
  'Bulk waste',
]
const supportedObjectClasses: ObjectClassKey[] = [
  'can',
  'bottle',
  'food',
  'battery',
  'paper',
  'plastic',
  'furniture',
  'background',
]

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
    statusIdle: '模型将按需加载。',
    statusIdleHint: '首次识别时才加载模型，可加快页面打开速度。',
    statusReady: '模型已就绪，可以开始识别。',
    statusReadyHint: '选择或拍摄一张图片，系统会给出 Top 3 结果。',
    statusMissing: '未找到模型文件。',
    statusMissingHint:
      '请将训练导出的 model.json 与 weights.bin 放到 public/model/ 目录。',
    statusError: '模型加载失败。',
    statusErrorHint: '请检查网络连接或模型文件是否完整，然后重试。',
    actionsTitle: '开始操作',
    actionHint: '可以直接拍照（电脑/手机摄像头）或从本地上传。',
    takePhotoButton: '拍照识别',
    uploadButton: '上传图片',
    uploadPickerTitle: '选择上传方式',
    uploadFromLocal: '本地图片',
    uploadFromUrl: '图片 URL',
    uploadFromClipboard: '截图粘贴',
    pasteZoneHint: '先截图并复制，然后在此模式按 Ctrl/Cmd + V。',
    pasteButton: '读取剪贴板图片',
    clipboardUnsupported: '当前浏览器不支持主动读取剪贴板，请使用 Ctrl/Cmd + V 粘贴。',
    pasteHint: '支持直接粘贴截图（Ctrl/Cmd + V）或输入图片 URL。',
    urlPlaceholder: '粘贴图片 URL（https://...）',
    loadUrlButton: '导入 URL 图片',
    urlInvalid: '请输入有效的图片 URL（http/https，且扩展名为 jpg/png/webp/gif 等）。',
    urlLoadFailed: 'URL 图片加载失败，请检查链接是否可访问。',
    pasteNoImage: '剪贴板中未检测到图片，请复制图片后重试。',
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
    cameraLoading: '正在打开摄像头...',
    cameraOpenFailed: '无法打开摄像头。',
    cameraUnsupported: '当前环境不支持摄像头调用，已切换为拍照上传。',
    cameraSecureContext: '浏览器限制：请使用 HTTPS 或 localhost 才能调用摄像头。',
    cameraPermissionDenied: '摄像头权限被拒绝，请在浏览器设置中允许后重试。',
    cameraNoDevice: '未检测到可用摄像头，请检查设备连接。',
    cameraInUse: '摄像头可能被其他应用占用，请先关闭其它应用。',
    closeButton: '关闭',
    switchCameraButton: '切换摄像头',
    mirrorHint: '前置画面已校正为非镜像',
    labels: {
      'General waste': '一般垃圾',
      'Food waste': '厨余垃圾',
      Recyclables: '可回收垃圾',
      'Hazardous waste': '有害垃圾',
      'Bulk waste': '大件垃圾',
    },
    descriptions: {
      'General waste': '无法回收或难以分类的生活废弃物，投入一般垃圾桶。',
      'Food waste': '沥干水分，去除塑料袋后投入厨余桶。',
      Recyclables: '保持清洁干燥后分类投放到可回收物。',
      'Hazardous waste': '如电池、灯管、药品等，请投放至有害垃圾回收点。',
      'Bulk waste': '家具家电等大件废弃物，请按当地预约清运流程处理。',
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
    statusIdle: '모델은 필요할 때 로드됩니다.',
    statusIdleHint: '첫 분석 시 로드되어 초기 페이지 속도를 높입니다.',
    statusReady: '모델 준비 완료. 분석을 시작할 수 있어요.',
    statusReadyHint: '사진을 선택하거나 촬영하면 Top 3 결과를 보여드립니다.',
    statusMissing: '모델 파일을 찾을 수 없습니다.',
    statusMissingHint:
      '학습된 model.json과 weights.bin 파일을 public/model/ 폴더에 배치하세요.',
    statusError: '모델 로딩에 실패했습니다.',
    statusErrorHint: '네트워크 또는 모델 파일을 확인한 뒤 다시 시도하세요.',
    actionsTitle: '시작하기',
    actionHint: '카메라 촬영(PC/모바일) 또는 파일 업로드가 가능합니다.',
    takePhotoButton: '사진 촬영',
    uploadButton: '이미지 업로드',
    uploadPickerTitle: '업로드 방식 선택',
    uploadFromLocal: '로컬 이미지',
    uploadFromUrl: '이미지 URL',
    uploadFromClipboard: '스크린샷 붙여넣기',
    pasteZoneHint: '스크린샷을 복사한 뒤 이 모드에서 Ctrl/Cmd + V를 누르세요.',
    pasteButton: '클립보드 이미지 읽기',
    clipboardUnsupported: '브라우저에서 클립보드 읽기를 지원하지 않습니다. Ctrl/Cmd + V를 사용하세요.',
    pasteHint: '스크린샷 붙여넣기(Ctrl/Cmd + V) 또는 이미지 URL 입력을 지원합니다.',
    urlPlaceholder: '이미지 URL 붙여넣기 (https://...)',
    loadUrlButton: 'URL 이미지 불러오기',
    urlInvalid: '유효한 이미지 URL(http/https, jpg/png/webp/gif 등)을 입력하세요.',
    urlLoadFailed: 'URL 이미지 로딩에 실패했습니다. 링크를 확인해주세요.',
    pasteNoImage: '클립보드에서 이미지를 찾지 못했습니다. 이미지를 복사 후 다시 시도하세요.',
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
    cameraLoading: '카메라를 여는 중...',
    cameraOpenFailed: '카메라를 열 수 없습니다.',
    cameraUnsupported: '현재 환경에서 카메라를 지원하지 않아 파일 촬영으로 전환했습니다.',
    cameraSecureContext: '브라우저 제한: HTTPS 또는 localhost에서만 카메라를 사용할 수 있습니다.',
    cameraPermissionDenied: '카메라 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.',
    cameraNoDevice: '사용 가능한 카메라를 찾지 못했습니다.',
    cameraInUse: '다른 앱이 카메라를 사용 중일 수 있습니다.',
    closeButton: '닫기',
    switchCameraButton: '카메라 전환',
    mirrorHint: '전면 카메라는 좌우 반전 보정됨',
    labels: {
      'General waste': '일반 쓰레기',
      'Food waste': '음식물 쓰레기',
      Recyclables: '재활용 쓰레기',
      'Hazardous waste': '유해 쓰레기',
      'Bulk waste': '대형 폐기물',
    },
    descriptions: {
      'General waste': '재활용이 어렵거나 분류가 애매한 생활폐기물은 일반 쓰레기로 배출.',
      'Food waste': '물기를 제거하고 이물질을 뺀 뒤 음식물 전용 수거함에 배출.',
      Recyclables: '깨끗이 분리해 재활용 수거함에 배출하세요.',
      'Hazardous waste': '건전지, 형광등, 의약품 등은 유해폐기물 전용 수거함에 배출.',
      'Bulk waste': '가구·가전 등 대형 폐기물은 지자체 신고/예약 후 배출.',
    },
  },
}

export default function Page() {
  const [lang, setLang] = useState<Lang>('zh')
  const t = textMap[lang]

  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle')
  const [predictionError, setPredictionError] = useState('')
  const [isPredicting, setIsPredicting] = useState(false)

  const [imageUrl, setImageUrl] = useState('')
  const [remoteImageUrl, setRemoteImageUrl] = useState('')
  const [isUploadPanelOpen, setIsUploadPanelOpen] = useState(false)
  const [uploadSource, setUploadSource] = useState<UploadSource>('local')
  const [fileName, setFileName] = useState('')
  const [mainResult, setMainResult] = useState<PredictionItem | null>(null)
  const [topPredictions, setTopPredictions] = useState<PredictionItem[]>([])

  const tfRef = useRef<TfModule | null>(null)
  const modelRef = useRef<TfLayersModel | null>(null)
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

  const ensureModelReady = useCallback(async () => {
    if (modelRef.current && tfRef.current) {
      setModelStatus((prev) => (prev === 'ready' ? prev : 'ready'))
      return true
    }

    setModelStatus('loading')
    try {
      const tf = tfRef.current ?? (await import('@tensorflow/tfjs'))
      tfRef.current = tf
      await tf.ready()

      const model = await tf.loadLayersModel(MODEL_PATH)
      modelRef.current = model
      setModelStatus('ready')
      return true
    } catch (err) {
      const msg = (err as Error)?.message ?? ''
      if (isMissingModelError(msg)) setModelStatus('missing')
      else setModelStatus('error')
      return false
    }
  }, [])

  const runPredictFromUrl = useCallback(
    async (url: string, defaultErrorMessage = t.predictionError) => {
      const modelReady = await ensureModelReady()
      if (!modelReady || !modelRef.current || !tfRef.current) return
      setIsPredicting(true)
      try {
        const img = await readImage(url)
        const results = await predictTop3(tfRef.current, modelRef.current, img)
        setTopPredictions(results)
        setMainResult(results[0] ?? null)
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
      setImageUrl(url)
      setFileName(file.name || 'clipboard-image.png')
      void runPredictFromUrl(url)
    }

    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [isUploadPanelOpen, runPredictFromUrl, t.pasteNoImage, uploadSource])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsCameraOpen(false)
    setIsOpeningCamera(false)
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
    setIsUploadPanelOpen(false)

    await runPredictFromUrl(url)
  }

  async function loadFromImageUrl() {
    const target = remoteImageUrl.trim()
    if (!isLikelyImageUrl(target)) {
      setPredictionError(t.urlInvalid)
      return
    }

    setPredictionError('')
    setMainResult(null)
    setImageUrl(target)
    setFileName('remote-image')
    setIsUploadPanelOpen(false)

    await runPredictFromUrl(target, t.urlLoadFailed)
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
      setImageUrl(url)
      setFileName('clipboard-image.png')
      setIsUploadPanelOpen(false)
      await runPredictFromUrl(url)
    } catch {
      setPredictionError(t.clipboardUnsupported)
    }
  }

  function openUploadPanel() {
    setPredictionError('')
    setIsUploadPanelOpen((prev) => !prev)
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

          {isUploadPanelOpen ? (
            <div className="upload-panel">
              <p className="upload-panel-title">{t.uploadPickerTitle}</p>
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
                <button className="secondary-button" onClick={() => uploadInputRef.current?.click()} type="button">
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
                  <button className="secondary-button" onClick={loadFromClipboard} type="button">
                    {t.pasteButton}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

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

      {!isCameraOpen && cameraError ? <p className="error-text camera-inline-error">{cameraError}</p> : null}

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
                disabled={isOpeningCamera}
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
            {isOpeningCamera ? <p className="camera-hint">{t.cameraLoading}</p> : null}
            {cameraFacingMode === 'user' ? <p className="camera-hint camera-mirror-hint">{t.mirrorHint}</p> : null}
            {cameraError ? <p className="error-text">{cameraError}</p> : null}
            <div className="camera-controls">
              <button
                className="camera-shutter-btn"
                onClick={captureFromCamera}
                type="button"
                disabled={isOpeningCamera || !!cameraError}
                aria-label={t.takePhotoButton}
              >
                <span />
              </button>
            </div>
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

async function predictTop3(tf: TfModule, model: TfLayersModel, source: HTMLImageElement): Promise<PredictionItem[]> {
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

  return mapScoresToTrashPredictions(scores)
}

function mapToTrash(className: string): LabelKey {
  const normalized = className.trim().toLowerCase()

  if (normalized === 'can' || normalized === 'bottle' || normalized === 'paper' || normalized === 'plastic') {
    return 'Recyclables'
  }
  if (normalized === 'food' || normalized === 'banana') return 'Food waste'
  if (normalized === 'battery') return 'Hazardous waste'
  if (normalized === 'furniture' || normalized === 'chair') return 'Bulk waste'
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

  // Case B: model outputs object classes (8 classes), then map to trash buckets
  const bucket: Record<LabelKey, number> = {
    'General waste': 0,
    'Food waste': 0,
    Recyclables: 0,
    'Hazardous waste': 0,
    'Bulk waste': 0,
  }

  scores.forEach((score, index) => {
    const className = supportedObjectClasses[index] ?? 'background'
    const trashLabel = mapToTrash(className)
    bucket[trashLabel] += score
  })

  return supportedLabels
    .map((label) => ({ label, confidence: bucket[label] }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)
}

function getCameraErrorMessage(err: unknown, t: Localized) {
  const name = (err as DOMException | Error | undefined)?.name

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return t.cameraPermissionDenied
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return t.cameraNoDevice
  if (name === 'NotReadableError' || name === 'TrackStartError') return t.cameraInUse
  if (name === 'SecurityError') return t.cameraSecureContext

  return (err as Error | undefined)?.message || t.cameraOpenFailed
}

function isLikelyImageUrl(value: string) {
  if (!value) return false

  try {
    const url = new URL(value)
    const isHttp = url.protocol === 'http:' || url.protocol === 'https:'
    if (!isHttp) return false
    return /(\.jpg|\.jpeg|\.png|\.webp|\.gif|\.bmp|\.svg)(\?.*)?$/i.test(url.pathname + url.search)
  } catch {
    return false
  }
}
