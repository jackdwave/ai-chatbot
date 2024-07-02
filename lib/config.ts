export const voiceConversionModels = [
  '伍佰',
  '吳青峰',
  '張惠妹',
  '王菲',
  '米津玄師',
  'Beatles',
  'BonJovi',
  'LadyGaga',
  'WhitneyHouston',
  'Yoasobi',
  'gura'
] as const

export type VoiceConversionModel = (typeof voiceConversionModels)[number]

export type Singer = {
  label: string
  model: VoiceConversionModel
}

export type SingerCategory =
  | 'rock_star'
  | 'taiwan_hit_singer'
  | 'asian_pop_singer'

const vcMap: Record<VoiceConversionModel, string> = {
  Beatles: 'beetles',
  BonJovi: 'Don Covi',
  LadyGaga: 'Gen Kaka',
  WhitneyHouston: 'Wheny Houstion',
  伍佰: '五百萬',
  張惠妹: '章蕙媚',
  吳青峰: '無清風',
  Yoasobi: 'Yoarsobad',
  王菲: '王飛',
  米津玄師: '高筋律師',
  gura: 'Kula'
}

export function voiceConversionModelToLabel(vcModel: VoiceConversionModel) {
  return vcMap[vcModel] || vcModel
}

export const maxConversionsCount = 5
