'use client'

import Link from 'next/link'
import { useState } from 'react'

type Lang = 'zh' | 'ko'
type LabelKey = 'General waste' | 'Food waste' | 'Recyclables' | 'Hazardous waste' | 'Bulk waste'
type ObjectClassKey =
  | 'can'
  | 'bottle'
  | 'food'
  | 'battery'
  | 'paper'
  | 'plastic'
  | 'furniture'
  | 'background'
type InputSource = 'local' | 'url' | 'clipboard' | 'camera'
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

const LOG_STORAGE_KEY = 'npc_inference_logs_v1'
const LANG_STORAGE_KEY = 'npc_lang'

const textMap: Record<
  Lang,
  {
    title: string
    subtitle: string
    refresh: string
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
> = {
  zh: {
    title: '管理日志',
    subtitle: '推理埋点统计（浏览器 localStorage）。',
    refresh: '刷新',
    backHome: '返回首页',
    exportCsv: '导出 CSV',
    total: '总请求',
    lowConfidenceRate: '低置信度占比',
    avgLatency: '平均耗时',
    source: '来源',
    onlyUndetermined: '只看 undetermined',
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
    subtitle: '추론 로그 통계(브라우저 localStorage).',
    refresh: '새로고침',
    backHome: '홈으로',
    exportCsv: 'CSV 내보내기',
    total: '총 요청',
    lowConfidenceRate: '저신뢰 비율',
    avgLatency: '평균 지연',
    source: '소스',
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

export default function AdminPage() {
  const [lang] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'zh'
    return localStorage.getItem(LANG_STORAGE_KEY) === 'ko' ? 'ko' : 'zh'
  })
  const t = textMap[lang]
  const [sourceFilter, setSourceFilter] = useState<InputSource | 'all'>('all')
  const [onlyUndetermined, setOnlyUndetermined] = useState(false)

  function readLogs(): InferenceLog[] {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(LOG_STORAGE_KEY)
      return raw ? (JSON.parse(raw) as InferenceLog[]) : []
    } catch {
      return []
    }
  }

  const [logs, setLogs] = useState<InferenceLog[]>(() => readLogs())

  function loadLogs() {
    setLogs(readLogs())
  }

  const filteredLogs = logs.filter((item) => {
    if (sourceFilter !== 'all' && item.source !== sourceFilter) return false
    if (onlyUndetermined && !item.undetermined) return false
    return true
  })

  const summary = (() => {
    const total = filteredLogs.length
    if (!total) return { total: 0, lowConfidenceRate: 0, avgLatency: 0 }
    const low = filteredLogs.filter((item) => item.undetermined).length
    const avgLatency = Math.round(filteredLogs.reduce((acc, cur) => acc + cur.latencyMs, 0) / total)
    return {
      total,
      lowConfidenceRate: Math.round((low / total) * 100),
      avgLatency,
    }
  })()

  function exportCsv() {
    const headers = [
      t.tableTime,
      t.tableSource,
      t.tableTop1,
      t.tableRawTop1,
      t.tableConfidence,
      t.tableLatency,
      t.tableStatus,
    ]
    const rows = filteredLogs.map((item) => [
      new Date(item.timestamp).toLocaleString(),
      item.source,
      item.topLabel ?? '-',
      item.rawTopClass ?? '-',
      `${(item.topConfidence * 100).toFixed(1)}%`,
      `${item.latencyMs}ms`,
      item.undetermined ? 'undetermined' : 'ok',
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `npc_logs_${new Date().toISOString().slice(0, 19).replaceAll(':', '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const sourceOptions: Array<InputSource | 'all'> = ['all', 'camera', 'local', 'url', 'clipboard']

  return (
    <main className="page-shell">
      <section className="card admin-card">
        <div className="admin-head">
          <div>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>
          <div className="admin-actions">
            <button className="secondary-button" onClick={loadLogs} type="button">
              {t.refresh}
            </button>
            <button className="secondary-button" onClick={exportCsv} type="button">
              {t.exportCsv}
            </button>
            <Link className="secondary-button admin-home-link" href="/">
              {t.backHome}
            </Link>
          </div>
        </div>

        <div className="admin-summary">
          <div className="tip-list">
            <strong>{t.total}</strong>
            <p>{summary.total}</p>
          </div>
          <div className="tip-list">
            <strong>{t.lowConfidenceRate}</strong>
            <p>{summary.lowConfidenceRate}%</p>
          </div>
          <div className="tip-list">
            <strong>{t.avgLatency}</strong>
            <p>{summary.avgLatency}ms</p>
          </div>
        </div>

        <div className="admin-filters">
          <label className="admin-filter-item">
            {t.source}
            <select
              className="admin-select"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as InputSource | 'all')}
            >
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-filter-check">
            <input
              type="checkbox"
              checked={onlyUndetermined}
              onChange={(e) => setOnlyUndetermined(e.target.checked)}
            />
            {t.onlyUndetermined}
          </label>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th align="left">{t.tableTime}</th>
                <th align="left">{t.tableSource}</th>
                <th align="left">{t.tableTop1}</th>
                <th align="left">{t.tableRawTop1}</th>
                <th align="left">{t.tableConfidence}</th>
                <th align="left">{t.tableLatency}</th>
                <th align="left">{t.tableStatus}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.timestamp).toLocaleString()}</td>
                  <td>{item.source}</td>
                  <td>{item.topLabel ?? '-'}</td>
                  <td>{item.rawTopClass ?? '-'}</td>
                  <td>{(item.topConfidence * 100).toFixed(1)}%</td>
                  <td>{item.latencyMs}ms</td>
                  <td>{item.undetermined ? 'undetermined' : 'ok'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
