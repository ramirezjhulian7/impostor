import { useEffect, useRef } from 'react';

export function useWakeLock() {
    const wakeLockRef = useRef(null);

    useEffect(() => {
        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wakeLockRef.current = await navigator.wakeLock.request('screen');
                    console.log('Screen Wake Lock active');

                    wakeLockRef.current.addEventListener('release', () => {
                        console.log('Screen Wake Lock released');
                    });
                }
            } catch (err) {
                console.warn(`Screen Wake Lock error: ${err.name}, ${err.message}`);
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };

        // Request on mount
        requestWakeLock();

        // Re-request when tab becomes visible again
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (wakeLockRef.current) {
                wakeLockRef.current.release()
                    .catch(err => console.error('Failed to release wake lock:', err));
            }
        };
    }, []);
}
