/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BpmnNodeType = 
  | 'startEvent' 
  | 'endEvent' 
  | 'userTask' 
  | 'serviceTask' 
  | 'dmnTask' 
  | 'exclusiveGateway' 
  | 'parallelGateway';

export interface BpmnNode {
  id: string;
  name: string;
  type: BpmnNodeType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  
  // Properties depending on task type
  assignee?: string;
  candidateGroups?: string;
  formId?: string; // Links to a FormSchema
  dmnId?: string;  // Links to a DmnTable
  serviceAction?: string; // Predefined simulated service tasks (e.g. 'sendEmail', 'calculatePayroll', 'logProcessInfo', 'verifyIdentity')
  serviceResultVar?: string; // Variable to store service task result
  
  // Gateway condition evaluation configuration
  gatewayDefaultFlowId?: string;
}

export interface BpmnEdge {
  id: string;
  name?: string;
  sourceRef: string;
  targetRef: string;
  conditionExpression?: string; // Condition evaluated for flow transitions (e.g., "approved === true" or "score >= 700")
}

export interface Process {
  id: string;
  name: string;
  description?: string;
  nodes: BpmnNode[];
  edges: BpmnEdge[];
  createdAt: string;
  updatedAt: string;
}

// DMN Decision Model classes
export interface DmnInput {
  id: string;
  label: string;
  name: string; // The variable name evaluated
  type: 'string' | 'number' | 'boolean';
}

export interface DmnOutput {
  id: string;
  label: string;
  name: string; // The variable name outputs
  type: 'string' | 'number' | 'boolean';
}

export interface DmnRule {
  id: string;
  /**
   * Conditions corresponding to the list of input columns.
   * Expressions can be e.g. ">= 500", "true", "\"Premium\"", "< 30", or "-" for "any".
   */
  inputConstraints: string[];
  /**
   * Outcomes corresponding to the list of output columns.
   * Simple values: e.g. "true", "4.5", "\"Approved\"", etc.
   */
  outputValues: string[];
  description?: string;
}

export interface DmnTable {
  id: string;
  name: string;
  inputs: DmnInput[];
  outputs: DmnOutput[];
  rules: DmnRule[];
  hitPolicy: 'unique' | 'first' | 'collect'; // 'unique': only 1 rule matches, 'first': first matching rule, 'collect': combine all results
  createdAt: string;
}

// User-Facing Dynamic Form Engine
export interface FormField {
  id: string;
  label: string;
  key: string; // Process variable bound to this field
  type: 'text' | 'number' | 'boolean' | 'date' | 'select';
  required: boolean;
  placeholder?: string;
  options?: string[]; // Used for select dropdowns representation
  defaultValue?: any;
}

export interface FormSchema {
  id: string;
  name: string;
  fields: FormField[];
  createdAt: string;
}

// Runtime Execution Tracker
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  nodeId: string;
  nodeName: string;
  nodeType: BpmnNodeType | 'sequenceFlow' | 'process';
  action: 'STARTED' | 'COMPLETED' | 'FAILED' | 'DECISION_EVALUATED' | 'PATH_TAKEN';
  details?: string;
  variablesSnap?: Record<string, any>;
}

export interface ProcessInstance {
  id: string;
  processId: string;
  processName: string;
  status: 'ACTIVE' | 'COMPLETED' | 'TERMINATED' | 'SUSPENDED';
  variables: Record<string, any>;
  activeNodeIds: string[]; // Current token positions (supports parallel execution)
  completedNodeIds: string[]; // History of visited nodes for highlight
  startTime: string;
  endTime?: string;
  auditLog: AuditLogEntry[];
}

export interface UserTaskInstance {
  id: string;
  instanceId: string; // Process instance link
  processId: string;
  processName: string;
  nodeId: string;
  taskName: string;
  assignee: string;
  status: 'PENDING' | 'COMPLETED';
  formId?: string; // Bound form identifier
  variables: Record<string, any>; // Read-only snapshot of current scope variables
  createdAt: string;
  completedAt?: string;
}
