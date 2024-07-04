'use client'

import { useActions, useUIState } from 'ai/rsc'

import type { AI } from '@/lib/chat/actions'
import { nanoid } from '@/lib/utils'

import { UserMessage } from '../stocks/message'
import Button from '../button'

interface FetchConversionResultProps {
  conversionId: string
  children: React.ReactNode
  inputMessage: string
}

export default function FetchConversionResult({
  conversionId,
  children,
  inputMessage
}: FetchConversionResultProps) {
  const [, setMessages] = useUIState<typeof AI>()
  const { submitUserMessage } = useActions()

  return (
    <div>
      {children}

      <Button
        onClick={async () => {
          console.log(`conversion id: ${conversionId}`)

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
        Get conversion result
      </Button>
    </div>
  )
}
