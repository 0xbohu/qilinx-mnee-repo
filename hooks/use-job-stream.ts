"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ExecutionEvent } from "@/lib/agents/types";

export interface UseJobStreamOptions {
  jobId: string;
  enabled?: boolean;
  onEvent?: (event: ExecutionEvent) => void;
}

export interface UseJobStreamReturn {
  isConnected: boolean;
  events: ExecutionEvent[];
  lastEvent: ExecutionEvent | null;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
}

export function useJobStream({
  jobId,
  enabled = true,
  onEvent,
}: UseJobStreamOptions): UseJobStreamReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<ExecutionEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);

  // Keep onEvent ref updated
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const connect = useCallback(() => {
    // Close existing connection
    disconnect();

    const eventSource = new EventSource(`/api/agents/jobs/${jobId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ExecutionEvent;
        setEvents((prev) => [...prev, data]);
        setLastEvent(data);
        onEventRef.current?.(data);

        // Auto-disconnect on terminal events
        if (
          data.type === "job_completed" ||
          data.type === "job_failed" ||
          data.type === "job_cancelled"
        ) {
          setTimeout(() => disconnect(), 500);
        }
      } catch (err) {
        console.error("Failed to parse SSE event:", err);
      }
    };

    eventSource.onerror = () => {
      setError("Connection lost");
      setIsConnected(false);
      // Don't auto-reconnect, let the component decide
    };
  }, [jobId, disconnect]);

  // Auto-connect when enabled
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected,
    events,
    lastEvent,
    error,
    connect,
    disconnect,
  };
}
