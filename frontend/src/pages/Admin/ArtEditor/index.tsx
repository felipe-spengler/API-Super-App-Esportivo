import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Upload, Type, Image as ImageIcon, Layout, Move, Plus, Trash2, Smartphone, Monitor, X, ChevronDown, ChevronRight, Award, Timer, Users, Palette, ArrowLeft } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { compressImage } from '../../../utils/imageCompressor';

// Default canvas size (Stories 9:16)
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;
const SCALE = 0.35; // Scale for display on screen

interface Element {
    id: string;
    type: 'text' | 'image';
    x: number;
    y: number;
    width?: number; // For images
    height?: number; // For images
    fontSize?: number; // For text
    color?: string; // For text
    fontFamily?: string;
    align?: 'left' | 'center' | 'right';
    content?: string; // Text content or Image Placeholder key
    label: string; // User friendly name
    zIndex: number;
    backgroundColor?: string;
    borderRadius?: number;
}

const DEFAULT_ELEMENTS: Element[] = [
    { id: 'player_photo', type: 'image', x: 140, y: 335, width: 800, height: 800, label: 'Foto do Jogador', zIndex: 1, content: 'player_photo', borderRadius: 0 },
    { id: 'player_name', type: 'text', x: 540, y: 1230, fontSize: 75, color: '#FFB700', align: 'center', label: 'Nome do Jogador', zIndex: 2, content: '{JOGADOR}', fontFamily: 'Roboto' },
    { id: 'team_badge_a', type: 'image', x: 265, y: 1255, width: 150, height: 150, label: 'Brasão Mandante', zIndex: 2, content: 'team_a' },
    { id: 'team_badge_b', type: 'image', x: 665, y: 1255, width: 150, height: 150, label: 'Brasão Visitante', zIndex: 2, content: 'team_b' },

    // Placar Separado
    { id: 'score_home', type: 'text', x: 450, y: 1535, fontSize: 100, color: '#000000', align: 'center', label: 'Placar Casa', zIndex: 3, content: '{PLACAR_CASA}', fontFamily: 'Roboto-Bold' },
    { id: 'score_x', type: 'text', x: 540, y: 1535, fontSize: 60, color: '#000000', align: 'center', label: 'X (Divisor)', zIndex: 3, content: 'X', fontFamily: 'Roboto' },
    { id: 'score_away', type: 'text', x: 630, y: 1535, fontSize: 100, color: '#000000', align: 'center', label: 'Placar Visitante', zIndex: 3, content: '{PLACAR_FORA}', fontFamily: 'Roboto-Bold' },

    { id: 'championship', type: 'text', x: 540, y: 1690, fontSize: 40, color: '#FFFFFF', align: 'center', label: 'Nome Campeonato', zIndex: 2, content: '{CAMPEONATO}' },
    { id: 'round', type: 'text', x: 540, y: 1750, fontSize: 30, color: '#FFFFFF', align: 'center', label: 'Rodada/Fase', zIndex: 2, content: '{RODADA}' },
];

export function ArtEditor() {
    // Mode Selection State
    const [editorMode, setEditorMode] = useState<'select' | 'classic' | 'timing'>('select');

    const [elements, setElements] = useState<Element[]>(DEFAULT_ELEMENTS);
    const [activeElementId, setActiveElementId] = useState<string | null>(null);
    const [templateName, setTemplateName] = useState('Craque do Jogo');
    const [bgImage, setBgImage] = useState<string | null>(null); // URL of background
    const [loading, setLoading] = useState(false);
    const [showHelp, setShowHelp] = useState(true);
    const [previewMode, setPreviewMode] = useState(false);

    // Sidebar sections
    const [showSettings, setShowSettings] = useState(true);
    const [showElements, setShowElements] = useState(true);
    const [showProps, setShowProps] = useState(true);

    const [selectedSport, setSelectedSport] = useState('futebol');
    const [persistedBgUrl, setPersistedBgUrl] = useState<string | null>(null);
    const [allSports, setAllSports] = useState<any[]>([]);

    // Championship Context
    const [championships, setChampionships] = useState<any[]>([]);
    const [selectedChampionship, setSelectedChampionship] = useState<string>(''); // '' = Padrão (Por Esporte)

    const isTimingSportObj = (s: any) => {
        if (!s) return false;
        const slug = (s.slug || '').toLowerCase();
        const type = (s.category_type || '').toLowerCase();
        return type === 'racing' || slug.includes('natacao') || slug.includes('corrida') || slug.includes('ciclismo') || slug.includes('atletismo');
    };

    const isTimingChampionship = (c: any) => {
        if (!c) return false;
        const format = (c.format || '').toLowerCase();
        const name = (c.name || '').toLowerCase();
        return (
            format === 'racing' || 
            format === 'laps' || 
            format === 'time_ranking' || 
            isTimingSportObj(c.sport) ||
            name.includes('natação') ||
            name.includes('natacao') ||
            name.includes('corrida') ||
            name.includes('voltas') ||
            name.includes('tempo')
        );
    };

    // Load template or default settings
    useEffect(() => {
        if (editorMode !== 'select') {
            loadTemplate();
        }
    }, [templateName, selectedSport, selectedChampionship, editorMode]);

    // Load available sports and championships
    useEffect(() => {
        try {
            api.get('/sports').then(res => {
                if (res.data) setAllSports(res.data);
            });

            // Load Championships for selection
            api.get('/admin/championships').then(res => {
                if (res.data) setChampionships(res.data);
            });
        } catch (e) {
            console.error(e);
        }
    }, []);

    const getDefaultBg = (name: string, sport: string) => {
        const baseUrl = api.defaults.baseURL;
        const s = (sport || 'futebol').toLowerCase();

        if (name === 'Craque do Jogo') return `${baseUrl}/assets-templates/fundo_craque_do_jogo.jpg`;
        if (name === 'Jogo Programado') {
            if (s.includes('volei')) return `${baseUrl}/assets-templates/volei_confronto.jpg`;
            return `${baseUrl}/assets-templates/fundo_confronto.jpg`;
        }
        if (name === 'Confronto') return `${baseUrl}/assets-templates/fundo_confronto.jpg`;
        if (name === 'Defesa Menos Vazada') return `${baseUrl}/assets-templates/fundo_craque_do_jogo.jpg`;
        return null;
    };

    const loadDefaults = (name: string) => {
        setBgImage(getDefaultBg(name, selectedSport));
        setPersistedBgUrl(null); // Reset persisted to null to allow dynamic behavior

        if (name === 'Craque do Jogo') {
            setElements(DEFAULT_ELEMENTS);
        } else if (name === 'Jogo Programado') {
            setElements([
                { id: 'championship', type: 'text', x: 540, y: 250, fontSize: 45, color: '#FFFFFF', align: 'center', label: 'Campeonato', zIndex: 2, content: '{CAMPEONATO}', fontFamily: 'Roboto' },
                { id: 'round', type: 'text', x: 540, y: 320, fontSize: 35, color: '#FFB700', align: 'center', label: 'Rodada/Fase', zIndex: 2, content: '{RODADA}', fontFamily: 'Roboto' },
                { id: 'team_a', type: 'image', x: 250, y: 800, width: 400, height: 400, label: 'Brasão Mandante', zIndex: 2, content: 'team_a' },
                { id: 'team_b', type: 'image', x: 830, y: 800, width: 400, height: 400, label: 'Brasão Visitante', zIndex: 2, content: 'team_b' },
                { id: 'vs', type: 'text', x: 540, y: 1000, fontSize: 80, color: '#FFB700', align: 'center', label: 'X (Versus)', zIndex: 2, content: 'X', fontFamily: 'Roboto-Bold' },
                { id: 'date', type: 'text', x: 540, y: 1500, fontSize: 50, color: '#FFB700', align: 'center', label: 'Data', zIndex: 2, content: 'DD/MM HH:MM', fontFamily: 'Roboto' },
                { id: 'local', type: 'text', x: 540, y: 1600, fontSize: 35, color: '#FFFFFF', align: 'center', label: 'Local', zIndex: 2, content: 'Local da Partida', fontFamily: 'Roboto' },
            ]);
        } else if (name === 'Confronto') {
            setElements([
                { id: 'bg', type: 'image', x: 540, y: 960, width: 1080, height: 1920, label: 'Background', zIndex: 0, content: 'bg_confronto' },
                { id: 'championship', type: 'text', x: 540, y: 250, fontSize: 45, color: '#FFFFFF', align: 'center', label: 'Campeonato', zIndex: 2, content: '{CAMPEONATO}', fontFamily: 'Roboto' },
                { id: 'team_a', type: 'image', x: 250, y: 800, width: 400, height: 400, label: 'Brasão Mandante', zIndex: 2, content: 'team_a' },
                { id: 'team_b', type: 'image', x: 830, y: 800, width: 400, height: 400, label: 'Brasão Visitante', zIndex: 2, content: 'team_b' },

                { id: 'score_home', type: 'text', x: 400, y: 1000, fontSize: 150, color: '#FFB700', align: 'center', label: 'Placar Casa', zIndex: 3, content: '{PLACAR_CASA}', fontFamily: 'Roboto-Bold' },
                { id: 'vs', type: 'text', x: 540, y: 1000, fontSize: 80, color: '#FFFFFF', align: 'center', label: 'X (Versus)', zIndex: 2, content: 'X', fontFamily: 'Roboto' },
                { id: 'score_away', type: 'text', x: 680, y: 1000, fontSize: 150, color: '#FFB700', align: 'center', label: 'Placar Visitante', zIndex: 3, content: '{PLACAR_FORA}', fontFamily: 'Roboto-Bold' },

                { id: 'date', type: 'text', x: 540, y: 1500, fontSize: 50, color: '#FFB700', align: 'center', label: 'Data', zIndex: 2, content: 'DD/MM HH:MM', fontFamily: 'Roboto' },
                { id: 'local', type: 'text', x: 540, y: 1600, fontSize: 35, color: '#FFFFFF', align: 'center', label: 'Local', zIndex: 2, content: 'Local da Partida', fontFamily: 'Roboto' },
            ]);
        } else if (name === 'Defesa Menos Vazada') {
            setElements([
                { id: 'team_logo', type: 'image', x: 540, y: 750, width: 700, height: 700, label: 'Logo do Time', zIndex: 1, content: 'team_logo' },
                { id: 'team_name', type: 'text', x: 540, y: 1200, fontSize: 80, color: '#FFB700', align: 'center', label: 'Nome do Time', zIndex: 2, content: '{JOGADOR}', fontFamily: 'Roboto-Bold' },
                { id: 'title', type: 'text', x: 540, y: 1320, fontSize: 50, color: '#FFFFFF', align: 'center', label: 'Título', zIndex: 2, content: 'DEFESA MENOS VAZADA', fontFamily: 'Roboto' },
                { id: 'championship', type: 'text', x: 540, y: 1650, fontSize: 40, color: '#FFFFFF', align: 'center', label: 'Campeonato', zIndex: 2, content: '{CAMPEONATO}' },
                { id: 'category', type: 'text', x: 540, y: 1720, fontSize: 35, color: '#AAAAAA', align: 'center', label: 'Categoria', zIndex: 2, content: '{CATEGORIA}' }
            ]);
        } else if (name === 'Premiação (Jogador)' || name === 'Premiação (Atleta)') {
            setElements([
                { id: 'player_photo', type: 'image', x: 540, y: 600, width: 800, height: 800, label: 'Foto do Jogador', zIndex: 1, content: 'player_photo', borderRadius: 0 },
                { id: 'player_name', type: 'text', x: 540, y: 1200, fontSize: 80, color: '#FFB700', align: 'center', label: 'Nome do Jogador', zIndex: 2, content: '{JOGADOR}', fontFamily: 'Roboto-Bold' },
                { id: 'team_badge', type: 'image', x: 540, y: 1000, width: 200, height: 200, label: 'Brasão do Time', zIndex: 2, content: 'team_logo' },
                { id: 'award_name', type: 'text', x: 540, y: 1350, fontSize: 60, color: '#FFFFFF', align: 'center', label: 'Nome do Prêmio', zIndex: 2, content: '{PREMIO}', fontFamily: 'Roboto' },
                { id: 'championship', type: 'text', x: 540, y: 1650, fontSize: 40, color: '#FFFFFF', align: 'center', label: 'Campeonato', zIndex: 2, content: '{CAMPEONATO}' },
                { id: 'category', type: 'text', x: 540, y: 1720, fontSize: 35, color: '#AAAAAA', align: 'center', label: 'Categoria', zIndex: 2, content: '{CATEGORIA}' }
            ]);
        } else if (name === 'Melhor Tempo') {
            setElements([
                { id: 'player_photo', type: 'image', x: 540, y: 600, width: 800, height: 800, label: 'Foto do Atleta', zIndex: 1, content: 'player_photo', borderRadius: 0 },
                { id: 'player_name', type: 'text', x: 540, y: 1200, fontSize: 80, color: '#FFB700', align: 'center', label: 'Nome do Atleta', zIndex: 2, content: '{JOGADOR}', fontFamily: 'Roboto-Bold' },
                { id: 'title', type: 'text', x: 540, y: 1350, fontSize: 60, color: '#FFFFFF', align: 'center', label: 'Título', zIndex: 2, content: 'MELHOR TEMPO', fontFamily: 'Roboto' },
                { id: 'record_time', type: 'text', x: 540, y: 1470, fontSize: 90, color: '#FFB700', align: 'center', label: 'Tempo Registrado', zIndex: 3, content: '{TEMPO}', fontFamily: 'Roboto-Bold' },
                { id: 'championship', type: 'text', x: 540, y: 1690, fontSize: 40, color: '#FFFFFF', align: 'center', label: 'Nome Campeonato', zIndex: 2, content: '{CAMPEONATO}' },
                { id: 'category', type: 'text', x: 540, y: 1750, fontSize: 30, color: '#AAAAAA', align: 'center', label: 'Categoria', zIndex: 2, content: '{CATEGORIA}' }
            ]);
        } else if (name === 'Melhor Volta') {
            setElements([
                { id: 'player_photo', type: 'image', x: 540, y: 600, width: 800, height: 800, label: 'Foto/Logo', zIndex: 1, content: 'player_photo', borderRadius: 0 },
                { id: 'player_name', type: 'text', x: 540, y: 1200, fontSize: 80, color: '#FFB700', align: 'center', label: 'Nome Competidor', zIndex: 2, content: '{JOGADOR}', fontFamily: 'Roboto-Bold' },
                { id: 'title', type: 'text', x: 540, y: 1350, fontSize: 60, color: '#FFFFFF', align: 'center', label: 'Título', zIndex: 2, content: 'MELHOR VOLTA', fontFamily: 'Roboto' },
                { id: 'record_time', type: 'text', x: 540, y: 1470, fontSize: 90, color: '#FFB700', align: 'center', label: 'Tempo da Volta', zIndex: 3, content: '{TEMPO}', fontFamily: 'Roboto-Bold' },
                { id: 'championship', type: 'text', x: 540, y: 1690, fontSize: 40, color: '#FFFFFF', align: 'center', label: 'Nome Campeonato', zIndex: 2, content: '{CAMPEONATO}' },
                { id: 'category', type: 'text', x: 540, y: 1750, fontSize: 30, color: '#AAAAAA', align: 'center', label: 'Categoria', zIndex: 2, content: '{CATEGORIA}' }
            ]);
        } else if (name === 'Bateria Programada') {
            setElements([
                { id: 'championship', type: 'text', x: 540, y: 250, fontSize: 45, color: '#FFFFFF', align: 'center', label: 'Campeonato', zIndex: 2, content: '{CAMPEONATO}', fontFamily: 'Roboto' },
                { id: 'round', type: 'text', x: 540, y: 320, fontSize: 35, color: '#FFB700', align: 'center', label: 'Rodada/Fase', zIndex: 2, content: '{RODADA}', fontFamily: 'Roboto' },
                { id: 'title', type: 'text', x: 540, y: 800, fontSize: 80, color: '#FFFFFF', align: 'center', label: 'Título Bateria', zIndex: 2, content: 'BATERIA PROGRAMADA', fontFamily: 'Roboto-Bold' },
                { id: 'date', type: 'text', x: 540, y: 1300, fontSize: 60, color: '#FFB700', align: 'center', label: 'Data/Hora', zIndex: 2, content: 'DD/MM HH:MM', fontFamily: 'Roboto' },
                { id: 'local', type: 'text', x: 540, y: 1400, fontSize: 35, color: '#FFFFFF', align: 'center', label: 'Local', zIndex: 2, content: 'Local da Bateria', fontFamily: 'Roboto' }
            ]);
        } else if (name === 'Premiação (Equipe)') {
            setElements([
                { id: 'team_logo', type: 'image', x: 540, y: 650, width: 650, height: 650, label: 'Logo da Equipe', zIndex: 1, content: 'player_photo' },
                { id: 'team_name', type: 'text', x: 540, y: 1200, fontSize: 80, color: '#FFB700', align: 'center', label: 'Nome da Equipe', zIndex: 2, content: '{JOGADOR}', fontFamily: 'Roboto-Bold' },
                { id: 'award_name', type: 'text', x: 540, y: 1350, fontSize: 60, color: '#FFFFFF', align: 'center', label: 'Nome do Prêmio', zIndex: 2, content: '{PREMIO}', fontFamily: 'Roboto' },
                { id: 'championship', type: 'text', x: 540, y: 1650, fontSize: 40, color: '#FFFFFF', align: 'center', label: 'Campeonato', zIndex: 2, content: '{CAMPEONATO}' },
                { id: 'category', type: 'text', x: 540, y: 1720, fontSize: 35, color: '#AAAAAA', align: 'center', label: 'Categoria', zIndex: 2, content: '{CATEGORIA}' }
            ]);
        } else {
            setElements([]);
        }
    };

    const loadTemplate = async () => {
        setLoading(true);
        console.log(`Frontend: Loading Template [${templateName}] for Sport [${selectedSport}] Champ [${selectedChampionship}]`);
        try {
            const params: any = { name: templateName, sport: selectedSport };
            if (selectedChampionship) params.championship_id = selectedChampionship;

            const res = await api.get('/admin/art-templates', { params });

            if (res.data && res.data.elements) {
                let loadedElements = res.data.elements;

                if (templateName === 'Jogo Programado' && !loadedElements.find((e: any) => String(e.content).includes('{RODADA}'))) {
                    loadedElements.push({
                        id: 'round_' + Date.now(),
                        type: 'text', x: 540, y: 320, fontSize: 35, color: '#FFFFFF', align: 'center', label: 'Rodada/Fase', zIndex: 2, content: '{RODADA}', fontFamily: 'Roboto'
                    });
                }
                
                setElements(loadedElements);

                let bgToUse = res.data.bg_url;
                const isSystemAsset = (url: string) => url && url.includes('/assets-templates/');

                if (bgToUse && isSystemAsset(bgToUse) && res.data.preview_bg_url) {
                    bgToUse = res.data.preview_bg_url;
                }

                if (!bgToUse) {
                    bgToUse = res.data.preview_bg_url || getDefaultBg(templateName, selectedSport);
                }

                setPersistedBgUrl(res.data.bg_url || null);
                setBgImage(bgToUse);
            } else {
                loadDefaults(templateName);
            }
        } catch (error) {
            console.error("Erro ao carregar template", error);
            loadDefaults(templateName);
        } finally {
            setLoading(false);
        }
    };

    const resetTemplate = () => {
        if (confirm('Tem certeza que deseja restaurar o padrão? Suas alterações não salvas serão perdidas.')) {
            loadDefaults(templateName);
            toast.success('Padrão restaurado!');
        }
    };

    const handleElementChange = (id: string, updates: Partial<Element>) => {
        setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
    };

    const handleAddElement = () => {
        const newEl: Element = {
            id: 'new_text_' + Date.now(),
            type: 'text',
            x: CANVAS_WIDTH / 2,
            y: CANVAS_HEIGHT / 2,
            fontSize: 40,
            color: '#FFFFFF',
            align: 'center',
            label: 'Novo Texto',
            zIndex: elements.length + 1,
            content: 'Novo Texto',
            fontFamily: 'Roboto'
        };
        setElements(prev => [...prev, newEl]);
        setActiveElementId(newEl.id);
        setShowElements(true);
    };

    const handleAddImageElement = () => {
        const newEl: Element = {
            id: 'new_img_' + Date.now(),
            type: 'image',
            x: CANVAS_WIDTH / 2,
            y: CANVAS_HEIGHT / 2,
            width: 300,
            height: 300,
            label: 'Nova Imagem Livre',
            zIndex: elements.length + 1,
            content: 'custom_image',
            borderRadius: 0
        };
        setElements(prev => [...prev, newEl]);
        setActiveElementId(newEl.id);
        setShowElements(true);
    };

    const handleCustomImageUpload = async (id: string, file: File) => {
        const toastId = toast.loading('Enviando imagem...');
        try {
            const compressed = await compressImage(file, 5 * 1024 * 1024, 2000, 0.9);
            const formData = new FormData();
            formData.append('image', compressed);
            formData.append('folder', 'art-elements');

            const res = await api.post('/admin/upload/generic', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data && res.data.url) {
                handleElementChange(id, { content: res.data.url });
                toast.success('Imagem enviada!', { id: toastId });
            }
        } catch (err) {
            console.error(err);
            toast.error('Erro ao enviar imagem', { id: toastId });
        }
    };

    const saveTemplate = async () => {
        setLoading(true);
        try {
            const backendKey = templateName === 'Premiação (Equipe)' ? 'art_layout_custom_premiacao-equipe' :
                               templateName === 'Premiação (Jogador)' ? 'art_layout_custom_premiacao-jogador' :
                               templateName === 'Melhor Tempo' ? 'art_layout_custom_melhor-tempo' :
                               templateName === 'Melhor Volta' ? 'art_layout_custom_melhor-volta' :
                               templateName === 'Bateria Programada' ? 'art_layout_custom_bateria-programada' :
                               templateName;

            await api.post('/admin/art-templates', {
                name: backendKey,
                bg_url: persistedBgUrl,
                elements: elements,
                canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
                championship_id: selectedChampionship || null
            });
            toast.success('Template salvo com sucesso!');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar template.');
        } finally {
            setLoading(false);
        }
    };

    const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const toastId = toast.loading('Processando e enviando fundo...');
        try {
            const compressed = await compressImage(file, 5 * 1024 * 1024, 3000, 0.9);

            const formData = new FormData();
            formData.append('image', compressed);
            formData.append('folder', 'art-backgrounds');

            const res = await api.post('/admin/upload/generic', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data && res.data.url) {
                setBgImage(res.data.url);
                setPersistedBgUrl(res.data.url);
                toast.success('Fundo atualizado!', { id: toastId });
            }
        } catch (err) {
            console.error(err);
            toast.error('Erro ao enviar imagem', { id: toastId });
        }
    };

    const activeElement = elements.find(el => el.id === activeElementId);

    const CanvasRenderer = ({ scale = 1, interactable = false }) => (
        <div
            className="bg-white shadow-2xl relative overflow-hidden select-none shrink-0"
            style={{
                width: CANVAS_WIDTH * scale,
                height: CANVAS_HEIGHT * scale,
                transformOrigin: 'top left',
            }}
            onClick={e => interactable && e.stopPropagation()}
        >
            <div className="absolute inset-0 bg-gray-300 flex items-center justify-center text-gray-400">
                {bgImage ? (
                    <img src={bgImage} className="w-full h-full object-cover" />
                ) : (
                    <div className="text-center font-bold opacity-30 text-2xl uppercase">
                        {templateName}<br/>UPLOAD FUNDO
                    </div>
                )}
            </div>

            {elements.sort((a, b) => a.zIndex - b.zIndex).map(el => (
                interactable ? (
                    <motion.div
                        drag
                        dragMomentum={false}
                        key={el.id}
                        onDragEnd={(_, info) => {
                            const deltaX = info.offset.x / scale;
                            const deltaY = info.offset.y / scale;
                            handleElementChange(el.id, { x: Math.round(el.x + deltaX), y: Math.round(el.y + deltaY) });
                        }}
                        onClick={(e) => { e.stopPropagation(); setActiveElementId(el.id); }}
                        className={`absolute hover:outline hover:outline-2 hover:outline-blue-400 ${activeElementId === el.id ? 'outline outline-2 outline-blue-600 z-[100]' : ''}`}
                        style={{
                            left: el.x * scale,
                            top: el.y * scale,
                            width: el.width ? el.width * scale : 'auto',
                            height: el.height ? el.height * scale : 'auto',
                            fontSize: el.fontSize ? el.fontSize * scale : undefined,
                            color: el.color,
                            fontFamily: el.fontFamily || 'Arial',
                            textAlign: el.align || 'left',
                            transform: el.type === 'text'
                                ? `translate(${el.align === 'left' ? '0' : el.align === 'right' ? '-100%' : '-50%'}, -50%)`
                                : 'translate(-50%, -50%)',
                            whiteSpace: 'pre',
                            lineHeight: 1,
                            cursor: 'move'
                        }}
                    >
                        {el.type === 'image' ? (
                            <div className="w-full h-full bg-gray-200/50 border border-gray-400/30 flex items-center justify-center relative overflow-hidden"
                                style={{ borderRadius: (el.borderRadius || 0) * scale }}
                            >
                                {el.content === 'player_photo' ? <img src="https://ui-avatars.com/api/?name=Competidor&background=random&size=512" className="w-full h-full object-cover" /> :
                                 el.content?.includes('http') || el.content?.includes('data:image') ? <img src={el.content} className="w-full h-full object-contain" /> :
                                 el.content?.includes('team') ? <div className="text-[10px] font-bold">Logo</div> : <div className="text-[10px] font-bold text-gray-500">Imagem</div>}
                            </div>
                        ) : (
                            <span>{el.content}</span>
                        )}
                        <div className="absolute -top-6 left-0 bg-blue-600 text-white text-[8px] px-1 rounded opacity-0 hover:opacity-100 whitespace-nowrap pointer-events-none">
                            {el.label} (X:{el.x}, Y:{el.y})
                        </div>
                    </motion.div>
                ) : (
                    <div
                        key={el.id}
                        style={{
                            position: 'absolute',
                            left: el.x * scale,
                            top: el.y * scale,
                            width: el.width ? el.width * scale : undefined,
                            height: el.height ? el.height * scale : undefined,
                            fontSize: el.fontSize ? el.fontSize * scale : undefined,
                            color: el.color,
                            fontFamily: el.fontFamily || 'Arial',
                            textAlign: el.align || 'left',
                            transform: el.type === 'text'
                                ? `translate(${el.align === 'left' ? '0' : el.align === 'right' ? '-100%' : '-50%'}, -50%)`
                                : 'translate(-50%, -50%)',
                            whiteSpace: 'pre',
                            lineHeight: 1,
                            zIndex: el.zIndex,
                        }}
                    >
                        {el.type === 'image' ? (
                            <div className="w-full h-full bg-gray-200/50 flex items-center justify-center overflow-hidden"
                                style={{ borderRadius: (el.borderRadius || 0) * scale }}
                            >
                                {el.content === 'player_photo' ? <img src="https://ui-avatars.com/api/?name=Competidor&background=random&size=512" className="w-full h-full object-cover" /> : 
                                 el.content?.includes('http') || el.content?.includes('data:image') ? <img src={el.content} className="w-full h-full object-contain" /> : null}
                                {el.content?.includes('team') ? <div className="text-sm font-bold opacity-50">Logo</div> : null}
                            </div>
                        ) : (
                            <span>{el.content}</span>
                        )}
                    </div>
                )
            ))}
        </div>
    );

    return (
        <div className="h-[calc(100vh-64px)] bg-gray-150 overflow-hidden font-sans relative">
            <style>{`
                @font-face { font-family: 'Roboto'; src: url('${api.defaults.baseURL}/assets-fonts/Roboto.ttf'); font-display: block; }
                @font-face { font-family: 'Roboto-Bold'; src: url('${api.defaults.baseURL}/assets-fonts/Roboto-Bold.ttf'); font-display: block; }
                @font-face { font-family: 'Anton'; src: url('${api.defaults.baseURL}/assets-fonts/Anton.ttf'); font-display: block; }
                @font-face { font-family: 'Archivo Black'; src: url('${api.defaults.baseURL}/assets-fonts/Archivo Black.ttf'); font-display: block; }
                @font-face { font-family: 'Bebas Neue'; src: url('${api.defaults.baseURL}/assets-fonts/Bebas Neue.ttf'); font-display: block; }
                @font-face { font-family: 'Cinzel'; src: url('${api.defaults.baseURL}/assets-fonts/Cinzel.ttf'); font-display: block; }
                @font-face { font-family: 'Lato'; src: url('${api.defaults.baseURL}/assets-fonts/Lato.ttf'); font-display: block; }
                @font-face { font-family: 'Lexend'; src: url('${api.defaults.baseURL}/assets-fonts/Lexend.ttf'); font-display: block; }
                @font-face { font-family: 'Lora'; src: url('${api.defaults.baseURL}/assets-fonts/Lora.ttf'); font-display: block; }
                @font-face { font-family: 'Merriweather'; src: url('${api.defaults.baseURL}/assets-fonts/Merriweather.ttf'); font-display: block; }
                @font-face { font-family: 'Montserrat'; src: url('${api.defaults.baseURL}/assets-fonts/Montserrat.ttf'); font-display: block; }
                @font-face { font-family: 'Open Sans'; src: url('${api.defaults.baseURL}/assets-fonts/Open Sans.ttf'); font-display: block; }
                @font-face { font-family: 'Oswald'; src: url('${api.defaults.baseURL}/assets-fonts/Oswald.ttf'); font-display: block; }
                @font-face { font-family: 'Playfair Display'; src: url('${api.defaults.baseURL}/assets-fonts/Playfair Display.ttf'); font-display: block; }
                @font-face { font-family: 'Poppins'; src: url('${api.defaults.baseURL}/assets-fonts/Poppins.ttf'); font-display: block; }
                @font-face { font-family: 'Source Sans 3'; src: url('${api.defaults.baseURL}/assets-fonts/Source Sans 3.ttf'); font-display: block; }
                @font-face { font-family: 'Teko'; src: url('${api.defaults.baseURL}/assets-fonts/Teko.ttf'); font-display: block; }
            `}</style>

            <AnimatePresence mode="wait">
                {editorMode === 'select' ? (
                    <motion.div
                        key="selection-screen"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-white z-50 overflow-y-auto"
                    >
                        <div className="max-w-4xl w-full text-center mb-10">
                            <span className="text-xs font-black uppercase tracking-[0.3em] bg-indigo-500/20 text-indigo-300 px-4 py-1.5 rounded-full mb-4 inline-block border border-indigo-500/30 animate-pulse">Design Lab</span>
                            <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tight leading-none">Qual tipo de esporte você vai editar?</h1>
                            <p className="text-slate-400 font-bold mt-3 text-sm md:text-base">Escolha o laboratório adequado para carregar as ferramentas e dimensões estéticas correspondentes.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
                            {/* Card 1: Coletivo */}
                            <button
                                onClick={() => {
                                    setEditorMode('classic');
                                    setTemplateName('Craque do Jogo');
                                }}
                                className="group relative text-left bg-slate-800 border border-slate-700/60 p-8 rounded-[2.5rem] hover:border-indigo-500/80 hover:bg-slate-800/80 transition-all duration-350 flex flex-col justify-between shadow-2xl hover:shadow-indigo-550/10 min-h-[320px] overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors"></div>
                                <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-3xl w-max group-hover:scale-110 transition-transform shadow-inner">
                                    <Palette size={32} />
                                </div>
                                <div className="mt-8">
                                    <h3 className="text-xl font-black uppercase italic group-hover:text-indigo-400 transition-colors">Quadra & Campo</h3>
                                    <p className="text-xs text-slate-400 mt-2 font-bold uppercase">Esportes Coletivos Tradicionais</p>
                                    <p className="text-xs text-slate-400/80 font-medium mt-4 line-clamp-3">Gere templates clássicos como Craque do Jogo, Placar de Confronto direto, Próxima Partida, Defesa Menos Vazada e Premiação Individual.</p>
                                </div>
                            </button>

                            {/* Card 2: Tempo / Voltas */}
                            <button
                                onClick={() => {
                                    setEditorMode('timing');
                                    setTemplateName('Melhor Tempo');
                                }}
                                className="group relative text-left bg-slate-800 border border-slate-700/60 p-8 rounded-[2.5rem] hover:border-orange-500/80 hover:bg-slate-800/80 transition-all duration-350 flex flex-col justify-between shadow-2xl hover:shadow-orange-550/10 min-h-[320px] overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-colors"></div>
                                <div className="p-4 bg-orange-500/10 text-orange-400 rounded-3xl w-max group-hover:scale-110 transition-transform shadow-inner">
                                    <Timer size={32} />
                                </div>
                                <div className="mt-8">
                                    <h3 className="text-xl font-black uppercase italic group-hover:text-orange-400 transition-colors">Tempo & Voltas</h3>
                                    <p className="text-xs text-slate-400 mt-2 font-bold uppercase">Esportes de Corrida e Cronometragem</p>
                                    <p className="text-xs text-slate-400/80 font-medium mt-4 line-clamp-3">Gere templates de Melhor Tempo, Melhor Volta Individual, Baterias Programadas, Premiação de Equipes Vencedoras e Premiação de Atletas.</p>
                                </div>
                            </button>

                            {/* Card 3: Individuais / Geral */}
                            <a
                                href="/admin/championships"
                                className="group relative text-left bg-slate-800 border border-slate-700/60 p-8 rounded-[2.5rem] hover:border-emerald-500/80 hover:bg-slate-800/80 transition-all duration-350 flex flex-col justify-between shadow-2xl hover:shadow-emerald-550/10 min-h-[320px] overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
                                <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-3xl w-max group-hover:scale-110 transition-transform shadow-inner">
                                    <Users size={32} />
                                </div>
                                <div className="mt-8">
                                    <h3 className="text-xl font-black uppercase italic group-hover:text-emerald-400 transition-colors">Individuais</h3>
                                    <p className="text-xs text-slate-400 mt-2 font-bold uppercase">Gestão por Campeonato</p>
                                    <p className="text-xs text-slate-400/80 font-medium mt-4 line-clamp-3">Ir para Campeonatos Individuais. Gerencie artes de atletas confirmados e colocações de pódio diretamente pelo painel de cada campeonato.</p>
                                </div>
                            </a>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="main-editor"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex h-full"
                    >
                        {/* Sidebar Controls */}
                        <div className="w-80 bg-white border-r border-gray-200 flex flex-col z-20 shadow-xl overflow-hidden shrink-0 h-full">
                            <div className="p-4 border-b border-gray-150 shrink-0 flex items-center justify-between">
                                <h2 className="font-black text-gray-800 flex items-center gap-2 uppercase tracking-tight">
                                    {editorMode === 'timing' ? <Timer className="w-5 h-5 text-orange-500" /> : <Palette className="w-5 h-5 text-indigo-600" />}
                                    Editor {editorMode === 'timing' ? 'Tempo' : 'Tradicional'}
                                </h2>
                                <button
                                    onClick={() => setEditorMode('select')}
                                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-450 hover:text-slate-900 transition-colors"
                                    title="Voltar ao início"
                                >
                                    <ArrowLeft size={16} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                {/* Settings Section */}
                                <div className="border-b border-gray-100">
                                    <button
                                        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                                        onClick={() => setShowSettings(!showSettings)}
                                    >
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Configurações Base</span>
                                        {showSettings ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </button>

                                    {showSettings && (
                                        <div className="p-4 pt-0 space-y-3">
                                            <label className="text-xs font-black text-slate-500 block mb-1 uppercase">Campeonato (Contexto)</label>
                                            <select
                                                value={selectedChampionship}
                                                onChange={e => setSelectedChampionship(e.target.value)}
                                                className="w-full p-2 border border-gray-200 rounded-lg text-sm font-bold bg-white mb-3 text-indigo-700"
                                            >
                                                <option value="">Padrão (Por Esporte)</option>
                                                {championships
                                                    .filter(c => editorMode === 'timing' ? isTimingChampionship(c) : !isTimingChampionship(c))
                                                    .map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                            </select>

                                            <label className="text-xs font-black text-slate-500 block mb-1 uppercase">Template</label>
                                            <select
                                                value={templateName}
                                                onChange={e => {
                                                    setTemplateName(e.target.value);
                                                    setSelectedChampionship('');
                                                }}
                                                className="w-full p-2 border border-gray-200 rounded-lg text-sm font-bold bg-white"
                                            >
                                                {editorMode === 'timing' ? (
                                                    <>
                                                        <option>Melhor Tempo</option>
                                                        <option>Melhor Volta</option>
                                                        <option>Bateria Programada</option>
                                                        <option>Premiação (Equipe)</option>
                                                        <option>Premiação (Jogador)</option>
                                                    </>
                                                ) : (
                                                    <>
                                                        <option>Craque do Jogo</option>
                                                        <option>Jogo Programado</option>
                                                        <option>Confronto</option>
                                                        <option>Defesa Menos Vazada</option>
                                                        <option>Premiação (Jogador)</option>
                                                    </>
                                                )}
                                            </select>

                                            <label className="text-xs font-black text-slate-500 block mb-1 pt-2 uppercase">Esporte (Visualização)</label>
                                            <select
                                                value={selectedSport}
                                                onChange={e => setSelectedSport(e.target.value)}
                                                className="w-full p-2 border border-gray-200 rounded-lg text-sm font-bold bg-white"
                                            >
                                                {allSports.length > 0 ? (
                                                    allSports
                                                        .filter(s => editorMode === 'timing' ? isTimingSportObj(s) : !isTimingSportObj(s))
                                                        .map(s => (
                                                            <option key={s.slug} value={s.slug}>{s.name}</option>
                                                        ))
                                                ) : (
                                                    editorMode === 'timing' ? (
                                                        <>
                                                            <option value="natacao">Natação</option>
                                                            <option value="corrida">Corrida / Ciclismo</option>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <option value="futebol">Futebol</option>
                                                            <option value="futebol-7">Futebol 7</option>
                                                            <option value="futsal">Futsal</option>
                                                            <option value="volei">Vôlei</option>
                                                            <option value="basquete">Basquete</option>
                                                            <option value="handebol">Handebol</option>
                                                            <option value="tenis">Tênis</option>
                                                            <option value="beach-tennis">Beach Tennis</option>
                                                        </>
                                                    )
                                                )}
                                            </select>

                                            {/* Upload Background */}
                                            <div className="mt-3 pt-3 border-t border-gray-150">
                                                <label className="text-xs font-black text-slate-400 block mb-1 uppercase tracking-wider">Fundo Customizado</label>
                                                <div className="flex gap-2">
                                                    <label className="flex-1 cursor-pointer bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2 flex items-center justify-center gap-2 text-xs font-black uppercase transition-colors">
                                                        <Upload size={14} /> Upload Imagem
                                                        <input type="file" className="hidden" accept="image/*" onChange={handleBgUpload} />
                                                    </label>
                                                    {persistedBgUrl && (
                                                        <button
                                                            onClick={() => { setPersistedBgUrl(null); loadTemplate(); }}
                                                            className="p-2 text-red-500 hover:bg-red-50 rounded border border-red-100"
                                                            title="Remover Fundo Customizado"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-[9px] text-gray-400 mt-1 uppercase">Recomendado: 1080x1920 (9:16)</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Elements List */}
                                <div className="border-b border-gray-100">
                                    <button
                                        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                                        onClick={() => setShowElements(!showElements)}
                                    >
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Elementos ({elements.length})</span>
                                        <div className="flex items-center gap-2">
                                            <span className="p-1 hover:bg-indigo-50 rounded text-indigo-650 cursor-pointer" onClick={(e) => {
                                                e.stopPropagation();
                                                handleAddImageElement();
                                            }} title="Adicionar nova imagem livre"><ImageIcon size={14} /></span>
                                            <span className="p-1 hover:bg-indigo-50 rounded text-indigo-650 cursor-pointer" onClick={(e) => {
                                                e.stopPropagation();
                                                handleAddElement();
                                            }} title="Adicionar novo elemento de texto"><Type size={14} /></span>
                                            {showElements ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </div>
                                    </button>

                                    {showElements && (
                                        <div className="p-4 pt-0 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                            {elements.map(el => (
                                                <div
                                                    key={el.id}
                                                    onClick={() => setActiveElementId(el.id)}
                                                    className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer transition-all text-xs ${activeElementId === el.id ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-gray-300 bg-white'
                                                        }`}
                                                >
                                                    {el.type === 'text' ? <Type size={14} className="text-gray-400" /> : <ImageIcon size={14} className="text-gray-400" />}
                                                    <div className="flex-1 min-w-0">
                                                        <span className="font-bold text-gray-700 block truncate">{el.label}</span>
                                                    </div>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${activeElementId === el.id ? 'bg-indigo-500' : 'bg-gray-350'}`} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Properties Section */}
                                {activeElement && (
                                    <div className="border-b border-gray-100 bg-slate-50/50">
                                        <button
                                            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-100 transition-colors"
                                            onClick={() => setShowProps(!showProps)}
                                        >
                                            <span className="text-xs font-black text-indigo-600 uppercase flex items-center gap-2">
                                                Propriedades: {activeElement.label}
                                            </span>
                                            {showProps ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </button>

                                        {showProps && (
                                            <div className="p-4 pt-0 space-y-4">
                                                <div className="flex justify-end">
                                                    <button 
                                                        onClick={() => {
                                                            setElements(prev => prev.filter(el => el.id !== activeElement.id));
                                                            setActiveElementId(null);
                                                        }}
                                                        className="text-red-500 hover:text-red-700 flex items-center gap-1 bg-white border border-red-100 px-2 py-1 rounded shadow-sm text-[10px] font-black uppercase"
                                                    >
                                                        <Trash2 size={12} /> Excluir Elemento
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-405 uppercase tracking-wider block mb-0.5">Posição X</label>
                                                        <input
                                                            type="number"
                                                            value={activeElement.x}
                                                            onChange={e => handleElementChange(activeElement.id, { x: parseInt(e.target.value) || 0 })}
                                                            className="w-full p-2 border rounded-lg text-xs font-mono font-bold"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-405 uppercase tracking-wider block mb-0.5">Posição Y</label>
                                                        <input
                                                            type="number"
                                                            value={activeElement.y}
                                                            onChange={e => handleElementChange(activeElement.id, { y: parseInt(e.target.value) || 0 })}
                                                            className="w-full p-2 border rounded-lg text-xs font-mono font-bold"
                                                        />
                                                    </div>
                                                </div>

                                                {activeElement.type === 'text' && (
                                                    <>
                                                        <div>
                                                            <label className="text-[10px] font-black text-slate-405 uppercase tracking-wider block mb-0.5">Tamanho da Fonte</label>
                                                            <input
                                                                type="number"
                                                                value={activeElement.fontSize}
                                                                onChange={e => handleElementChange(activeElement.id, { fontSize: parseInt(e.target.value) || 12 })}
                                                                className="w-full p-2 border rounded-lg text-xs font-bold"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-black text-slate-405 uppercase tracking-wider block mb-0.5">Cor do Texto</label>
                                                            <input
                                                                type="color"
                                                                value={activeElement.color}
                                                                onChange={e => handleElementChange(activeElement.id, { color: e.target.value })}
                                                                className="w-full h-10 border-none cursor-pointer rounded-lg overflow-hidden"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-black text-slate-405 uppercase tracking-wider block mb-0.5">Alinhamento</label>
                                                            <div className="flex p-1 bg-slate-50 border rounded-xl">
                                                                {(['left', 'center', 'right'] as const).map(a => (
                                                                    <button
                                                                        key={a}
                                                                        onClick={() => handleElementChange(activeElement.id, { align: a })}
                                                                        className={`flex-1 py-1 px-2 rounded-lg text-[9px] font-black uppercase transition-all ${activeElement.align === a ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                                                                    >
                                                                        {a}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-black text-slate-405 uppercase tracking-wider block mb-0.5">Fonte Tipográfica</label>
                                                            <select
                                                                value={activeElement.fontFamily || 'Arial'}
                                                                onChange={e => handleElementChange(activeElement.id, { fontFamily: e.target.value })}
                                                                className="w-full p-2 border rounded-lg text-xs font-bold bg-white"
                                                            >
                                                                <option value="Arial">Arial (Padrão)</option>
                                                                <option value="Roboto">Roboto</option>
                                                                <option value="Roboto-Bold">Roboto Bold</option>
                                                                <option value="Anton">Anton</option>
                                                                <option value="Bebas Neue">Bebas Neue</option>
                                                                <option value="Archivo Black">Archivo Black</option>
                                                                <option value="Montserrat">Montserrat</option>
                                                                <option value="Poppins">Poppins</option>
                                                                <option value="Oswald">Oswald</option>
                                                                <option value="Teko">Teko</option>
                                                            </select>
                                                        </div>
                                                    </>
                                                )}

                                                {activeElement.type === 'image' && (
                                                    <>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-[10px] font-black text-slate-405 uppercase tracking-wider block mb-0.5">Largura (L)</label>
                                                                <input
                                                                    type="number"
                                                                    value={activeElement.width}
                                                                    onChange={e => handleElementChange(activeElement.id, { width: parseInt(e.target.value) || 50 })}
                                                                    className="w-full p-2 border rounded-lg text-xs font-bold"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-black text-slate-405 uppercase tracking-wider block mb-0.5">Altura (A)</label>
                                                                <input
                                                                    type="number"
                                                                    value={activeElement.height}
                                                                    onChange={e => handleElementChange(activeElement.id, { height: parseInt(e.target.value) || 50 })}
                                                                    className="w-full p-2 border rounded-lg text-xs font-bold"
                                                                />
                                                            </div>
                                                        </div>
                                                        {activeElement.content === 'custom_image' && (
                                                            <div>
                                                                <label className="text-[10px] font-black text-slate-405 uppercase tracking-wider block mb-0.5">Imagem Customizada</label>
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={(e) => {
                                                                        const f = e.target.files?.[0];
                                                                        if (f) handleCustomImageUpload(activeElement.id, f);
                                                                    }}
                                                                    className="w-full text-xs"
                                                                />
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-gray-150 bg-gray-50/50 shrink-0">
                                <button
                                    onClick={saveTemplate}
                                    disabled={loading}
                                    className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                                >
                                    <Save size={20} /> Salvar Template
                                </button>
                                <button
                                    onClick={resetTemplate}
                                    className="w-full py-2.5 mt-2 bg-slate-100 hover:bg-slate-200 text-slate-650 hover:text-slate-800 rounded-xl font-bold transition-all text-xs uppercase tracking-wider"
                                >
                                    Restaurar Padrão
                                </button>
                            </div>
                        </div>

                        {/* Main Canvas Area */}
                        <div className="flex-1 overflow-auto bg-slate-200 flex items-center justify-center p-10 relative">
                            {loading && (
                                <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-xs flex items-center justify-center z-50">
                                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}

                            <div style={{ transform: `scale(${SCALE})`, transformOrigin: 'center' }} className="shadow-2xl flex-shrink-0">
                                <CanvasRenderer scale={1} interactable={true} />
                            </div>

                            {/* Floating help box */}
                            {showHelp && (
                                <div className="absolute bottom-6 right-6 max-w-sm bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 animate-in fade-in duration-300">
                                    <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-slate-300 hover:text-slate-700"><X size={18} /></button>
                                    <h4 className="font-black text-slate-900 uppercase text-xs tracking-wider mb-2 flex items-center gap-1"><Award size={14} className="text-indigo-500" /> Dicas de Design</h4>
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Você pode arrastar e soltar os elementos da arte diretamente no canvas. Use as propriedades na barra lateral para ajustar tamanhos, fontes e alinhamento de forma milimétrica.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
