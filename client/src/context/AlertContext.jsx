import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { socketService } from '../services/socket';
import { useAuth } from './AuthContext';

const AlertContext = createContext(null);

const MAX_TOASTS = 5;         // maximum simultaneous toast notifications
const TOAST_TTL = 8000;       // ms before a toast auto-dismisses
const MAX_UNREAD_CAP = 99;    // badge cap

export function AlertProvider({ children }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [toasts, setToasts] = useState([]);           // active toast notifications
  const [unreadCount, setUnreadCount] = useState(0);  // nav badge count

  // Callbacks that pages can register to react to real-time events
  const alertListeners = useRef(new Set());

  // ── Listener registration API ────────────────────────────────────────────

  const addAlertListener = useCallback((fn) => {
    alertListeners.current.add(fn);
    return () => alertListeners.current.delete(fn);
  }, []);

  function notifyListeners(event, payload) {
    alertListeners.current.forEach((fn) => fn(event, payload));
  }

  // ── Toast helpers ────────────────────────────────────────────────────────

  function addToast(payload) {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [{ id, ...payload }, ...prev].slice(0, MAX_TOASTS));
    setTimeout(() => removeToast(id), TOAST_TTL);
  }

  function removeToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  // ── Socket lifecycle ─────────────────────────────────────────────────────

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!user || !token) {
      socketService.disconnect();
      setConnected(false);
      return;
    }

    const sock = socketService.connect(token);
    if (!sock) return;

    // ── Connection status
    sock.on('connect', () => setConnected(true));
    sock.on('disconnect', () => setConnected(false));
    sock.on('connect_error', () => setConnected(false));

    // ── After reconnection, refresh stale state via REST (see Dashboard/Alerts)
    sock.on('reconnect', () => {
      setConnected(true);
      notifyListeners('reconnect', {});
    });

    // ── risk:alert — new HIGH/CRITICAL alert created
    sock.on('risk:alert', (payload) => {
      setUnreadCount((c) => Math.min(c + 1, MAX_UNREAD_CAP));
      addToast({
        type: 'risk:alert',
        severity: payload.severity,
        riskScore: payload.riskScore,
        transactionId: payload.transactionId,
        alertId: payload.alertId,
        message: payload.message,
        timestamp: payload.timestamp,
      });
      notifyListeners('risk:alert', payload);
    });

    // ── risk:updated — existing transaction risk recalculated
    sock.on('risk:updated', (payload) => {
      if (payload.newRiskLevel === 'HIGH' || payload.newRiskLevel === 'CRITICAL') {
        addToast({
          type: 'risk:updated',
          severity: payload.newRiskLevel,
          riskScore: payload.newRiskScore,
          transactionId: payload.transactionId,
          message: `Risk recalculated: ${payload.previousRiskLevel ?? '?'} → ${payload.newRiskLevel}`,
          timestamp: payload.timestamp,
        });
      }
      notifyListeners('risk:updated', payload);
    });

    // ── alert:resolved
    sock.on('alert:resolved', (payload) => {
      setUnreadCount((c) => Math.max(c - 1, 0));
      notifyListeners('alert:resolved', payload);
    });

    // ── alert:dismissed
    sock.on('alert:dismissed', (payload) => {
      setUnreadCount((c) => Math.max(c - 1, 0));
      notifyListeners('alert:dismissed', payload);
    });

    // ── alert:status_updated (INVESTIGATING etc.)
    sock.on('alert:status_updated', (payload) => {
      notifyListeners('alert:status_updated', payload);
    });

    return () => {
      socketService.disconnect();
      setConnected(false);
    };
  }, [user]);   // re-run when auth user changes (login / logout)

  const value = {
    connected,
    toasts,
    removeToast,
    unreadCount,
    setUnreadCount,
    addAlertListener,
  };

  return (
    <AlertContext.Provider value={value}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  return useContext(AlertContext);
}
