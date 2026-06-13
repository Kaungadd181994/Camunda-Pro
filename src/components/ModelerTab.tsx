/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Plus, Trash2, ArrowRight, X, Settings, Check, 
  Layers, User, Cpu, Database, Disc, CircleDot, RefreshCw, 
  Download, Upload, HelpCircle, FileJson, Move
} from 'lucide-react';
import { Process, BpmnNode, BpmnEdge, BpmnNodeType, DmnTable, FormSchema } from '../types';
import { generateId } from '../utils/bpmnEngine';

interface ModelerTabProps {
  processes: Process[];
  selectedProcessId: string;
  onSelectProcessId: (id: string) => void;
  onUpdateProcesses: (list: Process[]) => void;
  dmnTables: DmnTable[];
  formSchemas: FormSchema[];
  onStartInstance: (processId: string, initialVariables?: Record<string, any>) => void;
}

export default function ModelerTab({
  processes,
  selectedProcessId,
  onSelectProcessId,
  onUpdateProcesses,
  dmnTables,
  formSchemas,
  onStartInstance
}: ModelerTabProps) {
  const currentProcess = processes.find(p => p.id === selectedProcessId) || processes[0];
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  
  // Connection state: drawing links
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  
  // Canvas offset positioning for panning
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  
  // Dragging a node state variables
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragStartCoords, setDragStartCoords] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<SVGSVGElement | null>(null);

  // Auto select nodes
  const selectNode = (id: string) => {
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
  };

  const selectEdge = (id: string) => {
    setSelectedEdgeId(id);
    setSelectedNodeId(null);
  };

  // Safe updates helper
  const updateCurrentProcess = (updated: Process) => {
    const list = processes.map(p => p.id === updated.id ? updated : p);
    onUpdateProcesses(list);
  };

  // Node operations
  const addNode = (type: BpmnNodeType) => {
    if (!currentProcess) return;
    
    // Choose location within view center
    const x = 150 + Math.random() * 100;
    const y = 150 + Math.random() * 100;

    let defaultName = 'Task';
    switch (type) {
      case 'startEvent': defaultName = 'Start Event'; break;
      case 'endEvent': defaultName = 'End Event'; break;
      case 'userTask': defaultName = 'User Task'; break;
      case 'serviceTask': defaultName = 'Service Task'; break;
      case 'dmnTask': defaultName = 'Business Rule'; break;
      case 'exclusiveGateway': defaultName = 'Exclusive Gateway'; break;
      case 'parallelGateway': defaultName = 'Parallel Gateway'; break;
    }

    const newNode: BpmnNode = {
      id: generateId(type),
      name: defaultName,
      type,
      x,
      y,
      width: type.includes('Gateway') ? 50 : type.includes('Event') ? 42 : 110,
      height: type.includes('Gateway') ? 50 : type.includes('Event') ? 42 : 72
    };

    // Auto setup hooks
    if (type === 'dmnTask' && dmnTables.length > 0) {
      newNode.dmnId = dmnTables[0].id;
    }
    if (type === 'userTask' && formSchemas.length > 0) {
      newNode.formId = formSchemas[0].id;
      newNode.assignee = 'Operations Team';
    }
    if (type === 'serviceTask') {
      newNode.serviceAction = 'sendEmail';
      newNode.serviceResultVar = 'emailOutcome';
    }

    const updated: Process = {
      ...currentProcess,
      nodes: [...currentProcess.nodes, newNode],
      updatedAt: new Date().toISOString()
    };
    updateCurrentProcess(updated);
    setSelectedNodeId(newNode.id);
  };

  const deleteSelected = () => {
    if (!currentProcess) return;

    if (selectedNodeId) {
      const updatedNodes = currentProcess.nodes.filter(n => n.id !== selectedNodeId);
      // Clean up connected margins/edges
      const updatedEdges = currentProcess.edges.filter(
        e => e.sourceRef !== selectedNodeId && e.targetRef !== selectedNodeId
      );

      updateCurrentProcess({
        ...currentProcess,
        nodes: updatedNodes,
        edges: updatedEdges,
        updatedAt: new Date().toISOString()
      });
      setSelectedNodeId(null);
    } else if (selectedEdgeId) {
      const updatedEdges = currentProcess.edges.filter(e => e.id !== selectedEdgeId);
      updateCurrentProcess({
        ...currentProcess,
        edges: updatedEdges,
        updatedAt: new Date().toISOString()
      });
      setSelectedEdgeId(null);
    }
  };

  // Node Property edits helper
  const updateNodeProperty = (nodeId: string, property: keyof BpmnNode, value: any) => {
    if (!currentProcess) return;
    const nodes = currentProcess.nodes.map(n => {
      if (n.id === nodeId) {
        return { ...n, [property]: value };
      }
      return n;
    });

    updateCurrentProcess({
      ...currentProcess,
      nodes,
      updatedAt: new Date().toISOString()
    });
  };

  // Edge Property edits helper
  const updateEdgeProperty = (edgeId: string, property: keyof BpmnEdge, value: any) => {
    if (!currentProcess) return;
    const edges = currentProcess.edges.map(e => {
      if (e.id === edgeId) {
        return { ...e, [property]: value };
      }
      return e;
    });

    updateCurrentProcess({
      ...currentProcess,
      edges,
      updatedAt: new Date().toISOString()
    });
  };

  // Handles starting a connection process
  const startConnecting = (sourceId: string) => {
    setIsConnecting(true);
    setConnectSourceId(sourceId);
  };

  const handleNodeClick = (clickedNodeId: string) => {
    if (isConnecting && connectSourceId) {
      if (connectSourceId !== clickedNodeId) {
        // Create SequenceFlow
        const newEdge: BpmnEdge = {
          id: generateId('edge'),
          sourceRef: connectSourceId,
          targetRef: clickedNodeId,
          name: ''
        };

        const updated: Process = {
          ...currentProcess,
          edges: [...currentProcess.edges, newEdge],
          updatedAt: new Date().toISOString()
        };
        updateCurrentProcess(updated);
        setSelectedEdgeId(newEdge.id);
      }
      setIsConnecting(false);
      setConnectSourceId(null);
    } else {
      selectNode(clickedNodeId);
    }
  };

  // SVG Canvas event handlers for standard dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as SVGElement;
    if (target.id === 'bpmn-canvas-bg') {
      setIsPanning(true);
      setStartPan({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - startPan.x;
      const dy = e.clientY - startPan.y;
      setPanOffset(p => ({ x: p.x + dx, y: p.y + dy }));
      setStartPan({ x: e.clientX, y: e.clientY });
    } else if (draggingNodeId) {
      const dx = e.clientX - dragStartCoords.x;
      const dy = e.clientY - dragStartCoords.y;
      
      const node = currentProcess?.nodes.find(n => n.id === draggingNodeId);
      if (node) {
        // Snap to grid standard coordinates
        const snap = 5;
        const rawX = node.x + dx;
        const rawY = node.y + dy;
        const newX = Math.round(rawX / snap) * snap;
        const newY = Math.round(rawY / snap) * snap;

        updateNodeProperty(draggingNodeId, 'x', newX);
        updateNodeProperty(draggingNodeId, 'y', newY);
      }
      setDragStartCoords({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  // Node dragging init
  const initiateNodeDrag = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggingNodeId(nodeId);
    setDragStartCoords({ x: e.clientX, y: e.clientY });
    selectNode(nodeId);
  };

  // JSON configurations file handling (Import/Export)
  const exportProcessConfig = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentProcess, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `camunda-process-${currentProcess.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importProcessConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string) as Process;
          if (parsed.id && parsed.nodes && parsed.edges) {
            // Keep unique ID
            parsed.id = parsed.id + '-imported';
            parsed.name = parsed.name + ' (Imported)';
            parsed.updatedAt = new Date().toISOString();
            onUpdateProcesses([...processes, parsed]);
            onSelectProcessId(parsed.id);
          } else {
            alert('Invalid process JSON structure. Must contain id, nodes, and edges.');
          }
        } catch (err) {
          alert('Could not parse process file. Please upload a valid JSON config.');
        }
      };
    }
  };

  const handleCreateNewSchema = () => {
    const newProcId = generateId('process');
    const newProc: Process = {
      id: newProcId,
      name: 'New Modeler Process Workflow',
      description: 'Model custom tasks, parallel pathways, decision tasks, and gateway splits.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [
        { id: 'start-1', name: 'Start Trigger', type: 'startEvent', x: 80, y: 150 },
        { id: 'end-1', name: 'End Goal', type: 'endEvent', x: 500, y: 150 }
      ],
      edges: [
        { id: 'edge-initial', sourceRef: 'start-1', targetRef: 'end-1' }
      ]
    };
    onUpdateProcesses([...processes, newProc]);
    onSelectProcessId(newProcId);
    setSelectedNodeId('start-1');
  };

  // Helper calculation for straight or slightly offset vector paths for BPMN connections
  const renderEdgeLine = (edge: BpmnEdge) => {
    const sourceNode = currentProcess?.nodes.find(n => n.id === edge.sourceRef);
    const targetNode = currentProcess?.nodes.find(n => n.id === edge.targetRef);

    if (!sourceNode || !targetNode) return null;

    // Calculate center coordinates
    const sourceWidth = sourceNode.width || (sourceNode.type.includes('Event') ? 42 : 110);
    const sourceHeight = sourceNode.height || (sourceNode.type.includes('Event') ? 42 : 72);
    const targetWidth = targetNode.width || (targetNode.type.includes('Event') ? 42 : 110);
    const targetHeight = targetNode.height || (targetNode.type.includes('Event') ? 42 : 72);

    const x1 = sourceNode.x + sourceWidth / 2;
    const y1 = sourceNode.y + sourceHeight / 2;
    const x2 = targetNode.x + targetWidth / 2;
    const y2 = targetNode.y + targetHeight / 2;

    const isSelected = selectedEdgeId === edge.id;

    // We can draw a clean orthogonal line or a direct line. A direct line is very robust.
    // Let's create orthogonal routing lines if offset is large to model strict BPMN aesthetics!
    let pathDefinition = `M ${x1} ${y1} L ${x2} ${y2}`;
    const xDiff = Math.abs(x2 - x1);
    const yDiff = Math.abs(y2 - y1);

    if (xDiff > 30 && yDiff > 30) {
      // Draw standard L-shaped Orthogonal layout
      const midX = x1 + (x2 - x1) / 2;
      pathDefinition = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
    }

    // Midpoint for placing text/label tags
    const labelX = x1 + (x2 - x1) / 2;
    const labelY = y1 + (y2 - y1) / 2 - 10;

    return (
      <g key={edge.id} className="cursor-pointer group" onClick={(e) => { e.stopPropagation(); selectEdge(edge.id); }}>
        {/* Thick interactive overlay path to support easy mouse hover clicking */}
        <path
          d={pathDefinition}
          fill="none"
          stroke="transparent"
          strokeWidth={14}
        />
        {/* Core BPMN route line */}
        <path
          d={pathDefinition}
          fill="none"
          stroke={isSelected ? '#f35a00' : '#4b5563'}
          strokeWidth={isSelected ? 3 : 2}
          markerEnd="url(#arrowhead)"
          className="transition-colors group-hover:stroke-primaryOrange"
        />
        {/* Optional text badge labels for gateway conditions */}
        {edge.name || edge.conditionExpression ? (
          <g>
            <rect
              x={labelX - 60}
              y={labelY - 10}
              width={120}
              height={22}
              rx={4}
              fill="#ffffff"
              stroke={isSelected ? '#f35a00' : '#e5e7eb'}
              strokeWidth={1}
              className="drop-shadow-sm"
            />
            <text
              cx={labelX}
              x={labelX}
              y={labelY + 5}
              textAnchor="middle"
              className="text-[10px] font-mono fill-gray-700 font-medium select-none text-center"
            >
              {edge.name || edge.conditionExpression}
            </text>
          </g>
        ) : null}
      </g>
    );
  };

  const getIconForType = (type: BpmnNodeType) => {
    switch (type) {
      case 'startEvent': return <CircleDot className="w-5 h-5 text-emerald-600" />;
      case 'endEvent': return <Disc className="w-5 h-5 text-red-600" />;
      case 'userTask': return <User className="w-5 h-5 text-sky-600" />;
      case 'serviceTask': return <Cpu className="w-5 h-5 text-orange-600" />;
      case 'dmnTask': return <Database className="w-5 h-5 text-fuchsia-600" />;
      case 'exclusiveGateway': return <Layers className="w-5 h-5 text-amber-600" />;
      case 'parallelGateway': return <Layers className="w-5 h-5 text-indigo-600" />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-slate-50 overflow-hidden relative" id="bpmn-modeler-tab-view">
      
      {/* 1. LEFT MODELLER PALETTE & DIRECTORIES PANEL */}
      <div className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 select-none" id="palette-sidebar">
        
        {/* Selection selector */}
        <div className="p-3 border-b border-slate-200 bg-slate-50">
          <label className="block text-[10px] font-sans font-bold text-gray-500 uppercase tracking-wider mb-2">
            Active Diagram Workflow
          </label>
          <div className="flex gap-1.5">
            <select
              value={selectedProcessId}
              onChange={(e) => onSelectProcessId(e.target.value)}
              className="w-full text-xs font-sans border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primaryOrange bg-white font-medium"
              id="modeler-process-select"
            >
              {processes.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              onClick={handleCreateNewSchema}
              title="Create New Process"
              className="p-1 px-2.5 border border-slate-300 rounded bg-white hover:bg-slate-50 text-gray-700 font-medium active:bg-slate-100 flex items-center justify-center cursor-pointer text-xs"
              id="new-process-btn"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BPMN Drag/Click Element Adders */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <div>
            <h4 className="text-[10px] font-sans font-bold text-gray-400 uppercase tracking-widest mb-3">
              BPMN 2.0 ELEMENTS
            </h4>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => addNode('startEvent')}
                className="flex items-center gap-2.5 p-2 py-2.5 text-left text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-all cursor-pointer font-sans"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-300 flex items-center justify-center shadow-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <span>Start Event</span>
              </button>

              <button
                onClick={() => addNode('userTask')}
                className="flex items-center gap-2.5 p-2 py-2.5 text-left text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-all cursor-pointer font-sans"
              >
                <div className="w-6 h-5 rounded bg-sky-50 border border-sky-300 flex items-center justify-center shadow-xs">
                  <User className="w-3.5 h-3.5 text-sky-600" />
                </div>
                <span>User Task</span>
              </button>

              <button
                onClick={() => addNode('serviceTask')}
                className="flex items-center gap-2.5 p-2 py-2.5 text-left text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-all cursor-pointer font-sans"
              >
                <div className="w-6 h-5 rounded bg-orange-50 border border-orange-300 flex items-center justify-center shadow-xs">
                  <Cpu className="w-3.5 h-3.5 text-orange-600" />
                </div>
                <span>Service Task</span>
              </button>

              <button
                onClick={() => addNode('dmnTask')}
                className="flex items-center gap-2.5 p-2 py-2.5 text-left text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-all cursor-pointer font-sans"
              >
                <div className="w-6 h-5 rounded bg-fuchsia-50 border border-fuchsia-300 flex items-center justify-center shadow-xs">
                  <Database className="w-3.5 h-3.5 text-fuchsia-600" />
                </div>
                <span>Business Rule Task (DMN)</span>
              </button>

              <button
                onClick={() => addNode('exclusiveGateway')}
                className="flex items-center gap-2.5 p-2 py-2.5 text-left text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-all cursor-pointer font-sans"
              >
                <div className="w-5 h-5 bg-amber-50 border border-amber-300 rotate-45 flex items-center justify-center shadow-xs ml-0.5">
                  <span className="-rotate-45 text-[10px] font-bold text-amber-700">X</span>
                </div>
                <span>Exclusive Gateway</span>
              </button>

              <button
                onClick={() => addNode('parallelGateway')}
                className="flex items-center gap-2.5 p-2 py-2.5 text-left text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-all cursor-pointer font-sans"
              >
                <div className="w-5 h-5 bg-indigo-50 border border-indigo-300 rotate-45 flex items-center justify-center shadow-xs ml-0.5">
                  <span className="-rotate-45 text-xs font-bold text-indigo-700">+</span>
                </div>
                <span>Parallel Gateway</span>
              </button>

              <button
                onClick={() => addNode('endEvent')}
                className="flex items-center gap-2.5 p-2 py-2.5 text-left text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-all cursor-pointer font-sans"
              >
                <div className="w-6 h-6 rounded-full bg-red-50 border-2 border-red-500 flex items-center justify-center shadow-xs">
                  <div className="w-2 h-2 rounded-full bg-red-600" />
                </div>
                <span>End Event</span>
              </button>
            </div>
          </div>

          {/* Import / Export utility widgets */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <h4 className="text-[10px] font-sans font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              DATA SYNC
            </h4>
            <div className="flex flex-col gap-2">
              <button
                onClick={exportProcessConfig}
                className="flex items-center justify-center gap-2 w-full p-1.5 text-xs text-gray-700 border border-slate-200 hover:bg-slate-50 rounded cursor-pointer font-sans"
                id="export-process-btn"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export BPMN Map</span>
              </button>

              <label 
                className="flex items-center justify-center gap-2 w-full p-1.5 text-xs text-gray-700 border border-slate-200 hover:bg-slate-50 rounded cursor-pointer font-sans text-center"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import BPMN Map</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={importProcessConfig}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Informative Help Guide tip */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-[11px] text-gray-500 space-y-1.5 font-sans" id="help-hint-block">
          <div className="flex gap-1 items-center font-bold text-slate-700">
            <HelpCircle className="w-3.5 h-3.5 text-primaryOrange" />
            <span>Modeling Pro-Tips:</span>
          </div>
          <p className="leading-relaxed">
            1. Drag nodes directly on the canvas to layout. <br/>
            2. Select a node and click the orange <b className="text-primaryOrange">Connect</b> tool. Then select another node to branch. <br/>
            3. Modify properties on the Right panel.
          </p>
        </div>
      </div>

      {/* 2. CENTER STAGE - INTERACTIVE WORKSPACE VECTOR CANVAS */}
      <div className="flex-1 relative h-full bg-slate-100 overflow-hidden flex flex-col" id="bpmn-canvas-stage">
        
        {/* Workspace Mini-Toolbar Header */}
        <div className="bg-white border-b border-slate-200 p-2.5 px-4 flex items-center justify-between shadow-xs relative z-10">
          <div className="flex items-center gap-2">
            <div>
              <h2 className="text-xs font-sans font-bold text-slate-800" id="current-diagram-title">
                {currentProcess?.name || 'My Automator Modeler'}
              </h2>
              <p className="text-[11px] text-gray-400 font-sans font-medium line-clamp-1">
                {currentProcess?.description || 'Build process flows using BPMN standards.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onStartInstance(currentProcess.id)}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-sans text-xs px-3 py-1.5 rounded font-bold shadow-xs transition-colors cursor-pointer"
              id="modeler-run-instance-btn"
            >
              <Play className="w-3.5 h-3.5 fill-white text-transparent" />
              <span>Start Execution</span>
            </button>
            <button
              onClick={deleteSelected}
              disabled={!selectedNodeId && !selectedEdgeId}
              className={`p-1.5 rounded transition bg-white border border-slate-200 cursor-pointer text-gray-600 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed`}
              title="Delete selected item"
              id="canvas-delete-tool"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Connection Notice banner */}
        <AnimatePresence>
          {isConnecting && (
            <motion.div
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -40, opacity: 0 }}
              className="absolute top-14 left-1/2 transform -translate-x-1/2 bg-amber-600 text-white text-xs px-4 py-1.5 rounded-full shadow-md z-30 flex items-center gap-2"
              id="connect-routing-prompt"
            >
              <ArrowRight className="w-4 h-4 animate-pulse" />
              <span>Connecting: Click target node to draw SequenceFlow edge arrow...</span>
              <button 
                onClick={() => { setIsConnecting(false); setConnectSourceId(null); }}
                className="p-0.5 hover:bg-amber-700 rounded-full cursor-pointer ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Vector SVG viewport */}
        <div className="flex-1 w-full h-full outline-none relative overflow-hidden" id="canvas-draggable-container">
          <svg
            id="bpmn-canvas"
            ref={canvasRef}
            className="w-full h-full select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* Grid Pattern Background for authenticity */}
            <defs>
              <pattern id="grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="1" />
              </pattern>
              
              {/* Arrow Marker for SequenceFlow lines */}
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#4b5563" />
              </marker>
            </defs>

            {/* Clickable Panning Background */}
            <rect
              id="bpmn-canvas-bg"
              width="3000"
              height="3000"
              fill="url(#grid-pattern)"
              className="cursor-grab active:cursor-grabbing"
            />

            {/* Panned viewport translation container */}
            <g transform={`translate(${panOffset.x}, ${panOffset.y})`}>
              
              {/* Render edges & connectors */}
              {currentProcess?.edges.map(renderEdgeLine)}

              {/* Render Nodes */}
              {currentProcess?.nodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const width = node.width || (node.type.includes('Event') ? 42 : 110);
                const height = node.height || (node.type.includes('Event') ? 42 : 72);

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-move group/node"
                    onMouseDown={(e) => initiateNodeDrag(e, node.id)}
                    onClick={(e) => { e.stopPropagation(); handleNodeClick(node.id); }}
                  >
                    {/* Render visual box shapes dependent on element type */}
                    
                    {/* A. Events: Circle */}
                    {node.type.includes('event') || node.type.includes('Event') ? (
                      <circle
                        cx={width / 2}
                        cy={height / 2}
                        r={width / 2}
                        fill={node.type === 'startEvent' ? '#f0fdf4' : '#fef2f2'}
                        stroke={node.type === 'startEvent' ? '#10b981' : '#ef4444'}
                        strokeWidth={node.type === 'endEvent' ? 4 : 2}
                        filter="drop-shadow(0 1px 2px rgba(0,0,0,0.05))"
                        className={`transition-colors ${
                          isSelected ? 'stroke-primaryOrange ring-4 ring-primaryOrange/20' : 'group-hover/node:stroke-primaryOrange'
                        }`}
                      />
                    ) : node.type.includes('gateway') || node.type.includes('Gateway') ? (
                      /* B. Gateways: Diamond shape */
                      <polygon
                        points={`${width / 2} 0, ${width} ${height / 2}, ${width / 2} ${height}, 0 ${height / 2}`}
                        fill="#fffbeb"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        filter="drop-shadow(0 1px 2px rgba(0,0,0,0.05))"
                        className={`transition-colors ${
                          isSelected ? 'stroke-primaryOrange' : 'group-hover/node:stroke-primaryOrange'
                        }`}
                      />
                    ) : (
                      /* C. Tasks: Rounded rectangular blocks */
                      <rect
                        width={width}
                        height={height}
                        rx={6}
                        fill="#ffffff"
                        stroke={
                          node.type === 'userTask' ? '#0ea5e9' :
                          node.type === 'serviceTask' ? '#f97316' : '#d946ef'
                        }
                        strokeWidth={1.5}
                        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.02))"
                        className={`transition-colors ${
                          isSelected ? 'stroke-primaryOrange ring-4 ring-primaryOrange/20' : 'group-hover/node:stroke-primaryOrange'
                        }`}
                      />
                    )}

                    {/* Left Stripe Decorator on Task Boxes */}
                    {!node.type.includes('gateway') && !node.type.includes('event') && !node.type.includes('Gateway') && !node.type.includes('Event') && (
                      <path
                        d={`M 1.5 6 A 4.5 4.5 0 0 1 6 1.5 L 6 ${height - 1.5} A 4.5 4.5 0 0 1 1.5 ${height - 6} Z`}
                        fill={
                          node.type === 'userTask' ? '#0ea5e9' :
                          node.type === 'serviceTask' ? '#f97316' : '#d946ef'
                        }
                      />
                    )}

                    {/* Central Icon Placement */}
                    <g transform={`translate(${node.type.includes('Event') ? 10 : node.type.includes('Gateway') ? 14 : 12}, ${node.type.includes('Event') ? 10 : node.type.includes('Gateway') ? 14 : 10})`}>
                      {getIconForType(node.type)}
                    </g>

                    {/* Node Identifier / Custom Human Label Text */}
                    <text
                      x={width / 2}
                      y={node.type.includes('Event') ? height + 16 : height / 2 + 12}
                      textAnchor="middle"
                      className={`text-[10px] font-sans font-medium select-none ${
                        node.type.includes('Event') ? 'fill-gray-600 font-bold' : 'fill-slate-800'
                      }`}
                    >
                      {node.name.length > 20 ? node.name.slice(0, 18) + '...' : node.name}
                    </text>

                    {/* Task sub-indicators for extra realism */}
                    {node.type === 'dmnTask' && (
                      <text x={11} y={height - 8} className="text-[8px] font-mono font-bold fill-fuchsia-600 uppercase">
                        DMN Table
                      </text>
                    )}
                    {node.type === 'userTask' && (
                      <text x={11} y={height - 8} className="text-[8px] font-mono font-bold fill-sky-500 uppercase">
                        Form: {node.formId ? 'Linked' : 'Unset'}
                      </text>
                    )}
                    {node.type === 'serviceTask' && (
                      <text x={11} y={height - 8} className="text-[8px] font-mono font-bold fill-orange-500 uppercase">
                        Automated Script
                      </text>
                    )}

                    {/* Gateway overlay signs */}
                    {node.type === 'exclusiveGateway' && (
                      <text x={width / 2} y={height / 2 + 1} textAnchor="middle" className="text-sm font-sans font-bold fill-amber-700">
                        X
                      </text>
                    )}
                    {node.type === 'parallelGateway' && (
                      <text x={width / 2} y={height / 2 + 3} textAnchor="middle" className="text-base font-sans font-bold fill-indigo-700">
                        +
                      </text>
                    )}

                    {/* Floating circular utility tools displayed when item is selected */}
                    {isSelected && (
                      <g transform={`translate(${width + 12}, ${-5})`} className="cursor-pointer relative z-50">
                        {/* A. Outer background block */}
                        <rect x={-8} y={-4} width={38} height={102} rx={6} fill="#ffffff" stroke="#e5e7eb" strokeWidth={1} className="drop-shadow-sm" />
                        
                        {/* B. Connect Tool trigger line */}
                        <g onClick={(e) => { e.stopPropagation(); startConnecting(node.id); }} transform="translate(0, 4)" title="Connect with Arrow">
                          <circle r={11} cx={11} cy={11} fill="#f4f5f7" className="hover:fill-primaryOrange/10 transition-all svg-btn" stroke="#cbd5e1" strokeWidth={1} />
                          <ArrowRight className="w-3.5 h-3.5 text-gray-500 hover:text-primaryOrange transition" x={4} y={4} />
                        </g>

                        {/* C. Duplicate Node copy */}
                        <g onClick={(e) => {
                          e.stopPropagation();
                          const offsetNew: BpmnNode = {
                            ...node,
                            id: generateId(node.type),
                            name: node.name + ' Copy',
                            x: node.x + 40,
                            y: node.y + 70
                          };
                          updateCurrentProcess({
                            ...currentProcess,
                            nodes: [...currentProcess.nodes, offsetNew],
                            updatedAt: new Date().toISOString()
                          });
                        }} transform="translate(0, 36)" title="Duplicate node">
                          <circle r={11} cx={11} cy={11} fill="#f4f5f7" className="hover:fill-sky-50 transition-all svg-btn" stroke="#cbd5e1" strokeWidth={1} />
                          <Plus className="w-3.5 h-3.5 text-gray-500 hover:text-sky-600 transition" x={4} y={4} />
                        </g>

                        {/* D. Delete node instantly */}
                        <g onClick={(e) => { e.stopPropagation(); deleteSelected(); }} transform="translate(0, 68)" title="Delete Element">
                          <circle r={11} cx={11} cy={11} fill="#fee2e2" className="hover:fill-red-100 transition-all svg-btn" stroke="#fca5a5" strokeWidth={1} />
                          <Trash2 className="w-3.5 h-3.5 text-red-600 transition" x={4} y={4} />
                        </g>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>

      {/* 3. RIGHT HAND DETAILS SIDEBAR - PROPERTIES CAMUNDA PANEL */}
      <div className="w-80 border-l border-slate-200 bg-white flex flex-col shrink-0 overflow-y-auto" id="properties-panel">
        
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
          <Settings className="w-4.5 h-4.5 text-slate-700 animate-spin-slow" />
          <h3 className="font-sans font-bold text-slate-800 text-xs uppercase tracking-wider">
            Properties Panel
          </h3>
        </div>

        {/* Selected Node options */}
        {selectedNodeId ? (
          (() => {
            const node = currentProcess?.nodes.find(n => n.id === selectedNodeId);
            if (!node) return <div className="p-4 text-slate-400 text-xs font-sans">Node metadata error.</div>;

            return (
              <div className="p-4 space-y-4 font-sans text-xs">
                
                {/* Visual state headers */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                  <div className="flex items-center gap-1.5 font-bold text-gray-700 capitalize">
                    {getIconForType(node.type)}
                    <span>{node.type.replace(/([A-Z])/g, ' $1')}</span>
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-gray-400 break-all bg-slate-100 p-1 rounded">
                    ID: {node.id}
                  </div>
                </div>

                {/* Common fields */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-gray-600">Element Label/Name</label>
                  <input
                    type="text"
                    value={node.name}
                    onChange={(e) => updateNodeProperty(node.id, 'name', e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primaryOrange font-medium"
                    id="property-node-name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-gray-400">POS X</label>
                    <input
                      type="number"
                      value={node.x}
                      onChange={(e) => updateNodeProperty(node.id, 'x', Number(e.target.value))}
                      className="w-full border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primaryOrange font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-gray-400">POS Y</label>
                    <input
                      type="number"
                      value={node.y}
                      onChange={(e) => updateNodeProperty(node.id, 'y', Number(e.target.value))}
                      className="w-full border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primaryOrange font-mono"
                    />
                  </div>
                </div>

                {/* -- User Task Specific Settings -- */}
                {node.type === 'userTask' && (
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="space-y-1.5">
                      <label className="block font-bold text-gray-600">Assignee Username/Role</label>
                      <input
                        type="text"
                        value={node.assignee || ''}
                        placeholder="e.g. Finance Team"
                        onChange={(e) => updateNodeProperty(node.id, 'assignee', e.target.value)}
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none"
                        id="property-task-assignee"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block font-bold text-gray-600">Link Dynamic Form</label>
                        <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1 rounded">dynamic</span>
                      </div>
                      <select
                        value={node.formId || ''}
                        onChange={(e) => updateNodeProperty(node.id, 'formId', e.target.value)}
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white focus:outline-none"
                        id="property-task-form-select"
                      >
                        <option value="">-- No form attached --</option>
                        {formSchemas.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-gray-400">
                        When active, users will fill out constraints defined inside this form block.
                      </p>
                    </div>
                  </div>
                )}

                {/* -- DMN Business Rule Task Settings -- */}
                {node.type === 'dmnTask' && (
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block font-bold text-gray-600">Linked DMN Table</label>
                        <span className="text-[11px] font-mono text-fuchsia-600 bg-fuchsia-50 px-1 rounded uppercase">DMN</span>
                      </div>
                      <select
                        value={node.dmnId || ''}
                        onChange={(e) => updateNodeProperty(node.id, 'dmnId', e.target.value)}
                        className="w-full border border-slate-300 bg-white rounded px-2.5 py-1.5 focus:outline-none"
                        id="property-task-dmn-select"
                      >
                        <option value="">-- Choose spreadsheet Table --</option>
                        {dmnTables.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-gray-400">
                        DMN tables evaluate parameters instantly and automatically append rule outcomes.
                      </p>
                    </div>
                  </div>
                )}

                {/* -- Service Task (Script run automation) settings -- */}
                {node.type === 'serviceTask' && (
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="space-y-1.5">
                      <label className="block font-bold text-gray-600">API Simulated Action</label>
                      <select
                        value={node.serviceAction || 'sendEmail'}
                        onChange={(e) => updateNodeProperty(node.id, 'serviceAction', e.target.value)}
                        className="w-full border border-slate-300 bg-white rounded px-2.5 py-1.5 focus:outline-none"
                        id="property-service-action-dropdown"
                      >
                        <option value="sendEmail">Send Email Delivery (Simulated)</option>
                        <option value="verifyIdentity">Background Check Verify API</option>
                        <option value="logProcessInfo">System Logger Daemon</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-bold text-gray-600">Output Result Store Namespace</label>
                      <input
                        type="text"
                        value={node.serviceResultVar || ''}
                        placeholder="e.g. notifyOutcome"
                        onChange={(e) => updateNodeProperty(node.id, 'serviceResultVar', e.target.value)}
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none font-mono"
                        id="property-service-result-var"
                      />
                    </div>
                  </div>
                )}

              </div>
            );
          })()
        ) : selectedEdgeId ? (
          (() => {
            const edge = currentProcess?.edges.find(e => e.id === selectedEdgeId);
            if (!edge) return <div className="p-4 text-slate-400 text-xs font-sans">Edge metadata error.</div>;

            return (
              <div className="p-4 space-y-4 font-sans text-xs">
                
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                  <div className="flex items-center gap-1 text-slate-600 font-bold">
                    <ArrowRight className="w-4 h-4 text-gray-500" />
                    <span>Sequence Flow Edge</span>
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-gray-400 break-all">
                    ID: {edge.id} <br/>
                    Source: {edge.sourceRef} <br/>
                    Target: {edge.targetRef}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-gray-600">Edge Display Name</label>
                  <input
                    type="text"
                    value={edge.name || ''}
                    placeholder="e.g. Yes Case"
                    onChange={(e) => updateEdgeProperty(edge.id, 'name', e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none"
                    id="property-edge-name"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-gray-600">Route Conditional Expression</label>
                    <span className="text-[9px] font-mono text-amber-600 bg-amber-50 px-1 rounded">XOR gateway</span>
                  </div>
                  <input
                    type="text"
                    value={edge.conditionExpression || ''}
                    placeholder="e.g. eligibility === 'APPROVED'"
                    onChange={(e) => updateEdgeProperty(edge.id, 'conditionExpression', e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none font-mono text-[11px]"
                    id="property-edge-condition"
                  />
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    Used when branching from <b>Exclusive Gateways</b>. <br/>
                    Ex: <code className="bg-slate-100 px-1 py-0.5 rounded text-red-600">score &gt;= 700</code> or <code className="bg-slate-100 px-1 py-0.5 rounded text-red-600">overrideApproved === true</code>
                  </p>
                </div>

              </div>
            );
          })()
        ) : (
          <div className="p-6 text-center text-slate-400 space-y-2 mt-12 font-sans" id="unselected-panels-msg">
            <Settings className="w-8 h-8 mx-auto text-slate-300 animate-pulse" />
            <p className="text-[11px]">Select a node or arrow edge to modify process inputs, roles, actions, decision linking, and criteria.</p>
          </div>
        )}
      </div>

    </div>
  );
}
