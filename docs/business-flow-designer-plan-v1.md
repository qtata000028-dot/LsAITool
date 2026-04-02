# Business Flow Designer Plan V1

## Goal

Add a new wizard step after the current `流程设计` step.

The new step name is:

- `业务流程`

Its purpose is different from the current approval/process designer:

- current `流程设计`
  - focuses on approval workflow authoring
  - currently hosted by the Vue `Simple` process designer child app
- new `业务流程`
  - focuses on connecting business modules into one visible business chain
  - must behave more like a free-form diagram editor
  - must support node placement, drag, connection lines, and node-level business metadata

This document is the frontend-facing feature plan for that new capability.

## Current Baseline

The current configuration wizard step order is:

1. `类型选择`
2. `菜单信息`
3. `模块介绍`
4. `调研过程`
5. `模块设置`
6. `限制措施`
7. `流程设计`
8. `模块预览`

Relevant current implementation points:

- `src/components/Dashboard.tsx`
  - step constants and wizard step registration live here
- `src/features/dashboard/module-settings/config-wizard-step-content.tsx`
  - renders per-step content
- `src/features/dashboard/module-settings/simple-process-design-host-panel.tsx`
  - current Vue child-app host for approval flow design
- `subapps/simple-process-designer`
  - current child app for Yudao approval-tree authoring

## Main Decision

Do not force the new `业务流程` feature into the current approval designer.

Reason:

- the current child app is an approval-tree editor, not a free canvas
- it is strong at:
  - approver nodes
  - copy nodes
  - condition branches
  - parallel branches
- it is weak for the new target interaction:
  - arbitrary node placement
  - arbitrary connection lines
  - data-flow vs business-flow node categories
  - module-to-module transfer modeling
  - per-node transformation rules

Recommended direction:

- reuse the host-shell pattern
- reuse iframe or child-app embedding if needed
- reuse round-trip JSON snapshot persistence
- do not reuse the current approval-node semantics as the business-flow model

## Target Wizard Change

Recommended new step order:

1. `类型选择`
2. `菜单信息`
3. `模块介绍`
4. `调研过程`
5. `模块设置`
6. `限制措施`
7. `流程设计`
8. `业务流程`
9. `模块预览`

Recommended new step constants in principle:

```ts
const MODULE_SETTING_STEP = 5;
const RESTRICTION_STEP = 6;
const PROCESS_DESIGN_STEP = 7;
const BUSINESS_FLOW_STEP = 8;
const MODULE_PREVIEW_STEP = 9;
```

## Product Scope For V1

V1 should focus on design, persistence, and metadata binding.

Do not promise runtime execution in V1.

V1 should support:

- create one or more business-flow schemes for a module
- add nodes on canvas
- drag nodes
- add and remove lines
- edit line metadata
- zoom and pan canvas
- save and reload the original graph JSON without losing layout
- bind business metadata to nodes
- validate whether referenced module codes exist

V1 should not yet promise:

- workflow runtime engine
- automatic task execution
- distributed orchestration
- BPMN compilation
- replacement of existing approval runtime

## Node Model

The new business-flow designer should begin with two first-class node families.

### 1. Business Flow Node

Represents a business action or stage.

Recommended fields:

- `id`
- `nodeType = "business"`
- `name`
- `businessActionCode`
- `businessActionName`
- `moduleCode`
- `moduleName`
- `ownerRole`
- `triggerCondition`
- `resultState`
- `remark`
- `position`

Typical examples:

- create order
- submit bill
- finance confirm
- warehouse receive
- archive result

### 2. Data Flow Node

Represents a data source, target, or transformation step.

Recommended fields:

- `id`
- `nodeType = "data"`
- `name`
- `moduleCode`
- `moduleName`
- `billTypeCode`
- `transformRule`
- `inputMapping`
- `outputMapping`
- `dataSourceType`
- `remark`
- `position`

Typical examples:

- source bill
- target bill
- data transform
- data split
- data merge

## Edge Model

Use one edge structure first, then distinguish semantics by property.

Recommended edge fields:

- `id`
- `sourceNodeId`
- `targetNodeId`
- `relationType`
- `conditionExpression`
- `label`
- `remark`

Recommended `relationType` values:

- `business`
- `data`
- `trigger`

This keeps V1 simpler than splitting multiple incompatible edge classes too early.

## Recommended Frontend Architecture

### Host Layer

Add a new host panel under the current module-settings area.

Recommended new files:

- `src/features/dashboard/module-settings/business-flow-design-host-panel.tsx`
- `src/lib/backend-business-flow.ts`
- `src/lib/business-flow-designer-host.ts`

Responsibilities:

- launch the child app or embedded designer
- pass current module context
- receive `ready` and `save-draft`
- keep the selected scheme in local React state
- call backend save/list/detail APIs

### Child App / Canvas Layer

Recommended new child application:

- `subapps/business-flow-designer`

Why a separate child app:

- free-canvas requirements are different from approval-tree requirements
- avoids contaminating the approval designer code with unrelated semantics
- makes later standalone entry easier if this feature grows

Child app responsibilities:

- canvas render
- node palette
- node drag
- line creation
- node and edge property panels
- graph JSON serialization

## Recommended Frontend State Contract

The host-side saved draft should keep the original graph source.

Recommended root shape:

```ts
type BusinessFlowGraphSchema = {
  engine: 'business-flow-canvas';
  schemaVersion: 'v1';
  metadata: {
    businessCode: string;
    businessType?: string;
    moduleName?: string;
    schemeCode?: string;
    schemeName?: string;
  };
  nodes: Array<{
    id: string;
    nodeType: 'business' | 'data';
    name: string;
    position: { x: number; y: number };
    properties: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    relationType: 'business' | 'data' | 'trigger';
    properties?: Record<string, unknown>;
  }>;
};
```

Important rule:

- backend must store this original graph JSON directly
- do not flatten it into legacy approval tables
- do not attempt to reconstruct layout from relational rows in V1

## UI Layout Recommendation

Recommended three-panel layout:

- left
  - node palette
  - scheme info
- center
  - free canvas
- right
  - selected node or selected edge property inspector

Recommended top actions:

- save draft
- create scheme
- switch scheme
- validate references
- fit view
- zoom in
- zoom out

## Validation Rules For V1

At minimum validate:

- node name is not empty
- `moduleCode` exists when node type requires it
- edge source and target both exist
- no self-loop unless explicitly allowed later
- `transformRule` length and format are acceptable
- duplicate scheme code under the same module is not allowed

Validation result should be visible before save succeeds.

## Backend Expectations From Frontend

The frontend expects the backend to provide:

- scheme list
- scheme detail
- save draft
- optional delete
- module-code validation or module-option lookup

The backend should not require the frontend to translate graph JSON into approval flow payloads.

## Current Known Touchpoints

The following current files will be touched when implementation starts:

- `src/components/Dashboard.tsx`
- `src/features/dashboard/module-settings/config-wizard-step-content.tsx`
- `src/features/dashboard/module-settings/config-wizard-step-nodes.tsx`
- `src/features/dashboard/module-settings/dashboard-config-wizard-step-nodes.ts`
- `src/features/dashboard/module-settings/restriction-workbench.tsx`

## Not Done Yet

This feature is still planning-only at the moment.

Not implemented yet:

- new wizard step
- host panel
- child app
- graph schema types
- backend API client
- backend persistence
- module-code validation integration
- save and reload flow

## Recommended Delivery Order

1. freeze the `BusinessFlowGraphSchema` contract
2. add backend list/save/detail endpoints
3. add host-side panel and scheme switching
4. add child-app canvas with drag and connect
5. add node property editor
6. add validation and lookup integration
7. add visual polish and usability improvements

## Handover Note

If the next teammate needs to decide between:

- reusing the current approval-tree designer directly
- building a dedicated business-flow canvas

the current recommendation is:

- build a dedicated business-flow canvas
- only reuse the hosting, messaging, and snapshot-persistence pattern
