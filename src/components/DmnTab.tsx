/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Plus, Trash2, Edit2, Check, FileSpreadsheet, 
  HelpCircle, Sparkles, BookOpen, Calculator, RefreshCw, X
} from 'lucide-react';
import { DmnTable, DmnInput, DmnOutput, DmnRule } from '../types';
import { evaluateDmnTable, generateId } from '../utils/bpmnEngine';

interface DmnTabProps {
  dmnTables: DmnTable[];
  onUpdateDmnTables: (list: DmnTable[]) => void;
}

export default function DmnTab({
  dmnTables,
  onUpdateDmnTables
}: DmnTabProps) {
  const [selectedTableId, setSelectedTableId] = useState<string>(
    dmnTables[0]?.id || ''
  );
  const currentTable = dmnTables.find(t => t.id === selectedTableId) || dmnTables[0];

  // Testing variables state sandbox
  const [testInputs, setTestInputs] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{
    matchedRuleId: string | null;
    outputs: Record<string, any>;
    comment: string;
  } | null>(null);

  const saveTable = (updated: DmnTable) => {
    const list = dmnTables.map(t => t.id === updated.id ? updated : t);
    onUpdateDmnTables(list);
  };

  // Create new tabular index
  const createNewDmnTable = () => {
    const newId = generateId('dmn');
    const newTable: DmnTable = {
      id: newId,
      name: 'Credit score eligibility matrix',
      hitPolicy: 'first',
      createdAt: new Date().toISOString(),
      inputs: [
        { id: 'in-1', label: 'Age', name: 'age', type: 'number' },
        { id: 'in-2', label: 'Account Rank', name: 'tier', type: 'string' }
      ],
      outputs: [
        { id: 'out-1', label: 'Assigned Limit', name: 'creditLimit', type: 'number' }
      ],
      rules: [
        {
          id: 'rule-sample-1',
          inputConstraints: ['>= 18', '"Premium"'],
          outputValues: ['5000'],
          description: 'High credit ceiling for verified premium adults'
        },
        {
          id: 'rule-sample-2',
          inputConstraints: ['>= 18', '-'],
          outputValues: ['1500'],
          description: 'Basic threshold for all generic adults'
        },
        {
          id: 'rule-sample-3',
          inputConstraints: ['-', '-'],
          outputValues: ['250'],
          description: 'Standard safe bracket default'
        }
      ]
    };
    onUpdateDmnTables([...dmnTables, newTable]);
    setSelectedTableId(newId);
    setTestResult(null);
  };

  const deleteDmnTable = () => {
    if (dmnTables.length <= 1) {
      alert('Must maintain at least 1 DMN table in the workspace catalog.');
      return;
    }
    const filtered = dmnTables.filter(t => t.id !== selectedTableId);
    onUpdateDmnTables(filtered);
    setSelectedTableId(filtered[0].id);
    setTestResult(null);
  };

  // Rule additions / operations
  const addRuleRow = () => {
    if (!currentTable) return;
    const inputsCount = currentTable.inputs.length;
    const outputsCount = currentTable.outputs.length;

    const newRule: DmnRule = {
      id: generateId('rule'),
      inputConstraints: Array(inputsCount).fill('-'),
      outputValues: Array(outputsCount).fill('0'),
      description: 'Custom rule trigger'
    };

    saveTable({
      ...currentTable,
      rules: [...currentTable.rules, newRule]
    });
  };

  const deleteRuleRow = (ruleId: string) => {
    if (!currentTable) return;
    saveTable({
      ...currentTable,
      rules: currentTable.rules.filter(r => r.id !== ruleId)
    });
    if (testResult?.matchedRuleId === ruleId) {
      setTestResult(null);
    }
  };

  // Cell constraint update
  const updateRuleConstraint = (ruleId: string, colIndex: number, isInput: boolean, value: string) => {
    if (!currentTable) return;
    const rules = currentTable.rules.map(r => {
      if (r.id === ruleId) {
        if (isInput) {
          const freshInputs = [...r.inputConstraints];
          freshInputs[colIndex] = value;
          return { ...r, inputConstraints: freshInputs };
        } else {
          const freshOutputs = [...r.outputValues];
          freshOutputs[colIndex] = value;
          return { ...r, outputValues: freshOutputs };
        }
      }
      return r;
    });

    saveTable({ ...currentTable, rules });
  };

  const updateRuleDescription = (ruleId: string, txt: string) => {
    if (!currentTable) return;
    const rules = currentTable.rules.map(r => {
      if (r.id === ruleId) return { ...r, description: txt };
      return r;
    });
    saveTable({ ...currentTable, rules });
  };

  // Columns adjustments
  const addColumn = (isInput: boolean) => {
    if (!currentTable) return;
    if (isInput) {
      const colId = generateId('col-in');
      const newInput: DmnInput = {
        id: colId,
        label: 'New Input Field',
        name: 'variableName',
        type: 'number'
      };
      
      const inputs = [...currentTable.inputs, newInput];
      // Append matching default cell
      const rules = currentTable.rules.map(r => ({
        ...r,
        inputConstraints: [...r.inputConstraints, '-']
      }));

      saveTable({ ...currentTable, inputs, rules });
    } else {
      const colId = generateId('col-out');
      const newOutput: DmnOutput = {
        id: colId,
        label: 'Result Variable',
        name: 'outcome',
        type: 'string'
      };

      const outputs = [...currentTable.outputs, newOutput];
      const rules = currentTable.rules.map(r => ({
        ...r,
        outputValues: [...r.outputValues, '"DEFAULT"']
      }));

      saveTable({ ...currentTable, outputs, rules });
    }
  };

  const deleteColumn = (colId: string, isInput: boolean, index: number) => {
    if (!currentTable) return;
    if (isInput) {
      if (currentTable.inputs.length <= 1) {
        alert('Table requires at least 1 input column.');
        return;
      }
      const inputs = currentTable.inputs.filter(c => c.id !== colId);
      const rules = currentTable.rules.map(r => {
        const inputConstraints = [...r.inputConstraints];
        inputConstraints.splice(index, 1);
        return { ...r, inputConstraints };
      });
      saveTable({ ...currentTable, inputs, rules });
    } else {
      if (currentTable.outputs.length <= 1) {
        alert('Table requires at least 1 output column.');
        return;
      }
      const outputs = currentTable.outputs.filter(c => c.id !== colId);
      const rules = currentTable.rules.map(r => {
        const outputValues = [...r.outputValues];
        outputValues.splice(index, 1);
        return { ...r, outputValues };
      });
      saveTable({ ...currentTable, outputs, rules });
    }
  };

  const updateColumnMeta = <T extends DmnInput | DmnOutput>(
    colId: string, 
    isInput: boolean, 
    key: keyof T, 
    val: any
  ) => {
    if (!currentTable) return;
    if (isInput) {
      const inputs = currentTable.inputs.map(c => {
        if (c.id === colId) return { ...c, [key]: val };
        return c;
      });
      saveTable({ ...currentTable, inputs });
    } else {
      const outputs = currentTable.outputs.map(c => {
        if (c.id === colId) return { ...c, [key]: val };
        return c;
      });
      saveTable({ ...currentTable, outputs });
    }
  };

  // Run Sandbox Evaluation simulation
  const handleRunSimulation = () => {
    if (!currentTable) return;
    
    // Parse values safely
    const variablesEvaluated: Record<string, any> = {};
    currentTable.inputs.forEach(col => {
      const rawVal = testInputs[col.name];
      if (rawVal === undefined || rawVal === '') {
        variablesEvaluated[col.name] = null;
        return;
      }

      if (col.type === 'number') {
        const num = parseFloat(rawVal);
        variablesEvaluated[col.name] = isNaN(num) ? rawVal : num;
      } else if (col.type === 'boolean') {
        variablesEvaluated[col.name] = rawVal === 'true';
      } else {
        variablesEvaluated[col.name] = rawVal;
      }
    });

    const output = evaluateDmnTable(currentTable, variablesEvaluated);
    setTestResult(output);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-50 overflow-hidden font-sans" id="dmn-tab-workspace">
      
      {/* Table Selector Header */}
      <div className="bg-white border-b border-slate-200 p-3.5 px-6 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-fuchsia-50 text-fuchsia-700 rounded-md">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <select
                value={selectedTableId}
                onChange={(e) => {
                  setSelectedTableId(e.target.value);
                  setTestResult(null);
                }}
                className="text-sm font-bold text-slate-800 border border-slate-300 rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-primaryOrange bg-white"
                id="dmn-table-select"
              >
                {dmnTables.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Decision Model Notation table linked to Business Rules.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={createNewDmnTable}
            className="flex items-center gap-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded px-3 py-1.5 text-xs font-bold cursor-pointer transition"
            id="dmn-add-table-btn"
          >
            <Plus className="w-4 h-4" />
            <span>New DMN Spreadsheet</span>
          </button>
          <button
            onClick={deleteDmnTable}
            title="Delete current spreadsheet"
            className="p-1.5 border border-slate-300 hover:bg-red-50 hover:text-red-600 rounded bg-white text-gray-400 cursor-pointer transition"
            id="dmn-delete-table-btn"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex" id="dmn-workspace-container">
        
        {/* Core Spreadsheet Section */}
        <div className="flex-1 overflow-auto p-6" id="spreadsheet-viewport">
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden max-w-5xl mx-auto">
            
            {/* Table Name and Hit Policy Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={currentTable?.name || ''}
                  onChange={(e) => saveTable({ ...currentTable!, name: e.target.value })}
                  className="text-sm font-bold text-slate-800 bg-transparent hover:bg-slate-100 border border-transparent hover:border-slate-300 rounded px-2 py-0.5 w-80 focus:outline-none focus:ring-1 focus:ring-primaryOrange focus:bg-white"
                  title="Edit table title"
                  id="dmn-table-name-input"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-gray-500 font-sans uppercase text-[10px] tracking-wider">Hit Policy:</span>
                <select
                  value={currentTable?.hitPolicy || 'first'}
                  onChange={(e) => saveTable({ ...currentTable!, hitPolicy: e.target.value as any })}
                  className="border border-slate-300 rounded bg-white px-2 py-1 font-medium font-sans focus:outline-none focus:ring-1 focus:ring-primaryOrange"
                  id="dmn-hit-policy-select"
                >
                  <option value="first">First Match (Runs top-down)</option>
                  <option value="unique">Unique Match (No overlaps allowed)</option>
                </select>
              </div>
            </div>

            {/* Excel-style DMN Grid */}
            <div className="overflow-x-auto" id="dmn-grid-table">
              <table className="w-full border-collapse">
                <thead>
                  {/* Category Classification headers */}
                  <tr>
                    <th className="w-12 bg-slate-100 border border-slate-200 text-slate-400 text-[10px] font-bold py-1">Row</th>
                    <th 
                      colSpan={currentTable?.inputs.length || 1} 
                      className="bg-emerald-500 border border-slate-200 text-white font-sans text-[10px] font-bold text-center py-1 uppercase tracking-wider uppercase"
                    >
                      Inputs Condition Criteria (If...)
                    </th>
                    <th 
                      colSpan={currentTable?.outputs.length || 1} 
                      className="bg-sky-500 border border-slate-200 text-white font-sans text-[10px] font-bold text-center py-1 uppercase tracking-wider uppercase"
                    >
                      Output Values Assigned (Then...)
                    </th>
                    <th className="bg-slate-100 border border-slate-200 text-slate-400 text-[10px] font-bold py-1 w-48">Audit Notes</th>
                    <th className="bg-slate-100 border border-slate-200 text-slate-400 text-[10px] font-bold py-1 w-10">Delete</th>
                  </tr>

                  {/* Variable mapping detailed Headers */}
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200" />
                    
                    {/* INPUTS headings config */}
                    {currentTable?.inputs.map((inp, idx) => (
                      <td key={inp.id} className="border border-slate-200 p-2 text-xs relative group/col max-w-[170px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <input
                              type="text"
                              value={inp.label}
                              onChange={(e) => updateColumnMeta<DmnInput>(inp.id, true, 'label', e.target.value)}
                              className="text-[11px] font-bold text-emerald-800 bg-transparent hover:bg-white border-none rounded px-1 w-full focus:outline-none"
                              placeholder="Display Label"
                            />
                            <button
                              onClick={() => deleteColumn(inp.id, true, idx)}
                              className="hidden group-hover/col:block p-0.5 text-gray-400 hover:text-red-500 cursor-pointer"
                              title="Delete column"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-1 font-mono text-[9px]">
                            <input
                              type="text"
                              value={inp.name}
                              onChange={(e) => updateColumnMeta<DmnInput>(inp.id, true, 'name', e.target.value)}
                              className="bg-emerald-50 text-emerald-800 rounded px-1 border border-emerald-100 text-[9px] w-full py-0.5"
                              placeholder="var_name"
                              title="Process variable name"
                            />
                            <select
                              value={inp.type}
                              onChange={(e) => updateColumnMeta<DmnInput>(inp.id, true, 'type', e.target.value)}
                              className="bg-emerald-50 text-emerald-800 rounded px-1 border border-emerald-100 text-[9px] py-0.5 w-full"
                            >
                              <option value="number">Number</option>
                              <option value="string">String</option>
                              <option value="boolean">Boolean</option>
                            </select>
                          </div>
                        </div>
                      </td>
                    ))}

                    {/* OUTPUTS headings config */}
                    {currentTable?.outputs.map((out, idx) => (
                      <td key={out.id} className="border border-slate-200 p-2 text-xs relative group/col max-w-[170px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <input
                              type="text"
                              value={out.label}
                              onChange={(e) => updateColumnMeta<DmnOutput>(out.id, false, 'label', e.target.value)}
                              className="text-[11px] font-bold text-sky-800 bg-transparent hover:bg-white border-none rounded px-1 w-full focus:outline-none"
                              placeholder="Result Label"
                            />
                            <button
                              onClick={() => deleteColumn(out.id, false, idx)}
                              className="hidden group-hover/col:block p-0.5 text-gray-400 hover:text-red-500 cursor-pointer"
                              title="Delete column"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-1 font-mono text-[9px]">
                            <input
                              type="text"
                              value={out.name}
                              onChange={(e) => updateColumnMeta<DmnOutput>(out.id, false, 'name', e.target.value)}
                              className="bg-sky-50 text-sky-800 rounded px-1 border border-sky-100 text-[9px] w-full py-0.5"
                              placeholder="output_var"
                              title="Output variable name"
                            />
                            <select
                              value={out.type}
                              onChange={(e) => updateColumnMeta<DmnOutput>(out.id, false, 'type', e.target.value)}
                              className="bg-sky-50 text-sky-800 rounded px-1 border border-sky-100 text-[9px] py-0.5 w-full"
                            >
                              <option value="string">String</option>
                              <option value="number">Number</option>
                              <option value="boolean">Boolean</option>
                            </select>
                          </div>
                        </div>
                      </td>
                    ))}

                    <td className="border border-slate-200 p-1 text-center bg-slate-100" colSpan={2}>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => addColumn(true)}
                          className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 hover:bg-emerald-100 cursor-pointer"
                        >
                          + Input
                        </button>
                        <button
                          onClick={() => addColumn(false)}
                          className="text-[9px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100 hover:bg-sky-100 cursor-pointer"
                        >
                          + Output
                        </button>
                      </div>
                    </td>
                  </tr>
                </thead>

                {/* Rows data body */}
                <tbody>
                  {currentTable?.rules.map((rule, rIdx) => {
                    const isMatchedInTest = testResult?.matchedRuleId === rule.id;

                    return (
                      <tr 
                        key={rule.id}
                        className={`transition-all ${
                          isMatchedInTest 
                            ? 'bg-amber-100/70 shadow-inner' 
                            : 'hover:bg-slate-50/50'
                        }`}
                      >
                        {/* Index marker */}
                        <td className="border border-slate-200 text-center font-mono text-xs text-gray-500 font-bold py-2 bg-slate-50">
                          {rIdx + 1}
                        </td>

                        {/* Input constraints inputs */}
                        {rule.inputConstraints.map((constraint, cIdx) => (
                          <td key={`rc-${cIdx}`} className="border border-slate-200 p-1.5 min-w-[120px]">
                            <input
                              type="text"
                              value={constraint}
                              onChange={(e) => updateRuleConstraint(rule.id, cIdx, true, e.target.value)}
                              className="w-full text-xs font-mono border-none focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-transparent text-emerald-800 text-center px-1 rounded hover:bg-slate-100"
                              placeholder="-"
                            />
                          </td>
                        ))}

                        {/* Output values config */}
                        {rule.outputValues.map((val, oIdx) => (
                          <td key={`ro-${oIdx}`} className="border border-slate-200 p-1.5 min-w-[120px]">
                            <input
                              type="text"
                              value={val}
                              onChange={(e) => updateRuleConstraint(rule.id, oIdx, false, e.target.value)}
                              className="w-full text-xs font-mono border-none focus:outline-none focus:ring-1 focus:ring-sky-400 bg-transparent text-sky-800 text-center px-1 rounded hover:bg-slate-100 font-bold"
                              placeholder="0"
                            />
                          </td>
                        ))}

                        {/* Annotation description column */}
                        <td className="border border-slate-200 p-1.5">
                          <input
                            type="text"
                            value={rule.description || ''}
                            onChange={(e) => updateRuleDescription(rule.id, e.target.value)}
                            className="w-full text-[11px] border-none focus:outline-none text-gray-500 bg-transparent h-6 truncate hover:bg-slate-100 rounded px-1.5"
                            placeholder="Explanation..."
                          />
                        </td>

                        {/* Action delete row */}
                        <td className="border border-slate-200 text-center py-1 bg-slate-50">
                          <button
                            onClick={() => deleteRuleRow(rule.id)}
                            className="p-1 hover:text-red-500 text-gray-400 cursor-pointer"
                            title="Delete row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table add rules footer banner */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={addRuleRow}
                className="flex items-center gap-1.5 text-xs text-primaryOrange hover:text-orange-700 bg-white border border-slate-200 hover:border-slate-300 font-bold rounded px-4 py-1.5 shadow-2xs transition"
                id="dmn-add-row-btn"
              >
                <Plus className="w-4 h-4" />
                <span>Add Rule Choice Row</span>
              </button>

              <div className="text-[10px] text-gray-400 flex gap-2 font-medium font-mono items-center">
                <span>Tip: <code className="bg-slate-100 text-red-600 px-1 font-bold">"-"</code> matches any inputs. Wrap string outputs in quotes like <code className="bg-slate-100 text-red-600 px-1 font-bold">"APPROVED"</code>.</span>
              </div>
            </div>

          </div>
        </div>

        {/* Dynamic Sandbox Evaluation Tester widgets */}
        <div className="w-80 border-l border-slate-200 bg-white flex flex-col p-4 space-y-4 shrink-0 overflow-y-auto" id="dmn-sandbox-sidebar">
          
          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <Calculator className="w-4.5 h-4.5 text-fuchsia-600" />
            <h3 className="text-xs font-sans font-bold text-slate-800 uppercase tracking-wider">
              DMN Live Sandbox Tester
            </h3>
          </div>

          <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
            Type values representing local runtime process state variables below to simulate how the DMN sheet will execute decision logic in real-time.
          </p>

          <div className="space-y-3.5 bg-slate-50/70 p-3 border border-slate-100 rounded-lg">
            <h4 className="text-[10px] font-sans font-bold text-slate-500 uppercase tracking-wider">INPUT STATES</h4>
            {currentTable?.inputs.map(col => (
              <div key={col.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 font-sans">{col.label}</span>
                  <span className="text-[9px] font-mono text-gray-400 font-medium">({col.type})</span>
                </div>
                <input
                  type={col.type === 'number' ? 'number' : 'text'}
                  value={testInputs[col.name] || ''}
                  onChange={(e) => setTestInputs({ ...testInputs, [col.name]: e.target.value })}
                  placeholder={`Set mock var_name: ${col.name}...`}
                  className="w-full text-xs font-sans border border-slate-300 rounded px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primaryOrange"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleRunSimulation}
            className="flex items-center justify-center gap-1.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-sans text-xs font-bold w-full py-2 rounded shadow-xs cursor-pointer transition-colors"
            id="dmn-test-sandbox-btn"
          >
            <Play className="w-3.5 h-3.5 fill-white text-transparent" />
            <span>Evaluate Table rules</span>
          </button>

          {/* Result Outcome panel */}
          {testResult && (
            <div className="space-y-3 border-t border-slate-100 pt-4" id="dmn-sandbox-outcome">
              <div className="text-[11px] font-bold text-slate-500 font-mono">EVALUATION METRICS</div>
              
              {testResult.matchedRuleId ? (
                <>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md space-y-2">
                    <div className="text-xs font-bold text-emerald-800 flex items-center gap-1 font-sans">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Decision Matched successfully!</span>
                    </div>
                    <div className="text-[10px] text-emerald-700 bg-white/70 p-1.5 rounded border border-emerald-100 font-mono leading-relaxed">
                      💬 Match description: &quot;{testResult.comment}&quot;
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                    <div className="text-[10px] font-sans font-bold text-gray-400 uppercase tracking-widest mb-1.5">MERGED OUTPUT VARIABLES</div>
                    <div className="space-y-1.5">
                      {Object.entries(testResult.outputs).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between text-xs py-0.5 font-mono">
                          <span className="text-gray-500">{key}:</span>
                          <span className="font-bold text-slate-800 bg-sky-50 text-sky-800 px-1.5 py-0.5 rounded border border-sky-100 text-[11px]">
                            {typeof val === 'string' ? `"${val}"` : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 space-y-1">
                  <div className="font-bold">No Rule Matched</div>
                  <p className="text-[11px] text-amber-700 leading-normal">
                    The evaluating values didn't satisfy any of the decision spreadsheet rows configured on this sheet. Adjust rule parameters or inputs above.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
