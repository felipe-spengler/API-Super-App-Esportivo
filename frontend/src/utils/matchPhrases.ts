/**
 * Frases temáticas para os eventos de sistema das súmulas.
 * São exibidas na linha inferior dos "pills" de período/partida.
 * POLIESPORTIVAS: sem menção a campo, estádio, bola específica etc.
 * A seleção é determinística (baseada no ID do evento) para não mudar a cada re-render.
 */
export const MATCH_PHRASES: string[] = [
    'Haja coração! 💪',
    'Que vença o melhor! 🏆',
    'A batalha recomeça! ⚔️',
    'Deixem tudo em jogo! 🔥',
    'É agora ou nunca! ⚡',
    'A disputa não acabou! 😤',
    'Tudo pode mudar em segundos! ❤️‍🔥',
    'Cada segundo conta! ⏱️',
    'Garra, técnica e determinação! 🎯',
    'Chegou a hora da verdade! 🎯',
    'Quem quer mais? 💥',
    'A emoção toma conta! 🎭',
    'Guerreiros em ação! 🛡️',
    'Ninguém para até o fim! 🚀',
    'Suor, garra e superação! 💦',
    'A história vai ser escrita agora! 📜',
    'A torcida está em êxtase! 🙌',
    'É pra cima! Vai com tudo! 💯',
    'Momento épico! 🌟',
    'Isso é paixão pelo esporte! ❤️',
    'Emoção garantida! 🎉',
    'A decisão está nas mãos deles! 🤝',
    'Que espetáculo! 👀',
    'Nenhum resultado é definitivo! 🔄',
    'Foco, força e fé! 🎯',
];

/**
 * Retorna uma frase determinística baseada no ID do evento.
 * Usando o índice como fallback para eventos sem ID.
 */
export function getMatchPhrase(eventId: number | string, fallbackIndex = 0): string {
    const id = typeof eventId === 'string' ? parseInt(eventId, 10) || fallbackIndex : eventId;
    return MATCH_PHRASES[Math.abs(id) % MATCH_PHRASES.length];
}
