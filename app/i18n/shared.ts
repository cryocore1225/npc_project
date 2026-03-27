export type Lang = 'zh' | 'ko'

export type LabelKey =
  | 'General waste'
  | 'Food waste'
  | 'Recyclables'
  | 'Hazardous waste'
  | 'Bulk waste'

export type ObjectClassKey =
  | 'battery'
  | 'biological'
  | 'brown-glass'
  | 'cardboard'
  | 'clothes'
  | 'green-glass'
  | 'metal'
  | 'paper'
  | 'plastic'
  | 'shoes'
  | 'trash'
  | 'white-glass'

export const LANG_STORAGE_KEY = 'npc_lang'
export const LOG_STORAGE_KEY = 'npc_inference_logs_v1'
