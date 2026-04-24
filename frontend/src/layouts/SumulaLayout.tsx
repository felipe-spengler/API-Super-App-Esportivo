
import { useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';

/* 
 * This layout is used to keep the screen awake during match scoring (Sumula).
 * It uses the Screen Wake Lock API.
 */
export function SumulaLayout() {
    const wakeLockRef = useRef<any>(null);

    useEffect(() => {
        const requestWakeLock = async () => {
            if (!('wakeLock' in navigator)) {
                console.warn('⚠️ Wake Lock API not supported in this browser');
                return;
            }

            try {
                // If we already have a lock and it's active, don't request another one
                if (wakeLockRef.current && !wakeLockRef.current.released) {
                    return;
                }

                // @ts-ignore
                wakeLockRef.current = await navigator.wakeLock.request('screen');
                console.log('✅ Wake Lock is active - Screen will not sleep');

                // Handle system-initiated release (e.g. tab hidden, battery saver)
                wakeLockRef.current.addEventListener('release', () => {
                    console.log('🛑 Wake Lock was released');
                });
            } catch (err: any) {
                console.error(`❌ Wake Lock Error: ${err.name}, ${err.message}`);
            }
        };

        // Request wake lock on mount
        requestWakeLock();

        // Handle visibility change (re-request lock if tab becomes visible again)
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible') {
                console.log('Visibility changed to visible - re-requesting wake lock');
                await requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Re-request on any interaction if the lock was lost
        const handleInteraction = async () => {
            if (!wakeLockRef.current || wakeLockRef.current.released) {
                await requestWakeLock();
            }
        };
        document.addEventListener('click', handleInteraction);
        document.addEventListener('touchstart', handleInteraction);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('touchstart', handleInteraction);
            
            if (wakeLockRef.current) {
                wakeLockRef.current.release()
                    .then(() => console.log('🛑 Wake Lock released by unmount'))
                    .catch((e: any) => console.error(e));
                wakeLockRef.current = null;
            }
        };
    }, []);

    return <Outlet />;
}
