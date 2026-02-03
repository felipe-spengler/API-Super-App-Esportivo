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
}

interface AuthContextData {
    signed: boolean;
    user: User | null;
    loading: boolean;
    signIn: (email: string, pass: string) => Promise<User>;
    signOut: () => void;
    updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStorageData() {
            const storedUser = localStorage.getItem('@AppEsportivo:user');
            const storedToken = localStorage.getItem('@AppEsportivo:token');

            if (storedUser && storedToken) {
                // Opcional: Validar token com backend aqui
                setUser(JSON.parse(storedUser));
                api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
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
        setUser(null);
    }

    function updateUser(userData: User) {
        localStorage.setItem('@AppEsportivo:user', JSON.stringify(userData));
        setUser(userData);
    }

    return (
        <AuthContext.Provider value={{ signed: !!user, user, loading, signIn, signOut, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
