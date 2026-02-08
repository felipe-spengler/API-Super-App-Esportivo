import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// @ts-ignore
window.Pusher = Pusher;

const echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 443,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],

    // Configurações de reconexão e estabilidade
    disableStats: true,
    encrypted: true,

    // Configurações do Pusher para melhor estabilidade
    authEndpoint: `${import.meta.env.VITE_API_URL}/broadcasting/auth`,

    // Configurações adicionais para debugging (apenas em desenvolvimento)
    ...(import.meta.env.DEV && {
        enableLogging: true,
    }),
});

// Event listeners para monitoramento da conexão
if (import.meta.env.DEV) {
    echo.connector.pusher.connection.bind('connected', () => {
        console.log('✅ Reverb WebSocket Connected!');
        console.log('📡 Connection ID:', echo.connector.pusher.connection.socket_id);
    });

    echo.connector.pusher.connection.bind('connecting', () => {
        console.log('🔄 Reverb WebSocket Connecting...');
    });

    echo.connector.pusher.connection.bind('disconnected', () => {
        console.warn('⚠️ Reverb WebSocket Disconnected');
    });

    echo.connector.pusher.connection.bind('unavailable', () => {
        console.error('❌ Reverb WebSocket Unavailable');
    });

    echo.connector.pusher.connection.bind('failed', () => {
        console.error('❌ Reverb WebSocket Connection Failed');
    });

    echo.connector.pusher.connection.bind('error', (err: any) => {
        console.error('❌ Reverb WebSocket Error:', err);
    });

    echo.connector.pusher.connection.bind('state_change', (states: any) => {
        console.log('🔀 Reverb State Change:', states.previous, '→', states.current);
    });
}

export default echo;
