
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

/* 
 * This layout is used to keep the screen awake during match scoring (Sumula).
 * It uses the Screen Wake Lock API.
 */
export function SumulaLayout() {
    useEffect(() => {
        let wakeLock: any = null;

        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    // @ts-ignore
                    wakeLock = await navigator.wakeLock.request('screen');
                    console.log('✅ Wake Lock is active - Screen will not sleep');
                } else {
                    console.warn('⚠️ Wake Lock API not supported in this browser');
                }
            } catch (err: any) {
                console.error(`❌ Wake Lock Error: ${err.name}, ${err.message}`);
            }
        };

        // Request wake lock on mount
        requestWakeLock();

        // Handle visibility change (re-request lock if tab becomes visible again)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (wakeLock) {
                wakeLock.release()
                    .then(() => console.log('🛑 Wake Lock released'))
                    .catch((e: any) => console.error(e));
            }
        };
    }, []);

    return <Outlet />;
}
