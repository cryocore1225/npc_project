export type Lang = 'zh' | 'ko'

export type LabelKey =
  | 'General waste'
  | 'Food waste'
  | 'Recyclables'
  | 'Hazardous waste'
  | 'Bulk waste'

export type ObjectClassKey =
  | 'can'
  | 'bottle'
  | 'food'
  | 'battery'
  | 'paper'
  | 'plastic'
  | 'furniture'
  | 'background'

export const LANG_STORAGE_KEY = 'npc_lang'
export const LOG_STORAGE_KEY = 'npc_inference_logs_v1'
