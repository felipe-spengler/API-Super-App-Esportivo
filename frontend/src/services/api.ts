import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api', // Ajuste conforme a porta do seu backend Laravel
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Interceptor para adicionar o token em todas as requisições
api.interceptors.request.use(config => {
    const token = localStorage.getItem('@AppEsportivo:token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Interceptor para tratamento de erros (ex: 401 - Não autorizado)
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            // Token expirado ou inválido
            localStorage.removeItem('@AppEsportivo:token');
            localStorage.removeItem('@AppEsportivo:user');
            // Opcional: Redirecionar para login
            // window.location.href = '/login'; 
        }
        return Promise.reject(error);
    }
);

export default api;
