/**
 * Frases temáticas para os eventos de sistema das súmulas.
 * SEPARADAS POR TIPO DE EVENTO para que cada frase faça sentido no momento certo.
 * Todas são poliesportivas — sem menção a esporte específico, campo, estádio etc.
 */

export const MATCH_START_PHRASES: string[] = [
    'Que comece a batalha! ⚔️',
    'É hora de brilhar! ✨',
    'Que o melhor vença! 🏆',
    'Vai com tudo! 💥',
    'A disputa começa agora! 🎯',
    'Cada segundo vai contar! ⏱️',
    'Mostre do que é capaz! 💪',
    'Boa sorte aos dois lados! 🤜🤛',
];

export const PERIOD_START_PHRASES: string[] = [
    'A batalha recomeça! ⚔️',
    'Do zero, com tudo! 🔥',
    'Novo tempo, nova chance! 🌟',
    'O jogo não acabou! 💪',
    'Vamos lá, sem descanso! 🚀',
    'Haja coração! ❤️‍🔥',
    'A decisão está chegando! 🎯',
    'Quem quer mais vai buscar! 💯',
];

export const PERIOD_END_PHRASES: string[] = [
    'Intervalo! E agora? 🤔',
    'Hidrata e volta forte! 💧',
    'Tempo de recarregar as energias! ⚡',
    'O que vem por aí? 👀',
    'Cada ponto faz diferença! 📊',
    'Descansa o corpo, não a mente! 🧠',
    'O jogo ainda não decidiu nada! 🔄',
    'Estratégia e foco para o próximo! 🎯',
];

export const MATCH_END_PHRASES: string[] = [
    'E assim a história foi escrita! 📜',
    'Que disputa! Parabéns aos dois lados! 🤝',
    'Até a próxima batalha! 🏅',
    'Foi emocionante do início ao fim! ❤️',
    'O esforço de todos foi enorme! 💪',
    'Que jogo! Que partida! 🌟',
    'A vitória sorri para quem batalhou! 🏆',
    'Fim de jogo! Obrigado pela luta! 👏',
];

export const TIMEOUT_PHRASES: string[] = [
    'Pausa estratégica! 🧠',
    'Hora de reorganizar! 🔄',
    'O técnico tem a palavra! 📋',
    'Reajuste e volta mais forte! 💪',
];

/**
 * Retorna uma frase determinística baseada no ID do evento e no tipo de evento.
 * A seleção é baseada no ID para ser consistente entre re-renders.
 */
export function getMatchPhrase(
    eventId: number | string,
    eventType: 'match_start' | 'match_end' | 'period_start' | 'period_end' | 'timeout' | string,
    fallbackIndex = 0
): string {
    const id = typeof eventId === 'string' ? (parseInt(eventId, 10) || fallbackIndex) : eventId;
    const idx = Math.abs(id);

    switch (eventType) {
        case 'match_start':
            return MATCH_START_PHRASES[idx % MATCH_START_PHRASES.length];
        case 'period_start':
            return PERIOD_START_PHRASES[idx % PERIOD_START_PHRASES.length];
        case 'period_end':
            return PERIOD_END_PHRASES[idx % PERIOD_END_PHRASES.length];
        case 'match_end':
            return MATCH_END_PHRASES[idx % MATCH_END_PHRASES.length];
        case 'timeout':
            return TIMEOUT_PHRASES[idx % TIMEOUT_PHRASES.length];
        default:
            return PERIOD_START_PHRASES[idx % PERIOD_START_PHRASES.length];
    }
}
