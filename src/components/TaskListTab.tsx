/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Inbox, User, CheckCircle, Clock, FileText, Sparkles, 
  Layers, ChevronRight, Check, AlertCircle, Info
} from 'lucide-react';
import { UserTaskInstance, FormSchema, ProcessInstance } from '../types';

interface TaskListTabProps {
  userTasks: UserTaskInstance[];
  formSchemas: FormSchema[];
  processInstances: ProcessInstance[];
  onCompleteTask: (taskId: string, outputVariables: Record<string, any>) => void;
}

export default function TaskListTab({
  userTasks,
  formSchemas,
  processInstances,
  onCompleteTask
}: TaskListTabProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    userTasks.find(t => t.status === 'PENDING')?.id || null
  );
  
  // Local state for carrying form input values
  const [taskInputs, setTaskInputs] = useState<Record<string, any>>({});
  const [filterType, setFilterType] = useState<'all' | 'assigned' | 'completed'>('all');

  const pendingTasks = userTasks.filter(t => t.status === 'PENDING');
  const completedTasks = userTasks.filter(t => t.status === 'COMPLETED');

  // Apply visual category filtering
  let displayedTasks: UserTaskInstance[] = [];
  if (filterType === 'all') {
    displayedTasks = pendingTasks;
  } else if (filterType === 'assigned') {
    displayedTasks = pendingTasks.filter(t => t.assignee && t.assignee !== 'Unassigned');
  } else {
    displayedTasks = completedTasks;
  }

  // Auto fallback selection if current became invalid
  const activeTask = userTasks.find(t => t.id === selectedTaskId) || displayedTasks[0];

  const handleSelectTask = (task: UserTaskInstance) => {
    setSelectedTaskId(task.id);
    
    // Pre-populate input values with current process variable states
    const prefilled: Record<string, any> = {};
    const processInstance = processInstances.find(inst => inst.id === task.instanceId);
    
    const schema = formSchemas.find(f => f.id === task.formId);
    if (schema) {
      schema.fields.forEach(f => {
        // Preference trace: 1. Current Task state variables, 2. Global process variable values, 3. Field default values
        if (task.variables && task.variables[f.key] !== undefined) {
          prefilled[f.key] = task.variables[f.key];
        } else if (processInstance && processInstance.variables[f.key] !== undefined) {
          prefilled[f.key] = processInstance.variables[f.key];
        } else if (f.defaultValue !== undefined) {
          prefilled[f.key] = f.defaultValue;
        } else {
          prefilled[f.key] = '';
        }
      });
    }
    setTaskInputs(prefilled);
  };

  // Trigger completeness push
  const handleSubmitTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask) return;

    // Convert numeric variables if required by schema field types
    const parsedOutputs = { ...taskInputs };
    const schema = formSchemas.find(f => f.id === activeTask.formId);
    if (schema) {
      schema.fields.forEach(f => {
        const val = parsedOutputs[f.key];
        if (f.type === 'number' && typeof val === 'string' && val !== '') {
          parsedOutputs[f.key] = parseFloat(val) || 0;
        } else if (f.type === 'boolean') {
          parsedOutputs[f.key] = val === true || val === 'true';
        }
      });
    }

    onCompleteTask(activeTask.id, parsedOutputs);
    setSelectedTaskId(null);
    setTaskInputs({});
  };

  const getFormForTask = (formId?: string) => {
    return formSchemas.find(f => f.id === formId);
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-slate-50 font-sans overflow-hidden" id="tasklist-workspace">
      
      {/* 1. LEFT SPLIT PANEL - TASK FILTER NAVIGATION BAR */}
      <div className="w-56 border-r border-slate-200 bg-white flex flex-col shrink-0 select-none" id="tasklist-filters-sidebar">
        
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
            <Inbox className="w-4 h-4 text-primaryOrange" />
            <span>Filters catalog</span>
          </div>
        </div>

        <div className="p-3.5 space-y-2 flex-grow overflow-y-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`w-full flex items-center justify-between text-left text-xs px-3 py-2.5 rounded-md transition font-medium cursor-pointer ${
              filterType === 'all' 
                ? 'bg-slate-100 text-slate-900 border-l-4 border-primaryOrange font-bold' 
                : 'text-gray-600 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-gray-500" />
              <span>Pending Tasks</span>
            </div>
            <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold">
              {pendingTasks.length}
            </span>
          </button>

          <button
            onClick={() => setFilterType('assigned')}
            className={`w-full flex items-center justify-between text-left text-xs px-3 py-2.5 rounded-md transition font-medium cursor-pointer ${
              filterType === 'assigned' 
                ? 'bg-slate-100 text-slate-900 border-l-4 border-primaryOrange font-bold' 
                : 'text-gray-600 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span>Claimed Work</span>
            </div>
            <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[10px]">
              {pendingTasks.filter(t => t.assignee !== 'Unassigned').length}
            </span>
          </button>

          <button
            onClick={() => setFilterType('completed')}
            className={`w-full flex items-center justify-between text-left text-xs px-3 py-2.5 rounded-md transition font-medium cursor-pointer ${
              filterType === 'completed' 
                ? 'bg-slate-100 text-slate-900 border-l-4 border-primaryOrange font-bold' 
                : 'text-gray-600 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-gray-500" />
              <span>Completed History</span>
            </div>
            <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[10px]">
              {completedTasks.length}
            </span>
          </button>
        </div>

        {/* Diagnostic info banner */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 text-[10px] text-gray-400 font-medium font-mono leading-relaxed" id="tasklist-audit-info">
          APP STATE MONITOR <br/>
          Pending: {pendingTasks.length} <br/>
          Total Completed: {completedTasks.length}
        </div>
      </div>

      {/* 2. MIDDLE SPLIT PANEL - INBOX LIST ITEMS */}
      <div className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0 overflow-y-auto" id="tasks-timeline-pane">
        
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shadow-3xs shrink-0 select-none">
          <span className="text-[10px] font-sans font-bold text-slate-500 uppercase tracking-widest">
            Inbox items ({displayedTasks.length})
          </span>
          <span className="text-[10px] text-gray-400 font-mono font-medium leading-none">
            Sorted: Newest
          </span>
        </div>

        <div className="divide-y divide-slate-100 flex-grow" id="tasks-list">
          {displayedTasks.length === 0 ? (
            <div className="p-8 text-center text-slate-300 space-y-2 mt-12 select-none" id="empty-inbox-msg">
              <Inbox className="w-10 h-10 mx-auto text-slate-200" />
              <p className="text-xs">No user tasks found matching this criteria.</p>
            </div>
          ) : (
            displayedTasks.map((task) => {
              const remainsActive = task.status === 'PENDING';
              const isSelected = activeTask?.id === task.id;

              return (
                <div
                  key={task.id}
                  onClick={() => handleSelectTask(task)}
                  className={`p-4 text-left transition-all cursor-pointer relative ${
                    isSelected 
                      ? 'bg-orange-50/20 border-l-4 border-primaryOrange' 
                      : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 text-[10px] font-mono select-none">
                    <span className="text-gray-400 font-medium bg-slate-100 px-1 py-0.5 rounded truncate max-w-[120px]">
                      {task.processName}
                    </span>
                    <span className="text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-300" />
                      {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-800 line-clamp-1 mb-1 font-sans">
                    {task.taskName}
                  </h3>

                  <div className="flex items-center justify-between text-[11px] text-gray-500 select-none">
                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                      Assignee: {task.assignee || 'Unassigned'}
                    </span>
                    
                    {!remainsActive && (
                      <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                        <Check className="w-3.5 h-3.5" /> Done
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. RIGHT SPLIT PANEL - FORM DETAIL & VALUES ENTRY FIELDS */}
      <div className="flex-grow bg-slate-50 overflow-y-auto flex flex-col" id="task-forms-pane">
        
        {activeTask ? (
          (() => {
            const schema = getFormForTask(activeTask.formId);

            return (
              <div className="flex-1 flex flex-col h-full" id="task-forms-view">
                
                {/* Panel Title banner */}
                <div className="bg-white border-b border-slate-200 p-4 px-6 flex items-center justify-between shadow-3xs shrink-0 select-none">
                  <div>
                    <h2 className="text-sm font-sans font-bold text-slate-800">
                      {activeTask.taskName}
                    </h2>
                    <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                      Process instance: <b className="font-mono text-slate-600">{activeTask.instanceId}</b> | Task assignee: <b className="text-slate-600 font-sans">{activeTask.assignee}</b>
                    </p>
                  </div>
                  
                  <span className={`text-[10px] font-sans font-bold px-2 py-1 rounded shadow-3xs uppercase ${
                    activeTask.status === 'PENDING' 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {activeTask.status}
                  </span>
                </div>

                {/* Main panel body containing form */}
                <div className="p-6 max-w-2xl mx-auto w-full flex-grow space-y-6">
                  
                  {/* Instancer Scope Variables display widget */}
                  <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-3xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700 text-xs">
                      <Layers className="w-4 h-4 text-orange-500" />
                      <span>Process variables context scope</span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-normal">
                      The dynamic variables computed prior to executing this user step:
                    </p>
                    
                    <div className="bg-slate-50 rounded-md p-3 border border-slate-200">
                      {Object.keys(activeTask.variables).length === 0 ? (
                        <div className="text-[11px] text-gray-400 font-mono">No scope variables initialized yet.</div>
                      ) : (
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 font-mono text-[10px]">
                          {Object.entries(activeTask.variables).map(([k, v]) => (
                            <div key={k} className="flex justify-between items-center py-0.5 border-b border-slate-100/70">
                              <span className="text-gray-400">{k}:</span>
                              <span className="font-bold text-slate-800 truncate max-w-[150px]" title={JSON.stringify(v)}>
                                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Schema input fields */}
                  <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-3xs space-y-4">
                    {activeTask.status === 'PENDING' ? (
                      schema ? (
                        <form onSubmit={handleSubmitTask} className="space-y-4.5">
                          <div className="border-b border-slate-100 pb-2">
                            <h3 className="text-xs font-bold font-sans text-slate-700 flex items-center gap-1 mb-0.5">
                              <FileText className="w-4 h-4 text-slate-400" />
                              <span>{schema.name}</span>
                            </h3>
                            <p className="text-[10px] text-gray-400 font-medium">Please fulfill validation rules before completing.</p>
                          </div>

                          {schema.fields.map((field) => (
                            <div key={field.id} className="space-y-1.5">
                              <label className="block text-[11px] font-sans font-bold text-slate-700">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                              </label>

                              {field.type === 'select' ? (
                                <select
                                  required={field.required}
                                  value={taskInputs[field.key] || ''}
                                  onChange={(e) => setTaskInputs({ ...taskInputs, [field.key]: e.target.value })}
                                  className="w-full text-xs font-sans border border-slate-300 bg-white rounded px-3 py-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-primaryOrange font-medium"
                                  id={`tasklist-form-field-${field.key}`}
                                >
                                  <option value="">-- Click to select Option --</option>
                                  {field.options?.map((opt, oIdx) => (
                                    <option key={oIdx} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : field.type === 'boolean' ? (
                                <label className="flex items-center gap-2 text-xs text-slate-600 font-medium p-1 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!!taskInputs[field.key]}
                                    onChange={(e) => setTaskInputs({ ...taskInputs, [field.key]: e.target.checked })}
                                    className="w-4 h-4 border-slate-300 rounded text-primaryOrange focus:ring-primaryOrange"
                                    id={`tasklist-form-field-${field.key}`}
                                  />
                                  <span>Check to approve, verify or agree</span>
                                </label>
                              ) : field.type === 'date' ? (
                                <input
                                  type="date"
                                  required={field.required}
                                  value={taskInputs[field.key] || ''}
                                  onChange={(e) => setTaskInputs({ ...taskInputs, [field.key]: e.target.value })}
                                  className="w-full text-xs font-sans border border-slate-300 rounded px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primaryOrange font-semibold"
                                  id={`tasklist-form-field-${field.key}`}
                                />
                              ) : (
                                <input
                                  type={field.type === 'number' ? 'number' : 'text'}
                                  required={field.required}
                                  placeholder={field.placeholder || 'Value details...'}
                                  value={taskInputs[field.key] !== undefined ? taskInputs[field.key] : ''}
                                  onChange={(e) => setTaskInputs({ ...taskInputs, [field.key]: e.target.value })}
                                  className="w-full text-xs font-sans border border-slate-300 rounded px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primaryOrange font-semibold"
                                  id={`tasklist-form-field-${field.key}`}
                                />
                              )}
                            </div>
                          ))}

                          <div className="pt-4 border-t border-slate-100 flex justify-end">
                            <button
                              type="submit"
                              className="flex items-center gap-1.5 bg-primaryOrange hover:bg-orange-700 text-white font-sans text-xs font-bold px-5 py-2.5 rounded shadow-xs cursor-pointer transition-colors"
                              id="tasklist-complete-btn"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Complete and Submit Task</span>
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="space-y-4" id="tasklist-no-schema-fallback">
                          <div className="flex gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 leading-normal">
                            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
                            <div>
                              <div className="font-bold">No Custom Form Sheet Linked</div>
                              No form schema was attached to this BPMN userTask. Fulfill generic trigger fields below instead.
                            </div>
                          </div>

                          <form onSubmit={handleSubmitTask} className="space-y-4 pt-1">
                            <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-gray-700">Audit Completion Comments</label>
                              <input
                                type="text"
                                placeholder="Done with action..."
                                value={taskInputs.genericCompletionNotes || ''}
                                onChange={(e) => setTaskInputs({ ...taskInputs, genericCompletionNotes: e.target.value })}
                                className="w-full text-xs font-sans border border-slate-300 rounded px-3 py-2.5 focus:outline-none"
                              />
                            </div>

                            <button
                              type="submit"
                              className="w-full text-center py-2.5 text-xs bg-slate-800 hover:bg-slate-900 text-white font-bold rounded cursor-pointer mt-2 shadow-xs transition"
                            >
                              Fulfill Task
                            </button>
                          </form>
                        </div>
                      )
                    ) : (
                      // Display historical inputs for reference if task was already completed
                      <div className="space-y-4" id="tasklist-history-view">
                        <div className="flex gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 leading-normal">
                          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div>
                            <div className="font-bold">Task Completed Successfully</div>
                            This step has already been evaluated and processed. Data metrics have been permanently integrated.
                          </div>
                        </div>

                        <div className="text-xs font-bold text-gray-500 font-mono uppercase tracking-widest border-b border-slate-100 pb-1 pt-1">SUBMITTED VALUES SNAPSHOT</div>
                        <div className="space-y-2">
                          {Object.keys(activeTask.variables).length === 0 ? (
                            <p className="text-xs italic text-gray-400">No input fields registered on submission.</p>
                          ) : (
                            Object.entries(activeTask.variables).map(([k, v]) => (
                              <div key={k} className="flex justify-between items-center py-1 border-b border-slate-100 bg-slate-50/50 px-2 rounded">
                                <span className="font-mono text-xs text-gray-500 font-semibold">{k}:</span>
                                <span className="font-mono text-xs font-bold text-slate-800">{String(v)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })()
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-3 font-sans select-none" id="unselected-task-pane-msg">
            <Inbox className="w-14 h-14 text-slate-300 animate-pulse" />
            <div>
              <h3 className="text-sm font-bold text-slate-600">No active Task selected</h3>
              <p className="text-xs max-w-sm mt-1 leading-normal">
                Select an item from the center panel to claim ownership, inspect variables snapshot, and complete work tasks.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
