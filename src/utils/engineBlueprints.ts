/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Process, DmnTable, FormSchema } from '../types';

export const INITIAL_FORMS: FormSchema[] = [
  {
    id: 'loan-app-form',
    name: 'Loan Application Form',
    createdAt: new Date().toISOString(),
    fields: [
      {
        id: 'f1',
        label: 'Applicant Full Name',
        key: 'applicantName',
        type: 'text',
        required: true,
        placeholder: 'John Doe',
      },
      {
        id: 'f2',
        label: 'Requested Loan Amount ($)',
        key: 'loanAmount',
        type: 'number',
        required: true,
        defaultValue: 15000,
      },
      {
        id: 'f3',
        label: 'Annual Income ($)',
        key: 'income',
        type: 'number',
        required: true,
        defaultValue: 65000,
      },
      {
        id: 'f4',
        label: 'Credit Score',
        key: 'creditScore',
        type: 'number',
        required: true,
        defaultValue: 710,
      },
      {
        id: 'f5',
        label: 'Loan Purpose',
        key: 'purpose',
        type: 'select',
        required: true,
        options: ['Home purchase', 'Debt consolidation', 'Business growth', 'Education', 'Personal'],
        defaultValue: 'Debt consolidation',
      }
    ]
  },
  {
    id: 'loan-review-form',
    name: 'Manual Loan Review Form',
    createdAt: new Date().toISOString(),
    fields: [
      {
        id: 'r1',
        label: 'Underwriter Comments',
        key: 'underwriterNotes',
        type: 'text',
        required: true,
        placeholder: 'Reasoning for recommendation...',
      },
      {
        id: 'r2',
        label: 'Manager Override Decision',
        key: 'overrideApproved',
        type: 'boolean',
        required: true,
        defaultValue: true,
      },
      {
        id: 'r3',
        label: 'Interest Rate %, if override approved',
        key: 'finalInterestRate',
        type: 'number',
        required: false,
        defaultValue: 6.25,
      }
    ]
  },
  {
    id: 'onboard-candidate-form',
    name: 'Candidate Interview Entry',
    createdAt: new Date().toISOString(),
    fields: [
      { id: 'c1', label: 'Candidate Name', key: 'candidateName', type: 'text', required: true },
      { id: 'c2', label: 'Position Department', key: 'department', type: 'select', required: true, options: ['Engineering', 'Design', 'Product', 'Sales', 'Marketing'] },
      { id: 'c3', label: 'Technical Score (1-10)', key: 'technicalScore', type: 'number', required: true, defaultValue: 8 },
      { id: 'c4', label: 'Experience Level', key: 'experienceLevel', type: 'select', required: true, options: ['Junior', 'Mid-Level', 'Senior', 'Lead'] }
    ]
  },
  {
    id: 'contract-sign-form',
    name: 'Employment Offer Acceptance',
    createdAt: new Date().toISOString(),
    fields: [
      { id: 'cn1', label: 'Confirm Base Salary ($)', key: 'annualSalary', type: 'number', required: true, defaultValue: 110000 },
      { id: 'cn2', label: 'Candidate Agreed and Signed', key: 'candidateSigned', type: 'boolean', required: true, defaultValue: true },
      { id: 'cn3', label: 'Actual Joining Date', key: 'joiningDate', type: 'date', required: true }
    ]
  }
];

export const INITIAL_DMN_TABLES: DmnTable[] = [
  {
    id: 'loan-eligibility-dmn',
    name: 'Loan Eligibility Scorecard',
    hitPolicy: 'first',
    createdAt: new Date().toISOString(),
    inputs: [
      { id: 'i1', label: 'Annual Income', name: 'income', type: 'number' },
      { id: 'i2', label: 'Credit Score', name: 'creditScore', type: 'number' }
    ],
    outputs: [
      { id: 'o1', label: 'Eligibility Status', name: 'eligibility', type: 'string' },
      { id: 'o2', label: 'Recommended Interest Rate %', name: 'interestRate', type: 'number' }
    ],
    rules: [
      {
        id: 'rule1',
        inputConstraints: ['< 30000', '-'],
        outputValues: ['"REJECTED"', '0'],
        description: 'Auto-decline candidates below minimum base income metric.'
      },
      {
        id: 'rule2',
        inputConstraints: ['>= 80000', '>= 720'],
        outputValues: ['"APPROVED"', '4.85'],
        description: 'High earner with exceptional credit risk profile fits Auto-Approve tier.'
      },
      {
        id: 'rule3',
        inputConstraints: ['>= 50000', '>= 680'],
        outputValues: ['"APPROVED"', '5.95'],
        description: 'Standard middle class credit tier approved automatically.'
      },
      {
        id: 'rule4',
        inputConstraints: ['>= 40000', '>= 620'],
        outputValues: ['"MANUAL_REVIEW"', '7.5'],
        description: 'Moderate metrics request human expert underwriting review.'
      },
      {
        id: 'rule5',
        inputConstraints: ['-', '< 600'],
        outputValues: ['"REJECTED"', '0'],
        description: 'Reject applicants holding insufficient credit standing scores.'
      },
      {
        id: 'rule6',
        inputConstraints: ['-', '-'],
        outputValues: ['"MANUAL_REVIEW"', '8.99'],
        description: 'Default catch-all routing to human review underwriter.'
      }
    ]
  },
  {
    id: 'salary-grade-dmn',
    name: 'Engineering Compensation Matrix',
    hitPolicy: 'first',
    createdAt: new Date().toISOString(),
    inputs: [
      { id: 'g1', label: 'Technical Score', name: 'technicalScore', type: 'number' },
      { id: 'g2', label: 'Experience Level', name: 'experienceLevel', type: 'string' }
    ],
    outputs: [
      { id: 'o_g1', label: 'Base Comp Offer ($)', name: 'offeredComp', type: 'number' },
      { id: 'o_g2', label: 'Requires VP Approval', name: 'needsVpSign', type: 'boolean' }
    ],
    rules: [
      { id: 'gr1', inputConstraints: ['>= 9', '"Lead"'], outputValues: ['185000', 'true'], description: 'Distinguished talent comp brackets.' },
      { id: 'gr2', inputConstraints: ['>= 7', '"Senior"'], outputValues: ['145000', 'false'], description: 'Mid-Senior core comp standard bracket.' },
      { id: 'gr3', inputConstraints: ['>= 7', '"Mid-Level"'], outputValues: ['115000', 'false'], description: 'Standard high-performing mid level.' },
      { id: 'gr4', inputConstraints: ['-', '"Junior"'], outputValues: ['85000', 'false'], description: 'Base career tracking Comp level.' },
      { id: 'gr5', inputConstraints: ['-', '-'], outputValues: ['105000', 'true'], description: 'Catch-all standard offering.' }
    ]
  }
];

export const INITIAL_PROCESSES: Process[] = [
  {
    id: 'loan-underwriting-process',
    name: 'Loan Underwriting and Approval Flow',
    description: 'An advanced pipeline where a loan applicant starts a request, DMN calculates credit eligibility, and a gateway routes to auto-approval, manual overriding, or immediate auto-rejections.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [
      { id: 'start-evt', name: 'Loan Package Filed', type: 'startEvent', x: 80, y: 180, formId: 'loan-app-form' },
      { id: 'dmn-calc', name: 'Determine Eligibility', type: 'dmnTask', x: 220, y: 160, dmnId: 'loan-eligibility-dmn' },
      { id: 'xor-gateway', name: 'Check Status Decision', type: 'exclusiveGateway', x: 400, y: 175 },
      
      // Top branch: APPROVED path leading to service notifier and end
      { id: 'service-notify-approved', name: 'Log Approved Account Notification', type: 'serviceTask', x: 520, y: 50, serviceAction: 'sendEmail', serviceResultVar: 'notifyResult' },
      { id: 'end-approved', name: 'Loan Disbursed', type: 'endEvent', x: 720, y: 70 },
      
      // Middle branch: MANUAL_REVIEW path leading to underwriter user task -> check decision
      { id: 'task-manual-review', name: 'Underwriter Manual Assessment', type: 'userTask', x: 520, y: 160, assignee: 'Credit Team Board', formId: 'loan-review-form' },
      { id: 'xor-override', name: 'Override Check', type: 'exclusiveGateway', x: 680, y: 175 },
      
      // Bottom branch: REJECTED path
      { id: 'service-notify-rejected', name: 'Issue Rejection Email Notification', type: 'serviceTask', x: 520, y: 280, serviceAction: 'logProcessInfo', serviceResultVar: 'rejectResult' },
      { id: 'end-rejections', name: 'Application Terminated', type: 'endEvent', x: 720, y: 300 }
    ],
    edges: [
      { id: 'flow1', sourceRef: 'start-evt', targetRef: 'dmn-calc' },
      { id: 'flow2', sourceRef: 'dmn-calc', targetRef: 'xor-gateway' },
      
      // From xor-gateway
      { id: 'flow-auto-approved', name: 'Auto-Approved', sourceRef: 'xor-gateway', targetRef: 'service-notify-approved', conditionExpression: 'eligibility === "APPROVED"' },
      { id: 'flow-needs-review', name: 'Requires Human Review', sourceRef: 'xor-gateway', targetRef: 'task-manual-review', conditionExpression: 'eligibility === "MANUAL_REVIEW"' },
      { id: 'flow-auto-rejected', name: 'Auto-Rejected', sourceRef: 'xor-gateway', targetRef: 'service-notify-rejected', conditionExpression: 'eligibility === "REJECTED"' },
      
      // Manual review logic
      { id: 'flow-task-to-override', sourceRef: 'task-manual-review', targetRef: 'xor-override' },
      // Flows from override check
      { id: 'flow-override-yes', name: 'Approved Override', sourceRef: 'xor-override', targetRef: 'service-notify-approved', conditionExpression: 'overrideApproved === true' },
      { id: 'flow-override-no', name: 'Declined Override', sourceRef: 'xor-override', targetRef: 'service-notify-rejected', conditionExpression: 'overrideApproved !== true' },
      
      // End terminations
      { id: 'flow-notify-to-end-approved', sourceRef: 'service-notify-approved', targetRef: 'end-approved' },
      { id: 'flow-notify-to-end-rejected', sourceRef: 'service-notify-rejected', targetRef: 'end-rejections' }
    ]
  },
  {
    id: 'employee-onboarding-process',
    name: 'Aesthetic Talent Hire and Compensation Process',
    description: 'Process to register candidate interview data, run an automated DMN salary index calculator, schedule service actions, and complete recruitment with a final hiring confirmation.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [
      { id: 'start-rec', name: 'Interview Accomplished', type: 'startEvent', x: 80, y: 150, formId: 'onboard-candidate-form' },
      { id: 'dmn-comp', name: 'Look up Compensation Rate', type: 'dmnTask', x: 220, y: 130, dmnId: 'salary-grade-dmn' },
      { id: 'service-id-verify', name: 'Trigger Background Check API', type: 'serviceTask', x: 380, y: 130, serviceAction: 'verifyIdentity', serviceResultVar: 'bgCheckStatus' },
      { id: 'task-contract', name: 'Sign Contract & Setup Start Date', type: 'userTask', x: 540, y: 130, assignee: 'HR Operations', formId: 'contract-sign-form' },
      { id: 'end-hired', name: 'Onboarded Successfully', type: 'endEvent', x: 720, y: 150 }
    ],
    edges: [
      { id: 'rect-1', sourceRef: 'start-rec', targetRef: 'dmn-comp' },
      { id: 'rect-2', sourceRef: 'dmn-comp', targetRef: 'service-id-verify' },
      { id: 'rect-3', sourceRef: 'service-id-verify', targetRef: 'task-contract' },
      { id: 'rect-4', sourceRef: 'task-contract', targetRef: 'end-hired' }
    ]
  }
];
