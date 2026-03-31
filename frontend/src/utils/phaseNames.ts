/**
 * Utility functions for converting between backend phase values and display names
 */

export interface Phase {
    value: string;
    label: string;
}

export const PHASES: Phase[] = [
    { value: 'round_of_32', label: '32-avos de Final' },
    { value: 'round_of_16', label: 'Oitavas de Final' },
    { value: 'quarter', label: 'Quartas de Final' },
    { value: 'semi', label: 'Semifinal' },
    { value: 'third_place', label: 'Disputa 3º Lugar' },
    { value: 'final', label: 'Final' },
    { value: 'Grande Final', label: 'Grande Final' },
];

/**
 * Convert backend phase value to display name
 * @param backendValue - The backend value (e.g., 'round_of_16')
 * @returns The display name (e.g., 'Oitavas de Final')
 */
export function getPhaseDisplayName(backendValue: string): string {
    const phase = PHASES.find(p => p.value === backendValue);
    return phase ? phase.label : backendValue;
}

/**
 * Convert display name to backend phase value
 * @param displayName - The display name (e.g., 'Oitavas de Final')
 * @returns The backend value (e.g., 'round_of_16')
 */
export function getPhaseBackendValue(displayName: string): string {
    const phase = PHASES.find(p => p.label === displayName);
    return phase ? phase.value : displayName;
}

/**
 * Check if a string is a backend phase value
 * @param value - The value to check
 * @returns True if it's a backend phase value
 */
export function isBackendPhaseValue(value: string): boolean {
    return PHASES.some(p => p.value === value);
}

/**
 * Get the display name for any round/phase name
 * Handles: Rodada X, Eliminatória X, and phase values
 * @param roundName - The round name from the database
 * @returns The friendly display name
 */
export function getRoundDisplayName(roundName: string | null | undefined): string {
    if (!roundName) return 'Rodada';
    
    // Check if it's a backend phase value
    if (isBackendPhaseValue(roundName)) {
        return getPhaseDisplayName(roundName);
    }
    
    // Otherwise return as is (Rodada X, Eliminatória X, etc.)
    return roundName;
}
