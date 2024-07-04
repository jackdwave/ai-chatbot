'use client'

import { useActions, useUIState } from 'ai/rsc'

import type { AI } from '@/lib/chat/actions'
import { nanoid } from '@/lib/utils'

import { UserMessage } from '../stocks/message'
import Button from '../button'

interface FetchConversionResultProps {
  sourceUrl: string
  voiceConversionModel: string
  conversionId: string
}

export default function FetchConversionResult({
  conversionId,
  sourceUrl,
  voiceConversionModel
}: FetchConversionResultProps) {
  const [, setMessages] = useUIState<typeof AI>()
  const { submitUserMessage } = useActions()

  const inputMessage = `I want to get conversion result with conversion id ${conversionId}.`

  return (
    <div>
      <p className="mb-2">
        You have created voice conversion workflow with id: {conversionId},
        youtube video url: {sourceUrl} using ai voice model:{' '}
        {voiceConversionModel}
      </p>

      <Button
        onClick={async () => {
          console.log(`voice conversion id: ${conversionId}`)

          setMessages(currentMessages => [
            ...currentMessages,
            {
              id: nanoid(),
              display: <UserMessage>{inputMessage}</UserMessage>
            }
          ])

          const responseMessage = await submitUserMessage(inputMessage)

          setMessages(currentMessages => [...currentMessages, responseMessage])
        }}
      >
        Get voice conversion result
      </Button>
    </div>
  )
}
