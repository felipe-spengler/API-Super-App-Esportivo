import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, MicOff, Check, X, Timer, Play, Pause, Plus } from 'lucide-react';
import api from '../../services/api';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { Capacitor } from '@capacitor/core';
import echo from '../../services/echo';

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
    const [voiceLogs, setVoiceLogs] = useState<any[]>([]);

    // Voice State
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [feedback, setFeedback] = useState('');
    const [pendingAction, setPendingAction] = useState<any>(null); // { type, team, player, value }
    const [showPlayers, setShowPlayers] = useState(false);
    const [hasLoggedRoster, setHasLoggedRoster] = useState(false);

    const recognitionRef = useRef<any>(null);
    const timeRef = useRef(time);
    const matchDataRef = useRef(matchData);

    useEffect(() => {
        timeRef.current = time;
    }, [time]);

    useEffect(() => {
        matchDataRef.current = matchData;
    }, [matchData]);

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

                // Só atualiza o tempo se não estiver rodando localmente (evita pulos)
                if (!isRunning && data.match.match_details?.current_timer_value !== undefined) {
                    const serverTime = data.match.match_details.current_timer_value;
                    setTime(serverTime);
                    timeRef.current = serverTime;
                }

                if (data.match.status === 'live' && !isRunning) {
                    // setIsRunning(false); // Já está false
                }
            }
            if (data.rosters) {
                setRosters(data.rosters);

                // Logar elenco na auditoria ao carregar pela primeira vez
                if (!hasLoggedRoster && data.rosters.home.length > 0) {
                    const homeSummary = data.rosters.home.map((p: any) => `${p.number}-${p.nickname || p.name}`).join(', ');
                    const awaySummary = data.rosters.away.map((p: any) => `${p.number}-${p.nickname || p.name}`).join(', ');

                    api.post(`/admin/matches/${id}/events`, {
                        event_type: 'voice_debug',
                        minute: '00:00',
                        period: 'Pré-jogo',
                        metadata: {
                            voice_log: `SISTEMA: Elencos carregados para reconhecimento.`,
                            identified: true,
                            home_roster: homeSummary,
                            away_roster: awaySummary,
                            system_info: 'Roster Snapshot'
                        }
                    }).catch(err => console.error("Erro ao logar elenco", err));

                    setHasLoggedRoster(true);
                }
            }
            setLoading(false);
        } catch (e) {
            console.error(e);
            alert('Erro ao carregar jogo.');
        }
    };

    // ESCUTAR REVERB (REAL-TIME)
    useEffect(() => {
        if (!id) return;

        const channel = echo.channel(`match.${id}`)
            .listen('.MatchUpdated', (e: any) => {
                console.log('Evento Reverb recebido:', e);
                fetchMatchDetails(); // Recarrega dados quando houver atualização externa
            });

        return () => {
            echo.leaveChannel(`match.${id}`);
        };
    }, [id]);

    // SINCRONIZAR CRONÔMETRO PERIODICAMENTE (A cada 15s se estiver rodando)
    useEffect(() => {
        let syncInterval: any;

        if (isRunning) {
            syncInterval = setInterval(async () => {
                try {
                    await api.put(`/admin/matches/${id}`, {
                        match_details: {
                            ...matchDataRef.current?.match_details,
                            current_timer_value: timeRef.current,
                            timer_running: true
                        }
                    });
                } catch (e) {
                    console.error("Erro na sync periódica do tempo", e);
                }
            }, 15000); // 15 segundos
        }

        return () => clearInterval(syncInterval);
    }, [isRunning, id]);

    const normalizeText = (t: string) => (t || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const processVoiceCommand = async (text: string) => {
        console.log("Processando:", text);
        const lower = text.toLowerCase();
        const normalized = normalizeText(text);
        let identified = false;

        let team: 'home' | 'away' | null = null;
        let points = 0;
        let type = '';
        let number: string | null = null;
        let failureReason = '';

        // 1. Identificar Time
        const homeName = normalizeText(matchData?.home_team?.name || '');
        const awayName = normalizeText(matchData?.away_team?.name || '');

        if (normalized.includes('casa') || normalized.includes('mandante') || (homeName && normalized.includes(homeName))) {
            team = 'home';
        } else if (normalized.includes('visitante') || normalized.includes('fora') || (awayName && normalized.includes(awayName))) {
            team = 'away';
        } else {
            failureReason = 'Time não identificado';
        }

        // 2. Identificar Ação (Pontos)
        const isThree = normalized.includes('tres') || normalized.includes('3') || normalized.includes('triplo') || normalized.includes('triple');
        const isOne = normalized.includes('um ponto') || normalized.includes('lance livre') || normalized.includes('1 ponto');
        const isTwo = normalized.includes('dois pontos') || normalized.includes('cesta de dois') || normalized.includes('2 pontos');
        const isFoul = normalized.includes('falta');
        const isTechFoul = isFoul && (normalized.includes('tecnica') || normalized.includes('antitidesportiva'));
        const isPoints = normalized.includes('ponto') || normalized.includes('cesta') || normalized.includes('marque') || normalized.includes('marcar') || normalized.includes('fez');

        if (isTechFoul) {
            type = 'technical_foul';
        } else if (isFoul) {
            type = 'foul';
        } else if (isThree) {
            points = 3;
            type = '3_points';
        } else if (isOne) {
            points = 1;
            type = '1_point';
        } else if (isTwo || isPoints) {
            points = 2;
            type = '2_points';
        } else if (normalized.includes('substituicao') || normalized.includes('troca') || normalized.includes('entra')) {
            type = 'substitution';
        } else {
            if (!failureReason) failureReason = 'Ação não identificada';
        }

        // 3. Identificar Número do Jogador
        const numberMap: { [key: string]: string } = {
            'zero': '0', 'um': '1', 'dois': '2', 'tres': '3', 'quatro': '4', 'cinco': '5', 'seis': '6', 'sete': '7', 'oito': '8', 'nove': '9', 'dez': '10',
            'onze': '11', 'doze': '12', 'treze': '13', 'quatorze': '14', 'quinze': '15', 'dezesseis': '16', 'dezessete': '17', 'dezoito': '18', 'dezenove': '19', 'vinte': '20',
            'vinte e um': '21', 'vinte e dois': '22', 'vinte e tres': '23', 'vinte e quatro': '24', 'vinte e cinco': '25', 'vinte e seis': '26', 'vinte e sete': '27', 'vinte e oito': '28', 'vinte e nove': '29', 'trinta': '30',
            'quarenta': '40', 'cinquenta': '50', 'sessenta': '60', 'setenta': '70', 'oitenta': '80', 'noventa': '90'
        };

        // Regex flexível: (camisa|número|jogador) + (número ou palavra)
        const flexMatch = normalized.match(/(?:camisa|numero|jogador|atleta)\s+([a-z0-9\s]+)/);
        if (flexMatch) {
            const possibleNumber = flexMatch[1].trim().split(' ')[0]; // Pega a primeira palavra após "camisa"
            if (!isNaN(parseInt(possibleNumber))) {
                number = possibleNumber;
            } else if (numberMap[possibleNumber]) {
                number = numberMap[possibleNumber];
            } else {
                // Tenta achar se o numberMap contém a string completa (ex: "vinte e um")
                for (const [key, val] of Object.entries(numberMap)) {
                    if (flexMatch[1].includes(key)) {
                        number = val;
                        break;
                    }
                }
            }
        }

        // Fallback: Procura qualquer número isolado ou palavra de número no texto
        if (!number) {
            const digits = normalized.match(/\d+/);
            if (digits) {
                number = digits[0];
            } else {
                for (const [key, val] of Object.entries(numberMap)) {
                    if (normalized.includes(` ${key}`) || normalized.startsWith(key)) {
                        number = val;
                        break;
                    }
                }
            }
        }

        if (type && team) {
            // Find player - NOW SEARCHING BY NUMBER OR NAME/NICKNAME
            const roster = team === 'home' ? rosters.home : rosters.away;

            const player = roster.find((p: any) => {
                const pName = normalizeText(p.name || '');
                const pNick = normalizeText(p.nickname || '');
                const pFirst = pName.split(' ')[0];
                const pNum = String(p.number);

                // Prioridade 1: Número exato
                if (number && pNum === number) return true;

                // Prioridade 2: Apelido na frase
                if (pNick && pNick.length > 2 && normalized.includes(pNick)) return true;

                // Prioridade 3: Primeiro nome exato na frase
                if (pFirst && pFirst.length > 2 && normalized.includes(pFirst)) return true;

                // Prioridade 4: Nome completo na frase (caso o sistema ouça o nome inteiro)
                if (pName && pName.length > 5 && normalized.includes(pName)) return true;

                return false;
            });

            if (player) {
                const playerIdentifier = player.nickname || player.name;
                identified = true;
                setPendingAction({
                    type,
                    team,
                    player,
                    value: points,
                    description: `${type === 'foul' ? 'Falta' : points + ' Pontos'} - ${playerIdentifier} (${team === 'home' ? 'Casa' : 'Visitante'})`
                });
                setFeedback(`Entendi: ${type === 'foul' ? 'Falta' : points + ' Pontos'} para ${playerIdentifier}. Confirma?`);
            } else {
                failureReason = `Jogador não encontrado (Num: ${number || 'N/A'})`;
                if (number) {
                    setFeedback(`Jogador camisa ${number} não encontrado no time ${team === 'home' ? 'da Casa' : 'Visitante'}.`);
                } else {
                    setFeedback(`Não consegui identificar o jogador. Tente falar o número da camisa.`);
                }
            }
        } else if (normalized.includes('tempo') || normalized.includes('time out')) {
            // Timeout detection
            identified = true;
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
        } else if (lower.includes('próximo quarto') || lower.includes('fim do quarto') || lower.includes('próximo período') || lower.includes('encerrar quarto')) {
            const currentIdx = quarters.indexOf(currentQuarter);
            identified = true;
            if (currentIdx < quarters.length - 1) {
                const next = quarters[currentIdx + 1];
                setPendingAction({
                    type: 'period_end',
                    nextPeriod: next,
                    description: `Encerrar ${currentQuarter} e ir para ${next}`
                });
                setFeedback(`Confirmar mudança para ${next} e resetar cronômetro?`);
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

        // SALVAR LOG DE VOZ NO BACKEND (MESMO SE NÃO RECONHECER)
        try {
            await api.post(`/admin/matches/${id}/events`, {
                event_type: 'voice_debug',
                team_id: identified ? (team === 'home' ? matchData.home_team_id : matchData.away_team_id) : null,
                minute: formatTime(time),
                period: currentQuarter,
                metadata: {
                    voice_log: text,
                    identified: identified,
                    action_type: type || 'none',
                    team: team || 'none',
                    failure_reason: failureReason || (identified ? null : 'Desconhecido'),
                    normalized_text: normalized
                }
            });
            fetchMatchDetails(); // Recarrega histórico para mostrar o log
        } catch (e) {
            console.error("Erro ao salvar log de voz", e);
        }
    };

    const confirmAction = async () => {
        if (!pendingAction || !matchData) return;

        try {
            if (pendingAction.type === 'period_end') {
                const nextPeriod = pendingAction.nextPeriod;
                setCurrentQuarter(nextPeriod);
                setTime(600); // RESET PARA 10 MIN NOVO QUARTO
                setIsRunning(false);

                await api.post(`/admin/matches/${id}/events`, {
                    event_type: 'period_end',
                    team_id: matchData.home_team_id,
                    minute: '00:00',
                    period: currentQuarter,
                    metadata: {
                        label: `Fim do ${currentQuarter}`,
                        system_period: currentQuarter,
                        next_period: nextPeriod,
                        voice_log: transcript
                    }
                });

                // Atualizar o cronômetro no banco também
                await api.put(`/admin/matches/${id}`, {
                    match_details: { ...matchData.match_details, current_timer_value: 600 }
                });

                setPendingAction(null);
                setFeedback(`Mudamos para ${nextPeriod}. Cronômetro resetado.`);
                fetchMatchDetails(); // Atualiza lista de eventos
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
            fetchMatchDetails(); // Atualiza o histórico imediatamente
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

    const deleteEvent = async (eventId: number) => {
        if (!window.confirm('Deseja realmente excluir este lançamento?')) return;
        try {
            await api.delete(`/admin/matches/${id}/events/${eventId}`);
            fetchMatchDetails(); // Recarrega placar e lista
            setFeedback("Evento excluído com sucesso!");
        } catch (e) {
            console.error(e);
            alert("Erro ao excluir evento.");
        }
    };

    const toggleTimer = async () => {
        const newIsRunning = !isRunning;
        setIsRunning(newIsRunning);

        // Logar ação do cronômetro
        try {
            await api.post(`/admin/matches/${id}/events`, {
                event_type: 'timer_control',
                minute: formatTime(time),
                period: currentQuarter,
                metadata: {
                    action: newIsRunning ? 'start' : 'pause',
                    current_time: formatTime(time)
                }
            });

            // Sincroniza estado no match_details
            const currentDetails = matchData.match_details || {};
            await api.put(`/admin/matches/${id}`, {
                match_details: {
                    ...currentDetails,
                    current_timer_value: time,
                    timer_running: newIsRunning
                }
            });
        } catch (e) {
            console.error("Erro ao logar controle de tempo", e);
        }
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
                        onClick={toggleTimer}
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

                {/* Períodos e Histórico */}
                <div className="w-full space-y-4 pb-12">
                    <h3 className="text-orange-500 font-bold text-xs uppercase tracking-widest px-1">Histórico de Lançamentos</h3>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {matchData.events && matchData.events.length > 0 ? (
                            matchData.events.slice().reverse().map((event: any) => {
                                // Se for apenas um log de voz, mostrar diferente
                                if (event.event_type === 'voice_debug') {
                                    return (
                                        <div key={event.id} className="bg-gray-800/30 border border-dashed border-gray-700 rounded-lg p-2 flex items-center gap-2 opacity-60">
                                            <span className="text-[8px] font-mono text-gray-500">{event.game_time}</span>
                                            <span className="text-[9px] text-gray-400 flex-1 italic truncate">
                                                🎤 "{event.metadata?.voice_log}"
                                                {event.metadata?.identified ?
                                                    <span className="text-green-500 ml-1">✓</span> :
                                                    <span className="text-red-500 ml-1">✗</span>
                                                }
                                            </span>
                                            <button onClick={() => deleteEvent(event.id)} className="text-gray-600"><X size={10} /></button>
                                        </div>
                                    );
                                }

                                if (event.event_type === 'timer_control') {
                                    return (
                                        <div key={event.id} className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-2 flex items-center gap-2 opacity-80">
                                            <span className="text-[8px] font-mono text-blue-500">{event.game_time}</span>
                                            <span className="text-[9px] text-blue-300 flex-1 font-bold italic">
                                                ⏱️ CRONÔMETRO: {event.metadata?.action === 'start' ? 'INICIADO' : 'PAUSADO'}
                                            </span>
                                            <button onClick={() => deleteEvent(event.id)} className="text-gray-600"><X size={10} /></button>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={event.id} className="bg-gray-900/80 border border-gray-800 rounded-xl p-3 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-right-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-mono text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded">
                                                    {event.game_time || '00:00'}
                                                </span>
                                                <span className="text-[10px] text-gray-500 font-bold uppercase italic">
                                                    {event.period}
                                                </span>
                                            </div>
                                            <p className="text-xs font-bold text-white uppercase truncate">
                                                {event.event_type === 'field_goal_3' ? '🏀 3 Pontos' :
                                                    event.event_type === 'field_goal_2' ? '🏀 2 Pontos' :
                                                        event.event_type === 'free_throw' ? '🏀 L. Livre' :
                                                            event.event_type === 'foul' ? '⚠️ Falta' :
                                                                event.event_type === 'period_end' ? '🏁 Fim de Quarto' :
                                                                    event.event_type === 'timeout' ? '⏱️ Tempo' : event.event_type}
                                            </p>
                                            <p className="text-[10px] text-gray-400 truncate">
                                                {event.player?.name || event.team?.name || 'Evento de Jogo'}
                                            </p>
                                            {event.metadata?.voice_log && (
                                                <p className="text-[9px] text-gray-600 italic mt-1 truncate">
                                                    🎤 "{event.metadata.voice_log}"
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => deleteEvent(event.id)}
                                            className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-8 bg-gray-900/30 rounded-2xl border border-dashed border-gray-800">
                                <p className="text-gray-600 text-xs italic">Nenhum lançamento registrado ainda.</p>
                            </div>
                        )}
                    </div>
                </div>

                <p className="text-gray-600 text-[10px] text-center max-w-xs mt-4 italic">
                    Diga sempre: Ação + Camisa + Time
                </p>
            </div>
        </div>
    );
}
