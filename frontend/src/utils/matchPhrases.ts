/**
 * Frases temáticas para os eventos de sistema das súmulas.
 * São exibidas na linha inferior dos "pills" de período/partida.
 * A seleção é determinística (baseada no ID do evento) para não mudar a cada re-render.
 */
export const MATCH_PHRASES: string[] = [
    'Haja coração! 💪',
    'Que vença o melhor! 🏆',
    'A batalha recomeça! ⚔️',
    'Deixem tudo em campo! 🔥',
    'É agora ou nunca! ⚡',
    'O jogo não acabou! 😤',
    'Pulsa o coração da torcida! ❤️‍🔥',
    'Cada segundo conta! ⏱️',
    'Destino traçado, bola rolando! ⚽',
    'Chegou a hora da verdade! 🎯',
    'Quem quer mais? 💥',
    'A emoção toma conta! 🎭',
    'Guerreiros em campo! 🛡️',
    'Ninguém para até o fim! 🚀',
    'Suor, garra e determinação! 💦',
    'A história vai ser escrita agora! 📜',
    'Deu a louca no estádio! 🏟️',
    'É pra cima! Vai com tudo! 💯',
    'Momento épico! 🌟',
    'Isso é paixão pelo esporte! ❤️',
    'Emoção garantida! 🎉',
    'Torcida à flor da pele! 🙌',
    'Que espetáculo! 👀',
    'Nenhum resultado é definitivo! 🔄',
    'Coragem, foco e gol! 🎯',
];

/**
 * Retorna uma frase determinística baseada no ID do evento.
 * Usando o índice como fallback para eventos sem ID.
 */
export function getMatchPhrase(eventId: number | string, fallbackIndex = 0): string {
    const id = typeof eventId === 'string' ? parseInt(eventId, 10) || fallbackIndex : eventId;
    return MATCH_PHRASES[Math.abs(id) % MATCH_PHRASES.length];
}
