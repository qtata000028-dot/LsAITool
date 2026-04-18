import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';

type DesignerWorkbenchDropLaneProps = {
  children: React.ReactNode;
  className: string;
  data: Record<string, unknown>;
  dropId: string;
  key?: React.Key;
  style?: React.CSSProperties;
};

export function DesignerWorkbenchDropLane({
  children,
  className,
  data,
  dropId,
  style,
}: DesignerWorkbenchDropLaneProps): React.JSX.Element {
  const { setNodeRef } = useDroppable({
    id: dropId,
    data,
  });

  return (
    <div ref={setNodeRef} className={className} style={style}>
      {children}
    </div>
  );
}

type DesignerWorkbenchDraggableItemProps = {
  children: React.ReactNode;
  className: string;
  data: Record<string, unknown>;
  dragId: string;
  dropId: string;
  itemAttributes?: Record<string, string>;
  key?: React.Key;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDoubleClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onMouseDown?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseDownCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseUp?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseUpCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  role?: string;
  style?: React.CSSProperties;
  tabIndex?: number;
};

export function DesignerWorkbenchDraggableItem({
  children,
  className,
  data,
  dragId,
  dropId,
  itemAttributes,
  onClick,
  onContextMenu,
  onDoubleClick,
  onKeyDown,
  onMouseDown,
  onMouseDownCapture,
  onMouseUp,
  onMouseUpCapture,
  role = 'button',
  style,
  tabIndex = 0,
}: DesignerWorkbenchDraggableItemProps): React.JSX.Element {
  const { attributes, listeners, setNodeRef: setDragNodeRef, transform } = useDraggable({
    id: dragId,
    data,
  });
  const { setNodeRef: setDropNodeRef } = useDroppable({
    id: dropId,
    data,
  });
  const setNodeRef = (node: HTMLDivElement | null) => {
    setDragNodeRef(node);
    setDropNodeRef(node);
  };
  const dragStyle = transform
    ? { ...(style ?? {}), transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : style;
  const shouldBlockDragStart = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return Boolean(target.closest('[data-workbench-no-drag="true"]'));
  };
  const handleMouseDownCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (shouldBlockDragStart(target)) {
      event.stopPropagation();
      return;
    }
    onMouseDownCapture?.(event);
  };
  const handlePointerDownCapture = (event: React.PointerEvent<HTMLDivElement>) => {
    if (shouldBlockDragStart(event.target)) {
      event.stopPropagation();
    }
  };

  return (
    <div
      ref={setNodeRef}
      role={role}
      tabIndex={tabIndex}
      className={className}
      style={dragStyle}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      onMouseDown={onMouseDown}
      onMouseDownCapture={handleMouseDownCapture}
      onPointerDownCapture={handlePointerDownCapture}
      onMouseUp={onMouseUp}
      onMouseUpCapture={onMouseUpCapture}
      {...itemAttributes}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}
