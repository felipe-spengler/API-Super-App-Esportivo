import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, MicOff, Check, X, Timer, Play, Pause, Plus } from 'lucide-react';
import api from '../../services/api';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { Capacitor } from '@capacitor/core';

// Extend window interface for SpeechRecognition
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

type Quarter = '1º Quarto' | '2º Quarto' | 'Intervalo' | '3º Quarto' | '4º Quarto' | 'Prorrogação' | 'Fim de Jogo';
const quarters: Quarter[] = ['1º Quarto', '2º Quarto', 'Intervalo', '3º Quarto', '4º Quarto', 'Prorrogação', 'Fim de Jogo'];

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
    const [showPlayers, setShowPlayers] = useState(false);

    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        let interval: any;
        if (isRunning && time > 0) {
            interval = setInterval(() => {
                setTime((prev) => prev - 1);
            }, 1000);
        } else if (time === 0) {
            setIsRunning(false);
        }
        return () => clearInterval(interval);
    }, [isRunning, time]);

    // Initial Load
    useEffect(() => {
        fetchMatchDetails();

        let nativeListener: any = null;

        if (!Capacitor.isNativePlatform()) {
            // Setup Web Speech Recognition
            const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRec) {
                const recognition = new SpeechRec();
                recognition.lang = 'pt-BR';
                recognition.continuous = false;
                recognition.interimResults = true;

                recognition.onstart = () => {
                    setIsListening(true);
                    setFeedback('Ouvindo (Web)...');
                };

                recognition.onend = () => {
                    setIsListening(false);
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
                setFeedback("Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.");
            }
        } else {
            // Native Platform Initialization
            checkPermissions();

            // Native Listener
            nativeListener = SpeechRecognition.addListener('partialResults', (data: any) => {
                if (data.matches && data.matches.length > 0) {
                    const text = data.matches[0];
                    setTranscript(text);
                }
            });
        }

        return () => {
            if (nativeListener) nativeListener.remove();
        };
    }, [id]);

    const checkPermissions = async () => {
        try {
            const permission = await SpeechRecognition.checkPermissions();
            if (permission.speechRecognition !== 'granted') {
                await SpeechRecognition.requestPermissions();
            }
        } catch (e) {
            console.error("Erro ao verificar permissões de voz", e);
        }
    };

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
                if (data.match.match_details?.current_timer_value !== undefined) {
                    setTime(data.match.match_details.current_timer_value);
                }
                if (data.match.status === 'live') {
                    setIsRunning(false); // Mantém pausado por padrão ao carregar
                }
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
        // 2. Identificar Ação (Pontos)
        const isThree = lower.includes('três') || lower.includes('3') || lower.includes('triplo') || lower.includes('triple');
        const isPoints = lower.includes('ponto') || lower.includes('cesta') || lower.includes('marque') || lower.includes('marcar') || lower.includes('fez');

        if (isThree && isPoints) {
            points = 3;
            type = '3_points';
        }

        // Refine if other points matched (override order if specific)
        if (lower.includes('dois pontos') || lower.includes('2 pontos') || lower.includes('cesta de dois')) {
            points = 2;
            type = '2_points';
        } else if (lower.includes('um ponto') || lower.includes('lance livre') || (lower.includes('ponto') && !type)) {
            points = 1;
            type = '1_point';
        } else if (lower.includes('técnica') && lower.includes('falta')) {
            type = 'technical_foul';
        } else if (lower.includes('falta')) {
            type = 'foul';
        } else if (lower.includes('substituição') || lower.includes('troca') || lower.includes('entra')) {
            type = 'substitution';
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

        if (type && team) {
            // Find player - NOW SEARCHING BY NUMBER OR NAME/NICKNAME
            const roster = team === 'home' ? rosters.home : rosters.away;

            const player = roster.find((p: any) => {
                const nameMatch = p.name && lower.includes(p.name.toLowerCase());
                const nickMatch = p.nickname && lower.includes(p.nickname.toLowerCase());
                const numMatch = number && (p.number == number || p.number == parseInt(number || '0'));
                return nameMatch || nickMatch || numMatch;
            });

            if (player) {
                const playerIdentifier = player.nickname || player.name;
                setPendingAction({
                    type,
                    team,
                    player,
                    value: points,
                    description: `${type === 'foul' ? 'Falta' : points + ' Pontos'} - ${playerIdentifier} (${team === 'home' ? 'Casa' : 'Visitante'})`
                });
                setFeedback(`Entendi: ${type === 'foul' ? 'Falta' : points + ' Pontos'} para ${playerIdentifier}. Confirma?`);
            } else {
                if (number) {
                    setFeedback(`Jogador camisa ${number} não encontrado no time ${team === 'home' ? 'da Casa' : 'Visitante'}.`);
                } else {
                    setFeedback(`Não consegui identificar o jogador. Tente falar o número da camisa.`);
                }
            }
        } else if (lower.includes('tempo') || lower.includes('time out')) {
            // Timeout detection
            if (team) {
                setPendingAction({
                    type: 'timeout',
                    team,
                    description: `Pedido de Tempo - Time ${team === 'home' ? 'Casa' : 'Visitante'}`
                });
                setFeedback(`Entendi: Pedido de tempo para o time ${team === 'home' ? 'Casa' : 'Visitante'}. Confirma?`);
            } else {
                setFeedback("Diga de qual time é o pedido de tempo. Ex: 'Tempo time casa'");
            }
        } else if (lower.includes('próximo quarto') || lower.includes('fim do quarto')) {
            const currentIdx = quarters.indexOf(currentQuarter);
            if (currentIdx < quarters.length - 1) {
                const next = quarters[currentIdx + 1];
                setPendingAction({
                    type: 'period_end',
                    nextPeriod: next,
                    description: `Encerrar ${currentQuarter} e ir para ${next}`
                });
                setFeedback(`Confirmar mudança para ${next}?`);
            }
        } else {
            // Fallback partial recognition loops could go here
            let missing = [];
            if (!team && !lower.includes('quarto')) missing.push("o time");
            if (!type && !lower.includes('quarto')) missing.push("a ação");
            if (!number && (type === 'foul' || points > 0)) missing.push("o número");

            if (missing.length > 0) {
                setFeedback(`Não entendi ${missing.join(', ')}. Tente: "Três pontos time casa camisa dez"`);
            }
        }
    };

    const confirmAction = async () => {
        if (!pendingAction || !matchData) return;

        try {
            if (pendingAction.type === 'period_end') {
                setCurrentQuarter(pendingAction.nextPeriod);
                await api.post(`/admin/matches/${id}/events`, {
                    event_type: 'period_end',
                    team_id: matchData.home_team_id,
                    minute: '00:00',
                    period: currentQuarter,
                    metadata: { label: `Fim do ${currentQuarter}`, system_period: currentQuarter }
                });
                setPendingAction(null);
                setFeedback(`Mudamos para ${pendingAction.nextPeriod}`);
                return;
            }

            let apiType = pendingAction.type;
            if (pendingAction.type === '1_point') apiType = 'free_throw';
            if (pendingAction.type === '2_points') apiType = 'field_goal_2';
            if (pendingAction.type === '3_points') apiType = 'field_goal_3';

            // ATUALIZAÇÃO DO CRONÔMETRO NO BACKEND
            // Vamos salvar o tempo atual no match_details para não resetar
            const currentDetails = matchData.match_details || {};
            const updatedDetails = {
                ...currentDetails,
                current_timer_value: time
            };

            // Optimistic Update local
            if (pendingAction.value > 0) {
                setMatchData((prev: any) => ({
                    ...prev,
                    scoreHome: pendingAction.team === 'home' ? prev.scoreHome + pendingAction.value : prev.scoreHome,
                    scoreAway: pendingAction.team === 'away' ? prev.scoreAway + pendingAction.value : prev.scoreAway
                }));
            }

            const teamId = pendingAction.team === 'home' ? matchData.home_team_id : matchData.away_team_id;

            const formatTime = (s: number) => {
                const mins = Math.floor(s / 60);
                const secs = s % 60;
                return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            };

            await api.post(`/admin/matches/${id}/events`, {
                event_type: apiType,
                team_id: teamId,
                minute: formatTime(600 - time), // Time elapsed in quarter
                period: currentQuarter,
                player_id: pendingAction.player?.id,
                value: pendingAction.value,
                metadata: {
                    system_period: currentQuarter,
                    quarter_time: formatTime(time),
                    voice_log: transcript, // SALVA O LOG DA FALA AQUI
                    original_text: transcript
                }
            });

            // Atualiza o estado local para refletir o tempo salvo
            setMatchData((prev: any) => ({
                ...prev,
                match_details: updatedDetails
            }));

            // Sincroniza o tempo salvo com o servidor também através de um update na partida
            await api.put(`/admin/matches/${id}`, {
                match_details: updatedDetails
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

    const toggleListening = async () => {
        if (Capacitor.isNativePlatform()) {
            if (isListening) {
                const result: any = await SpeechRecognition.stop();
                setIsListening(false);

                const finalTranscript = (result && result.matches && result.matches.length > 0)
                    ? result.matches[0]
                    : transcript;

                if (finalTranscript) {
                    processVoiceCommand(finalTranscript);
                }
            } else {
                setPendingAction(null);
                setTranscript("");
                try {
                    const available = await SpeechRecognition.available();
                    if (available.available) {
                        setIsListening(true);
                        setFeedback('Ouvindo (Nativo)...');
                        await SpeechRecognition.start({
                            language: 'pt-BR',
                            partialResults: true,
                            popup: false,
                        });
                    } else {
                        alert("Reconhecimento de voz não disponível neste aparelho.");
                    }
                } catch (e) {
                    console.error(e);
                    setIsListening(false);
                }
            }
        } else {
            if (isListening) {
                try {
                    recognitionRef.current?.stop();
                } catch (e) {
                    console.error(e);
                    setIsListening(false);
                }
            } else {
                if (!recognitionRef.current) {
                    setFeedback("Reconhecimento de voz não inicializado. Verifique se seu navegador suporta.");
                    return;
                }
                setPendingAction(null);
                setTranscript("");
                try {
                    recognitionRef.current.start();
                } catch (e) {
                    console.error("Erro ao iniciar reconhecimento:", e);
                    setFeedback("Erro ao ativar microfone. Verifique as permissões de áudio.");
                    setIsListening(false);
                }
            }
        }
    };

    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

            {/* Timer and Period Area */}
            <div className="flex flex-col items-center gap-2 mb-6">
                <div className="flex items-center gap-4 bg-gray-900 px-6 py-2 rounded-2xl border border-gray-700 shadow-xl">
                    <button
                        onClick={() => setIsRunning(!isRunning)}
                        className={`p-2 rounded-full ${isRunning ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}
                    >
                        {isRunning ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
                    </button>
                    <div className="text-4xl font-mono font-bold tracking-tighter text-orange-500 min-w-[100px] text-center">
                        {formatTime(time)}
                    </div>
                </div>
                <div className="text-xs font-bold text-gray-500 px-3 py-1 bg-gray-800 rounded-full uppercase tracking-widest">
                    {currentQuarter}
                </div>
            </div>

            {/* Scoreboard Simplificado */}
            <div className="flex gap-12 mb-8 items-center">
                <div className="text-center">
                    <div className="text-7xl font-black text-white leading-none">{matchData.scoreHome}</div>
                    <div className="text-[10px] text-orange-500 font-bold uppercase tracking-[0.2em] mt-2">CASA</div>
                </div>
                <div className="w-px h-12 bg-gray-800"></div>
                <div className="text-center">
                    <div className="text-7xl font-black text-white leading-none">{matchData.scoreAway}</div>
                    <div className="text-[10px] text-orange-500 font-bold uppercase tracking-[0.2em] mt-2">VISITANTE</div>
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

                {/* Confirmation Actions - MOVED ABOVE TIPS */}
                {pendingAction && (
                    <div className="w-full space-y-3 mb-4 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="bg-green-600/10 border border-green-600/30 rounded-xl p-3 text-center">
                            <p className="text-sm text-green-400 font-bold animate-pulse">Ação Pendente: {pendingAction.description}</p>
                        </div>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={cancelAction}
                                className="flex-1 bg-gray-800 text-gray-300 py-4 rounded-xl flex items-center justify-center gap-2 font-bold hover:bg-gray-700 active:scale-95 transition-all"
                            >
                                <X size={20} /> Cancelar
                            </button>
                            <button
                                onClick={confirmAction}
                                className="flex-1 bg-green-600 text-white py-4 rounded-xl flex items-center justify-center gap-2 font-black hover:bg-green-500 active:scale-95 transition-all shadow-lg shadow-green-900/40 uppercase"
                            >
                                <Check size={20} /> CONFIRMAR
                            </button>
                        </div>
                    </div>
                )}

                <div className="bg-gray-900 border border-orange-500/20 rounded-2xl p-4 w-full text-[11px]">
                    <h3 className="text-orange-500 font-bold mb-2 flex items-center gap-1">📖 Dicas de Comandos:</h3>
                    <div className="grid grid-cols-1 gap-1.5 text-gray-400">
                        <p>• <span className="text-gray-200">"Triplo camisa dez casa"</span> ou <span className="text-gray-200">"3 pontos..."</span></p>
                        <p>• <span className="text-gray-200">"Falta técnica camisa dez casa"</span> (Falta Técnica)</p>
                        <p>• <span className="text-gray-200">"Entra camisa cinco casa"</span> (Substituição)</p>
                        <p>• <span className="text-gray-200">"Tempo time casa"</span> (Pedido de Tempo/Timeout)</p>
                        <p>• <span className="text-gray-200">"Próximo quarto"</span> (Muda o período do jogo)</p>
                    </div>
                </div>

                {/* Rosters Section */}
                <div className="w-full mt-2">
                    <button
                        onClick={() => setShowPlayers(!showPlayers)}
                        className="w-full flex items-center justify-between bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 text-xs font-bold text-gray-300"
                    >
                        <span>LISTA DE JOGADORES</span>
                        {showPlayers ? <X size={14} /> : <Plus size={14} />}
                    </button>

                    {showPlayers && (
                        <div className="grid grid-cols-2 gap-4 mt-3 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-1">
                                <p className="text-[10px] text-orange-500 font-black mb-2 px-1">CASA</p>
                                {rosters.home.map((p: any) => (
                                    <div key={p.id} className="flex items-center gap-2 bg-gray-900 p-1.5 rounded-lg border border-gray-800">
                                        <span className="w-6 h-6 flex items-center justify-center bg-orange-600 rounded text-[10px] font-black">{p.number}</span>
                                        <span className="text-[10px] truncate flex-1 uppercase font-medium">{p.name}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] text-orange-500 font-black mb-2 px-1 text-right">VISITANTE</p>
                                {rosters.away.map((p: any) => (
                                    <div key={p.id} className="flex items-center gap-2 bg-gray-900 p-1.5 rounded-lg border border-gray-800 flex-row-reverse">
                                        <span className="w-6 h-6 flex items-center justify-center bg-gray-700 rounded text-[10px] font-black">{p.number}</span>
                                        <span className="text-[10px] truncate flex-1 uppercase font-medium text-right">{p.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <p className="text-gray-600 text-[10px] text-center max-w-xs mt-4 italic">
                    Diga sempre: Ação + Camisa + Time
                </p>
            </div>
        </div>
    );
}
