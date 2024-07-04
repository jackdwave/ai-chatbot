'use client'

import dynamic from 'next/dynamic'

export const CaptionerUI = dynamic(
  () => import('./captioner-ui').then(mod => mod.CaptionerUI),
  {
    ssr: false,
    loading: () => (
      <div className="h-[375px] rounded-xl border bg-zinc-950 p-4 text-green-400 sm:h-[314px]" />
    )
  }
)
