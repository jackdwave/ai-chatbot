'use client'

import { useId, useState } from 'react'
import { useActions, useUIState } from 'ai/rsc'

import type { AI } from '@/lib/chat/actions'
import { CaptionerWorkerAdder } from '@/lib/models/Worker'

import Button from '../button'

// Force the page to be dynamic and allow streaming responses up to 60 seconds
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const supportedDetectLanguages = [
  { key: 'zh-CN', label: 'chinese' },
  { key: 'en-US', label: 'english' }
]

const supportedSpeechTranslateTargetLanguages = [
  { key: 'zh-Hant', label: 'chinese' },
  { key: 'en', label: 'english' },
  { key: 'ja', label: 'japanese' }
]

type ConversionPhase =
  | 'insert_youtube_url'
  | 'auto_detect_languages'
  | 'speech_translate_target_languages'
  | 'confirm'

interface CaptionerUIProps {
  status: 'requires_action' | 'processing' | 'completed' | 'failed'
}

export function CaptionerUI({
  props: { status }
}: {
  props: CaptionerUIProps
}) {
  const [conversionPhase, setConversionPhase] =
    useState<ConversionPhase>('insert_youtube_url')

  const [youtubeUrl, setYoutubeUrl] = useState(
    'https://www.youtube.com/watch?v=BD6xQsk0ewQ'
  )
  const [detectLanguages, setDetectLanguages] = useState(
    supportedDetectLanguages
  )
  const [translateTargetLanguages, setTranslateTargetLanguages] = useState(
    supportedSpeechTranslateTargetLanguages
  )

  const [convertingUI, setConvertingUI] = useState<null | React.ReactNode>(null)
  console.log('🚀 ~ convertingUI:', convertingUI)
  const [, setMessages] = useUIState<typeof AI>()
  const { startCaptioner } = useActions()

  // Unique identifier for this UI component.
  const id = useId()

  function render() {
    if (conversionPhase === 'insert_youtube_url') {
      return (
        <section className="flex flex-col gap-2">
          <p className="text-white">Insert youtube url</p>
          <input
            value={youtubeUrl}
            className="p-2 border-2 border-green-400 rounded-lg"
            onChange={e => setYoutubeUrl(e.target.value)}
          />

          <Button onClick={() => setConversionPhase('auto_detect_languages')}>
            Next
          </Button>
        </section>
      )
    }

    if (conversionPhase === 'auto_detect_languages') {
      return (
        <section className="flex flex-col gap-2">
          <p className="text-white">Auto Detect languages</p>

          {supportedDetectLanguages.map(({ key, label }) => {
            const isSelected = detectLanguages
              .map(({ key }) => key)
              .includes(key)

            return (
              <div key={key} className="flex gap-4">
                <input
                  type="checkbox"
                  name={key}
                  value={key}
                  id={key}
                  checked={isSelected}
                  onChange={() =>
                    setDetectLanguages(prev =>
                      isSelected
                        ? prev.filter(val => val.key !== key)
                        : [...prev, { key, label }]
                    )
                  }
                />

                <label htmlFor={key}>{label}</label>
              </div>
            )
          })}

          <Button onClick={() => setConversionPhase('insert_youtube_url')}>
            Back
          </Button>

          <Button
            onClick={() =>
              setConversionPhase('speech_translate_target_languages')
            }
          >
            Next
          </Button>
        </section>
      )
    }

    if (conversionPhase === 'speech_translate_target_languages') {
      return (
        <section className="flex flex-col gap-2">
          <p className="text-white">Speech translate target languages</p>

          {supportedSpeechTranslateTargetLanguages.map(({ key, label }) => {
            const isSelected = translateTargetLanguages
              .map(({ key }) => key)
              .includes(key)

            return (
              <div key={key} className="flex gap-4">
                <input
                  type="checkbox"
                  name={key}
                  value={key}
                  id={key}
                  checked={isSelected}
                  onChange={() =>
                    setTranslateTargetLanguages(prev =>
                      isSelected
                        ? prev.filter(val => val.key !== key)
                        : [...prev, { key, label }]
                    )
                  }
                />

                <label htmlFor={key}>{label}</label>
              </div>
            )
          })}

          <Button onClick={() => setConversionPhase('auto_detect_languages')}>
            Back
          </Button>

          <Button onClick={() => setConversionPhase('confirm')}>Next</Button>
        </section>
      )
    }

    return (
      <div className="flex flex-col gap-4 text-white">
        <p>
          Youtube url:{' '}
          <a href={youtubeUrl} target="_blank" className="underline">
            {youtubeUrl}
          </a>
        </p>

        <div>
          <p>
            Auto detect languages:{' '}
            {detectLanguages.map(({ label }) => label).join(', ')}
          </p>
        </div>

        <div>
          <p>
            Speech translate target languages:{' '}
            {translateTargetLanguages.map(({ label }) => label).join(', ')}
          </p>
        </div>

        <Button
          onClick={async () => {
            const autoDetectLanguages = detectLanguages.map(({ key }) => key)
            const speechTranslateTargetLanguages = translateTargetLanguages.map(
              ({ key }) => key
            )

            const captionerWorkerAddder: CaptionerWorkerAdder = {
              filePath: youtubeUrl,
              autoDetectLanguages,
              speechTranslateTargetLanguages
            }
            console.log(
              '🚀 ~ onClick={ ~ captionerWorkerAddder:',
              captionerWorkerAddder
            )

            const response = await startCaptioner(captionerWorkerAddder)
            setConvertingUI(response.convertingUI)

            // Insert a new system message to the UI.
            setMessages((currentMessages: any) => [
              ...currentMessages,
              response.newMessage
            ])
          }}
        >
          Confirm
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 text-green-400 border rounded-xl bg-zinc-950  w-full">
      <h1 className="text-3xl font-bold mb-3">Create captioner worker</h1>

      {convertingUI && <div className="mt-4 text-zinc-200">{convertingUI}</div>}

      {!convertingUI && render()}
    </div>
  )
}
