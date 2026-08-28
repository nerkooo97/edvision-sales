export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  nodesCount?: number;
  tags?: { id: string; name: string }[];
}

export type N8nExecutionStatus = 'success' | 'error' | 'running' | 'waiting' | 'canceled' | 'unknown';

export type N8nFlowType = 'outreach' | 'followup' | 'full' | 'tracking' | 'unknown';

export interface N8nExecution {
  id: string;
  finished: boolean;
  mode: 'manual' | 'trigger' | 'webhook' | 'evaluation' | string;
  retryOf?: string | null;
  retrySuccessId?: string | null;
  status: N8nExecutionStatus;
  startedAt: string;
  stoppedAt?: string | null;
  workflowId: string;
  workflowName?: string;
  durationMs?: number;
  flowType?: N8nFlowType;
  flowLabel?: string;
}

export interface N8nNodeExecutionSummary {
  nodeName: string;
  executionTime?: number;
  hasError: boolean;
  errorMessage?: string;
}

export interface N8nExecutionDetail extends N8nExecution {
  nodesRun: N8nNodeExecutionSummary[];
  error?: {
    message: string;
    description?: string;
    nodeName?: string;
    stack?: string;
  };
  rawData?: Record<string, unknown>;
}
