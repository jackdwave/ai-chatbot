'use client'

import { useId, useState } from 'react'
import { useActions, useAIState, useUIState } from 'ai/rsc'
import { VoiceConversionModel, voiceConversionModels } from '@/lib/config'

import type { AI } from '@/lib/chat/actions'
import { WorkflowAdder } from '@/lib/models/Workflow'
import Button from '../button'

type ConversionPhase = 'select_ai_model' | 'insert_youtube_url' | 'confirm'

const initWorkflowAdder: WorkflowAdder = {
  pitch: 0,
  startTime: 0,
  endTime: 60,
  sourceUrl: '',
  voiceConversionModel: voiceConversionModels[0]
}

interface ConversionUIProps {
  status: 'requires_action' | 'processing' | 'completed' | 'failed'
}

export function ConversionUI({
  props: { status }
}: {
  props: ConversionUIProps
}) {
  const [conversionPhase, setConversionPhase] =
    useState<ConversionPhase>('select_ai_model')

  const [youtubeUrl, setYoutubeUrl] = useState('')
  console.log('🚀 ~ youtubeUrl:', youtubeUrl)
  const [selectedAIModel, setSelectedAIModel] = useState<VoiceConversionModel>(
    voiceConversionModels[0]
  )

  const [convertingUI, setConvertingUI] = useState<null | React.ReactNode>(null)
  console.log('🚀 ~ convertingUI:', convertingUI)
  const [aiState, setAIState] = useAIState<typeof AI>()
  const [, setMessages] = useUIState<typeof AI>()
  const { startConversion } = useActions()

  // Unique identifier for this UI component.
  const id = useId()

  function render() {
    if (conversionPhase === 'select_ai_model') {
      return (
        <section className="flex flex-col gap-2">
          <p className="text-white">Select a voice conversion model</p>
          <select
            className="p-2 border-2 border-green-400 rounded-lg"
            onChange={e =>
              setSelectedAIModel(e.target.value as VoiceConversionModel)
            }
          >
            {voiceConversionModels.map(vcModel => (
              <option key={vcModel} value={vcModel}>
                {vcModel}
              </option>
            ))}
          </select>

          <Button onClick={() => setConversionPhase('insert_youtube_url')}>
            Confirm
          </Button>
        </section>
      )
    }

    if (conversionPhase === 'insert_youtube_url') {
      return (
        <section className="flex flex-col gap-2">
          <p className="text-white">Insert youtube url</p>
          <input
            className="p-2 border-2 border-green-400 rounded-lg"
            onChange={e => setYoutubeUrl(e.target.value)}
          />

          <Button onClick={() => setConversionPhase('confirm')}>Confirm</Button>
        </section>
      )
    }

    return (
      <div className="flex flex-col gap-4 text-white">
        <p>Selected ai model: {selectedAIModel}</p>

        <p>
          Youtube url model:{' '}
          <a href={youtubeUrl} target="_blank" className="underline">
            {youtubeUrl}
          </a>
        </p>

        <Button
          onClick={async () => {
            const updatedWorflowAdder: WorkflowAdder = {
              ...initWorkflowAdder,
              sourceUrl: youtubeUrl,
              voiceConversionModel: selectedAIModel
            }

            const response = await startConversion(updatedWorflowAdder)
            setConvertingUI(response.convertingUI)

            // Insert a new system message to the UI.
            setMessages((currentMessages: any) => [
              ...currentMessages,
              response.newMessage
            ])
          }}
        >
          Convert
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 text-green-400 border rounded-xl bg-zinc-950  w-full">
      <h1 className="text-3xl font-bold mb-3">Create voice conversion</h1>

      {convertingUI && <div className="mt-4 text-zinc-200">{convertingUI}</div>}

      {!convertingUI && render()}
    </div>
  )
}
