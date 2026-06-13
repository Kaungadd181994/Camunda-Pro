/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, Database, Inbox, Activity, Plus, Play, 
  Layers, Settings, User, Check, RefreshCw, Sparkles, Send, 
  HelpCircle, X, FileText, ChevronRight
} from 'lucide-react';

import { Process, DmnTable, FormSchema, ProcessInstance, UserTaskInstance } from './types';
import { 
  INITIAL_PROCESSES, 
  INITIAL_DMN_TABLES, 
  INITIAL_FORMS 
} from './utils/engineBlueprints';
import { runEngineStep, generateId } from './utils/bpmnEngine';

// Subcomponents
import ModelerTab from './components/ModelerTab';
import DmnTab from './components/DmnTab';
import FormBuilderTab from './components/FormBuilderTab';
import TaskListTab from './components/TaskListTab';
import CockpitTab from './components/CockpitTab';

export default function App() {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<'modeler' | 'dmn' | 'form' | 'tasks' | 'cockpit'>('modeler');

  // Core configuration states
  const [processes, setProcesses] = useState<Process[]>([]);
  const [selectedProcessId, setSelectedProcessId] = useState<string>('');
  const [dmnTables, setDmnTables] = useState<DmnTable[]>([]);
  const [formSchemas, setFormSchemas] = useState<FormSchema[]>([]);

  // Runtime states
  const [processInstances, setProcessInstances] = useState<ProcessInstance[]>([]);
  const [userTasks, setUserTasks] = useState<UserTaskInstance[]>([]);

  // Modal Dialog states for starting processes
  const [launchModalProcessId, setLaunchModalProcessId] = useState<string | null>(null);
  const [launchFormInputs, setLaunchFormInputs] = useState<Record<string, any>>({});
  
  // Real-time flash notification banner
  const [engineNotification, setEngineNotification] = useState<{
    title: string;
    description: string;
    type: 'success' | 'info' | 'decision';
  } | null>(null);

  // Initialize/Seed database layout
  useEffect(() => {
    const localProcesses = localStorage.getItem('camunda_processes');
    const localDmn = localStorage.getItem('camunda_dmn');
    const localForms = localStorage.getItem('camunda_forms');
    const localInstances = localStorage.getItem('camunda_instances');
    const localTasks = localStorage.getItem('camunda_tasks');

    let loadedProcs = INITIAL_PROCESSES;
    let loadedDmn = INITIAL_DMN_TABLES;
    let loadedForms = INITIAL_FORMS;

    if (localProcesses) loadedProcs = JSON.parse(localProcesses);
    if (localDmn) loadedDmn = JSON.parse(localDmn);
    if (localForms) loadedForms = JSON.parse(localForms);

    setProcesses(loadedProcs);
    setSelectedProcessId(loadedProcs[0]?.id || '');
    setDmnTables(loadedDmn);
    setFormSchemas(loadedForms);

    // Instances and tasks loading or seeding
    if (localInstances && localTasks) {
      setProcessInstances(JSON.parse(localInstances));
      setUserTasks(JSON.parse(localTasks));
    } else {
      // Seed a live demo instance so they don't start empty!
      // Represents an underwriting reviews task for a credit candidate
      const demoInstanceId = 'inst-loan-7832';
      const demoInstance: ProcessInstance = {
        id: demoInstanceId,
        processId: 'loan-underwriting-process',
        processName: 'Loan Underwriting and Approval Flow',
        status: 'ACTIVE',
        variables: {
          applicantName: 'Sarah Jenkins',
          loanAmount: 35000,
          income: 55000,
          creditScore: 640,
          purpose: 'Business growth',
          eligibility: 'MANUAL_REVIEW',
          interestRate: 7.5
        },
        activeNodeIds: ['task-manual-review'],
        completedNodeIds: ['start-evt', 'dmn-calc', 'xor-gateway'],
        startTime: new Date(Date.now() - 300000).toISOString(),
        auditLog: [
          {
            id: 'audit-1',
            timestamp: new Date(Date.now() - 300000).toISOString(),
            nodeId: 'start-evt',
            nodeName: 'Loan Package Filed',
            nodeType: 'startEvent',
            action: 'COMPLETED',
            details: 'Process initiated by Sarah Jenkins.',
            variablesSnap: { applicantName: 'Sarah Jenkins', loanAmount: 35000, income: 55000, creditScore: 640, purpose: 'Business growth' }
          },
          {
            id: 'audit-2',
            timestamp: new Date(Date.now() - 290000).toISOString(),
            nodeId: 'dmn-calc',
            nodeName: 'Determine Eligibility',
            nodeType: 'dmnTask',
            action: 'DECISION_EVALUATED',
            details: 'Evaluated scorecard. Score index is average. Saved outcomes.',
            variablesSnap: { applicantName: 'Sarah Jenkins', loanAmount: 35000, income: 55000, creditScore: 640, purpose: 'Business growth', eligibility: 'MANUAL_REVIEW', interestRate: 7.5 }
          },
          {
            id: 'audit-3',
            timestamp: new Date(Date.now() - 280000).toISOString(),
            nodeId: 'xor-gateway',
            nodeName: 'Check Status Decision',
            nodeType: 'exclusiveGateway',
            action: 'PATH_TAKEN',
            details: 'XOR gateway evaluated: eligibility score demands manual check.',
            variablesSnap: { applicantName: 'Sarah Jenkins', loanAmount: 35000, income: 55000, creditScore: 640, purpose: 'Business growth', eligibility: 'MANUAL_REVIEW', interestRate: 7.5 }
          },
          {
            id: 'audit-4',
            timestamp: new Date(Date.now() - 275000).toISOString(),
            nodeId: 'task-manual-review',
            nodeName: 'Underwriter Manual Assessment',
            nodeType: 'userTask',
            action: 'STARTED',
            details: 'Token paused. Waiting for human underwriter to override decision.',
            variablesSnap: { applicantName: 'Sarah Jenkins', loanAmount: 35000, income: 55000, creditScore: 640, purpose: 'Business growth', eligibility: 'MANUAL_REVIEW', interestRate: 7.5 }
          }
        ]
      };

      const demoTask: UserTaskInstance = {
        id: 'task-underwrite-demo',
        instanceId: demoInstanceId,
        processId: 'loan-underwriting-process',
        processName: 'Loan Underwriting and Approval Flow',
        nodeId: 'task-manual-review',
        taskName: 'Underwriter Manual Assessment',
        assignee: 'Credit Team Board',
        status: 'PENDING',
        formId: 'loan-review-form',
        variables: {
          applicantName: 'Sarah Jenkins',
          loanAmount: 35000,
          income: 55000,
          creditScore: 640,
          purpose: 'Business growth',
          eligibility: 'MANUAL_REVIEW',
          interestRate: 7.5
        },
        createdAt: new Date(Date.now() - 275000).toISOString()
      };

      setProcessInstances([demoInstance]);
      setUserTasks([demoTask]);

      localStorage.setItem('camunda_instances', JSON.stringify([demoInstance]));
      localStorage.setItem('camunda_tasks', JSON.stringify([demoTask]));
    }
  }, []);

  // Save changes to localStorage on any state modification
  const handleUpdateProcesses = (newProcs: Process[]) => {
    setProcesses(newProcs);
    localStorage.setItem('camunda_processes', JSON.stringify(newProcs));
  };

  const handleUpdateDmnTables = (newDmn: DmnTable[]) => {
    setDmnTables(newDmn);
    localStorage.setItem('camunda_dmn', JSON.stringify(newDmn));
  };

  const handleUpdateFormSchemas = (newForms: FormSchema[]) => {
    setFormSchemas(newForms);
    localStorage.setItem('camunda_forms', JSON.stringify(newForms));
  };

  const saveInstancesAndTasks = (insts: ProcessInstance[], ts: UserTaskInstance[]) => {
    setProcessInstances(insts);
    setUserTasks(ts);
    localStorage.setItem('camunda_instances', JSON.stringify(insts));
    localStorage.setItem('camunda_tasks', JSON.stringify(ts));
  };

  // UI trigger to clear all history and restart states
  const handleClearHistory = () => {
    if (confirm('Are you sure you want to reset all process instances and task histories? Active edits will be kept.')) {
      saveInstancesAndTasks([], []);
      localStorage.removeItem('camunda_instances');
      localStorage.removeItem('camunda_tasks');
      triggerNotification('State Reset', 'All execution instances and completed user tasks have been deleted.', 'info');
    }
  };

  // Helper triggering toast notifications
  const triggerNotification = (title: string, description: string, type: 'success' | 'info' | 'decision') => {
    setEngineNotification({ title, description, type });
    setTimeout(() => {
      setEngineNotification(null);
    }, 4500);
  };

  // Modal handler to prompt for start variables
  const handleOpenLaunchDialog = (processId: string) => {
    const processFound = processes.find(p => p.id === processId);
    if (!processFound) return;

    // Look if startEvent has an associated Form schema
    const startNode = processFound.nodes.find(n => n.type === 'startEvent');
    if (startNode && startNode.formId) {
      // Form required - clear outputs, open input modal
      setLaunchModalProcessId(processId);
      const schema = formSchemas.find(f => f.id === startNode.formId);
      
      const defaults: Record<string, any> = {};
      if (schema) {
        schema.fields.forEach(f => {
          defaults[f.key] = f.defaultValue !== undefined ? f.defaultValue : '';
        });
      }
      setLaunchFormInputs(defaults);
    } else {
      // Empty input - trigger start immediately with blank variables
      handleExecuteLaunch(processId, {});
    }
  };

  // Process launching core executor
  const handleExecuteLaunch = (processId: string, inputVars: Record<string, any>) => {
    const proc = processes.find(p => p.id === processId);
    if (!proc) return;

    // 1. Setup blank instanced container
    const instanceId = generateId('inst');
    const startNode = proc.nodes.find(n => n.type === 'startEvent');
    if (!startNode) return;

    const newInstance: ProcessInstance = {
      id: instanceId,
      processId: proc.id,
      processName: proc.name,
      status: 'ACTIVE',
      variables: { ...inputVars },
      activeNodeIds: [startNode.id], // Starts token on the Start Event node
      completedNodeIds: [],
      startTime: new Date().toISOString(),
      auditLog: []
    };

    // Close options modals
    setLaunchModalProcessId(null);

    // 2. Run engine step which processes elements automatically (Start, DMN, Services) until human tasks or terminal events are reached
    const { updatedInstance, newPendingUserTask } = runEngineStep(
      newInstance,
      processes,
      dmnTables,
      formSchemas
    );

    // Append to list State
    const freshInstances = [updatedInstance, ...processInstances];
    const freshTasks = newPendingUserTask ? [newPendingUserTask, ...userTasks] : userTasks;

    saveInstancesAndTasks(freshInstances, freshTasks);

    // Formulate a beautiful toast notification to satisfy UX
    if (updatedInstance.status === 'COMPLETED') {
      triggerNotification(
        'Execution Succeeded',
        `Process '${proc.name}' was initiated and ran to completion in 1 step!`,
        'success'
      );
      setActiveTab('cockpit');
    } else {
      triggerNotification(
        'Process Launched',
        `Pipeline '${proc.name}' started. Automated tasks executed. Paused on step '${newPendingUserTask?.taskName || 'Waiting'}'.`,
        'decision'
      );
      // Auto take user to Tasklist if there is a pending user task to claim
      if (newPendingUserTask) {
        setActiveTab('tasks');
      } else {
        setActiveTab('cockpit');
      }
    }
  };

  // Complete User Task executor triggered from standard Tasklist tab submissions
  const handleCompleteTask = (taskId: string, outputVars: Record<string, any>) => {
    const task = userTasks.find(t => t.id === taskId);
    if (!task) return;

    const instance = processInstances.find(i => i.id === task.instanceId);
    if (!instance) return;

    // 1. Advance engine from the User Task node using completed outputs
    const { updatedInstance, newPendingUserTask } = runEngineStep(
      instance,
      processes,
      dmnTables,
      formSchemas,
      task.nodeId,
      outputVars
    );

    // 2. Close out current task in local task lists
    const updatedTasks = userTasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: 'COMPLETED' as const,
          completedAt: new Date().toISOString(),
          variables: { ...t.variables, ...outputVars } // Capture output values submitted in this task record
        };
      }
      return t;
    });

    // 3. If a subsequent user task is activated, push into lists
    const finalTasks = newPendingUserTask ? [newPendingUserTask, ...updatedTasks] : updatedTasks;
    const finalInstances = processInstances.map(i => i.id === instance.id ? updatedInstance : i);

    saveInstancesAndTasks(finalInstances, finalTasks);

    // Alert outcomes
    if (updatedInstance.status === 'COMPLETED') {
      triggerNotification(
        'Process Finished',
        `All sequential nodes executed. Instanced token '${instance.id}' is completed.`,
        'success'
      );
      setActiveTab('cockpit');
    } else {
      triggerNotification(
        'Task Completed',
        `Step completed. Flow advanced to task assessment: ${newPendingUserTask?.taskName || 'Subsequent action'}.`,
        'info'
      );
    }
  };

  // Terminate Instance callback
  const handleTerminateInstance = (instanceId: string) => {
    const updatedInstances = processInstances.map(i => {
      if (i.id === instanceId) {
        return {
          ...i,
          status: 'TERMINATED' as const,
          endTime: new Date().toISOString()
        };
      }
      return i;
    });

    // Cancel related pending jobs
    const updatedTasks = userTasks.map(t => {
      if (t.instanceId === instanceId && t.status === 'PENDING') {
        return { ...t, status: 'COMPLETED' as const, completedAt: new Date().toISOString(), taskName: t.taskName + ' (Canceled)' };
      }
      return t;
    });

    saveInstancesAndTasks(updatedInstances, updatedTasks);
    triggerNotification('Instance Canceled', `Terminated job ${instanceId} forcefully.`, 'info');
  };

  const handleUpdateInstanceVariables = (instanceId: string, nextVars: Record<string, any>) => {
    const updated = processInstances.map(i => {
      if (i.id === instanceId) {
        return { ...i, variables: nextVars };
      }
      return i;
    });
    setProcessInstances(updated);
    localStorage.setItem('camunda_instances', JSON.stringify(updated));
    triggerNotification('Variables Overridden', 'Manually saved overridden process variables in real-time context database.', 'success');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 antialiased" id="camunda-applet-root">
      
      {/* 1. TOP BRANDED NAVIGATION HEADER */}
      <header className="bg-[#1f2937] text-white shrink-0 select-none shadow-md border-b border-[#2d3748]" id="global-header-bar">
        <div className="mx-auto flex h-14 items-center justify-between px-6">
          
          {/* Logo brand and metadata tags */}
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-[#f35a00] flex items-center justify-center font-black text-xs text-white">
              C
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black tracking-tight flex items-center gap-1.5 leading-none">
                CAMUNDA PLATFORM
                <span className="text-[10px] font-mono text-white/50 bg-white/10 px-1 py-0.5 rounded">v2.0</span>
              </span>
              <p className="text-[10px] text-gray-400 font-medium font-sans leading-none mt-1">
                Workspace: kaunghtetmin.kght@gmail.com
              </p>
            </div>
          </div>

          {/* Central Main Navigation tabs with active indicators */}
          <nav className="flex h-full items-center" id="main-nav-links">
            <button
              onClick={() => setActiveTab('modeler')}
              className={`flex items-center gap-1.5 px-4 h-full text-xs font-extrabold transition-all relative cursor-pointer ${
                activeTab === 'modeler' ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4 text-primaryOrange" />
              <span>BPMN Modeler</span>
              {activeTab === 'modeler' && (
                <motion.div layoutId="nav-line" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f35a00]" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('dmn')}
              className={`flex items-center gap-1.5 px-4 h-full text-xs font-extrabold transition-all relative cursor-pointer ${
                activeTab === 'dmn' ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-fuchsia-500" />
              <span>DMN Tables</span>
              {activeTab === 'dmn' && (
                <motion.div layoutId="nav-line" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f35a00]" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('form')}
              className={`flex items-center gap-1.5 px-4 h-full text-xs font-bold transition-all relative cursor-pointer ${
                activeTab === 'form' ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 text-sky-500" />
              <span>Form Builder</span>
              {activeTab === 'form' && (
                <motion.div layoutId="nav-line" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f35a00]" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-1.5 px-4 h-full text-xs font-extrabold transition-all relative cursor-pointer ${
                activeTab === 'tasks' ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Inbox className="w-4 h-4 text-[#ef4444]" />
              <span>Tasklist Inbox</span>
              {userTasks.filter(t => t.status === 'PENDING').length > 0 && (
                <span className="bg-red-500 text-white font-mono text-[9px] font-bold px-1 rounded-full w-4 h-4 flex items-center justify-center animate-bounce">
                  {userTasks.filter(t => t.status === 'PENDING').length}
                </span>
              )}
              {activeTab === 'tasks' && (
                <motion.div layoutId="nav-line" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f35a00]" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('cockpit')}
              className={`flex items-center gap-1.5 px-4 h-full text-xs font-bold transition-all relative cursor-pointer ${
                activeTab === 'cockpit' ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4 text-[#10b981]" />
              <span>Cockpit Monitor</span>
              {activeTab === 'cockpit' && (
                <motion.div layoutId="nav-line" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f35a00]" />
              )}
            </button>
          </nav>

          {/* Right action metrics */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleClearHistory}
              title="Clear instance logs and reset"
              className="p-1 px-2 text-[10px] uppercase font-bold text-gray-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded bg-transparent transition cursor-pointer font-mono"
            >
              Reset History
            </button>
            <div className="text-[11px] font-mono font-medium text-slate-400 select-none bg-slate-800 p-1 px-2.5 rounded border border-slate-700/60 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Engine Status: Online</span>
            </div>
          </div>

        </div>
      </header>

      {/* 2. REALTIME ENGINE ADVANCEMENT NOTIFICATION OVERLAYS */}
      <AnimatePresence>
        {engineNotification && (
          <motion.div
            initial={{ opacity: 0, x: 50, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 w-96 bg-white border border-slate-200/80 rounded-xl p-4.5 shadow-xl flex gap-3.5"
            id="global-engine-notification"
          >
            <div className={`p-2 rounded-full shrink-0 ${
              engineNotification.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
              engineNotification.type === 'decision' ? 'bg-fuchsia-50 text-fuchsia-600' : 'bg-blue-50 text-blue-600'
            }`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-grow space-y-1">
              <div className="text-xs font-bold text-slate-800 font-sans flex items-center gap-1.5">
                <span>{engineNotification.title}</span>
                <span className="text-[9px] font-mono text-gray-400 bg-slate-100 p-0.5 px-1.5 rounded uppercase font-bold">engine.so</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-normal font-sans">
                {engineNotification.description}
              </p>
            </div>
            <button 
              onClick={() => setEngineNotification(null)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer self-start"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. CORE ROUTE TAB MULTIPLEX VIEWS */}
      <main className="flex-grow w-full h-full">
        {activeTab === 'modeler' && (
          <ModelerTab
            processes={processes}
            selectedProcessId={selectedProcessId}
            onSelectProcessId={setSelectedProcessId}
            onUpdateProcesses={handleUpdateProcesses}
            dmnTables={dmnTables}
            formSchemas={formSchemas}
            onStartInstance={handleOpenLaunchDialog}
          />
        )}

        {activeTab === 'dmn' && (
          <DmnTab
            dmnTables={dmnTables}
            onUpdateDmnTables={handleUpdateDmnTables}
          />
        )}

        {activeTab === 'form' && (
          <FormBuilderTab
            formSchemas={formSchemas}
            onUpdateFormSchemas={handleUpdateFormSchemas}
          />
        )}

        {activeTab === 'tasks' && (
          <TaskListTab
            userTasks={userTasks}
            formSchemas={formSchemas}
            processInstances={processInstances}
            onCompleteTask={handleCompleteTask}
          />
        )}

        {activeTab === 'cockpit' && (
          <CockpitTab
            processInstances={processInstances}
            processes={processes}
            onTerminateInstance={handleTerminateInstance}
            onUpdateInstanceVariables={handleUpdateInstanceVariables}
          />
        )}
      </main>

      {/* 4. MODAL DIALOG PROMPT FOR LAUNCHING START EVENT FORMS */}
      <AnimatePresence>
        {launchModalProcessId && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="start-instance-modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-xl shadow-2xl p-6 max-w-xl w-full font-sans space-y-4"
            >
              {(() => {
                const proc = processes.find(p => p.id === launchModalProcessId);
                const startNode = proc?.nodes.find(n => n.type === 'startEvent');
                const schema = formSchemas.find(f => f.id === startNode?.formId);

                return (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
                          START PROCESS INSTANCE
                        </h2>
                        <h3 className="text-sm font-black text-slate-800 mt-1">
                          {proc?.name}
                        </h3>
                      </div>
                      <button
                        onClick={() => setLaunchModalProcessId(null)}
                        className="p-1 hover:bg-slate-100 rounded text-gray-400 hover:text-gray-600 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex gap-2 text-xs text-gray-600 leading-normal">
                      <HelpCircle className="w-5 h-5 text-primaryOrange shrink-0" />
                      <p>
                        This workflow carries an assigned instancing form schema representing trial parameters. Fulfill fields below to initiate simulation tokens.
                      </p>
                    </div>

                    {schema ? (
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        handleExecuteLaunch(launchModalProcessId!, launchFormInputs);
                      }} className="space-y-4">
                        <div className="space-y-4 max-h-[300px] overflow-y-auto px-1.5 py-1">
                          {schema.fields.map(field => (
                            <div key={field.id} className="space-y-1">
                              <label className="block text-xs font-bold text-slate-700">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                              </label>

                              {field.type === 'select' ? (
                                <select
                                  required={field.required}
                                  value={launchFormInputs[field.key] || ''}
                                  onChange={(e) => setLaunchFormInputs({ ...launchFormInputs, [field.key]: e.target.value })}
                                  className="w-full text-xs font-sans border border-slate-300 rounded bg-white px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-primaryOrange font-medium"
                                >
                                  <option value="">-- Choose Option --</option>
                                  {field.options?.map((opt, oIdx) => (
                                    <option key={oIdx} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : field.type === 'boolean' ? (
                                <label className="flex items-center gap-2 text-xs text-slate-600 font-semibold py-1">
                                  <input
                                    type="checkbox"
                                    checked={!!launchFormInputs[field.key]}
                                    onChange={(e) => setLaunchFormInputs({ ...launchFormInputs, [field.key]: e.target.checked })}
                                    className="w-4 h-4 text-primaryOrange border-slate-300 rounded focus:ring-primaryOrange"
                                  />
                                  <span>Check to enable attribute</span>
                                </label>
                              ) : field.type === 'date' ? (
                                <input
                                  type="date"
                                  required={field.required}
                                  value={launchFormInputs[field.key] || ''}
                                  onChange={(e) => setLaunchFormInputs({ ...launchFormInputs, [field.key]: e.target.value })}
                                  className="w-full text-xs font-sans border border-slate-300 rounded px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-primaryOrange font-semibold"
                                />
                              ) : (
                                <input
                                  type={field.type === 'number' ? 'number' : 'text'}
                                  required={field.required}
                                  placeholder={field.placeholder || 'Value details...'}
                                  value={launchFormInputs[field.key] !== undefined ? launchFormInputs[field.key] : ''}
                                  onChange={(e) => setLaunchFormInputs({ ...launchFormInputs, [field.key]: e.target.value })}
                                  className="w-full text-xs font-sans border border-slate-300 rounded px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-primaryOrange font-semibold"
                                />
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="pt-4 border-t border-slate-150 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setLaunchModalProcessId(null)}
                            className="px-4 py-2 border border-slate-200 text-slate-600 text-xs rounded hover:bg-slate-50 cursor-pointer font-extrabold"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="bg-green-600 hover:bg-green-700 text-white font-sans text-xs px-5 py-2 rounded shadow-xs cursor-pointer font-bold transition-colors"
                          >
                            Trigger Process Instance
                          </button>
                        </div>
                      </form>
                    ) : (
                      // No Form linked fallback
                      <div className="space-y-4">
                        <p className="text-xs text-gray-500">No start event fields configured. Launching generic simulator token directly.</p>
                        <div className="pt-4 border-t border-slate-150 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setLaunchModalProcessId(null)}
                            className="px-4 py-2 border border-slate-200 text-slate-600 text-xs rounded hover:bg-slate-50 font-extrabold"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExecuteLaunch(launchModalProcessId!, {})}
                            className="bg-green-600 hover:bg-green-700 text-white font-sans text-xs px-5 py-2 rounded font-bold cursor-pointer"
                          >
                            Launch Instance
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
