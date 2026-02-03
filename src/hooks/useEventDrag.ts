import { useState, useCallback, useEffect, useRef } from 'react';
import { CalendarEvent } from '../types';
import { useCalendarStore } from '../store/useCalendarStore';
import { addMinutes, differenceInMinutes, startOfDay } from 'date-fns';

interface UseEventDragProps {
  pixelsPerMinute: number;
  snapToMinutes?: number;
}

export function useEventDrag({ pixelsPerMinute, snapToMinutes = 15 }: UseEventDragProps) {
  const { updateEvent } = useCalendarStore();
  const [dragState, setDragState] = useState<{
    event: CalendarEvent;
    type: 'move' | 'resize';
    initialY: number;
    initialStart: Date;
    initialEnd: Date;
    currentY: number;
    dayDate?: Date;
  } | null>(null);

  const lastDragTsRef = useRef<number>(0);
  const movedRef = useRef<boolean>(false);

  const handleMouseDown = (e: React.MouseEvent, event: CalendarEvent, type: 'move' | 'resize') => {
    e.stopPropagation();
    e.preventDefault();
    movedRef.current = false;
    setDragState({
      event,
      type,
      initialY: e.clientY,
      initialStart: event.start,
      initialEnd: event.end,
      currentY: e.clientY,
      dayDate: startOfDay(event.start),
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState) return;
      const delta = Math.abs(e.clientY - dragState.initialY);
      if (delta > 3) movedRef.current = true;
      setDragState((prev) => (prev ? { ...prev, currentY: e.clientY } : null));
    },
    [dragState]
  );

  const handleMouseUp = useCallback(() => {
    if (!dragState) return;

    const deltaPixels = dragState.currentY - dragState.initialY;
    const deltaMinutes = Math.round(deltaPixels / pixelsPerMinute / snapToMinutes) * snapToMinutes;

    if (deltaMinutes !== 0) {
      let newStart = dragState.initialStart;
      let newEnd = dragState.initialEnd;

      if (dragState.type === 'move') {
        newStart = addMinutes(dragState.initialStart, deltaMinutes);
        newEnd = addMinutes(dragState.initialEnd, deltaMinutes);
      } else {
        newEnd = addMinutes(dragState.initialEnd, deltaMinutes);
        if (differenceInMinutes(newEnd, newStart) < 15) {
          newEnd = addMinutes(newStart, 15);
        }
      }

      updateEvent({
        ...dragState.event,
        start: newStart,
        end: newEnd,
      });
    }

    if (movedRef.current) {
      lastDragTsRef.current = Date.now();
    }

    setDragState(null);
  }, [dragState, pixelsPerMinute, snapToMinutes, updateEvent]);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = dragState.type === 'move' ? 'grabbing' : 'ns-resize';
      document.body.style.userSelect = 'none';
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [dragState, handleMouseMove, handleMouseUp]);

  const getDragStyle = () => {
    if (!dragState) return null;

    const deltaPixels = dragState.currentY - dragState.initialY;
    const deltaMinutes = Math.round(deltaPixels / pixelsPerMinute / snapToMinutes) * snapToMinutes;

    const startMinutes = differenceInMinutes(dragState.initialStart, startOfDay(dragState.initialStart));
    const durationMinutes = differenceInMinutes(dragState.initialEnd, dragState.initialStart);

    let newStartMinutes = startMinutes;
    let newDurationMinutes = durationMinutes;

    if (dragState.type === 'move') {
      newStartMinutes += deltaMinutes;
    } else {
      newDurationMinutes += deltaMinutes;
      if (newDurationMinutes < 15) newDurationMinutes = 15;
    }

    return {
      top: `${newStartMinutes * pixelsPerMinute}px`,
      height: `${newDurationMinutes * pixelsPerMinute}px`,
      zIndex: 50,
      opacity: 0.8,
      cursor: dragState.type === 'move' ? 'grabbing' : 'ns-resize',
    };
  };

  const shouldSuppressClick = () => {
    if (dragState) return true;
    return Date.now() - lastDragTsRef.current < 200;
  };

  return {
    handleMouseDown,
    dragState,
    getDragStyle,
    shouldSuppressClick,
  };
}
