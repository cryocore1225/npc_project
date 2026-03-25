'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

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

export default function AdminPage() {
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

  const summary = useMemo(() => {
    const total = logs.length
    if (!total) return { total: 0, lowConfidenceRate: 0, avgLatency: 0 }
    const low = logs.filter((item) => item.undetermined).length
    const avgLatency = Math.round(logs.reduce((acc, cur) => acc + cur.latencyMs, 0) / total)
    return {
      total,
      lowConfidenceRate: Math.round((low / total) * 100),
      avgLatency,
    }
  }, [logs])

  return (
    <main className="page-shell">
      <section className="card admin-card">
        <div className="admin-head">
          <div>
            <h1>Admin Logs</h1>
            <p>推理埋点统计（浏览器本地 localStorage）。</p>
          </div>
          <div className="admin-actions">
            <button className="secondary-button" onClick={loadLogs} type="button">
              刷新
            </button>
            <Link className="secondary-button admin-home-link" href="/">
              返回首页
            </Link>
          </div>
        </div>

        <div className="admin-summary">
          <div className="tip-list">
            <strong>总请求</strong>
            <p>{summary.total}</p>
          </div>
          <div className="tip-list">
            <strong>低置信度占比</strong>
            <p>{summary.lowConfidenceRate}%</p>
          </div>
          <div className="tip-list">
            <strong>平均耗时</strong>
            <p>{summary.avgLatency}ms</p>
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th align="left">时间</th>
                <th align="left">来源</th>
                <th align="left">Top1</th>
                <th align="left">原始Top1</th>
                <th align="left">置信度</th>
                <th align="left">耗时</th>
                <th align="left">状态</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((item) => (
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
