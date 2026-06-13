/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, Play, Trash2, List, BarChart2, ShieldAlert, 
  Settings, CheckCircle2, AlertCircle, Cpu, Clock, Terminal, HelpCircle
} from 'lucide-react';
import { Process, ProcessInstance } from '../types';

interface CockpitTabProps {
  processInstances: ProcessInstance[];
  processes: Process[];
  onTerminateInstance: (instanceId: string) => void;
  onUpdateInstanceVariables: (instanceId: string, variables: Record<string, any>) => void;
}

export default function CockpitTab({
  processInstances,
  processes,
  onTerminateInstance,
  onUpdateInstanceVariables
}: CockpitTabProps) {
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(
    processInstances[0]?.id || null
  );

  // Filter selector
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'COMPLETED'>('all');

  const displayedInstances = processInstances.filter(inst => {
    if (statusFilter === 'all') return true;
    return inst.status === statusFilter;
  });

  // Current active loaded instance details
  const activeInstance = processInstances.find(i => i.id === selectedInstanceId) || displayedInstances[0];
  
  // Variables modifier scratchpad
  const [editingVarKey, setEditingVarKey] = useState<string | null>(null);
  const [editingVarValue, setEditingVarValue] = useState<string>('');

  const currentProcess = activeInstance ? processes.find(p => p.id === activeInstance.processId) : null;

  // Statistics calculation for KPI cards
  const totalCount = processInstances.length;
  const activeCount = processInstances.filter(i => i.status === 'ACTIVE').length;
  const completedCount = processInstances.filter(i => i.status === 'COMPLETED').length;

  // Variables edit save handler
  const handleSaveVariable = (key: string) => {
    if (!activeInstance) return;
    
    // Guess type convert
    let parsedVal: any = editingVarValue;
    if (editingVarValue === 'true') parsedVal = true;
    else if (editingVarValue === 'false') parsedVal = false;
    else if (!isNaN(Number(editingVarValue)) && editingVarValue.trim() !== '') {
      parsedVal = Number(editingVarValue);
    } else if (editingVarValue.startsWith('"') && editingVarValue.endsWith('"')) {
      parsedVal = editingVarValue.slice(1, -1);
    }

    const nextVars = {
      ...activeInstance.variables,
      [key]: parsedVal
    };

    onUpdateInstanceVariables(activeInstance.id, nextVars);
    setEditingVarKey(null);
  };

  // Helper calculating static graphics coordinates for Cockpit read-only SVG diagram displays
  const renderReadonlyEdge = (edge: any) => {
    if (!currentProcess) return null;
    const sourceNode = currentProcess.nodes.find(n => n.id === edge.sourceRef);
    const targetNode = currentProcess.nodes.find(n => n.id === edge.targetRef);

    if (!sourceNode || !targetNode) return null;

    const sourceWidth = sourceNode.width || (sourceNode.type.includes('Event') ? 42 : 110);
    const sourceHeight = sourceNode.height || (sourceNode.type.includes('Event') ? 42 : 72);
    const targetWidth = targetNode.width || (targetNode.type.includes('Event') ? 42 : 110);
    const targetHeight = targetNode.height || (targetNode.type.includes('Event') ? 42 : 72);

    const x1 = sourceNode.x + sourceWidth / 2;
    const y1 = sourceNode.y + sourceHeight / 2;
    const x2 = targetNode.x + targetWidth / 2;
    const y2 = targetNode.y + targetHeight / 2;

    const hasPassedSource = activeInstance?.completedNodeIds.includes(edge.sourceRef);
    const hasPassedTarget = activeInstance?.completedNodeIds.includes(edge.targetRef);
    const isLineActive = hasPassedSource && (hasPassedTarget || activeInstance?.activeNodeIds.includes(edge.targetRef));

    let pathDefinition = `M ${x1} ${y1} L ${x2} ${y2}`;
    const xDiff = Math.abs(x2 - x1);
    const yDiff = Math.abs(y2 - y1);

    if (xDiff > 30 && yDiff > 30) {
      const midX = x1 + (x2 - x1) / 2;
      pathDefinition = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
    }

    return (
      <g key={edge.id}>
        <path
          d={pathDefinition}
          fill="none"
          stroke={isLineActive ? '#10b981' : '#cbd5e1'}
          strokeWidth={isLineActive ? 3 : 2}
          markerEnd="url(#arrowhead-cockpit)"
          className="transition-all duration-300"
        />
        {edge.name ? (
          <g transform={`translate(${(x1+x2)/2}, ${(y1+y2)/2 - 10})`}>
            <rect x={-45} y={-8} width={90} height={16} rx={3} fill="#f8fafc" stroke="#e2e8f0" strokeWidth={1} />
            <text textAnchor="middle" y={3} className="text-[9px] font-medium fill-slate-500 font-sans">{edge.name}</text>
          </g>
        ) : null}
      </g>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-50 overflow-hidden font-sans" id="cockpit-workspace">
      
      {/* 1. TOP STATS OVERVIEW CARDS */}
      <div className="bg-slate-900 text-white p-4.5 px-6 flex items-center justify-between shadow-sm shrink-0 select-none border-b border-orange-500/20" id="cockpit-top-banner">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-600 rounded-md">
            <Activity className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-sans font-extrabold tracking-tight">Camunda Engine Cockpit</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">Live monitoring, instance audit logging trails, and tokens debugger.</p>
          </div>
        </div>

        {/* Dashboard statistics metrics */}
        <div className="flex items-center gap-6 text-center">
          <div className="px-3 border-r border-slate-700/80">
            <div className="text-xs text-slate-400 font-medium">Launched Instances</div>
            <div className="text-base font-extrabold text-white font-mono">{totalCount}</div>
          </div>
          <div className="px-3 border-r border-slate-700/80">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block animate-ping" />
              <span>Running Tokens</span>
            </div>
            <div className="text-base font-extrabold text-blue-400 font-mono">{activeCount}</div>
          </div>
          <div className="px-3">
            <div className="text-xs text-slate-400 font-medium">Completed Jobs</div>
            <div className="text-base font-extrabold text-green-400 font-mono">{completedCount}</div>
          </div>
        </div>
      </div>

      {/* 2. THREE PANEL WORKSPACE SPLIT DOCK */}
      <div className="flex-grow flex overflow-hidden w-full h-full" id="cockpit-main-viewport">
        
        {/* LEFT PANEL: LAUNCHED INSTANCE LIST */}
        <div className="w-68 border-r border-slate-200 bg-white flex flex-col shrink-0 select-none overflow-y-auto" id="cockpit-instances-sidebar">
          
          {/* Quick Filter toggle */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col gap-2">
            <span className="text-[10px] font-sans font-bold text-gray-500 uppercase tracking-widest leading-none">
              Filter by Task Status
            </span>
            <div className="grid grid-cols-3 gap-0.5 mt-1 border border-slate-200 rounded p-0.5 bg-white">
              <button
                onClick={() => setStatusFilter('all')}
                className={`text-[9px] font-bold py-1 rounded transition text-center cursor-pointer ${
                  statusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-gray-500 hover:bg-slate-100'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`text-[9px] font-bold py-1 rounded transition text-center cursor-pointer ${
                  statusFilter === 'ACTIVE' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-slate-100'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('COMPLETED')}
                className={`text-[9px] font-bold py-1 rounded transition text-center cursor-pointer ${
                  statusFilter === 'COMPLETED' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-slate-100'
                }`}
              >
                Done
              </button>
            </div>
          </div>

          {/* Instances Rows list */}
          <div className="divide-y divide-slate-100 flex-grow" id="instances-list-rows">
            {displayedInstances.length === 0 ? (
              <div className="p-8 text-center text-slate-300 space-y-2 mt-12 select-none">
                <Terminal className="w-8 h-8 mx-auto text-slate-200" />
                <p className="text-xs">No matching running instances cataloged.</p>
              </div>
            ) : (
              displayedInstances.map((inst) => {
                const isSelected = activeInstance?.id === inst.id;

                return (
                  <div
                    key={inst.id}
                    onClick={() => setSelectedInstanceId(inst.id)}
                    className={`p-3.5 text-left transition-all cursor-pointer relative ${
                      isSelected 
                        ? 'bg-slate-100/70 border-l-4 border-slate-800' 
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between select-none mb-1">
                      <span className="font-mono text-[9px] text-gray-500 font-extrabold bg-slate-200 rounded px-1 max-w-[120px] truncate">
                        ID: {inst.id}
                      </span>
                      <span className={`text-[9px] font-bold font-sans px-1 rounded uppercase ${
                        inst.status === 'ACTIVE' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {inst.status}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-slate-800 line-clamp-1">
                      {inst.processName}
                    </h3>

                    <div className="flex justify-between items-center text-[10px] text-gray-400 mt-1 select-none">
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3 text-slate-300" />
                        {new Date(inst.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>Variables: {Object.keys(inst.variables || {}).length}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT AREA PANEL: SCROLL DIAGRAMS AND VALUE TABLES DETAILS */}
        {activeInstance ? (
          <div className="flex-grow flex flex-col overflow-y-auto bg-slate-100 h-full p-6" id="instance-details-workspace">
            <div className="max-w-5xl mx-auto w-full space-y-6 flex flex-col min-h-full">
              
              {/* Context bar overview */}
              <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-3xs flex items-center justify-between select-none shrink-0" id="cockpit-detail-idbar">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded-md ${activeInstance.status === 'ACTIVE' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-slate-800">
                      Instance Details
                    </h2>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                      Instance UUID: <font className="text-slate-600 font-bold">{activeInstance.id}</font> | Template Ref: {activeInstance.processId}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {activeInstance.status === 'ACTIVE' && (
                    <button
                      onClick={() => onTerminateInstance(activeInstance.id)}
                      className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white font-sans text-xs px-2.5 py-1.5 font-bold rounded shadow-xs cursor-pointer transition-colors"
                      id="terminate-instance-btn"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Cancel Instance</span>
                    </button>
                  )}
                </div>
              </div>

              {/* READ-ONLY BPMN HIGHLIGHT DIAGRAM MAP */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-3xs overflow-hidden flex flex-col shrink-0" id="cockpit-diagram-card">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between select-none">
                  <div className="text-[10px] font-sans font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 bg-white border border-slate-200 p-1 px-2.5 rounded shadow-2xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animation px-0 border border-emerald-600" />
                    <span>Real-time Token Position diagram map</span>
                  </div>
                  
                  <div className="flex gap-4 text-[10px] text-gray-500 font-sans font-bold">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] inline-block" /> Completed Path
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0ea5e9] inline-block animate-pulse" /> Active Token Pos
                    </span>
                  </div>
                </div>

                {/* SVG Visual Representation viewport */}
                <div className="w-full h-72 border-b border-slate-100 relative bg-slate-50/50">
                  {currentProcess ? (
                    <svg className="w-full h-full select-none" id="cockpit-visual-diagram">
                      <defs>
                        <marker
                          id="arrowhead-cockpit"
                          markerWidth="10"
                          markerHeight="7"
                          refX="10"
                          refY="3.5"
                          orient="auto"
                        >
                          <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                        </marker>
                      </defs>

                      {/* Align center offset slightly */}
                      <g transform="translate(50, 40)">
                        {/* Process Edges arrows */}
                        {currentProcess.edges.map(renderReadonlyEdge)}

                        {/* Process Nodes circles/rects */}
                        {currentProcess.nodes.map(node => {
                          const width = node.width || (node.type.includes('Event') ? 42 : 110);
                          const height = node.height || (node.type.includes('Event') ? 42 : 72);

                          const isMarkedActive = activeInstance.activeNodeIds.includes(node.id);
                          const isMarkedDone = activeInstance.completedNodeIds.includes(node.id);

                          return (
                            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                              
                              {/* Draw shapes matching types */}
                              {node.type.includes('Event') || node.type.includes('event') ? (
                                <circle
                                  cx={width / 2}
                                  cy={height / 2}
                                  r={width / 2}
                                  fill={isMarkedActive ? '#f0fdf4' : '#fafafa'}
                                  stroke={
                                    isMarkedActive ? '#0284c7' :
                                    isMarkedDone ? '#10b981' : '#cbd5e1'
                                  }
                                  strokeWidth={
                                    isMarkedActive ? 4 :
                                    isMarkedDone ? 3 : 1.5
                                  }
                                  className={isMarkedActive ? 'stroke-sky-500 animate-pulse' : ''}
                                />
                              ) : node.type.includes('Gateway') || node.type.includes('gateway') ? (
                                <polygon
                                  points={`${width / 2} 0, ${width} ${height / 2}, ${width / 2} ${height}, 0 ${height / 2}`}
                                  fill="#fffbeb"
                                  stroke={
                                    isMarkedActive ? '#0ea5e9' :
                                    isMarkedDone ? '#10b981' : '#f59e0b'
                                  }
                                  strokeWidth={isMarkedActive ? 4 : isMarkedDone ? 3 : 1.5}
                                  className={isMarkedActive ? 'animate-pulse' : ''}
                                />
                              ) : (
                                <rect
                                  width={width}
                                  height={height}
                                  rx={5}
                                  fill="#ffffff"
                                  stroke={
                                    isMarkedActive ? '#0ea5e9' :
                                    isMarkedDone ? '#10b981' : '#e2e8f0'
                                  }
                                  strokeWidth={isMarkedActive ? 3.5 : isMarkedDone ? 2.5 : 1.5}
                                  className={isMarkedActive ? 'ring-4 ring-sky-500/10' : ''}
                                />
                              )}

                              {/* Label text */}
                              <text
                                x={width / 2}
                                y={node.type.includes('Event') ? height + 15 : height / 2 + 3}
                                textAnchor="middle"
                                className={`text-[9px] font-sans font-bold select-none ${
                                  isMarkedActive ? 'fill-sky-700' :
                                  isMarkedDone ? 'fill-emerald-700' : 'fill-slate-600'
                                }`}
                              >
                                {node.name.length > 20 ? node.name.slice(0, 18) + '...' : node.name}
                              </text>

                              {/* Small running indicators */}
                              {isMarkedActive && (
                                <circle
                                  cx={width}
                                  cy={0}
                                  r={6}
                                  fill="#3b82f6"
                                  className="stroke-white stroke-1 animate-bounce"
                                />
                              )}
                            </g>
                          );
                        })}
                      </g>
                    </svg>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 font-sans">
                      Visual diagram map could not resolve.
                    </div>
                  )}
                </div>
              </div>

              {/* DUAL COLUMN: SCOPE VARIABLES SPREADSHEET & AUDIT TRACE LOGS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start h-full">
                
                {/* COLUMN LEFT: SCOPE VARIABLES MANAGER */}
                <div className="bg-white border border-slate-200 rounded-lg shadow-3xs overflow-hidden">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between select-none">
                    <span className="text-[10px] font-sans font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <List className="w-4 h-4 text-slate-400" />
                      <span>Process instance variables spreadsheet</span>
                    </span>
                  </div>

                  <div className="p-4" id="variables-manager-block">
                    <p className="text-[11px] text-gray-500 leading-normal mb-3.5 font-sans">
                      Inspect variables bound inside this process instance scope framework. Double-click or select a row key to manually override variables.
                    </p>

                    <div className="border border-slate-100 rounded-lg overflow-hidden">
                      <table className="w-full border-collapse font-sans text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left">
                            <th className="p-2 pl-3 select-none">Variable Key Name</th>
                            <th className="p-2 select-none">Value</th>
                            <th className="p-2 text-center select-none w-16">Override</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {Object.keys(activeInstance.variables).length === 0 ? (
                            <tr>
                              <td colSpan={3} className="p-6 text-center text-gray-400 italic font-sans text-xs select-none">
                                No scope variables initialized yet in this launched instance.
                              </td>
                            </tr>
                          ) : (
                            Object.entries(activeInstance.variables).map(([key, value]) => {
                              const isEditing = editingVarKey === key;

                              return (
                                <tr key={key} className="hover:bg-slate-50/50">
                                  <td className="p-2 pl-3 font-semibold text-gray-500">{key}</td>
                                  
                                  <td className="p-2">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editingVarValue}
                                        onChange={(e) => setEditingVarValue(e.target.value)}
                                        className="border border-slate-300 rounded px-1.5 py-0.5 text-xs font-mono font-bold bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-primaryOrange w-full h-6"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveVariable(key);
                                          if (e.key === 'Escape') setEditingVarKey(null);
                                        }}
                                        autoFocus
                                      />
                                    ) : (
                                      <span className="text-slate-800 font-bold truncate max-w-[170px] inline-block" title={typeof value === 'object' ? JSON.stringify(value) : String(value)}>
                                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                      </span>
                                    )}
                                  </td>

                                  <td className="p-2 text-center text-xs">
                                    {isEditing ? (
                                      <div className="flex gap-1 justify-center">
                                        <button
                                          onClick={() => handleSaveVariable(key)}
                                          className="text-emerald-600 hover:text-emerald-800 p-0.5 font-bold hover:bg-emerald-50 rounded cursor-pointer"
                                          title="Save override value"
                                        >
                                          ✓
                                        </button>
                                        <button
                                          onClick={() => setEditingVarKey(null)}
                                          className="text-red-500 hover:text-red-700 p-0.5 font-bold hover:bg-red-50 rounded cursor-pointer"
                                          title="Quit"
                                        >
                                          X
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setEditingVarKey(key);
                                          setEditingVarValue(typeof value === 'object' ? JSON.stringify(value) : String(value));
                                        }}
                                        className="text-primaryOrange hover:scale-105 active:scale-95 transition-transform text-[10px] font-sans font-bold bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded cursor-pointer"
                                        title="Click to override variables value"
                                      >
                                        Set Value
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* COLUMN RIGHT: CHRONOLOGICAL AUDIT LOG TRACE */}
                <div className="bg-white border border-slate-200 rounded-lg shadow-3xs overflow-hidden">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between select-none">
                    <span className="text-[10px] font-sans font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-slate-500" />
                      <span>Engine chronological Audit Log trace</span>
                    </span>
                  </div>

                  <div className="p-4 flex flex-col justify-between max-h-[350px] overflow-y-auto space-y-4" id="audit-trace-block">
                    {activeInstance.auditLog && activeInstance.auditLog.length > 0 ? (
                      <div className="relative border-l-2 border-slate-200 ml-2.5 pl-3.5 space-y-4 font-sans">
                        {activeInstance.auditLog.map((log) => (
                          <div key={log.id} className="relative text-xs">
                            
                            {/* Circle bullet representation */}
                            <span className="absolute -left-[21px] top-0.5 w-3 h-3 rounded-full bg-slate-300 border-2 border-white ring-2 ring-slate-100" />

                            <div className="flex items-center justify-between font-mono text-[9px] text-gray-400 select-none">
                              <span>{log.nodeType.toUpperCase()} ({log.action})</span>
                              <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            </div>

                            <h4 className="font-bold text-slate-800 font-sans mt-0.5">
                              {log.nodeName}
                            </h4>

                            {log.details && (
                              <p className="text-[11px] text-gray-500 leading-normal mt-0.5 bg-slate-50 p-1.5 rounded border border-slate-100 font-mono">
                                {log.details}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-300 space-y-2 select-none">
                        <Terminal className="w-8 h-8 mx-auto" />
                        <p className="text-xs">No audit lines reported.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-slate-400 text-center p-8 select-none bg-slate-100" id="cockpit-no-instance-msg">
            <BarChart2 className="w-14 h-14 text-slate-300 animate-pulse" />
            <div>
              <h3 className="text-sm font-bold text-slate-600">No launching instances registered</h3>
              <p className="text-xs max-w-sm mt-1 leading-normal">
                Go to the <b>BPMN Modeler</b> tab options and trigger &quot;Start Execution&quot; on ready templates.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
