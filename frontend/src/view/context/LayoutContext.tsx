import React from 'react';

interface LayoutContextType {
    size: { x: number; y: number };
    spacing: number;
    flat: boolean;
    origin: { x: number; y: number };
    orientation: {
        f0: number;
        f1: number;
        f2: number;
        f3: number;
        b0: number;
        b1: number;
        b2: number;
        b3: number;
    };
}

export const LayoutContext = React.createContext<LayoutContextType | null>(null);

export const useLayout = () => {
    const context = React.useContext(LayoutContext);
    if (!context) {
        throw new Error('useLayout must be used within a LayoutProvider');
    }
    return context;
}; 