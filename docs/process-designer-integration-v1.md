# Process Designer Integration V1

## Goal

The frontend now includes a reusable process-designer component that can:

- run as an independent embedded component
- be mounted inside the existing design-platform configuration wizard
- call the backend Flowable bridge endpoints for XML compile and legacy preview
- be reused later by other process-related pages

## Main Files

- `src/features/dashboard/module-settings/process-designer-types.ts`
  - typed process document model and starter templates
- `src/features/dashboard/module-settings/process-designer-studio.tsx`
  - reusable designer canvas and properties panel
- `src/features/dashboard/module-settings/process-design-panel.tsx`
  - shared wrapper used by both workspace and wizard
- `src/lib/backend-process-designer.ts`
  - request builder and backend bridge API client
  - carries explicit approval-family routing for `bill` and `archive`
- `src/features/dashboard/module-settings/restriction-workbench.tsx`
  - current "流程设计管理" entry now uses the shared process-design panel
- `src/components/Dashboard.tsx`
  - configuration wizard now includes the new "流程设计" step

## Reuse Rule

If another page needs the same designer, prefer mounting:

- `ProcessDesignPanel` when the page already carries process scheme metadata
- `ProcessDesignerStudio` when only the DSL canvas is needed

Do not fork a second process-designer page shell unless the interaction truly diverges.

## Current Wizard Step

The config wizard step order is now:

1. 类型选择
2. 菜单信息
3. 模块介绍
4. 调研过程
5. 模块设置
6. 限制措施
7. 流程设计
8. 模块预览

## Current Scope

This version is intentionally the first reusable frontend shell, but it is already useful for联调:

- supports template switching:
  - linear
  - branch
  - parallel
- supports node property editing
- supports edge condition editing
- shares one state source between the restriction workbench and the wizard step
- can call backend:
  - `POST /api/bpm/legacy-flow/compile-xml`
  - `POST /api/bpm/legacy-flow/preview`
  - `POST /api/bpm/legacy-flow/publish`
- shows returned Flowable XML and legacy table previews inside the panel
- shows publish result statistics inside the panel
- routes legacy persistence by approval family before publish

## Approval Family Contract

Bridge requests must distinguish two approval families:

- `archive`
  - owner table: `p_systemdlltab`
  - flow type: `p_systemdlltabflowtype`
  - type step: `p_systemdlltabflowtypestep`
  - step grid: `p_systemdlltabflowstepgrid`
  - legacy flow: `p_systemdlltabflow`

- `bill`
  - owner table: `p_systembilltype`
  - flow type: `p_systembillflowtype`
  - type step: `p_systembillflowtypestep`
  - step grid: `p_systembillstepgrid`
  - legacy flow: `p_systembillflow`

The shared designer canvas can stay unified, but the bridge request must carry the target family so the backend can choose the correct persistence adapter.

## How To View

1. Start backend and make sure login is available.
2. Run the frontend:

```powershell
npm install
npm run dev
```

3. Open `http://localhost:3000`
4. Enter the design platform configuration wizard
5. Go to step `7. 流程设计`
6. Use:
   - `编译 XML`
   - `预览 Legacy 映射`
   - `发布 Legacy 流程`

## Not Done Yet

- full LogicFlow interaction is not wired yet
- drag-drop node authoring is not wired yet
- step-level child payload editors for `gridFields|conditions|menus|attachments` are still pending

## Local Validation

```powershell
npm run lint
npm run build
npm run dev
```
