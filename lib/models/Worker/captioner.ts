export interface CaptionerWorker {
  file_list: Filelist[]
  params: Params
}

interface Params {
  auto_detect_languages: string[]
  file: string
  phrases_list: string
  speech_translate_target_languages: string[]
}

interface Filelist {
  label: string
  path: string
}

export interface CaptionerWorkerAdder {
  filePath: string
  autoDetectLanguages: string[]
  speechTranslateTargetLanguages: string[]
}

export function initCaptionerWorker({
  filePath,
  autoDetectLanguages,
  speechTranslateTargetLanguages
}: CaptionerWorkerAdder) {
  const newCaptionerWorker: CaptionerWorker = {
    file_list: [
      {
        label: 'speech',
        path: filePath
      }
    ],
    params: {
      auto_detect_languages: autoDetectLanguages,
      file: 'speech',
      phrases_list: '',
      speech_translate_target_languages: speechTranslateTargetLanguages
    }
  }

  return newCaptionerWorker
}
