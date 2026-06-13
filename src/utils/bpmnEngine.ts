/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Process, BpmnNode, BpmnEdge, DmnTable, ProcessInstance, AuditLogEntry, UserTaskInstance, FormSchema } from '../types';

/**
 * Safely parse and evaluate numeric or string conditions in DMN columns.
 * Supports: "> 50000", "<= 300", "\"REJECTED\"", "true", "-", "700"
 */
export function evaluateConditionValue(cellConstraint: string, value: any): boolean {
  const normConstraint = cellConstraint.trim();
  if (normConstraint === '-' || normConstraint === '') {
    return true; // Catch-all / matching anything
  }

  // Handle boolean value checks
  if (normConstraint === 'true') return value === true || value === 'true';
  if (normConstraint === 'false') return value === false || value === 'false';

  // Handle String literals wrapped in quotes
  if (normConstraint.startsWith('"') && normConstraint.endsWith('"')) {
    const cleanStr = normConstraint.slice(1, -1);
    return String(value).toLowerCase().trim() === cleanStr.toLowerCase().trim();
  }
  if (normConstraint.startsWith("'") && normConstraint.endsWith("'")) {
    const cleanStr = normConstraint.slice(1, -1);
    return String(value).toLowerCase().trim() === cleanStr.toLowerCase().trim();
  }

  // Handle numeric comparator patterns (e.g., ">= 80000", "<= 300", "> 500", "< 20")
  const numericMatch = normConstraint.match(/^([>=<!]+)?\s*(-?\d+(\.\d+)?)$/);
  if (numericMatch) {
    const operator = numericMatch[1] || '===';
    const constraintNum = parseFloat(numericMatch[2]);
    const variableNum = parseFloat(value);

    if (isNaN(variableNum)) return false;

    switch (operator) {
      case '>': return variableNum > constraintNum;
      case '>=': return variableNum >= constraintNum;
      case '<': return variableNum < constraintNum;
      case '<=': return variableNum <= constraintNum;
      case '==':
      case '===': 
        return variableNum === constraintNum;
      case '!=':
      case '!==':
        return variableNum !== constraintNum;
      default: return false;
    }
  }

  // Fallback to exact string match check
  return String(value).toLowerCase().trim() === normConstraint.toLowerCase().trim();
}

/**
 * Execute a complete DMN Decision Table on a current set of process variables.
 */
export function evaluateDmnTable(table: DmnTable, variables: Record<string, any>): {
  matchedRuleId: string | null;
  outputs: Record<string, any>;
  comment: string;
} {
  const finalOutputs: Record<string, any> = {};
  let matchedRuleId: string | null = null;
  let summary = '';

  // Look through rules according to hit policy
  for (const rule of table.rules) {
    let ruleMatches = true;

    // Check all inputs
    for (let c = 0; c < table.inputs.length; c++) {
      const inputMeta = table.inputs[c];
      const variableValue = variables[inputMeta.name] !== undefined ? variables[inputMeta.name] : null;
      const cellConstraint = rule.inputConstraints[c];

      if (!evaluateConditionValue(cellConstraint, variableValue)) {
        ruleMatches = false;
        break;
      }
    }

    if (ruleMatches) {
      matchedRuleId = rule.id;
      summary = rule.description || `Rule ${rule.id} matched`;

      // Apply output mapping
      for (let o = 0; o < table.outputs.length; o++) {
        const outputMeta = table.outputs[o];
        const rawOutputCellValue = rule.outputValues[o].trim();

        // Parse outputs
        let finalVal: any = rawOutputCellValue;
        if (rawOutputCellValue.startsWith('"') && rawOutputCellValue.endsWith('"')) {
          finalVal = rawOutputCellValue.slice(1, -1);
        } else if (rawOutputCellValue.startsWith("'") && rawOutputCellValue.endsWith("'")) {
          finalVal = rawOutputCellValue.slice(1, -1);
        } else if (rawOutputCellValue === 'true') {
          finalVal = true;
        } else if (rawOutputCellValue === 'false') {
          finalVal = false;
        } else {
          const parsedNum = parseFloat(rawOutputCellValue);
          if (!isNaN(parsedNum)) {
            finalVal = parsedNum;
          }
        }

        finalOutputs[outputMeta.name] = finalVal;
      }

      // If hit policy is 'first', stop evaluating and return this rule execution state
      if (table.hitPolicy === 'first' || table.hitPolicy === 'unique') {
        break;
      }
    }
  }

  if (!matchedRuleId) {
    summary = 'No DMN decision spreadsheet row matched current inputs. Retained current state.';
  }

  return {
    matchedRuleId,
    outputs: finalOutputs,
    comment: summary
  };
}

/**
 * Evaluate simple gateway Expressions like "approved === true" or "score >= 700".
 */
export function evaluateExpression(expr: string | undefined, variables: Record<string, any>): boolean {
  if (!expr || expr.trim() === '') return true;

  try {
    const cleanExpr = expr.trim();
    
    // Pattern Matcher for "variableName operator value"
    // e.g. "eligibility === 'APPROVED'" or "score >= 700" or "overrideApproved === false"
    const match = cleanExpr.match(/^([a-zA-Z0-9_]+)\s*(===|!==|>=|<=|>|<|==|!=)\s*(.+)$/);
    if (!match) {
      // Direct Boolean variable check, e.g. "isApproved" or "!isApproved"
      if (cleanExpr.startsWith('!')) {
        const varName = cleanExpr.slice(1).trim();
        return !variables[varName];
      }
      return !!variables[cleanExpr];
    }

    const varName = match[1];
    const op = match[2];
    let cmpValueRaw = match[3].trim();

    // Clean quotes
    if ((cmpValueRaw.startsWith('"') && cmpValueRaw.endsWith('"')) ||
        (cmpValueRaw.startsWith("'") && cmpValueRaw.endsWith("'"))) {
      cmpValueRaw = cmpValueRaw.slice(1, -1);
    }

    const varVal = variables[varName];
    
    // Match logic based on variable types
    if (typeof varVal === 'boolean') {
      const boolCmp = cmpValueRaw === 'true';
      return op === '===' || op === '==' ? varVal === boolCmp : varVal !== boolCmp;
    }

    if (typeof varVal === 'number' || !isNaN(Number(varVal)) && varVal !== '') {
      const numVar = Number(varVal);
      const numCmp = Number(cmpValueRaw);
      switch (op) {
        case '>': return numVar > numCmp;
        case '>=': return numVar >= numCmp;
        case '<': return numVar < numCmp;
        case '<=': return numVar <= numCmp;
        case '==':
        case '===': return numVar === numCmp;
        case '!=':
        case '!==': return numVar !== numCmp;
      }
    }

    // Default string comparisons
    const strVar = String(varVal || '').toLowerCase().trim();
    const strCmp = String(cmpValueRaw).toLowerCase().trim();

    switch (op) {
      case '==':
      case '===': return strVar === strCmp;
      case '!=':
      case '!==': return strVar !== strCmp;
      default: return false;
    }
  } catch (err) {
    console.error(`Failed to evaluate expression: ${expr}`, err);
    return false;
  }
}

/**
 * Generate unique IDs for process items.
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
}

/**
 * Execute automated background node types.
 * Will run sequentially until userTasks or endEvents are reached.
 */
export function runEngineStep(
  instance: ProcessInstance,
  processes: Process[],
  dmnTables: DmnTable[],
  formSchemas: FormSchema[],
  completedNodeId?: string,
  userTaskOutputs?: Record<string, any>
): {
  updatedInstance: ProcessInstance;
  newPendingUserTask: UserTaskInstance | null;
} {
  const currentProcess = processes.find(p => p.id === instance.processId);
  if (!currentProcess) {
    return { updatedInstance: instance, newPendingUserTask: null };
  }

  // Deep clone state representation
  let updatedInstance = JSON.parse(JSON.stringify(instance)) as ProcessInstance;
  let newPendingUserTask: UserTaskInstance | null = null;
  let stepExecuted = false;

  // Let's create helper to record audit logs
  const logAudit = (nodeId: string, nodeName: string, type: string, action: "STARTED" | "COMPLETED" | "FAILED" | "DECISION_EVALUATED" | "PATH_TAKEN", details?: string) => {
    const entry: AuditLogEntry = {
      id: generateId('audit'),
      timestamp: new Date().toISOString(),
      nodeId,
      nodeName,
      nodeType: type as any,
      action,
      details,
      variablesSnap: JSON.parse(JSON.stringify(updatedInstance.variables))
    };
    updatedInstance.auditLog.push(entry);
  };

  // If a manual user task has just been finished
  if (completedNodeId && updatedInstance.activeNodeIds.includes(completedNodeId)) {
    const node = currentProcess.nodes.find(n => n.id === completedNodeId);
    if (node && node.type === 'userTask') {
      // Merge task outputs
      if (userTaskOutputs) {
        updatedInstance.variables = {
          ...updatedInstance.variables,
          ...userTaskOutputs
        };
      }

      // Record Audit Complete and transition from this node
      logAudit(node.id, node.name, node.type, 'COMPLETED', `Task finished by user. Current state variables synchronized.`);
      updatedInstance.activeNodeIds = updatedInstance.activeNodeIds.filter(id => id !== completedNodeId);
      if (!updatedInstance.completedNodeIds.includes(completedNodeId)) {
        updatedInstance.completedNodeIds.push(completedNodeId);
      }

      // Find outgoing flows
      const outEdges = currentProcess.edges.filter(e => e.sourceRef === completedNodeId);
      outEdges.forEach(edge => {
        if (!updatedInstance.activeNodeIds.includes(edge.targetRef)) {
          updatedInstance.activeNodeIds.push(edge.targetRef);
        }
        logAudit(edge.id, edge.name || `flow-${edge.id}`, 'sequenceFlow', 'PATH_TAKEN', `Advanced past completed Task.`);
      });

      stepExecuted = true;
    }
  }

  // Execution Step loop: run automated elements (DMN, Service, Gateways, Events)
  let safetyCounter = 0;
  const maxIterations = 50;

  while (updatedInstance.activeNodeIds.length > 0 && safetyCounter < maxIterations) {
    safetyCounter++;
    let hasAutomatedWork = false;

    // We copy active IDs list to iterate safely
    const currentActiveList = [...updatedInstance.activeNodeIds];

    for (const nodeId of currentActiveList) {
      const node = currentProcess.nodes.find(n => n.id === nodeId);
      if (!node) continue;

      // --- Start Event ---
      if (node.type === 'startEvent') {
        logAudit(node.id, node.name, node.type, 'COMPLETED', `Process initiated.`);
        updatedInstance.activeNodeIds = updatedInstance.activeNodeIds.filter(id => id !== nodeId);
        if (!updatedInstance.completedNodeIds.includes(nodeId)) {
          updatedInstance.completedNodeIds.push(nodeId);
        }

        // Advance to outgoing edges
        const outEdges = currentProcess.edges.filter(e => e.sourceRef === nodeId);
        outEdges.forEach(edge => {
          if (!updatedInstance.activeNodeIds.includes(edge.targetRef)) {
            updatedInstance.activeNodeIds.push(edge.targetRef);
          }
          logAudit(edge.id, edge.name || 'sequenceFlow', 'sequenceFlow', 'PATH_TAKEN', `Transitioning to ${edge.targetRef}`);
        });

        hasAutomatedWork = true;
        stepExecuted = true;
        break;
      }

      // --- Service Task ---
      if (node.type === 'serviceTask') {
        logAudit(node.id, node.name, node.type, 'STARTED', `Executing automated service: ${node.serviceAction}`);
        
        // Simulating different API services outputs
        let serviceOutput = {};
        if (node.serviceAction === 'sendEmail') {
          serviceOutput = { status: 'SENT', deliveryTime: new Date().toISOString() };
        } else if (node.serviceAction === 'verifyIdentity') {
          // Simulate simple verification pass based on applicant name length or variables
          const name = updatedInstance.variables.applicantName || updatedInstance.variables.candidateName || 'Unknown';
          const isOk = name.replace(/\s+/g, '').length > 3;
          serviceOutput = { status: isOk ? 'VERIFIED' : 'SUSPECTED_RISK', checkedAt: new Date().toISOString() };
        } else if (node.serviceAction === 'logProcessInfo') {
          serviceOutput = { status: 'LOGGED_SUCCESS', serverPod: 'cloud-run-worker' };
        } else {
          serviceOutput = { status: 'SUCCESS', value: Math.floor(Math.random() * 100) };
        }

        // Store result in process variables
        const outputVar = node.serviceResultVar || `${node.id}_result`;
        updatedInstance.variables[outputVar] = serviceOutput;

        logAudit(node.id, node.name, node.type, 'COMPLETED', `Automated Worker execution complete. Saved outcome reference to process namespace: ${JSON.stringify(serviceOutput)}`);
        
        updatedInstance.activeNodeIds = updatedInstance.activeNodeIds.filter(id => id !== nodeId);
        if (!updatedInstance.completedNodeIds.includes(nodeId)) {
          updatedInstance.completedNodeIds.push(nodeId);
        }

        // Fetch targets
        const outEdges = currentProcess.edges.filter(e => e.sourceRef === nodeId);
        outEdges.forEach(edge => {
          if (!updatedInstance.activeNodeIds.includes(edge.targetRef)) {
            updatedInstance.activeNodeIds.push(edge.targetRef);
          }
          logAudit(edge.id, edge.name || 'SequenceFlow', 'sequenceFlow', 'PATH_TAKEN', `Proceeded across flow line.`);
        });

        hasAutomatedWork = true;
        stepExecuted = true;
        break;
      }

      // --- DMN Decision Task ---
      if (node.type === 'dmnTask') {
        logAudit(node.id, node.name, node.type, 'STARTED', `Evaluating decision rules via DMN Table.`);
        
        const table = dmnTables.find(t => t.id === node.dmnId);
        if (table) {
          const dmnOutcome = evaluateDmnTable(table, updatedInstance.variables);
          
          // Merge outcomes
          updatedInstance.variables = {
            ...updatedInstance.variables,
            ...dmnOutcome.outputs
          };

          logAudit(
            node.id, 
            node.name, 
            node.type, 
            'DECISION_EVALUATED', 
            `Evaluated table '${table.name}'. Matched Rule ID: ${dmnOutcome.matchedRuleId || 'None'}. Outputs merged: ${JSON.stringify(dmnOutcome.outputs)}. Details: ${dmnOutcome.comment}`
          );
        } else {
          logAudit(node.id, node.name, node.type, 'FAILED', `Referenced DMN spreadsheet source '${node.dmnId}' was not configured! Defaulting variables...`);
        }

        updatedInstance.activeNodeIds = updatedInstance.activeNodeIds.filter(id => id !== nodeId);
        if (!updatedInstance.completedNodeIds.includes(nodeId)) {
          updatedInstance.completedNodeIds.push(nodeId);
        }

        // Transition forward
        const outEdges = currentProcess.edges.filter(e => e.sourceRef === nodeId);
        outEdges.forEach(edge => {
          if (!updatedInstance.activeNodeIds.includes(edge.targetRef)) {
            updatedInstance.activeNodeIds.push(edge.targetRef);
          }
        });

        hasAutomatedWork = true;
        stepExecuted = true;
        break;
      }

      // --- Exclusive Gateway (XOR) ---
      if (node.type === 'exclusiveGateway') {
        logAudit(node.id, node.name, node.type, 'STARTED', `Assumed XOR branch evaluations.`);
        
        const outEdges = currentProcess.edges.filter(e => e.sourceRef === nodeId);
        let selectedEdge: BpmnEdge | null = null;

        // 1. Check for flows that have expressions
        for (const edge of outEdges) {
          if (edge.conditionExpression) {
            const matches = evaluateExpression(edge.conditionExpression, updatedInstance.variables);
            if (matches) {
              selectedEdge = edge;
              break;
            }
          }
        }

        // 2. If no matching conditional edge was chosen, take default/fallback flow (flow without conditions)
        if (!selectedEdge) {
          selectedEdge = outEdges.find(e => !e.conditionExpression) || outEdges[0] || null;
        }

        updatedInstance.activeNodeIds = updatedInstance.activeNodeIds.filter(id => id !== nodeId);
        if (!updatedInstance.completedNodeIds.includes(nodeId)) {
          updatedInstance.completedNodeIds.push(nodeId);
        }

        if (selectedEdge) {
          if (!updatedInstance.activeNodeIds.includes(selectedEdge.targetRef)) {
            updatedInstance.activeNodeIds.push(selectedEdge.targetRef);
          }
          logAudit(
            selectedEdge.id, 
            selectedEdge.name || 'SequenceFlow', 
            'sequenceFlow', 
            'PATH_TAKEN', 
            `XOR Gateway resolved. Navigated path: '${selectedEdge.name || selectedEdge.id}' pointing to target '${selectedEdge.targetRef}'`
          );
        } else {
          logAudit(node.id, node.name, node.type, 'FAILED', `No valid outgoing flows found on Exclusive Gateway. Pipeline choked.`);
        }

        hasAutomatedWork = true;
        stepExecuted = true;
        break;
      }

      // --- Parallel Gateway ---
      if (node.type === 'parallelGateway') {
        const incomingEdges = currentProcess.edges.filter(e => e.targetRef === nodeId);
        const outgoingEdges = currentProcess.edges.filter(e => e.sourceRef === nodeId);

        // Check if it is a Merge or a Split
        if (incomingEdges.length > 1) {
          // This is a Merge operation. In simple environments, it proceeds once incoming flows complete.
          // We can check if previous elements are completed or we just pass through once a token arrives
          logAudit(node.id, node.name, node.type, 'STARTED', `Merging incoming parallel threads.`);
        } else {
          // This is a Split operation. Active tokens on ALL outgoing branches
          logAudit(node.id, node.name, node.type, 'STARTED', `Forking process to ${outgoingEdges.length} parallel paths.`);
        }

        updatedInstance.activeNodeIds = updatedInstance.activeNodeIds.filter(id => id !== nodeId);
        if (!updatedInstance.completedNodeIds.includes(nodeId)) {
          updatedInstance.completedNodeIds.push(nodeId);
        }

        outgoingEdges.forEach(edge => {
          if (!updatedInstance.activeNodeIds.includes(edge.targetRef)) {
            updatedInstance.activeNodeIds.push(edge.targetRef);
          }
          logAudit(edge.id, edge.name || 'ParallelFlow', 'sequenceFlow', 'PATH_TAKEN', `Branched path activated: '${edge.id}'`);
        });

        hasAutomatedWork = true;
        stepExecuted = true;
        break;
      }

      // --- End Event ---
      if (node.type === 'endEvent') {
        logAudit(node.id, node.name, node.type, 'COMPLETED', `Reached termination terminal node.`);
        updatedInstance.activeNodeIds = updatedInstance.activeNodeIds.filter(id => id !== nodeId);
        if (!updatedInstance.completedNodeIds.includes(nodeId)) {
          updatedInstance.completedNodeIds.push(nodeId);
        }

        // If no more active tokens are running on other paths, complete the entire application instance!
        if (updatedInstance.activeNodeIds.length === 0) {
          updatedInstance.status = 'COMPLETED';
          updatedInstance.endTime = new Date().toISOString();
          logAudit(currentProcess.id, currentProcess.name, 'process' as any, 'COMPLETED', `Process instance completed all automated pathways successfully.`);
        }

        hasAutomatedWork = true;
        stepExecuted = true;
        break;
      }

      // --- User Task ---
      if (node.type === 'userTask') {
        // Since User Tasks are blocking, they wait for user response submissions. We check if user task instances exist, else we instantiate one!
        // No automated step inside the engine logic itself can clear a User Task token.
        // We will return a request to create a pending task, then continue loop.
        hasAutomatedWork = false;
      }
    }

    if (!hasAutomatedWork) {
      break; // Pause engine: we got to a User Task or are waiting!
    }
  }

  // Check if we are parked on any active User Tasks. If so, create active task listed items
  for (const nodeId of updatedInstance.activeNodeIds) {
    const node = currentProcess.nodes.find(n => n.id === nodeId);
    if (node && node.type === 'userTask') {
      newPendingUserTask = {
        id: generateId('task'),
        instanceId: updatedInstance.id,
        processId: updatedInstance.processId,
        processName: currentProcess.name,
        nodeId: node.id,
        taskName: node.name,
        assignee: node.assignee || 'Unassigned',
        status: 'PENDING',
        formId: node.formId,
        variables: JSON.parse(JSON.stringify(updatedInstance.variables)),
        createdAt: new Date().toISOString()
      };
    }
  }

  return {
    updatedInstance,
    newPendingUserTask
  };
}
