/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Plus, Trash2, Edit2, Check, FileText, 
  Tag, ListPlus, Eye, Type, Binary, Calendar, CheckSquare, Settings, X
} from 'lucide-react';
import { FormSchema, FormField } from '../types';
import { generateId } from '../utils/bpmnEngine';

interface FormBuilderTabProps {
  formSchemas: FormSchema[];
  onUpdateFormSchemas: (list: FormSchema[]) => void;
}

export default function FormBuilderTab({
  formSchemas,
  onUpdateFormSchemas
}: FormBuilderTabProps) {
  const [selectedFormId, setSelectedFormId] = useState<string>(
    formSchemas[0]?.id || ''
  );
  const currentForm = formSchemas.find(f => f.id === selectedFormId) || formSchemas[0];
  
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // Preview form test variables
  const [sandboxVariables, setSandboxVariables] = useState<Record<string, any>>({});
  const [isSubmitSuccessful, setIsSubmitSuccessful] = useState<boolean>(false);

  const saveForm = (updated: FormSchema) => {
    const list = formSchemas.map(f => f.id === updated.id ? updated : f);
    onUpdateFormSchemas(list);
  };

  // Create new blank schema template
  const createNewForm = () => {
    const newId = generateId('form');
    const newForm: FormSchema = {
      id: newId,
      name: 'Custom User Intake Form',
      createdAt: new Date().toISOString(),
      fields: [
        {
          id: 'field-1',
          label: 'Customer Name',
          key: 'customerName',
          type: 'text',
          required: true,
          placeholder: 'John Doe'
        }
      ]
    };
    onUpdateFormSchemas([...formSchemas, newForm]);
    setSelectedFormId(newId);
    setSelectedFieldId('field-1');
    setIsSubmitSuccessful(false);
  };

  const deleteForm = () => {
    if (formSchemas.length <= 1) {
      alert('Must maintain at least 1 Form in the workspace catalog.');
      return;
    }
    const filtered = formSchemas.filter(f => f.id !== selectedFormId);
    onUpdateFormSchemas(filtered);
    setSelectedFormId(filtered[0].id);
    setSelectedFieldId(null);
    setIsSubmitSuccessful(false);
  };

  // Add individual input field
  const addField = (type: FormField['type']) => {
    if (!currentForm) return;

    let defaultLabel = 'Data field';
    let defaultKey = 'customVar';
    let options: string[] | undefined = undefined;

    switch (type) {
      case 'text':
        defaultLabel = 'Full Name';
        defaultKey = 'fullName';
        break;
      case 'number':
        defaultLabel = 'Credit Balance';
        defaultKey = 'balance';
        break;
      case 'boolean':
        defaultLabel = 'Accepted Conditions';
        defaultKey = 'hasSigned';
        break;
      case 'date':
        defaultLabel = 'Effective Date';
        defaultKey = 'effectiveDate';
        break;
      case 'select':
        defaultLabel = 'Tier Level';
        defaultKey = 'tierLevel';
        options = ['Bronze', 'Silver', 'Gold', 'VIP'];
        break;
    }

    const newField: FormField = {
      id: generateId('field'),
      label: defaultLabel,
      key: defaultKey + Math.floor(Math.random() * 100),
      type,
      required: true,
      options,
      placeholder: 'Type value...'
    };

    saveForm({
      ...currentForm,
      fields: [...currentForm.fields, newField]
    });
    setSelectedFieldId(newField.id);
    setIsSubmitSuccessful(false);
  };

  const deleteField = (fieldId: string) => {
    if (!currentForm) return;
    saveForm({
      ...currentForm,
      fields: currentForm.fields.filter(f => f.id !== fieldId)
    });
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
    setIsSubmitSuccessful(false);
  };

  // Single field properties edit hooks
  const updateFieldProperty = (fieldId: string, property: keyof FormField, value: any) => {
    if (!currentForm) return;
    const fields = currentForm.fields.map(f => {
      if (f.id === fieldId) {
        return { ...f, [property]: value };
      }
      return f;
    });
    saveForm({ ...currentForm, fields });
    setIsSubmitSuccessful(false);
  };

  const handleAddFieldOption = (fieldId: string, optionTxt: string) => {
    if (!optionTxt.trim()) return;
    const field = currentForm.fields.find(f => f.id === fieldId);
    if (field) {
      const options = field.options ? [...field.options, optionTxt.trim()] : [optionTxt.trim()];
      updateFieldProperty(fieldId, 'options', options);
    }
  };

  const handleRemoveFieldOption = (fieldId: string, idxToRemove: number) => {
    const field = currentForm.fields.find(f => f.id === fieldId);
    if (field && field.options) {
      const options = field.options.filter((_, idx) => idx !== idxToRemove);
      updateFieldProperty(fieldId, 'options', options);
    }
  };

  // Simulate filling in standard preview forms
  const handleTestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitSuccessful(true);
    setTimeout(() => {
      setIsSubmitSuccessful(false);
    }, 2500);
  };

  const getFieldIcon = (type: FormField['type']) => {
    switch (type) {
      case 'text': return <Type className="w-3.5 h-3.5 text-blue-500" />;
      case 'number': return <Binary className="w-3.5 h-3.5 text-emerald-500" />;
      case 'boolean': return <CheckSquare className="w-3.5 h-3.5 text-orange-500" />;
      case 'date': return <Calendar className="w-3.5 h-3.5 text-indigo-500" />;
      case 'select': return <ListPlus className="w-3.5 h-3.5 text-fuchsia-500" />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-slate-50 overflow-hidden font-sans" id="form-builder-workspace">
      
      {/* 1. LEFT FORM PALETTE & LISTS SELECTOR */}
      <div className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 select-none" id="forms-sidebar">
        
        {/* Selector Header info */}
        <div className="p-3 border-b border-slate-200 bg-slate-50">
          <label className="block text-[10px] font-sans font-bold text-gray-500 uppercase tracking-widest mb-2">
            Catalog Form schemas
          </label>
          <div className="flex gap-1.5">
            <select
              value={selectedFormId}
              onChange={(e) => {
                setSelectedFormId(e.target.value);
                setSelectedFieldId(null);
                setIsSubmitSuccessful(false);
                setSandboxVariables({});
              }}
              className="w-full text-xs font-sans border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primaryOrange bg-white font-medium"
              id="form-schema-select"
            >
              {formSchemas.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <button
              onClick={createNewForm}
              title="Create New Form Sheet"
              className="p-1 px-2.5 border border-slate-300 rounded bg-white hover:bg-slate-50 text-gray-700 font-medium active:bg-slate-100 flex items-center justify-center cursor-pointer text-xs"
              id="form-add-new-btn"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form Palette - Field Adders */}
        <div className="p-4 flex-grow overflow-y-auto space-y-4">
          <div>
            <h4 className="text-[10px] font-sans font-bold text-gray-400 uppercase tracking-widest mb-3">
              ADD INPUT FIELDS
            </h4>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => addField('text')}
                className="flex items-center gap-2.5 p-2 py-2 text-left text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition cursor-pointer"
                id="add-textbox-btn"
              >
                <div className="p-1 bg-blue-50 border border-blue-200 rounded">
                  <Type className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-700">Text Field</div>
                  <div className="text-[9px] text-gray-400">Letters and numbers text</div>
                </div>
              </button>

              <button
                onClick={() => addField('number')}
                className="flex items-center gap-2.5 p-2 py-2 text-left text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition cursor-pointer"
                id="add-numberbox-btn"
              >
                <div className="p-1 bg-emerald-50 border border-emerald-200 rounded">
                  <Binary className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-700">Number Input</div>
                  <div className="text-[9px] text-gray-400">Numeric currencies, ratings</div>
                </div>
              </button>

              <button
                onClick={() => addField('select')}
                className="flex items-center gap-2.5 p-2 py-2 text-left text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition cursor-pointer"
                id="add-selectlist-btn"
              >
                <div className="p-1 bg-fuchsia-50 border border-fuchsia-200 rounded">
                  <ListPlus className="w-4 h-4 text-fuchsia-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-700">Select List</div>
                  <div className="text-[9px] text-gray-400">Options dropdown list</div>
                </div>
              </button>

              <button
                onClick={() => addField('boolean')}
                className="flex items-center gap-2.5 p-2 py-2 text-left text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition cursor-pointer"
                id="add-checkbox-btn"
              >
                <div className="p-1 bg-orange-50 border border-orange-200 rounded">
                  <CheckSquare className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-700">Checkbox Toggle</div>
                  <div className="text-[9px] text-gray-400">Yes/No boolean condition</div>
                </div>
              </button>

              <button
                onClick={() => addField('date')}
                className="flex items-center gap-2.5 p-2 py-2 text-left text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition cursor-pointer"
                id="add-datepicker-btn"
              >
                <div className="p-1 bg-indigo-50 border border-indigo-200 rounded">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-700">Date Calendar</div>
                  <div className="text-[9px] text-gray-400">Pick appointment dates</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Delete Form and Metadata area */}
        <div className="p-3 border-t border-slate-200 bg-slate-50">
          <button
            onClick={deleteForm}
            className="w-full text-center text-xs py-1.5 hover:text-red-600 text-gray-500 border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 rounded shadow-2xs font-sans cursor-pointer transition-colors"
            id="form-delete-schema-btn"
          >
            Delete Form Catalog
          </button>
        </div>
      </div>

      {/* 2. CENTER STAGE - INTERACTIVE CANVAS GRID */}
      <div className="flex-grow flex flex-col h-full overflow-hidden" id="form-interactive-stage">
        
        {/* Workspace Toolbar Header */}
        <div className="bg-white border-b border-slate-200 p-2.5 px-6 flex items-center justify-between shadow-xs z-10">
          <div>
            <input
              type="text"
              value={currentForm?.name || ''}
              onChange={(e) => saveForm({ ...currentForm!, name: e.target.value })}
              className="text-xs font-bold text-slate-800 bg-transparent hover:bg-slate-50 border border-transparent hover:border-slate-300 rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-primaryOrange focus:bg-white w-80 font-sans"
              title="Edit form name"
              id="form-name-editor"
            />
            <p className="text-[10px] text-gray-400 px-2.5">
              Form metadata binding ID: <span className="font-mono">{currentForm?.id}</span>
            </p>
          </div>
          
          <div className="text-[10px] bg-slate-100 px-3 py-1 rounded text-gray-500 font-mono">
            Fields count: {currentForm?.fields.length || 0}
          </div>
        </div>

        {/* Layout grid divided into: Form Canvas & Form Live Preview */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-6" id="designer-canvas-grids">
          
          {/* A. WORKSPACE DESIGN CANVAS */}
          <div className="space-y-3 flex flex-col" id="designer-editor-blocks">
            <h4 className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest px-1">
              Canvas Layout Node tree
            </h4>
            
            <div className="border border-slate-200 bg-white rounded-lg p-5 min-h-[300px] shadow-2xs space-y-3.5 flex-grow overflow-y-auto">
              {currentForm?.fields.length === 0 ? (
                <div className="text-center text-slate-300 mt-16 space-y-2">
                  <FileText className="w-12 h-12 mx-auto text-slate-200" />
                  <p className="text-xs font-sans">Form workspace empty. Click side palette to append entry fields.</p>
                </div>
              ) : (
                currentForm?.fields.map((field, idx) => {
                  const isSelected = selectedFieldId === field.id;

                  return (
                    <div
                      key={field.id}
                      onClick={() => setSelectedFieldId(field.id)}
                      className={`relative group border rounded-lg p-3.5 transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-primaryOrange ring-2 ring-primaryOrange/10 shadow-sm bg-orange-50/5' 
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      {/* Delete node hover tool */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteField(field.id);
                        }}
                        className="absolute right-3 top-3 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                        title="Remove field"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getFieldIcon(field.type)}
                        <span className="font-mono text-[9px] bg-slate-100 text-slate-500 px-1 rounded uppercase font-bold">
                          {field.type}
                        </span>
                        <span className="font-mono text-[9px] bg-slate-100 text-slate-500 px-1 rounded">
                          key: {field.key}
                        </span>
                        {field.required && (
                          <span className="text-[9px] text-red-500 font-bold font-sans">
                            * Required
                          </span>
                        )}
                      </div>

                      <div className="mt-2 text-xs font-bold font-sans text-slate-800">
                        {field.label || 'No field label configured'}
                      </div>

                      {field.placeholder && (
                        <div className="mt-1 text-[11px] text-gray-400 font-sans italic">
                          placeholder: &quot;{field.placeholder}&quot;
                        </div>
                      )}

                      {field.type === 'select' && field.options && (
                        <div className="mt-1.5 flex gap-1 flex-wrap">
                          {field.options.map((opt, oIdx) => (
                            <span key={oIdx} className="text-[9px] bg-fuchsia-50 text-fuchsia-700 px-1.5 py-0.5 rounded border border-fuchsia-100">
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* B. TEST LIVE PREVIEW FORM INSTANCES */}
          <div className="space-y-3 flex flex-col" id="live-renderer-blocks">
            <h4 className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-slate-400" />
              <span>Real-time Form Renderer preview</span>
            </h4>

            <div className="border border-slate-200 bg-white rounded-lg p-6 shadow-2xs flex-grow font-sans flex flex-col justify-between">
              
              <form onSubmit={handleTestSubmit} className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-800">{currentForm?.name}</h3>
                  <p className="text-[10px] text-gray-400">Interactive live template test suite.</p>
                </div>

                {currentForm?.fields.map((field) => (
                  <div key={field.id} className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>

                    {/* Form type cases */}
                    {field.type === 'select' ? (
                      <select
                        required={field.required}
                        value={sandboxVariables[field.key] || ''}
                        onChange={(e) => setSandboxVariables({ ...sandboxVariables, [field.key]: e.target.value })}
                        className="w-full text-xs border border-slate-300 rounded px-2.5 py-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-primaryOrange font-medium"
                      >
                        <option value="">-- Choose Option --</option>
                        {field.options?.map((opt, oIdx) => (
                          <option key={oIdx} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'boolean' ? (
                      <label className="flex items-center gap-2 text-xs text-slate-600 font-medium py-1">
                        <input
                          type="checkbox"
                          checked={!!sandboxVariables[field.key]}
                          onChange={(e) => setSandboxVariables({ ...sandboxVariables, [field.key]: e.target.checked })}
                          className="w-4 h-4 text-primaryOrange border-slate-300 rounded focus:ring-primaryOrange"
                        />
                        <span>Check to approve or verify</span>
                      </label>
                    ) : field.type === 'date' ? (
                      <input
                        type="date"
                        required={field.required}
                        value={sandboxVariables[field.key] || ''}
                        onChange={(e) => setSandboxVariables({ ...sandboxVariables, [field.key]: e.target.value })}
                        className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-primaryOrange font-medium"
                      />
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        required={field.required}
                        placeholder={field.placeholder || ''}
                        value={sandboxVariables[field.key] || ''}
                        onChange={(e) => setSandboxVariables({ ...sandboxVariables, [field.key]: e.target.value })}
                        className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-primaryOrange font-semibold"
                      />
                    )}
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={currentForm?.fields.length === 0}
                  className="w-full flex items-center justify-center gap-1.5 bg-primaryOrange hover:bg-orange-700 text-white font-sans text-xs font-bold py-2.5 rounded shadow-xs cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>Submit test criteria values</span>
                </button>
              </form>

              {/* Submission outcomes logs */}
              <div>
                <AnimatePresence>
                  {isSubmitSuccessful && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 space-y-1 leading-snug"
                    >
                      <div className="font-bold flex items-center gap-1">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Form instance is Valid!</span>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-700 bg-white/50 p-1.5 rounded border border-emerald-100 overflow-x-auto">
                        Output state structure: {JSON.stringify(sandboxVariables)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* 3. RIGHT HAND DETAILS SIDEBAR - PROPERTIES FIELD PANEL */}
      <div className="w-80 border-l border-slate-200 bg-white flex flex-col shrink-0 overflow-y-auto" id="form-properties-sidebar">
        
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
          <Settings className="w-4.5 h-4.5 text-slate-700" />
          <h3 className="font-sans font-bold text-slate-800 text-xs uppercase tracking-wider">
            Field Properties
          </h3>
        </div>

        {selectedFieldId ? (
          (() => {
            const field = currentForm?.fields.find(f => f.id === selectedFieldId);
            if (!field) return <div className="p-4 text-slate-400 text-xs font-sans">Select a field.</div>;

            return (
              <div className="p-4 space-y-4 font-sans text-xs">
                
                {/* Heading details */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                  <div className="flex items-center gap-1.5 font-bold text-gray-700 uppercase tracking-wide">
                    {getFieldIcon(field.type)}
                    <span>{field.type} FIELD PARAMS</span>
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-gray-400 bg-slate-100 p-0.5 px-1.5 rounded">
                    Field ID: {field.id}
                  </div>
                </div>

                {/* Property Label name */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-gray-600">Field Label Banner</label>
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateFieldProperty(field.id, 'label', e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primaryOrange font-medium"
                    id="field-property-label"
                  />
                </div>

                {/* Property State namespace variable mapping */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-gray-600">State Variable Binding Key</label>
                  <input
                    type="text"
                    value={field.key}
                    onChange={(e) => updateFieldProperty(field.id, 'key', e.target.value.replace(/\s+/g, ''))}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primaryOrange font-mono"
                    id="field-property-key"
                  />
                  <p className="text-[10px] text-gray-400">
                    Process variables will be saved under this EXACT name key. No spaces allowed.
                  </p>
                </div>

                {/* Required switch toggles */}
                <div className="flex items-center justify-between py-1 border-t border-slate-100 pt-3">
                  <span className="font-bold text-gray-600">Mandatory Field</span>
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateFieldProperty(field.id, 'required', e.target.checked)}
                    className="w-4 h-4 text-primaryOrange focus:ring-primaryOrange"
                    id="field-property-required"
                  />
                </div>

                {/* Input Placeholder helpers, if not checkbox type */}
                {field.type !== 'boolean' && field.type !== 'date' && (
                  <div className="space-y-1.5 pt-3 border-t border-slate-100">
                    <label className="block font-bold text-gray-600">Dummy Placeholder</label>
                    <input
                      type="text"
                      value={field.placeholder || ''}
                      onChange={(e) => updateFieldProperty(field.id, 'placeholder', e.target.value)}
                      placeholder="e.g. Type something..."
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none"
                    />
                  </div>
                )}

                {/* Specific option tags for selects widgets */}
                {field.type === 'select' && (
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <label className="block font-bold text-gray-600">Configure Option Choices</label>
                    
                    <div className="space-y-1.5">
                      {field.options?.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 px-2.5 rounded">
                          <span className="font-semibold text-gray-600 flex-grow text-xs">{opt}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFieldOption(field.id, oIdx)}
                            className="p-0.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="Append selection..."
                        id="new-option-input"
                        className="flex-grow border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value;
                            handleAddFieldOption(field.id, val);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('new-option-input') as HTMLInputElement;
                          if (el) {
                            handleAddFieldOption(field.id, el.value);
                            el.value = '';
                          }
                        }}
                        className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded border border-slate-300 cursor-pointer"
                      >
                        Add Choice
                      </button>
                    </div>
                  </div>
                )}

              </div>
            );
          })()
        ) : (
          <div className="p-6 text-center text-slate-400 space-y-2 mt-12 font-sans" id="unselected-field-panel-msg">
            <Settings className="w-8 h-8 mx-auto text-slate-300 animate-pulse" />
            <p className="text-[11px]">Select any field on the canvas to configure labels, variable bindings, placeholder text, options, and validation.</p>
          </div>
        )}
      </div>

    </div>
  );
}
