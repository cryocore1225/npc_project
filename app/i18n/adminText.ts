import type { Lang } from './shared'

export type AdminLocalized = {
  title: string
  subtitle: string
  refresh: string
  clearLogs: string
  clearConfirm: string
  backHome: string
  exportCsv: string
  total: string
  lowConfidenceRate: string
  avgLatency: string
  source: string
  onlyUndetermined: string
  tableTime: string
  tableSource: string
  tableTop1: string
  tableRawTop1: string
  tableConfidence: string
  tableLatency: string
  tableStatus: string
}

export const adminTextMap: Record<Lang, AdminLocalized> = {
  zh: {
    title: '管理日志',
    subtitle: '推理埋点统计（浏览器 localStorage）',
    refresh: '刷新',
    clearLogs: '清空日志',
    clearConfirm: '确定清空本地日志吗？此操作不可撤销。',
    backHome: '返回首页',
    exportCsv: '导出 CSV',
    total: '总请求数',
    lowConfidenceRate: '低置信度占比',
    avgLatency: '平均耗时',
    source: '来源',
    onlyUndetermined: '仅看 undetermined',
    tableTime: '时间',
    tableSource: '来源',
    tableTop1: 'Top1',
    tableRawTop1: '原始 Top1',
    tableConfidence: '置信度',
    tableLatency: '耗时',
    tableStatus: '状态',
  },
  ko: {
    title: '관리 로그',
    subtitle: '추론 로그 통계 (브라우저 localStorage)',
    refresh: '새로고침',
    clearLogs: '로그 삭제',
    clearConfirm: '로컬 로그를 모두 삭제할까요? 이 작업은 되돌릴 수 없습니다.',
    backHome: '홈으로',
    exportCsv: 'CSV 내보내기',
    total: '총 요청 수',
    lowConfidenceRate: '저신뢰 비율',
    avgLatency: '평균 지연',
    source: '입력 소스',
    onlyUndetermined: 'undetermined만 보기',
    tableTime: '시간',
    tableSource: '소스',
    tableTop1: 'Top1',
    tableRawTop1: '원본 Top1',
    tableConfidence: '신뢰도',
    tableLatency: '지연',
    tableStatus: '상태',
  },
}
