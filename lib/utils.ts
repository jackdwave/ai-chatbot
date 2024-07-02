import { clsx, type ClassValue } from 'clsx'
import { customAlphabet } from 'nanoid'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const nanoid = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  7
) // 7-character random string

export async function fetcher<JSON = any>(
  input: RequestInfo,
  init?: RequestInit
): Promise<JSON> {
  const res = await fetch(input, init)

  if (!res.ok) {
    const json = await res.json()
    if (json.error) {
      const error = new Error(json.error) as Error & {
        status: number
      }
      error.status = res.status
      throw error
    } else {
      throw new Error('An unexpected error occurred')
    }
  }

  return res.json()
}

export function formatDate(input: string | number | Date): string {
  const date = new Date(input)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

export const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value)

export const runAsyncFnWithoutBlocking = (
  fn: (...args: any) => Promise<any>
) => {
  fn()
}

export const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms))

export const getStringFromBuffer = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

export enum ResultCode {
  InvalidCredentials = 'INVALID_CREDENTIALS',
  InvalidSubmission = 'INVALID_SUBMISSION',
  UserAlreadyExists = 'USER_ALREADY_EXISTS',
  UnknownError = 'UNKNOWN_ERROR',
  UserCreated = 'USER_CREATED',
  UserLoggedIn = 'USER_LOGGED_IN'
}

export const getMessageFromCode = (resultCode: string) => {
  switch (resultCode) {
    case ResultCode.InvalidCredentials:
      return 'Invalid credentials!'
    case ResultCode.InvalidSubmission:
      return 'Invalid submission, please try again!'
    case ResultCode.UserAlreadyExists:
      return 'User already exists, please log in!'
    case ResultCode.UserCreated:
      return 'User created, welcome!'
    case ResultCode.UnknownError:
      return 'Something went wrong, please try again!'
    case ResultCode.UserLoggedIn:
      return 'Logged in!'
  }
}

export const isObjectEmpty = (value: Object) => JSON.stringify(value) === '{}'

interface FormatSecondsConfig {
  includeHours?: boolean
}

export function formatSeconds(
  s: number,
  { includeHours }: FormatSecondsConfig = {}
): string {
  const dateObj = new Date(s * 1000)

  const hours = dateObj.getUTCHours()
  const minutes = dateObj.getUTCMinutes()
  const seconds = dateObj.getSeconds()

  const hourString = hours.toString().padStart(2, '0')
  const timeString =
    minutes.toString().padStart(2, '0') +
    ':' +
    seconds.toString().padStart(2, '0')

  const result = includeHours ? `${hourString}:${timeString}` : timeString

  return result
}

export function convertNanoTimestampToMilliTimestamp(
  nanoTimestamp: number
): number {
  const millisecondsTimestamp = nanoTimestamp / 1000000 // Convert nanoseconds to milliseconds

  return millisecondsTimestamp
}

interface TimeStampDifferenceConfig {
  thresholdInMinutes?: number
}

export function isTimestampDifferenceBeyondThreshold(
  timestamp1: number,
  timestamp2: number,
  { thresholdInMinutes }: TimeStampDifferenceConfig = {}
) {
  const timeoutInMinutes =
    thresholdInMinutes || Number(process.env.TIMEOUT_IN_MINUTES || 5)

  const timeoutInMilliseconds = timeoutInMinutes * 60 * 1000

  // Calculate the absolute difference between the two timestamps
  const timeDifference = Math.abs(timestamp1 - timestamp2)

  // Check if the time difference is greater than one hour
  return timeDifference > timeoutInMilliseconds
}
