import React, { createContext, useContext } from 'react';

interface AuthContextType {
    onLogout?: () => void;
}

const AuthContext = createContext<AuthContextType>({});

export const AuthProvider = ({ children, onLogout }: { children: React.ReactNode; onLogout?: () => void }) => {
    return (
        <AuthContext.Provider value={{ onLogout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};