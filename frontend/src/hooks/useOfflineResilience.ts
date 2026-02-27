import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

interface OfflineAction {
    id: string;
    action: string;
    data: any;
    attempts: number;
    timestamp: number;
}

export function useOfflineResilience(matchId: string | undefined, sportName: string, resolver?: (action: string, data: any) => Promise<any>) {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [offlineQueue, setOfflineQueue] = useState<OfflineAction[]>([]);
    const [syncing, setSyncing] = useState(false);

    const STORAGE_KEY = `offline_queue_${sportName}_${matchId}`;
    const CRASH_KEY = `crash_log_${sportName}_${matchId}`;

    const queueRef = useRef(offlineQueue);
    useEffect(() => {
        queueRef.current = offlineQueue;
    }, [offlineQueue]);

    const resolverRef = useRef(resolver);
    useEffect(() => {
        resolverRef.current = resolver;
    }, [resolver]);

    // 1. Initial Load (Once per matchId)
    useEffect(() => {
        if (!matchId) return;
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) setOfflineQueue(parsed);
            } catch (e) {
                console.error("Error loading queue", e);
            }
        }
    }, [matchId]);

    // 2. Persistence (Sync to LocalStorage)
    useEffect(() => {
        if (!matchId) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(offlineQueue));
    }, [offlineQueue, matchId]);

    // 3. Network & System Listeners
    useEffect(() => {
        if (!matchId) return;

        // Crash Recovery
        const lastCrash = localStorage.getItem(CRASH_KEY);
        if (lastCrash) {
            registerSystemEvent('system_error', `Recuperado de falha: ${lastCrash}`);
            localStorage.removeItem(CRASH_KEY);
        }

        const handleOnline = () => {
            setIsOnline(true);
            registerSystemEvent('user_action', 'Conexão Restaurada (Online)');
        };
        const handleOffline = () => {
            setIsOnline(false);
            registerSystemEvent('user_action', 'Conexão Perdida (Offline)');
        };
        const handleError = (event: ErrorEvent) => {
            const errorMsg = `Erro JS ${sportName}: ${event.message} em ${event.filename}:${event.lineno}`;
            localStorage.setItem(CRASH_KEY, errorMsg);
            registerSystemEvent('system_error', `FATAL JS: ${event.message}`);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('error', handleError);

        document.body.style.overscrollBehavior = 'none';
        document.documentElement.style.overscrollBehavior = 'none';

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (queueRef.current.length > 0) {
                const msg = "Você tem lançamentos pendentes que ainda não foram salvos no servidor.";
                e.preventDefault(); e.returnValue = msg; return msg;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('error', handleError);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.body.style.overscrollBehavior = 'auto';
            document.documentElement.style.overscrollBehavior = 'auto';
        };
    }, [matchId, sportName]);

    const registerSystemEvent = useCallback(async (type: string, label: string) => {
        if (!matchId) return;
        const payload = {
            event_type: type,
            team_id: null,
            minute: "00:00",
            period: 'Sistema',
            metadata: { label, sport: sportName, system_auto: true }
        };
        try {
            await api.post(`/admin/matches/${matchId}/events`, payload);
        } catch (e) {
            console.error("Failed to log system event", e);
            // Force it into the offline queue so we don't lose network connection logs
            setOfflineQueue(prev => [...prev, {
                id: `system-event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                action: 'event',
                data: payload,
                attempts: 0,
                timestamp: Date.now()
            }]);
        }
    }, [matchId, sportName]);

    const addToQueue = useCallback((action: string, data: any) => {
        const newItem: OfflineAction = {
            id: `${action}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            action,
            data,
            attempts: 0,
            timestamp: Date.now()
        };
        setOfflineQueue(prev => [...prev, newItem]);
    }, []);

    // 4. Sync Logic
    useEffect(() => {
        const sync = async () => {
            if (syncing || queueRef.current.length === 0 || !isOnline || !resolverRef.current) return;
            setSyncing(true);

            const item = queueRef.current[0];
            try {
                await resolverRef.current(item.action, item.data);
                setOfflineQueue(prev => prev.filter(i => i.id !== item.id));
            } catch (e: any) {
                console.error(`[Sync] Failed ${item.action}:`, e);
                if (e.response?.status === 422 || e.response?.status === 400) {
                    setOfflineQueue(prev => prev.filter(i => i.id !== item.id));
                } else {
                    setOfflineQueue(prev => prev.map(i => i.id === item.id ? { ...i, attempts: i.attempts + 1 } : i));
                    setIsOnline(false);
                    setTimeout(() => setIsOnline(navigator.onLine), 5000);
                }
            } finally {
                setSyncing(false);
            }
        };

        const timer = setInterval(sync, 1500);
        return () => clearInterval(timer);
    }, [isOnline, syncing]);

    return {
        isOnline,
        offlineQueue,
        syncing,
        addToQueue,
        registerSystemEvent,
        pendingCount: offlineQueue.length
    };
}

