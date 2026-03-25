import type { Lang, LabelKey, ObjectClassKey } from './shared'

export type Localized = {
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
  retakeButton: string
  usePhotoButton: string
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
  resolutionLabel: string
  analyzing: string
  resultTitle: string
  resultReadyHint: string
  confidence: string
  top3Title: string
  rawTop3Title: string
  undeterminedTitle: string
  undeterminedHint: string
  lowConfidenceHint: string
  reasonTitle: string
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
  cameraErrorTitle: string
  closeButton: string
  switchCameraButton: string
  mirrorHint: string
  rawLabels: Record<ObjectClassKey, string>
  reasonHints: Record<ObjectClassKey, string>
  labels: Record<LabelKey, string>
  descriptions: Record<LabelKey, string>
}

export const homeTextMap: Record<Lang, Localized> = {
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
    retakeButton: '重拍',
    usePhotoButton: '使用照片',
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
    resolutionLabel: '分辨率',
    analyzing: '正在分析图片...',
    resultTitle: '识别结果',
    resultReadyHint: '识别完成，请查看 Top 3 与投放指南。',
    confidence: '置信度',
    top3Title: 'Top 3 候选',
    rawTop3Title: '原始物体识别 Top 3',
    undeterminedTitle: '不可判定',
    undeterminedHint: '当前结果置信度较低，建议重拍或更换角度后再试。',
    lowConfidenceHint: '识别置信度低于 45%',
    reasonTitle: '判定依据',
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
    cameraErrorTitle: '摄像头打开失败',
    closeButton: '关闭',
    switchCameraButton: '切换摄像头',
    mirrorHint: '前置画面已校正为非镜像',
    rawLabels: {
      can: '易拉罐',
      bottle: '瓶子',
      food: '食物',
      battery: '电池',
      paper: '纸类',
      plastic: '塑料包装',
      furniture: '家具/大件',
      background: '背景',
    },
    reasonHints: {
      can: '检测到罐体轮廓和金属反光特征。',
      bottle: '检测到瓶身形状与瓶口结构特征。',
      food: '检测到食物纹理与有机残余特征。',
      battery: '检测到电池形态与端点结构特征。',
      paper: '检测到纸张平面纹理与折痕特征。',
      plastic: '检测到塑料包装高反光与薄膜边缘特征。',
      furniture: '检测到大件结构轮廓（桌椅/家具体积特征）。',
      background: '画面主体不明显，背景特征占比高。',
    },
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
    retakeButton: '다시 촬영',
    usePhotoButton: '사진 사용',
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
    resolutionLabel: '해상도',
    analyzing: '이미지 분석 중...',
    resultTitle: '분류 결과',
    resultReadyHint: '분석이 완료되었습니다. Top 3와 배출 가이드를 확인하세요.',
    confidence: '신뢰도',
    top3Title: 'Top 3 후보',
    rawTop3Title: '원본 객체 인식 Top 3',
    undeterminedTitle: '판정 불가',
    undeterminedHint: '현재 결과 신뢰도가 낮습니다. 각도/거리 변경 후 다시 촬영하세요.',
    lowConfidenceHint: '신뢰도 45% 미만',
    reasonTitle: '판정 근거',
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
    cameraErrorTitle: '카메라 실행 실패',
    closeButton: '닫기',
    switchCameraButton: '카메라 전환',
    mirrorHint: '전면 카메라는 좌우 반전 보정됨',
    rawLabels: {
      can: '캔',
      bottle: '병',
      food: '음식물',
      battery: '배터리',
      paper: '종이',
      plastic: '플라스틱 포장',
      furniture: '가구/대형물',
      background: '배경',
    },
    reasonHints: {
      can: '캔 형태와 금속 반사 특징이 감지되었습니다.',
      bottle: '병 몸체와 입구 구조 특징이 감지되었습니다.',
      food: '음식물 질감과 유기물 패턴이 감지되었습니다.',
      battery: '배터리 형태와 단자 구조 특징이 감지되었습니다.',
      paper: '종이 평면 질감과 접힘 패턴이 감지되었습니다.',
      plastic: '플라스틱 포장 반사/필름 가장자리 특징이 감지되었습니다.',
      furniture: '가구/대형물의 윤곽과 부피 특징이 감지되었습니다.',
      background: '주요 대상보다 배경 특징 비중이 높습니다.',
    },
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
