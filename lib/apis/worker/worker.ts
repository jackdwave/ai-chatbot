import { WorkflowResponse } from '@/lib/models/Workflow'
import { CaptionerWorkerAdder, initCaptionerWorker } from '@/lib/models/Worker'

import { makeRequest, endpoint } from '../base'

export async function addCaptionerWorker(params: CaptionerWorkerAdder) {
  const newWorker = initCaptionerWorker(params)
  console.log('🚀 ~ addCaptionerWorker ~ newWorker:', newWorker)

  return await makeRequest<WorkflowResponse>({
    method: 'POST',
    url: `${endpoint}/worker/captioner`,

    body: newWorker
  })
}
