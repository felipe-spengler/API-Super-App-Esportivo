import { useState, useEffect, useCallback } from 'react';
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

    // 1. Initial Load & Network Listeners
    useEffect(() => {
        if (!matchId) return;

        // Load saved queue
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try { setOfflineQueue(JSON.parse(saved)); } catch (e) { console.error("Error loading queue", e); }
        }

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

        // Protection: Pull-to-refresh & Accidental Close
        document.body.style.overscrollBehavior = 'none';
        document.documentElement.style.overscrollBehavior = 'none';

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (offlineQueue.length > 0) {
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
    }, [matchId, offlineQueue.length]);

    // 2. Persistence
    useEffect(() => {
        if (!matchId) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(offlineQueue));
    }, [offlineQueue, matchId]);

    const registerSystemEvent = useCallback(async (type: string, label: string) => {
        if (!matchId) return;
        try {
            await api.post(`/admin/matches/${matchId}/events`, {
                event_type: type,
                team_id: null,
                minute: "00:00",
                period: 'Sistema',
                metadata: { label, sport: sportName }
            });
        } catch (e) {
            console.error("Failed to log system event", e);
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

    // 3. Sync Logic
    useEffect(() => {
        const sync = async () => {
            if (syncing || offlineQueue.length === 0 || !isOnline || !resolver) return;
            setSyncing(true);

            const item = offlineQueue[0];
            try {
                await resolver(item.action, item.data);
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
    }, [isOnline, offlineQueue, syncing, resolver]);

    return {
        isOnline,
        offlineQueue,
        syncing,
        addToQueue,
        registerSystemEvent,
        pendingCount: offlineQueue.length
    };
}
