import { VoiceConversionModel } from '@/lib/config'
import { formatSeconds } from '@/lib/utils'

export interface WorkflowResponse {
  event_id: string
  status: string
}

export interface WorkflowAdder {
  sourceUrl: string
  startTime: number
  endTime: number
  pitch: number
  voiceConversionModel: VoiceConversionModel
}

export function initWorkflow({
  sourceUrl,
  startTime,
  endTime,
  pitch,
  voiceConversionModel
}: WorkflowAdder) {
  const startIndex = formatSeconds(startTime, { includeHours: true })
  const endIndex = formatSeconds(endTime, { includeHours: true })

  const step3VcResult = `step_3__${voiceConversionModel}_key_${pitch}`

  const newWorkflow = [
    {
      relation_result_files: {},
      file_list: [
        {
          label: 'origin',
          path: sourceUrl
        }
      ],
      job_id: 'step_1',
      params: {
        file: ['origin'],
        output_file: {
          trim_cut_result: 'trim_cut_result.wav'
        },
        start_index: startIndex,
        end_index: endIndex,
        usage: 'trim_cut'
      },
      worker_name: 'transformer'
    },
    {
      relation_result_files: {
        trim_cut_result: 'step_1__trim_cut_result'
      },
      file_list: [],
      job_id: 'step_2',
      params: {
        file: 'trim_cut_result',
        is_overlapadd: true,
        original_sr: false,
        stem: ['vocals']
      },
      worker_name: 'svs'
    },
    {
      relation_result_files: {
        vocals: 'step_2__vocals'
      },
      file_list: [],
      job_id: 'step_3',
      params: {
        enable_pitch_correction: false,
        f0_predictor: 'rmvpe',
        file: 'vocals',
        mode: 'sing',
        speakers: [voiceConversionModel],
        speakers_pitch_adjustment: {
          [voiceConversionModel]: [pitch]
        }
      },
      worker_name: 'vc'
    },
    {
      relation_result_files: {
        vc_result: step3VcResult,
        accompaniment: 'step_2__accompaniment'
      },
      file_list: [],
      job_id: 'step_4',
      params: {
        file: ['vc_result', 'accompaniment'],
        usage: 'merge_audio_files',
        merge_option: 'stereo_audio',
        output_file: {
          merged_result: 'merged_result.wav'
        }
      },
      worker_name: 'transformer'
    },
    {
      relation_result_files: {
        vc_result: 'step_4__merged_result',
        orig_result: 'step_1__trim_cut_result'
      },
      file_list: [],
      job_id: 'step_5',
      params: {
        file: ['vc_result', 'orig_result'],
        usage: 'audio_normalize',
        target_lufs: -14,
        true_peak: -2,
        output_file: {
          normalized_vc: 'normalized_vc.flac',
          normalized_orig: 'normalized_orig.flac'
        }
      },
      worker_name: 'transformer'
    }
  ]

  return { jobs: newWorkflow }
}
