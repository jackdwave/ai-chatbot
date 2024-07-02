import {
  WorkflowAdder,
  WorkflowResponse,
  initWorkflow
} from '@/lib/models/Workflow'

import { makeRequest, endpoint } from '../base'

export async function addWorkflow(params: WorkflowAdder) {
  const newWorker = initWorkflow(params)

  return await makeRequest<WorkflowResponse>({
    method: 'POST',
    url: `${endpoint}/workflow`,

    body: newWorker
  })
}
