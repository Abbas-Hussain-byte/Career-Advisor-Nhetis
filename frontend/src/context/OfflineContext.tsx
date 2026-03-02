import React, { createContext, useContext, useState, useEffect } from 'react';

const OfflineContext = createContext<boolean>(false);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <OfflineContext.Provider value={isOffline}>
            {children}
            {isOffline && (
                <div className="fixed bottom-0 left-0 right-0 bg-red-600 text-white text-center p-2 z-50">
                    You are currently offline. Some features may be limited.
                </div>
            )}
        </OfflineContext.Provider>
    );
};

export const useOffline = () => useContext(OfflineContext);
