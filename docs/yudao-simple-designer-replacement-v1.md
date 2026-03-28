# Yudao Simple Designer Replacement V1

## Goal

Replace the in-progress React process designer with the Yudao Vue 3 `Simple` designer.

The replacement target is:

- keep the current design platform shell and wizard
- move process-design authoring into a dedicated Vue child application
- embed or open that child application from the current React design system
- stop investing in the current React canvas as the long-term authoring UI

## Current Decision

The long-term authoring model is no longer:

- React custom canvas
- LogicFlow-like graph editing in `process-designer-studio.tsx`

The new long-term authoring model is:

- Yudao `SimpleProcessDesignerV2`
- Vue 3 + Element Plus child application
- React host shell only for launch, embed, and cross-app context handoff

## Why This Path

The Yudao `Simple` designer already matches the intended product form:

- start node
- approver node
- transactor node
- copy node
- condition branch
- parallel branch
- inclusive branch
- router branch
- delay timer
- trigger
- child process

That is much closer to DingTalk / Feishu style approval design than the current in-progress React canvas.

## Replace Boundary

### Keep

- current design platform routing
- current config wizard step structure
- current backend bridge endpoints:
  - `POST /api/bpm/legacy-flow/compile-xml`
  - `POST /api/bpm/legacy-flow/preview`
  - `POST /api/bpm/legacy-flow/publish`
- current approval-family split:
  - `bill`
  - `archive`

### Replace

- `src/features/dashboard/module-settings/process-designer-studio.tsx`
- `src/features/dashboard/module-settings/process-design-panel.tsx`

These files become legacy references only. New feature work should move to the Vue child application.

## Architecture

### React host

React remains responsible for:

- showing the process-design step inside the current wizard
- creating a new empty process scheme when needed
- passing module context into the child application
- opening the child application in iframe or new tab
- receiving child-app ready/save events via `postMessage`

### Vue child app

The Vue child application is responsible for:

- hosting Yudao `SimpleProcessDesignerV2`
- adapting Yudao global dependencies into local adapters
- loading form, user, role, dept, post, and user-group options
- owning the `SimpleFlowNode` authoring state
- converting child-app save payload into the Lserp canonical payload

### Backend

Backend remains responsible for:

- canonical payload validation
- canonical model to legacy preview mapping
- canonical model to legacy publish
- optional canonical model to Flowable XML compilation if still needed

## Directory Decision

The new child application lives inside the current frontend repository:

- `subapps/simple-process-designer`

Vendor snapshots pulled from Yudao live under:

- `subapps/simple-process-designer/vendor/yudao-ui-admin-vue3`

## Phase Plan

### Phase 1: Landing shell

Goal:

- stop expanding the React designer
- mount a new host panel
- create the Vue child-app skeleton
- add a repeatable Yudao source-sync script

Deliverables:

- new docs
- `subapps/simple-process-designer`
- sync script for Yudao `SimpleProcessDesignerV2`
- React host panel with iframe/new-tab launch

### Phase 2: Yudao component extraction

Goal:

- copy Yudao `SimpleProcessDesignerV2` into the child app vendor directory
- replace Yudao project-level imports with local adapters

Main source group:

- `src/views/bpm/simple/SimpleModelDesign.vue`
- `src/components/SimpleProcessDesignerV2/src/**/*`
- `src/components/SimpleProcessDesignerV2/theme/**/*`

Adapter targets:

- `@/api/bpm/form`
- `@/api/system/role`
- `@/api/system/dept`
- `@/api/system/post`
- `@/api/system/user`
- `@/api/bpm/userGroup`
- `@/utils/tree`
- `@/utils/is`
- `@/utils/download`
- `useMessage`
- `ContentWrap`
- `Dialog`
- `Icon`

### Phase 3: Canonical payload

Goal:

- define one Lserp-owned simple workflow payload
- stop binding save semantics to the old React graph model

Recommended child save payload:

```ts
type LserpSimpleProcessDraft = {
  approvalFamily: 'bill' | 'archive';
  businessCode: string;
  businessType: string;
  currentUserName?: string;
  modelFormId?: number;
  modelFormType?: number;
  moduleName: string;
  schemeCode: string;
  schemeName: string;
  simpleSchema: Record<string, unknown>;
};
```

### Phase 4: Backend adapter

Goal:

- add backend support for `simpleSchema`
- convert Yudao `SimpleFlowNode` into the canonical bridge model

Recommended backend steps:

1. add `simpleSchema` to the request contract
2. map `simpleSchema` to canonical workflow semantics
3. build `stepConfigs`
4. route by `approvalFamily`
5. preview and publish to legacy tables

### Phase 5: Replace old UI

Goal:

- switch both current process-design entry points to the new host
- mark the old React designer deprecated
- remove old designer once child-app save and preview are stable

Entry points to switch:

- wizard step `7. 流程设计`
- restriction workbench `process` tab

## Implementation Steps

### Step 1

Create the child-app skeleton and host shell.

Status:

- should be completed first

### Step 2

Add the Yudao sync script and pull the current `SimpleProcessDesignerV2` source tree into `vendor/`.

Status:

- should be automated, not manual copy-paste

### Step 3

Build local adapters for:

- user list
- role list
- dept list
- post list
- user group list
- form fields

Status:

- unblock the real designer render

### Step 4

Render the real Yudao designer inside the child app and emit `ready` / `save` events through `postMessage`.

Status:

- completed
- `hydrate` has also been added so existing drafts can be pushed back into the child app

### Step 5

Define and implement the save contract from child app to backend.

Status:

- frontend side started
- current payload already supports `simpleSchema` and `simpleSchemaVersion`
- backend parse service is still pending

### Step 6

Retire the old React authoring surface.

Status:

- React host entry points are already switched to the Vue child app
- old React designer files remain in the repo only as migration references

## Non-Goals

- do not embed the full Yudao BPM module
- do not bring in Yudao RBAC, router, or full page system
- do not keep investing in the old React process canvas
- do not require BPMN as the primary authoring UI

## Immediate Execution Rule

From this point on:

- all new process-design work should target `subapps/simple-process-designer`
- React only acts as the host shell
- backend bridge evolution should prioritize `simpleSchema` over the old React graph DSL

## Current Status

Status as of 2026-03-26:

- completed: created `subapps/simple-process-designer`
- completed: added repeatable Yudao sync script `scripts/fetch-yudao-simple-designer.mjs`
- completed: mounted the Vue child-app host in both React process-design entry points
- completed: rendered the real Yudao `SimpleProcessDesignerV2` inside the child app
- completed: added `postMessage` bridge for `ready`, `hydrate`, and `save-draft`
- completed: child-app draft can now round-trip through the React host as `simpleSchema`
- completed: frontend request types now allow `simpleSchema` and `simpleSchemaVersion`
- completed: child-app now accepts auth-session bridge and prefers real API adapters with mock fallback
- pending: backend parse pipeline for `simpleSchema -> canonical model -> preview/publish`

## Local Run

Use the combined dev entry when you want to launch the React host and the Vue child app together:

```powershell
npm run dev
```

This starts:

- React host on `http://127.0.0.1:3000`
- local API dev process on `http://127.0.0.1:3001`
- Vue child app on `http://127.0.0.1:5174`

`npm run dev:host` remains available when you only want the old React + API stack without the Vue child app.

## Production Build

`npm run build` now performs these steps automatically:

1. build `subapps/simple-process-designer`
2. copy its bundle into `public/simple-process-designer/`
3. build the React host app

The production default child-app URL is now the same-origin path `/simple-process-designer/`, so release deployment no longer requires a second port or a second site.
