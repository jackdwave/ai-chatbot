import 'server-only'

import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  streamUI,
  createStreamableValue
} from 'ai/rsc'
import { createAzure } from '@ai-sdk/azure'
import { LanguageModel } from 'ai'

import {
  spinner,
  BotCard,
  BotMessage,
  SystemMessage,
  Stock,
  Purchase
} from '@/components/stocks'

import { z } from 'zod'
import { Events } from '@/components/stocks/events'
import { StocksSkeleton } from '@/components/stocks/stocks-skeleton'
import { Stocks } from '@/components/stocks/stocks'
import {
  runAsyncFnWithoutBlocking,
  sleep,
  nanoid,
  isObjectEmpty,
  convertNanoTimestampToMilliTimestamp,
  isTimestampDifferenceBeyondThreshold
} from '@/lib/utils'
import { SpinnerMessage, UserMessage } from '@/components/stocks/message'
import { Chat, Message } from '@/lib/types'
import { AZURE_DEPLOYMENT_NAME, AZURE_RESOURCE_NAME } from '@/lib/constant'

import {
  fetchYoutubeDuration,
  extractYouTubeVideoIdFromUrl,
  getYoutubeEmbedLink
} from '@/lib/youtube'

import ConversionPage from '@/components/ConversionPage'
import { fetchEvent } from '@/lib/apis/event'
import { JobFile, PartialEventResponse } from '@/lib/models/Event'
import { downloadFile } from '../apis/download'
import { ConversionUI } from '@/components/ConversionUI'
import { addWorkflow } from '../apis/workflow'
import { WorkflowAdder } from '../models/Workflow'

import FetchConversionResult from '@/components/ConversionUI/fetch-conversion-result'
import { CaptionerUI } from '@/components/CaptionerUI'
import { addCaptionerWorker } from '../apis/worker'
import { CaptionerWorkerAdder } from '../models/Worker'
import { DownloadResponse } from '../models/Download'
import Button from '@/components/button'

const azureApiKey = process.env['AZURE_OPENAI_API_KEY']

const azure = createAzure({
  resourceName: AZURE_RESOURCE_NAME, // Azure resource name
  apiKey: azureApiKey
})

const renderErrorUI = (id: string) => {
  return (
    <BotCard>
      <div>Failed to fetch conversion event with id: {id}</div>
    </BotCard>
  )
}

interface ProcessingUI {
  message?: string
  showAvatar?: boolean
}

const ProcessingUI = ({ message, showAvatar = true }: ProcessingUI) => {
  return (
    <BotCard showAvatar={showAvatar}>
      <div className="inline-flex items-start gap-1 md:items-center mb-2">
        {spinner}
        <p>{message ?? 'Processing....'}</p>
      </div>
    </BotCard>
  )
}

async function startConversion(workflowAdder: WorkflowAdder) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  const converting = createStreamableUI(<ProcessingUI showAvatar={false} />)

  const { event_id } = await addWorkflow(workflowAdder)

  const systemMessage = createStreamableUI(null)

  runAsyncFnWithoutBlocking(async () => {
    await sleep(3000)

    converting.done(
      <FetchConversionResult
        conversionId={event_id}
        inputMessage={`I want to get conversion result with conversion id ${event_id}.`}
      >
        <p className="mb-2">
          You have created voice conversion workflow with id: {event_id},
          youtube video url: {workflowAdder.sourceUrl} using ai voice model:{' '}
          {workflowAdder.voiceConversionModel}
        </p>
      </FetchConversionResult>
    )

    systemMessage.done(
      <SystemMessage>
        You have created voice conversion workflow with id: {event_id}, youtube
        video url: {workflowAdder.sourceUrl} using ai voice model:{' '}
        {workflowAdder.voiceConversionModel}
      </SystemMessage>
    )

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'system',
          content: `[User has successfully created voice conversion workflow with id: ${event_id}, youtube video url: ${workflowAdder.sourceUrl} using ai voice model: ${workflowAdder.voiceConversionModel}]`
        }
      ]
    })
  })

  return {
    convertingUI: converting.value,
    newMessage: {
      id: nanoid(),
      display: systemMessage.value
    }
  }
}

async function startCaptioner(captionerWorkerAdder: CaptionerWorkerAdder) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  const converting = createStreamableUI(<ProcessingUI showAvatar={false} />)

  let eventId = ''

  const systemMessage = createStreamableUI(null)

  runAsyncFnWithoutBlocking(async () => {
    await sleep(3000)

    try {
      const { event_id } = await addCaptionerWorker(captionerWorkerAdder)
      eventId = event_id
    } catch (e) {
      console.log('🚀 ~ startCaptioner ~ e:', e)
    }

    converting.done(
      <>
        <FetchConversionResult
          conversionId={eventId}
          inputMessage={`I want to get captioner worker event result with event id ${eventId}.`}
        >
          <p className="mb-2">
            You have created voice captioner worker event with id: {eventId},
          </p>
        </FetchConversionResult>
      </>
    )

    systemMessage.done(
      <SystemMessage>
        You have created captioner workflow with id: {eventId}, youtube video
        url: {captionerWorkerAdder.filePath}
      </SystemMessage>
    )

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'system',
          content: `[User has successfully created captioner workflow with id: ${eventId}, youtube video url: ${captionerWorkerAdder.filePath}]`
        }
      ]
    })
  })

  return {
    convertingUI: converting.value,
    newMessage: {
      id: nanoid(),
      display: systemMessage.value
    }
  }
}

async function submitUserMessage(content: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
  let textNode: undefined | React.ReactNode

  const result = await streamUI({
    model: azure(AZURE_DEPLOYMENT_NAME) as LanguageModel,
    initial: <SpinnerMessage />,
    system: `\
    You are an AI music conversation bot and your main mission is to help users do different processing tasks using youtube videos as input.
    By this I mean, users can provide a youtube link and then our app will process this audio accordingly.
    
    If the user requests to do voice conversion, call \`show_voice_conversion_ui\` to show the VoiceConversion UI. This UI component allows users to convert A singer voice to another B singer voice by selecting a pre-trained B singer voice AI model.
    If the user requests to do get subtile captions for a youtube video, call \`show_captioner_worker_ui\` to show the CaptionerWorker UI. This UI component allows users to select which languages to detect from the youtube video, and then output caption subtitle in srt file format.
    
    If the user requests getting voice conversion event result, call \`get_conversion_event\` to get conversion event result.
    If the user requests getting captioner worker event, call \`get_captioner_worker_event\` to get captioner worker event result.

    If the user requests getting youtube video length, call \`get_youtube_length\` to get youtube video length in seconds.

    If the user wants to complete another impossible task, respond that you are a demo and cannot do that.
    `,
    messages: [
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: message.name
      }))
    ],
    text: ({ content, done, delta }) => {
      if (!textStream) {
        textStream = createStreamableValue('')
        textNode = <BotMessage content={textStream.value} />
      }

      if (done) {
        textStream.done()
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: 'assistant',
              content
            }
          ]
        })
      } else {
        textStream.update(delta)
      }

      return textNode
    },
    tools: {
      getYoutubeLength: {
        description: 'Fetch youtube video length in seconds.',
        parameters: z.object({
          youtubeUrl: z.string().describe('The youtube video url'),
          durationInSeconds: z
            .number()
            .describe('The youtube video duration in seconds')
        }),
        generate: async function* ({ youtubeUrl }) {
          yield (
            <BotCard>
              <StocksSkeleton />
            </BotCard>
          )

          await sleep(1000)

          const videoId = extractYouTubeVideoIdFromUrl(youtubeUrl)
          console.log('🚀 ~ submitUserMessage ~ videoId:', videoId)

          if (!youtubeUrl || !videoId) {
            return (
              <BotCard>
                <div>Invalid youtube url</div>
              </BotCard>
            )
          }

          const { durationInSeconds: duration } =
            await fetchYoutubeDuration(videoId)
          console.log('🚀 ~ submitUserMessage ~ duration:', duration)

          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'getYoutubeLength',
                    toolCallId,
                    args: { duration }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'getYoutubeLength',
                    toolCallId,
                    result: {
                      durationInSeconds: duration
                    }
                  }
                ]
              }
            ]
          })

          const youtubeEmbedUrl = getYoutubeEmbedLink(youtubeUrl)

          return (
            <BotCard>
              <div className="mb-4 aspect-[1920/1080] w-full max-w-[850px] border-2">
                <iframe
                  src={youtubeEmbedUrl}
                  // eslint-disable-next-line tailwindcss/enforces-shorthand
                  className="h-full w-full border-0"
                  allowFullScreen
                />
              </div>
              <div className="border-2 p-4 rounded-lg">
                youtube duration: {duration}
              </div>
            </BotCard>
          )
        }
      },
      getConversionEvent: {
        description:
          'Fetch voice conversion result by conversionId and show ConversionPage UI component',
        parameters: z.object({
          conversionId: z.string().describe('The voice conversion id')
        }),
        generate: async function* ({ conversionId }) {
          yield <ProcessingUI />

          console.log('🚀 ~ submitUserMessage ~ conversionId:', conversionId)

          await sleep(1000)

          let eventResponse: PartialEventResponse
          let isEmptyResponse = true
          let isSucceeded = false
          let attemptsCount = 0

          while (isEmptyResponse && attemptsCount < 8) {
            try {
              eventResponse = await fetchEvent({ eventId: conversionId })
              console.log(
                '🚀 ~ timer=setTimeout ~ eventResponse:',
                eventResponse
              )
              isEmptyResponse = isObjectEmpty(eventResponse)
            } catch (e) {
              return renderErrorUI(conversionId)
            }

            await sleep(5000)

            yield (
              <ProcessingUI message="It may take more than one minute to complete" />
            )
          }

          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'getConversionEvent',
                    toolCallId,
                    args: { conversionId }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'getConversionEvent',
                    toolCallId,
                    result: {
                      conversionId
                    }
                  }
                ]
              }
            ]
          })

          while (!isSucceeded) {
            try {
              eventResponse = await fetchEvent({ eventId: conversionId })
              console.log(
                '🚀 ~ timer=setTimeout ~ eventResponse:',
                eventResponse
              )

              isEmptyResponse = isObjectEmpty(eventResponse)

              const totalJobCounts = eventResponse?.jobs?.length || 0
              const finishedStepCounts = Object.keys(
                eventResponse?.results || {}
              ).length

              const hasFinishedProcessing =
                !isEmptyResponse && finishedStepCounts === totalJobCounts

              const hasFailed =
                !isEmptyResponse &&
                eventResponse?.states?.some(
                  state => !isObjectEmpty(state?.exception || {})
                )

              const timestampInMilliseconds =
                convertNanoTimestampToMilliTimestamp(
                  eventResponse.start_time || 0
                )

              const isWorkflowProbablyFailed =
                !isEmptyResponse &&
                !hasFinishedProcessing &&
                isTimestampDifferenceBeyondThreshold(
                  timestampInMilliseconds || 0,
                  Date.now()
                )

              if (hasFailed || isWorkflowProbablyFailed) {
                return renderErrorUI(conversionId)
              }

              isSucceeded =
                hasFinishedProcessing &&
                !!eventResponse?.states?.every(state =>
                  isObjectEmpty(state?.exception || {})
                )

              if (isSucceeded) {
                const sourceAudioLink =
                  eventResponse?.results?.step_5?.files?.[1]?.path ||
                  eventResponse?.results?.step_1?.files?.[0]?.path
                // TODO: will break if there is more steps
                const convertedAudioLink =
                  eventResponse?.results?.step_5?.files?.[0]?.path ||
                  eventResponse?.results?.step_4?.files?.[0]?.path

                const modelLabel =
                  eventResponse?.results?.step_3?.files?.[0]?.label?.split(
                    '_'
                  )[0] || ''

                const originUrl =
                  eventResponse?.jobs?.[0]?.files?.[0]?.path || ''

                try {
                  const [sourceAudioUrl, convertedAudioUrl] = await Promise.all(
                    [
                      downloadFile({ file_path: sourceAudioLink || '' }),
                      downloadFile({ file_path: convertedAudioLink || '' })
                    ]
                  )

                  return (
                    <BotCard>
                      <ConversionPage
                        conversionId={conversionId}
                        originUrl={originUrl}
                        modelLabel={modelLabel}
                        sourceAudioLink={sourceAudioUrl.download_url}
                        convertedAudioLink={convertedAudioUrl.download_url}
                      />
                    </BotCard>
                  )
                } catch (error) {
                  console.error('Error downloading audio files:', error)
                }
              } else {
                await sleep(5000)

                yield (
                  <BotCard>
                    <div>conversion is processing, please try later</div>
                  </BotCard>
                )
              }

              if (isEmptyResponse) return renderErrorUI(conversionId)
            } catch (e) {
              return renderErrorUI(conversionId)
            }
          }

          return (
            <BotCard>
              <div>conversion id: {conversionId}</div>
            </BotCard>
          )
        }
      },
      getCaptionerWorkerEvent: {
        description: 'Fetch captioner worker event result by eventId',
        parameters: z.object({
          eventId: z.string().describe('The voice conversion id')
        }),
        generate: async function* ({ eventId }) {
          yield <ProcessingUI />

          console.log('🚀 ~ submitUserMessage ~ conversionId:', eventId)

          await sleep(1000)

          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'getCaptionerWorkerEvent',
                    toolCallId,
                    args: { eventId }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'getCaptionerWorkerEvent',
                    toolCallId,
                    result: {
                      eventId
                    }
                  }
                ]
              }
            ]
          })

          let ready = false
          let attemptsCount = 0
          let youtubeUrl = ''
          const downloadUrls = []

          while (!ready && attemptsCount < 8) {
            try {
              const data = (await fetchEvent({ eventId })) as any

              if (data.results.captioner_job) {
                ready = true

                const files: JobFile[] = data.results.captioner_job.files

                for (const file of files) {
                  const filePath = file.path
                  const res = await downloadFile({ file_path: filePath })

                  downloadUrls.push({
                    label: file.label,
                    downloadUrl: res.download_url
                  })
                }
              }

              if (data.jobs) {
                youtubeUrl = data.jobs[0].files[0].path
              }
            } catch (e) {
              console.log('🚀 ~ runAsyncFnWithoutBlocking ~ e:', e)
              return renderErrorUI(eventId)
            }

            await sleep(5000)

            yield (
              <ProcessingUI message="It may take more than one minute to complete" />
            )
          }

          const youtubeEmbedUrl = getYoutubeEmbedLink(youtubeUrl)

          return (
            <BotCard>
              {youtubeEmbedUrl && (
                <div className="mb-4 aspect-[1920/1080] w-full max-w-[850px] border-2">
                  <iframe
                    src={youtubeEmbedUrl}
                    // eslint-disable-next-line tailwindcss/enforces-shorthand
                    className="h-full w-full border-0"
                    allowFullScreen
                  />
                </div>
              )}

              {downloadUrls.map(({ label, downloadUrl }) => (
                <div key={label}>
                  <p>{label}</p>
                  <Button>
                    <a href={downloadUrl}> download</a>
                  </Button>
                </div>
              ))}
            </BotCard>
          )
        }
      },
      showVoiceConversionUI: {
        description:
          'Show voice conversion ui. Use this if the user wants to do voice conversion.',
        parameters: z.object({
          aiVoiceModel: z
            .string()
            .describe('The ai voice model. e.g. BrunoMars, LadyGaga'),
          youtubeUrl: z.string().describe('The youtube video url')
        }),
        generate: async function* ({ aiVoiceModel, youtubeUrl }) {
          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'showVoiceConversionUI',
                    toolCallId,
                    args: { aiVoiceModel, youtubeUrl }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'showVoiceConversionUI',
                    toolCallId,
                    result: {
                      aiVoiceModel,
                      youtubeUrl
                    }
                  }
                ]
              }
            ]
          })

          return (
            <BotCard>
              <ConversionUI
                props={{
                  status: 'requires_action'
                }}
              />
            </BotCard>
          )
        }
      },
      showCaptionerWorkerUI: {
        description:
          'Show captioner worker ui. Use this if the user wants to add captioner worker.',
        parameters: z.object({
          youtubeUrl: z.string().describe('The youtube video url')
        }),
        generate: async function* ({ youtubeUrl }) {
          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'showCaptionerWorkerUI',
                    toolCallId,
                    args: { youtubeUrl }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'showCaptionerWorkerUI',
                    toolCallId,
                    result: {
                      youtubeUrl
                    }
                  }
                ]
              }
            ]
          })

          return (
            <BotCard>
              <CaptionerUI
                props={{
                  status: 'requires_action'
                }}
              />
            </BotCard>
          )
        }
      }
    }
  })

  return {
    id: nanoid(),
    display: result.value
  }
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
    startConversion,
    startCaptioner
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] }
})

export const getUIStateFromAIState = (aiState: Chat) => {
  return aiState.messages
    .filter(message => message.role !== 'system')
    .map((message, index) => ({
      id: `${aiState.chatId}-${index}`,
      display:
        message.role === 'tool' ? (
          message.content.map(tool => {
            return tool.toolName === 'listStocks' ? (
              <BotCard>
                {/* TODO: Infer types based on the tool result*/}
                {/* @ts-expect-error */}
                <Stocks props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showStockPrice' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Stock props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showStockPurchase' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Purchase props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'getEvents' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Events props={tool.result} />
              </BotCard>
            ) : null
          })
        ) : message.role === 'user' ? (
          <UserMessage>{message.content as string}</UserMessage>
        ) : message.role === 'assistant' &&
          typeof message.content === 'string' ? (
          <BotMessage content={message.content} />
        ) : null
    }))
}
