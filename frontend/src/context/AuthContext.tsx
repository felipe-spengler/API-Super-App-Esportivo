import { createContext, useState, useEffect, useContext } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';

interface User {
    id: number;
    name: string;
    email: string;
    role: string; // 'super_admin', 'admin', 'user'
    is_admin?: boolean;
    club_id?: number | null;
    photo_url?: string;
    photo_urls?: string[];
}

interface AuthContextData {
    signed: boolean;
    user: User | null;
    loading: boolean;
    signIn: (email: string, pass: string) => Promise<User>;
    signOut: () => void;
    updateUser: (user: User) => void;
    impersonate: (token: string, user: User) => void;
    stopImpersonation: () => void;
    isImpersonating: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isImpersonating, setIsImpersonating] = useState(false);

    useEffect(() => {
        async function loadStorageData() {
            const storedUser = localStorage.getItem('@AppEsportivo:user');
            const storedToken = localStorage.getItem('@AppEsportivo:token');

            if (storedUser && storedToken) {
                // Opcional: Validar token com backend aqui
                setUser(JSON.parse(storedUser));
                api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            }

            if (localStorage.getItem('@AppEsportivo:sa_token')) {
                setIsImpersonating(true);
            }

            setLoading(false);
        }

        loadStorageData();
    }, []);

    async function signIn(email: string, pass: string) {
        // Ajuste a rota '/login' conforme sua rota real de login no backend
        const response = await api.post('/login', {
            login: email, // Backend espera 'login'
            password: pass
        });

        // Backend retorna access_token
        const { access_token, user } = response.data;
        const token = access_token;

        localStorage.setItem('@AppEsportivo:user', JSON.stringify(user));
        localStorage.setItem('@AppEsportivo:token', token);

        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(user);
        return user;
    }

    function signOut() {
        localStorage.removeItem('@AppEsportivo:user');
        localStorage.removeItem('@AppEsportivo:token');
        localStorage.removeItem('@AppEsportivo:sa_token');
        localStorage.removeItem('@AppEsportivo:sa_user');
        setUser(null);
        setIsImpersonating(false);
    }

    function updateUser(userData: User) {
        localStorage.setItem('@AppEsportivo:user', JSON.stringify(userData));
        setUser(userData);
    }

    function impersonate(token: string, newUser: User) {
        const currentToken = localStorage.getItem('@AppEsportivo:token');
        const currentUser = localStorage.getItem('@AppEsportivo:user');

        // Only save if we are not already impersonating (nested impersonation avoided)
        if (!localStorage.getItem('@AppEsportivo:sa_token')) {
            localStorage.setItem('@AppEsportivo:sa_token', currentToken || '');
            localStorage.setItem('@AppEsportivo:sa_user', currentUser || '');
        }

        localStorage.setItem('@AppEsportivo:user', JSON.stringify(newUser));
        localStorage.setItem('@AppEsportivo:token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(newUser);
        setIsImpersonating(true);
    }

    function stopImpersonation() {
        const saToken = localStorage.getItem('@AppEsportivo:sa_token');
        const saUser = localStorage.getItem('@AppEsportivo:sa_user');

        if (saToken && saUser) {
            localStorage.setItem('@AppEsportivo:token', saToken);
            localStorage.setItem('@AppEsportivo:user', saUser);
            api.defaults.headers.common['Authorization'] = `Bearer ${saToken}`;
            setUser(JSON.parse(saUser));

            localStorage.removeItem('@AppEsportivo:sa_token');
            localStorage.removeItem('@AppEsportivo:sa_user');
            setIsImpersonating(false);
            window.location.href = '/admin'; // Force reload to refresh sidebar cleanly
        }
    }

    return (
        <AuthContext.Provider value={{ signed: !!user, user, loading, signIn, signOut, updateUser, impersonate, stopImpersonation, isImpersonating }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
