import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, MicOff, Check, X, Timer, Play, Pause } from 'lucide-react';
import api from '../../services/api';

// Extend window interface for SpeechRecognition
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

type Quarter = '1º Quarto' | '2º Quarto' | 'Intervalo' | '3º Quarto' | '4º Quarto' | 'Prorrogação' | 'Fim de Jogo';

export function SumulaBasqueteVoz() {
    const { id } = useParams();
    const navigate = useNavigate();

    // Match State (Copied from SumulaBasquete)
    const [loading, setLoading] = useState(true);
    const [matchData, setMatchData] = useState<any>(null);
    const [rosters, setRosters] = useState<any>({ home: [], away: [] });

    // Timer
    const [time, setTime] = useState(600);
    const [isRunning, setIsRunning] = useState(false);
    const [currentQuarter, setCurrentQuarter] = useState<Quarter>('1º Quarto');

    // Voice State
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [feedback, setFeedback] = useState('');
    const [pendingAction, setPendingAction] = useState<any>(null); // { type, team, player, value }

    const recognitionRef = useRef<any>(null);

    // Initial Load
    useEffect(() => {
        fetchMatchDetails();

        // Setup Speech Recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.lang = 'pt-BR';
            recognition.continuous = false; // Stop after one sentence
            recognition.interimResults = true; // Show results while speaking

            recognition.onstart = () => {
                setIsListening(true);
                setFeedback('Ouvindo...');
            };

            recognition.onend = () => {
                setIsListening(false);
                // Don't clear feedback immediately so user can see what happened
            };

            recognition.onresult = (event: any) => {
                const current = event.resultIndex;
                const result = event.results[current];
                const text = result[0].transcript;
                setTranscript(text);

                if (result.isFinal) {
                    processVoiceCommand(text);
                }
            };

            recognitionRef.current = recognition;
        } else {
            alert("Seu navegador não suporta reconhecimento de voz.");
        }
    }, [id]);

    const fetchMatchDetails = async () => {
        try {
            const response = await api.get(`/admin/matches/${id}/full-details`);
            const data = response.data;
            if (data.match) {
                setMatchData({
                    ...data.match,
                    scoreHome: parseInt(data.match.home_score || 0),
                    scoreAway: parseInt(data.match.away_score || 0)
                });
                if (data.rosters) setRosters(data.rosters);
            }
            setLoading(false);
        } catch (e) {
            console.error(e);
            alert('Erro ao carregar jogo.');
        }
    };

    const processVoiceCommand = (text: string) => {
        console.log("Processando:", text);
        const lower = text.toLowerCase();

        let team: 'home' | 'away' | null = null;
        let points = 0;
        let type = '';
        let number: string | null = null;

        // 1. Identificar Time
        const homeName = matchData?.home_team?.name?.toLowerCase() || '';
        const awayName = matchData?.away_team?.name?.toLowerCase() || '';

        if (lower.includes('casa') || lower.includes('mandante') || (homeName && lower.includes(homeName))) {
            team = 'home';
        } else if (lower.includes('visitante') || lower.includes('fora') || (awayName && lower.includes(awayName))) {
            team = 'away';
        }

        // 2. Identificar Ação (Pontos)
        if (lower.includes('três pontos') || lower.includes('3 pontos')) {
            points = 3;
            type = '3_points';
        } else if (lower.includes('dois pontos') || lower.includes('2 pontos')) {
            points = 2;
            type = '2_points';
        } else if (lower.includes('um ponto') || lower.includes('lance livre') || lower.includes('ponto')) {
            points = 1;
            type = '1_point';
        } else if (lower.includes('falta')) {
            type = 'foul';
        }

        // 3. Identificar Número do Jogador
        // Regex para "camisa X", "número Y", ou apenas números soltos se o contexto ajudar
        const numberMatch = lower.match(/(?:camisa|número|jogador)\s+(\d{1,3})/);
        if (numberMatch) {
            number = numberMatch[1];
        } else {
            // Tenta achar numero solto no final da frase
            const lastWord = lower.split(' ').pop();
            if (lastWord && !isNaN(parseInt(lastWord))) {
                number = lastWord;
            }
        }

        if (type && team && number) {
            // Find player
            const roster = team === 'home' ? rosters.home : rosters.away;
            const player = roster.find((p: any) => p.number == number || p.number == parseInt(number || '0'));

            if (player) {
                setPendingAction({
                    type,
                    team,
                    player,
                    value: points,
                    description: `${type === 'foul' ? 'Falta' : points + ' Pontos'} - ${player.name} (${team === 'home' ? 'Casa' : 'Visitante'})`
                });
                setFeedback(`Entendi: ${type === 'foul' ? 'Falta' : points + ' Pontos'} para camisa ${number}. Confirma?`);
            } else {
                setFeedback(`Jogador camisa ${number} não encontrado no time ${team === 'home' ? 'da Casa' : 'Visitante'}.`);
            }
        } else {
            // Fallback partial recognition loops could go here
            let missing = [];
            if (!team) missing.push("o time");
            if (!type) missing.push("a ação");
            if (!number) missing.push("o número");
            setFeedback(`Não entendi ${missing.join(', ')}. Tente: "Três pontos time casa camisa dez"`);
        }
    };

    const confirmAction = async () => {
        if (!pendingAction || !matchData) return;

        try {
            let apiType = pendingAction.type;
            if (pendingAction.type === '1_point') apiType = 'free_throw';
            if (pendingAction.type === '2_points') apiType = 'field_goal_2';
            if (pendingAction.type === '3_points') apiType = 'field_goal_3';

            // Optimistic Update
            if (pendingAction.value > 0) {
                setMatchData((prev: any) => ({
                    ...prev,
                    scoreHome: pendingAction.team === 'home' ? prev.scoreHome + pendingAction.value : prev.scoreHome,
                    scoreAway: pendingAction.team === 'away' ? prev.scoreAway + pendingAction.value : prev.scoreAway
                }));
            }

            const teamId = pendingAction.team === 'home' ? matchData.home_team_id : matchData.away_team_id;

            await api.post(`/admin/matches/${id}/events`, {
                event_type: apiType,
                team_id: teamId,
                minute: '00:00', // TODO: Get real time
                period: currentQuarter,
                player_id: pendingAction.player.id,
                value: pendingAction.value
            });

            setPendingAction(null);
            setFeedback("Lançamento confirmado!");
            setTranscript("");
        } catch (e) {
            console.error(e);
            alert("Erro ao salvar.");
        }
    };

    const cancelAction = () => {
        setPendingAction(null);
        setFeedback("Cancelado. Pode falar novamente.");
        setTranscript("");
    };

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            setPendingAction(null);
            setTranscript("");
            recognitionRef.current?.start();
        }
    };

    if (loading || !matchData) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Carregando...</div>;

    return (
        <div className="min-h-screen bg-black text-white p-4 flex flex-col items-center">
            {/* Header */}
            <div className="w-full flex justify-between items-center mb-6">
                <button onClick={() => navigate(-1)} className="p-2 bg-gray-800 rounded-full">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="text-center">
                    <h1 className="text-xl font-bold text-orange-500">SÚMULA POR VOZ 🎙️</h1>
                    <p className="text-gray-400 text-xs">{matchData.home_team?.name} vs {matchData.away_team?.name}</p>
                </div>
                <div className="w-10"></div>
            </div>

            {/* Scoreboard Simplificado */}
            <div className="flex gap-8 mb-8">
                <div className="text-center">
                    <div className="text-6xl font-black text-orange-100">{matchData.scoreHome}</div>
                    <div className="text-sm text-gray-400">CASA</div>
                </div>
                <div className="text-center">
                    <div className="text-6xl font-black text-orange-100">{matchData.scoreAway}</div>
                    <div className="text-sm text-gray-400">VISITANTE</div>
                </div>
            </div>

            {/* Voice Control Area */}
            <div className="flex-1 w-full max-w-md flex flex-col items-center justify-center gap-6">

                {/* Feedback Display */}
                <div className="w-full bg-gray-900/50 border border-gray-700 rounded-2xl p-6 text-center min-h-[150px] flex flex-col justify-center">
                    <p className="text-gray-400 text-sm mb-2 uppercase tracking-wide">Comando Reconhecido:</p>
                    <p className="text-2xl font-medium text-white italic">"{transcript || '...'}"</p>
                    <p className={`mt-4 text-sm font-bold ${pendingAction ? 'text-green-400' : 'text-orange-400'}`}>
                        {feedback}
                    </p>
                </div>

                {/* Main Action Button */}
                <div className="relative">
                    {/* Pulse Effect */}
                    {isListening && (
                        <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-20"></div>
                    )}

                    <button
                        onClick={toggleListening}
                        className={`w-32 h-32 rounded-full flex items-center justify-center transition-all shadow-2xl ${isListening ? 'bg-orange-600 scale-110' : 'bg-gray-800 hover:bg-gray-700'
                            }`}
                    >
                        {isListening ? <Mic className="w-12 h-12 text-white" /> : <MicOff className="w-12 h-12 text-gray-400" />}
                    </button>
                </div>

                <p className="text-gray-500 text-xs text-center max-w-xs">
                    Toque para falar. Ex: <br />
                    <span className="text-gray-300">"Três pontos camisa dez casa"</span> <br />
                    <span className="text-gray-300">"Falta camisa vinte visitante"</span>
                </p>

                {/* Confirmation Actions */}
                {pendingAction && (
                    <div className="flex gap-4 w-full animate-in slide-in-from-bottom-5">
                        <button
                            onClick={cancelAction}
                            className="flex-1 bg-red-900/50 text-red-200 py-4 rounded-xl flex items-center justify-center gap-2 font-bold hover:bg-red-900"
                        >
                            <X size={20} /> Cancelar
                        </button>
                        <button
                            onClick={confirmAction}
                            className="flex-1 bg-green-600 text-white py-4 rounded-xl flex items-center justify-center gap-2 font-bold hover:bg-green-500 shadow-lg shadow-green-900/50"
                        >
                            <Check size={20} /> CONFIRMAR
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
