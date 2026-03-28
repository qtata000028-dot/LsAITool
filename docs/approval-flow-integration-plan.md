# Approval Flow Integration Plan

## Background

The current system has two different approval families:

- bill approval
- base-archive approval

They share a similar approval concept, but they do **not** share the same write-back tables.

The legacy document `D:\NetPorjects\JavaProject\LserpPro\审批流转.docx` shows two separate table groups:

### Base-archive approval

- `p_systemdlltabflowtype`
- `p_systemdlltabflowtypestep`
- `p_systemdlltabflowstepgrid`
- `p_systemdlltabflow`

### Bill approval

- `p_systembillflowtype`
- `p_systembillflowtypestep`
- `p_systembillstepgrid`
- `p_systembillflow`

There are also shared accessory tables such as conditions, popup menus, attachments, reminders, and todo settings, but the current main write-back target remains the four core approval tables per family.

## Core Conclusion

Approval integration must be split into two persistence adapters:

1. `bill` adapter
2. `archive` adapter

The approval designer can still use one shared domain model, but save logic must branch by approval family.

Do not continue with a single generic "approval save" that writes whichever table names are convenient. That will blur the ownership boundary and create bad historical data.

## Ownership Boundary

### Archive approval

Archive approval belongs to the single-table / base-archive module family and is anchored by the archive module configuration domain:

- main module table: `p_systemdlltab`
- approval write-back tables:
  - `p_systemdlltabflowtype`
  - `p_systemdlltabflowtypestep`
  - `p_systemdlltabflowstepgrid`
  - `p_systemdlltabflow`

### Bill approval

Bill approval belongs to the bill module family and is anchored by the bill module configuration domain:

- main module table: `p_systembilltype`
- approval write-back tables:
  - `p_systembillflowtype`
  - `p_systembillflowtypestep`
  - `p_systembillstepgrid`
  - `p_systembillflow`

## Meaning Of The Four Core Tables

### Archive approval

1. `p_systemdlltabflowtype`
   Stores which approval flow types belong to one archive module.

2. `p_systemdlltabflowtypestep`
   Stores the node list under one flow type.

3. `p_systemdlltabflowstepgrid`
   Stores the field display definition for one step.

4. `p_systemdlltabflow`
   Legacy total-step table. After `flowtype + typestep` exists, this table is mostly a compatibility projection, but it still needs to be written.

### Bill approval

1. `p_systembillflowtype`
   Stores which approval flow types belong to one bill module.

2. `p_systembillflowtypestep`
   Stores the node list under one bill flow type.

3. `p_systembillstepgrid`
   Stores the field display definition for one bill step.

4. `p_systembillflow`
   Legacy total-step table. Same compatibility role as the archive side.

## Recommended Domain Model

Use one shared approval aggregate in code:

```ts
type ApprovalFamily = 'bill' | 'archive';

type ApprovalFlowAggregate = {
  family: ApprovalFamily;
  ownerCode: string;
  ownerId?: number | string;
  flowTypes: ApprovalFlowType[];
};

type ApprovalFlowType = {
  id?: number | string;
  flowCode: string;
  flowName: string;
  steps: ApprovalFlowStep[];
};

type ApprovalFlowStep = {
  id?: number | string;
  stepCode: string;
  stepName: string;
  orderNo: number;
  fields: ApprovalStepField[];
};

type ApprovalStepField = {
  id?: number | string;
  fieldCode: string;
  fieldName: string;
  visible: boolean;
  readOnly?: boolean;
  orderNo: number;
};
```

Then map this aggregate into:

- archive table set
- bill table set

## Save Strategy

Use the same save sequence for both families.

1. Save flow type master rows.
2. Save flow type steps.
3. Save step-grid rows.
4. Rebuild and write legacy total-flow rows.

The important point is:

- `flowtype` is the source of truth for the flow category
- `typestep` is the source of truth for the actual node chain
- `stepgrid` is the source of truth for per-step field presentation
- legacy `flow` table is a projection, not the primary editing source

## Strong Recommendation On Write Mode

For these old approval tables, prefer:

- scope delete
- full snapshot reinsert

instead of row-level diff updates.

In practice:

1. identify the module scope
2. identify the flow type scope
3. delete old `stepgrid`
4. delete old `typestep`
5. delete old `flowtype`
6. reinsert current snapshot
7. regenerate legacy `flow`

This is safer than patch-style updates because these old tables usually have weak constraints, historical dirty data, and implicit ordering semantics.

## Family Split Rule

Approval family must be decided before persistence.

Recommended decision sources:

1. explicit module family from the frontend payload
2. module type from menu / module metadata
3. backend owner lookup as the final guard

Suggested rules:

- if owner comes from `p_systembilltype`, use `bill`
- if owner comes from `p_systemdlltab`, use `archive`

Do not infer family from table name fragments later in the save process.

## Frontend / Backend Contract Adjustment

The save API should no longer be "one endpoint for all approval tables with mixed table names".

Recommended request contract:

```ts
type SaveApprovalFlowRequest = {
  family: 'bill' | 'archive';
  ownerCode: string;
  ownerId?: number | string;
  payload: ApprovalFlowAggregate;
};
```

Backend should route by `family`:

- `bill` -> bill approval adapter
- `archive` -> archive approval adapter

## Current Integration Decision

Based on the latest clarification, base-archive approval now uses these four main write-back tables:

1. `p_systemdlltabflowtype`
2. `p_systemdlltabflowtypestep`
3. `p_systemdlltabflowstepgrid`
4. `p_systemdlltabflow`

This must be kept separate from the already-discussed bill approval write-back path:

1. `p_systembillflowtype`
2. `p_systembillflowtypestep`
3. `p_systembillstepgrid`
4. `p_systembillflow`

## Practical Refactor Direction

1. Keep one approval designer UI model.
2. Add `family=bill|archive` to the approval payload immediately.
3. Build two backend write adapters instead of one mixed save service.
4. Treat `p_systemdlltabflow` and `p_systembillflow` as compatibility projections.
5. Make archive approval and bill approval test cases fully separate.

## Immediate Next Step

When implementing the real adapter, first lock down the owner-key mapping for:

- archive module -> `p_systemdlltab*`
- bill module -> `p_systembill*`

That key mapping is the only part that can still easily cause cross-family dirty writes.
