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

const zh: Localized = {
  eyebrow: 'N.P.C 智能分类',
  appTitle: '垃圾分类助手',
  intro: '拍照或上传图片，使用 TensorFlow.js 在浏览器中识别垃圾类型并给出投放建议。',
  languageLabel: '语言',
  langZh: '中文',
  langKo: '한국어',
  statusLoading: '模型加载中...',
  statusLoadingHint: '首次使用会下载模型文件，请稍候。',
  statusIdle: '模型将按需加载。',
  statusIdleHint: '首次识别时开始加载，可减少首屏等待。',
  statusReady: '模型就绪，可以开始识别。',
  statusReadyHint: '上传或拍照后将展示 Top 3 结果。',
  statusMissing: '未找到模型文件。',
  statusMissingHint: '请将 model.json 与 weights.bin 放到 public/model/。',
  statusError: '模型加载失败。',
  statusErrorHint: '请检查网络或模型文件是否完整。',
  actionsTitle: '开始操作',
  actionHint: '支持拍照、本地上传、URL 导入和剪贴板粘贴。',
  takePhotoButton: '拍照识别',
  uploadButton: '上传图片',
  uploadPickerTitle: '选择上传方式',
  uploadFromLocal: '本地图片',
  uploadFromUrl: '图片 URL',
  uploadFromClipboard: '剪贴板',
  pasteZoneHint: '先复制图片，再按 Ctrl/Cmd + V。',
  pasteButton: '读取剪贴板图片',
  retakeButton: '重拍',
  usePhotoButton: '使用照片',
  clipboardUnsupported: '当前浏览器不支持主动读取剪贴板，请使用 Ctrl/Cmd + V 粘贴。',
  pasteHint: '支持粘贴截图（Ctrl/Cmd + V）或输入图片 URL。',
  urlPlaceholder: '粘贴图片 URL（https://...）',
  loadUrlButton: '导入 URL 图片',
  urlInvalid: '请输入有效的 http/https 图片 URL。',
  urlLoadFailed: 'URL 图片加载失败，请检查链接是否可访问。',
  pasteNoImage: '剪贴板中未检测到图片，请重试。',
  previewTitle: '图片预览',
  previewEmpty: '尚未选择图片。',
  selectedFile: '已选择',
  resolutionLabel: '分辨率',
  analyzing: '正在分析图片...',
  resultTitle: '识别结果',
  resultReadyHint: '识别完成，请查看 Top 3 与投放建议。',
  confidence: '置信度',
  top3Title: 'Top 3 候选',
  rawTop3Title: '原始类别 Top 3',
  undeterminedTitle: '不可判定',
  undeterminedHint: '当前结果置信度较低，建议重拍或更换角度。',
  lowConfidenceHint: '识别置信度低于 45%：',
  reasonTitle: '判定依据',
  guideTitle: '投放指南',
  quickTipsTitle: '快速提示',
  quickTips: [
    '保证光线充足、主体清晰。',
    '减少遮挡，尽量单一主体。',
    '结果仅供参考，请结合当地标准。',
  ],
  predictionError: '识别失败，请稍后重试。',
  cameraLoading: '正在打开摄像头...',
  cameraOpenFailed: '无法打开摄像头。',
  cameraUnsupported: '当前环境不支持摄像头，已切换为上传模式。',
  cameraSecureContext: '请在 HTTPS 或 localhost 下使用摄像头。',
  cameraPermissionDenied: '摄像头权限被拒绝，请在浏览器设置中允许。',
  cameraNoDevice: '未检测到可用摄像头。',
  cameraInUse: '摄像头可能被其他应用占用。',
  cameraErrorTitle: '摄像头打开失败',
  closeButton: '关闭',
  switchCameraButton: '切换摄像头',
  mirrorHint: '前置画面已校正为非镜像。',
  rawLabels: {
    battery: '电池',
    biological: '厨余/有机物',
    'brown-glass': '棕色玻璃',
    cardboard: '纸板',
    clothes: '衣物',
    'green-glass': '绿色玻璃',
    metal: '金属',
    paper: '纸类',
    plastic: '塑料',
    shoes: '鞋类',
    trash: '其他垃圾',
    'white-glass': '白色玻璃',
  },
  reasonHints: {
    battery: '检测到电池形态与端点结构特征。',
    biological: '检测到有机残余与食物纹理特征。',
    'brown-glass': '检测到棕色玻璃反光和材质特征。',
    cardboard: '检测到纸板纤维与瓦楞结构特征。',
    clothes: '检测到织物纹理与柔性轮廓特征。',
    'green-glass': '检测到绿色玻璃反光和材质特征。',
    metal: '检测到金属高反光与硬质边缘特征。',
    paper: '检测到纸张平面纹理与折痕特征。',
    plastic: '检测到塑料反光与薄膜边缘特征。',
    shoes: '检测到鞋底结构与鞋面轮廓特征。',
    trash: '主体特征混杂，归入其他垃圾类别。',
    'white-glass': '检测到透明/白色玻璃反光和材质特征。',
  },
  labels: {
    'General waste': '一般垃圾（종량제）',
    'Food waste': '厨余垃圾（음식물）',
    Recyclables: '可回收物（재활용）',
    'Hazardous waste': '有害/专项回收',
    'Bulk waste': '大件垃圾（申报）',
  },
  descriptions: {
    'General waste': '使用韩国 종량제 垃圾袋投放；可回收物、厨余和有害物不要混入。',
    'Food waste': '先沥干水分，去掉塑料包装后投入 음식물 专用桶/专用袋；骨头、贝壳等按当地规则处理。',
    Recyclables: '按材质分开投放（纸/塑料/金属/玻璃/衣物鞋类）；尽量清洗并压扁，PET 瓶身与瓶盖/标签分离。',
    'Hazardous waste': '废电池、废灯管等投放到公寓/社区或行政机构的专项回收箱，不进普通垃圾袋。',
    'Bulk waste': '家具家电等大件需先在区厅网站/APP 申报并缴费，贴标后按预约时间排出。',
  },
}

const ko: Localized = {
  eyebrow: 'N.P.C 스마트 분류',
  appTitle: '쓰레기 분류 도우미',
  intro: '사진 촬영 또는 이미지 업로드 후 TensorFlow.js로 분류 결과와 배출 가이드를 제공합니다.',
  languageLabel: '언어',
  langZh: '中文',
  langKo: '한국어',
  statusLoading: '모델 로딩 중...',
  statusLoadingHint: '처음에는 모델 파일 다운로드가 필요합니다.',
  statusIdle: '모델은 필요 시 로드됩니다.',
  statusIdleHint: '첫 추론 시 로딩이 시작됩니다.',
  statusReady: '모델 준비 완료.',
  statusReadyHint: '이미지를 선택하면 Top 3 결과를 표시합니다.',
  statusMissing: '모델 파일을 찾을 수 없습니다.',
  statusMissingHint: 'public/model/에 model.json, weights.bin을 배치하세요.',
  statusError: '모델 로딩 실패.',
  statusErrorHint: '네트워크 또는 모델 파일 상태를 확인하세요.',
  actionsTitle: '시작하기',
  actionHint: '카메라, 로컬 업로드, URL, 클립보드를 지원합니다.',
  takePhotoButton: '사진 촬영',
  uploadButton: '이미지 업로드',
  uploadPickerTitle: '업로드 방식 선택',
  uploadFromLocal: '로컬 이미지',
  uploadFromUrl: '이미지 URL',
  uploadFromClipboard: '클립보드',
  pasteZoneHint: '이미지를 복사한 뒤 Ctrl/Cmd + V를 누르세요.',
  pasteButton: '클립보드 이미지 읽기',
  retakeButton: '다시 촬영',
  usePhotoButton: '사진 사용',
  clipboardUnsupported: '브라우저에서 클립보드 읽기를 지원하지 않습니다. Ctrl/Cmd + V를 사용하세요.',
  pasteHint: '스크린샷 붙여넣기(Ctrl/Cmd + V) 또는 URL 입력을 지원합니다.',
  urlPlaceholder: '이미지 URL 입력 (https://...)',
  loadUrlButton: 'URL 이미지 불러오기',
  urlInvalid: '유효한 http/https 이미지 URL을 입력하세요.',
  urlLoadFailed: 'URL 이미지 로딩에 실패했습니다.',
  pasteNoImage: '클립보드에서 이미지를 찾지 못했습니다.',
  previewTitle: '이미지 미리보기',
  previewEmpty: '선택된 이미지가 없습니다.',
  selectedFile: '선택 파일',
  resolutionLabel: '해상도',
  analyzing: '이미지 분석 중...',
  resultTitle: '분류 결과',
  resultReadyHint: 'Top 3 결과와 배출 가이드를 확인하세요.',
  confidence: '신뢰도',
  top3Title: 'Top 3 후보',
  rawTop3Title: '원시 클래스 Top 3',
  undeterminedTitle: '판단 보류',
  undeterminedHint: '신뢰도가 낮습니다. 다시 촬영하거나 각도를 바꿔보세요.',
  lowConfidenceHint: '신뢰도 45% 미만:',
  reasonTitle: '판단 근거',
  guideTitle: '배출 가이드',
  quickTipsTitle: '빠른 팁',
  quickTips: [
    '조명을 충분히 확보하세요.',
    '가림을 줄이고 대상을 크게 촬영하세요.',
    '결과는 참고용이며 지역 기준을 우선하세요.',
  ],
  predictionError: '분류 중 오류가 발생했습니다. 다시 시도하세요.',
  cameraLoading: '카메라를 여는 중...',
  cameraOpenFailed: '카메라를 열 수 없습니다.',
  cameraUnsupported: '현재 환경에서 카메라를 지원하지 않습니다.',
  cameraSecureContext: 'HTTPS 또는 localhost에서 카메라를 사용하세요.',
  cameraPermissionDenied: '카메라 권한이 거부되었습니다.',
  cameraNoDevice: '사용 가능한 카메라를 찾을 수 없습니다.',
  cameraInUse: '카메라가 다른 앱에서 사용 중일 수 있습니다.',
  cameraErrorTitle: '카메라 오류',
  closeButton: '닫기',
  switchCameraButton: '카메라 전환',
  mirrorHint: '전면 카메라는 미러 보정이 적용됩니다.',
  rawLabels: {
    battery: '배터리',
    biological: '음식물/유기물',
    'brown-glass': '갈색 유리',
    cardboard: '골판지',
    clothes: '의류',
    'green-glass': '녹색 유리',
    metal: '금속',
    paper: '종이',
    plastic: '플라스틱',
    shoes: '신발',
    trash: '일반 쓰레기',
    'white-glass': '투명/백색 유리',
  },
  reasonHints: {
    battery: '배터리 형태와 단자 구조 특징이 감지되었습니다.',
    biological: '음식물 잔여물과 유기물 질감 특징이 감지되었습니다.',
    'brown-glass': '갈색 유리 반사와 재질 특징이 감지되었습니다.',
    cardboard: '골판지 섬유와 골 구조 특징이 감지되었습니다.',
    clothes: '의류 섬유 질감과 유연한 윤곽이 감지되었습니다.',
    'green-glass': '녹색 유리 반사와 재질 특징이 감지되었습니다.',
    metal: '금속성 반사와 단단한 경계 특징이 감지되었습니다.',
    paper: '종이 평면 질감과 접힘 패턴이 감지되었습니다.',
    plastic: '플라스틱 반사/필름 가장자리 특징이 감지되었습니다.',
    shoes: '신발 밑창 구조와 갑피 윤곽 특징이 감지되었습니다.',
    trash: '주요 특징이 혼합되어 일반 쓰레기로 분류되었습니다.',
    'white-glass': '투명/백색 유리 반사와 재질 특징이 감지되었습니다.',
  },
  labels: {
    'General waste': '일반쓰레기(종량제)',
    'Food waste': '음식물류 폐기물',
    Recyclables: '재활용품',
    'Hazardous waste': '유해/전용 수거',
    'Bulk waste': '대형폐기물(신고)',
  },
  descriptions: {
    'General waste': '종량제 봉투에 담아 배출하고, 재활용/음식물/유해 폐기물은 섞지 마세요.',
    'Food waste': '물기를 최대한 제거하고 포장재를 분리한 뒤 음식물 전용 수거함/봉투에 배출하세요.',
    Recyclables: '종이/플라스틱/금속/유리/의류·신발을 재질별로 분리하고, 세척 후 가능한 한 부피를 줄여 배출하세요.',
    'Hazardous waste': '폐건전지·폐형광등 등은 아파트/주민센터 전용 수거함에 배출하세요.',
    'Bulk waste': '가구·가전 등 대형폐기물은 구청 홈페이지/앱에서 신고·결제 후 스티커 또는 접수번호로 배출하세요.',
  },
}

export const homeTextMap: Record<Lang, Localized> = {
  zh,
  ko,
}
