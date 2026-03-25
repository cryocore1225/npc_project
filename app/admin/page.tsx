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
      <section className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0 }}>Admin Logs</h1>
            <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>
              推理埋点统计（保存在浏览器 localStorage）。
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="secondary-button" onClick={loadLogs} type="button">
              刷新
            </button>
            <Link className="secondary-button" href="/">
              返回首页
            </Link>
          </div>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div className="tip-list" style={{ marginTop: 0 }}>
            <strong>总请求</strong>
            <p style={{ margin: '6px 0 0' }}>{summary.total}</p>
          </div>
          <div className="tip-list" style={{ marginTop: 0 }}>
            <strong>低置信度占比</strong>
            <p style={{ margin: '6px 0 0' }}>{summary.lowConfidenceRate}%</p>
          </div>
          <div className="tip-list" style={{ marginTop: 0 }}>
            <strong>平均耗时</strong>
            <p style={{ margin: '6px 0 0' }}>{summary.avgLatency}ms</p>
          </div>
        </div>

        <div style={{ marginTop: '18px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
