import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Upload, Type, Image as ImageIcon, Layout, Move, Plus, Trash2, Smartphone, Monitor, X, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

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
    const [elements, setElements] = useState<Element[]>(DEFAULT_ELEMENTS);
    const [activeElementId, setActiveElementId] = useState<string | null>(null);
    const [templateName, setTemplateName] = useState('Craque do Jogo');
    const [bgImage, setBgImage] = useState<string | null>(null); // URL of background
    const [loading, setLoading] = useState(false);
    const [showHelp, setShowHelp] = useState(true);
    const [previewMode, setPreviewMode] = useState(false);

    // Sidebar sections
    const [showSettings, setShowSettings] = useState(false);
    const [showElements, setShowElements] = useState(true);
    const [showProps, setShowProps] = useState(true);

    const [selectedSport, setSelectedSport] = useState('futebol');
    const [persistedBgUrl, setPersistedBgUrl] = useState<string | null>(null);

    // Load template or default settings
    useEffect(() => {
        loadTemplate();
    }, [templateName, selectedSport]);

    const getDefaultBg = (name: string, sport: string) => {
        // Use default assets from backend
        const baseUrl = api.defaults.baseURL;
        const s = (sport || 'futebol').toLowerCase();

        if (name === 'Craque do Jogo') return `${baseUrl}/assets-templates/fundo_craque_do_jogo.jpg`;
        if (name === 'Jogo Programado') {
            if (s.includes('volei')) return `${baseUrl}/assets-templates/volei_confronto.jpg`;
            return `${baseUrl}/assets-templates/fundo_confronto.jpg`;
        }
        if (name === 'Confronto') return `${baseUrl}/assets-templates/fundo_confronto.jpg`;
        return null; // fallback
    };

    const loadDefaults = (name: string) => {
        setBgImage(getDefaultBg(name, selectedSport));
        setPersistedBgUrl(null); // Reset persisted to null to allow dynamic behavior

        if (name === 'Craque do Jogo') {
            setElements(DEFAULT_ELEMENTS);
        } else if (name === 'Jogo Programado') {
            setElements([
                { id: 'championship', type: 'text', x: 540, y: 250, fontSize: 45, color: '#FFFFFF', align: 'center', label: 'Campeonato', zIndex: 2, content: '{CAMPEONATO}', fontFamily: 'Roboto' },
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
        } else {
            setElements([]);
        }
    };

    const loadTemplate = async () => {
        setLoading(true);
        console.log(`Frontend: Loading Template [${templateName}] for Sport [${selectedSport}]`);
        try {
            const res = await api.get('/admin/art-templates', { params: { name: templateName, sport: selectedSport } });
            console.log('Frontend: API Response', res.data);

            if (res.data && res.data.elements) {
                setElements(res.data.elements);
                // Priority: Saved BG -> Preview/Dynamic BG -> Default BG
                const bgToUse = res.data.bg_url || res.data.preview_bg_url || getDefaultBg(templateName, selectedSport);
                console.log('Frontend: Resolved BG to use:', bgToUse);

                setPersistedBgUrl(res.data.bg_url || null);
                setBgImage(bgToUse);
            } else {
                console.warn('Frontend: No data found, loading defaults');
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


    const saveTemplate = async () => {
        setLoading(true);
        try {
            await api.post('/admin/art-templates', {
                name: templateName,
                bg_url: persistedBgUrl, // Only save if explicit custom BG
                elements: elements,
                canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }
            });
            toast.success('Template salvo com sucesso!');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar template.');
        } finally {
            setLoading(false);
        }
    };

    const activeElement = elements.find(el => el.id === activeElementId);

    // --- MODAL EDITOR COMPONENTS ---
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
            {/* Background Layer */}
            <div className="absolute inset-0 bg-gray-300 flex items-center justify-center text-gray-400">
                {bgImage ? (
                    <img src={bgImage} className="w-full h-full object-cover" />
                ) : (
                    <div className="text-center font-bold opacity-30 text-2xl">
                        BACKGROUND PADRÃO
                    </div>
                )}
            </div>

            {/* Rendering Elements */}
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
                                {el.content === 'player_photo' ? <img src="https://ui-avatars.com/api/?name=Jogador&background=random&size=512" className="w-full h-full object-cover" /> :
                                    el.content?.includes('team') ? <div className="text-[10px] font-bold">Logo</div> : null}
                            </div>
                        ) : (
                            <span>{el.content}</span>
                        )}
                        {/* Label only in main editor not modal to keep clean? Or keep it. */}
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
                                {el.content === 'player_photo' ? <img src="https://ui-avatars.com/api/?name=Jogador&background=random&size=512" className="w-full h-full object-cover" /> : null}
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
        <div className="flex h-[calc(100vh-64px)] bg-gray-100 overflow-hidden">
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

            {/* Sidebar Controls */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col z-20 shadow-xl overflow-hidden shrink-0 h-full">
                {/* ... Sidebar content identical to before ... */}
                <div className="p-4 border-b border-gray-100 shrink-0">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2">
                        <Layout className="w-5 h-5 text-indigo-600" /> Editor de Artes
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Settings Section */}
                    <div className="border-b border-gray-100">
                        <button
                            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                            onClick={() => setShowSettings(!showSettings)}
                        >
                            <span className="text-xs font-bold text-gray-500 uppercase">Configurações Base</span>
                            {showSettings ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>

                        {showSettings && (
                            <div className="p-4 pt-0 space-y-3">
                                <label className="text-xs font-bold text-gray-500 block mb-1">TEMPLATE</label>
                                <select
                                    value={templateName}
                                    onChange={e => setTemplateName(e.target.value)}
                                    className="w-full p-2 border border-gray-200 rounded-lg text-sm font-bold bg-white"
                                >
                                    <option>Craque do Jogo</option>
                                    <option>Jogo Programado</option>
                                    <option>Confronto</option>
                                </select>

                                <label className="text-xs font-bold text-gray-500 block mb-1 pt-2">ESPORTE (Visualização)</label>
                                <select
                                    value={selectedSport}
                                    onChange={e => setSelectedSport(e.target.value)}
                                    className="w-full p-2 border border-gray-200 rounded-lg text-sm font-bold bg-white"
                                >
                                    <option value="futebol">Futebol</option>
                                    <option value="fut7">Fut7</option>
                                    <option value="futsal">Futsal</option>
                                    <option value="volei">Vôlei</option>
                                    <option value="basquete">Basquete</option>
                                    <option value="handebol">Handebol</option>
                                </select>

                                {/* Preview Image Check */}
                                <div className="mt-2 p-2 border border-gray-100 rounded bg-gray-50 text-[10px] text-gray-500 break-words">
                                    <strong>Debug BG:</strong> {bgImage ? bgImage.split('/').pop() : 'Nenhum'}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Elements List */}
                    <div className="border-b border-gray-100">
                        {/* ... Same Elements List Logic ... */}
                        <button
                            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                            onClick={() => setShowElements(!showElements)}
                        >
                            <span className="text-xs font-bold text-gray-500 uppercase">Elementos ({elements.length})</span>
                            <div className="flex items-center gap-2">
                                <span className="p-1 hover:bg-indigo-50 rounded text-indigo-600 cursor-pointer" onClick={(e) => {
                                    e.stopPropagation();
                                }}><Plus size={14} /></span>
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
                                        <div className={`w-1.5 h-1.5 rounded-full ${activeElementId === el.id ? 'bg-indigo-500' : 'bg-gray-300'}`} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Properties Section (Sticky or at bottom if active) */}
                    {activeElement && (
                        <div className="border-b border-gray-100 bg-gray-50/50">
                            {/* ... Same Properties Logic ... */}
                            <button
                                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-100 transition-colors"
                                onClick={() => setShowProps(!showProps)}
                            >
                                <span className="text-xs font-bold text-indigo-600 uppercase flex items-center gap-2">
                                    Propriedades: {activeElement.label}
                                </span>
                                {showProps ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>

                            {showProps && (
                                <div className="p-4 pt-0">
                                    <h3 className="text-[10px] font-bold text-gray-400 mb-3 uppercase flex justify-end">
                                        <button className="text-red-500 hover:text-red-700 flex items-center gap-1 bg-white border border-red-100 px-2 py-1 rounded shadow-sm">
                                            <Trash2 size={12} /> Excluir
                                        </button>
                                    </h3>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="col-span-1">
                                            <label className="text-[9px] text-gray-400 block mb-0.5">X</label>
                                            <input
                                                type="number"
                                                value={activeElement.x}
                                                onChange={e => handleElementChange(activeElement.id, { x: parseInt(e.target.value) })}
                                                className="w-full p-1 border rounded text-xs font-mono"
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="text-[9px] text-gray-400 block mb-0.5">Y</label>
                                            <input
                                                type="number"
                                                value={activeElement.y}
                                                onChange={e => handleElementChange(activeElement.id, { y: parseInt(e.target.value) })}
                                                className="w-full p-1 border rounded text-xs font-mono"
                                            />
                                        </div>
                                        {/* ... (Properties Inputs Continued) ... */}
                                        {activeElement.type === 'text' && (
                                            <>
                                                <div className="col-span-1">
                                                    <label className="text-[9px] text-gray-400 block mb-0.5">Tamanho</label>
                                                    <input
                                                        type="number"
                                                        value={activeElement.fontSize}
                                                        onChange={e => handleElementChange(activeElement.id, { fontSize: parseInt(e.target.value) })}
                                                        className="w-full p-1 border rounded text-xs font-mono"
                                                    />
                                                </div>
                                                <div className="col-span-1">
                                                    <label className="text-[9px] text-gray-700 font-bold block mb-0.5">Cor</label>
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="color"
                                                            value={activeElement.color}
                                                            onChange={e => handleElementChange(activeElement.id, { color: e.target.value })}
                                                            className="w-full h-6 border rounded cursor-pointer"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="col-span-2">
                                                    <label className="text-[9px] text-gray-700 font-bold block mb-0.5">Fonte</label>
                                                    <select
                                                        value={activeElement.fontFamily || 'Roboto'}
                                                        onChange={e => handleElementChange(activeElement.id, { fontFamily: e.target.value })}
                                                        className="w-full p-1 border rounded text-xs font-mono"
                                                    >
                                                        <option value="Roboto">Roboto</option>
                                                        <option value="Roboto-Bold">Roboto Bold</option>
                                                        <option value="Anton">Anton</option>
                                                        <option value="Archivo Black">Archivo Black</option>
                                                        <option value="Bebas Neue">Bebas Neue</option>
                                                        <option value="Cinzel">Cinzel</option>
                                                        <option value="Lato">Lato</option>
                                                        <option value="Lexend">Lexend</option>
                                                        <option value="Lora">Lora</option>
                                                        <option value="Merriweather">Merriweather</option>
                                                        <option value="Montserrat">Montserrat</option>
                                                        <option value="Open Sans">Open Sans</option>
                                                        <option value="Oswald">Oswald</option>
                                                        <option value="Playfair Display">Playfair Display</option>
                                                        <option value="Poppins">Poppins</option>
                                                        <option value="Source Sans 3">Source Sans 3</option>
                                                        <option value="Teko">Teko</option>
                                                    </select>
                                                </div>

                                                <div className="col-span-2">
                                                    <label className="text-[9px] text-gray-700 font-bold block mb-0.5">Alinhamento</label>
                                                    <div className="flex border rounded overflow-hidden">
                                                        {['left', 'center', 'right'].map(align => (
                                                            <button
                                                                key={align}
                                                                onClick={() => handleElementChange(activeElement.id, { align: align as any })}
                                                                className={`flex-1 py-1 text-[10px] capitalize ${activeElement.align === align ? 'bg-indigo-100 text-indigo-700 font-bold' : 'bg-white hover:bg-gray-50'}`}
                                                            >
                                                                {align}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="col-span-2">
                                                    <label className="text-[9px] text-gray-700 font-bold block mb-0.5">Conteúdo</label>
                                                    <input
                                                        type="text"
                                                        value={activeElement.content}
                                                        onChange={e => handleElementChange(activeElement.id, { content: e.target.value })}
                                                        className="w-full p-1 border rounded text-xs font-mono"
                                                    />
                                                </div>
                                            </>
                                        )}
                                        {activeElement.type === 'image' && (
                                            <>
                                                <div className="col-span-1">
                                                    <label className="text-[9px] text-gray-700 font-bold block mb-0.5">Largura</label>
                                                    <input
                                                        type="number"
                                                        value={activeElement.width}
                                                        onChange={e => handleElementChange(activeElement.id, { width: parseInt(e.target.value) })}
                                                        className="w-full p-1 border rounded text-xs font-mono"
                                                    />
                                                </div>
                                                <div className="col-span-1">
                                                    <label className="text-[9px] text-gray-700 font-bold block mb-0.5">Altura</label>
                                                    <input
                                                        type="number"
                                                        value={activeElement.height}
                                                        onChange={e => handleElementChange(activeElement.id, { height: parseInt(e.target.value) })}
                                                        className="w-full p-1 border rounded text-xs font-mono"
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 shrink-0 bg-white z-10">
                    <button
                        onClick={resetTemplate}
                        className="w-full py-2 mb-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 text-xs"
                    >
                        <Trash2 size={16} /> Restaurar Padrão
                    </button>
                    <button
                        onClick={saveTemplate}
                        disabled={loading}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Salvando...' : <><Save size={18} /> Salvar Template</>}
                    </button>
                    <button
                        onClick={() => setPreviewMode(true)}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 mt-3"
                    >
                        <Monitor size={18} /> Visualizar HD
                    </button>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 overflow-auto bg-gray-200 flex items-center justify-center p-10 relative">

                {/* Scale controls */}
                <div className="absolute top-4 right-4 bg-white/80 backdrop-blur rounded-lg p-2 shadow-sm flex items-center gap-2 z-10">
                    <Monitor size={16} className="text-gray-500" />
                    <span className="text-xs font-bold text-gray-600">Miniatura Interativa ({Math.round(SCALE * 100)}%)</span>
                </div>

                {/* Rendering Canvas with React */}
                <CanvasRenderer scale={SCALE} interactable={true} />
            </div>

            {/* Shortcuts / Help */}
            {showHelp && (
                <div className="absolute bottom-4 right-4 bg-white p-4 rounded-xl shadow-lg border border-gray-100 max-w-xs z-20">
                    {/* ... same help ... */}
                    <button
                        onClick={() => setShowHelp(false)}
                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                    >
                        <X size={14} />
                    </button>
                    <h4 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2">
                        <Smartphone size={16} /> Modo Admin
                    </h4>
                    <p className="text-xs text-gray-500">
                        Arraste os elementos para posicionar. Use o painel lateral para ajuste fino (cores, tamanho).
                        As alterações são salvas para todos os esportes ao clicar em Salvar.
                    </p>
                </div>
            )}

            {/* FULL SCREEN PREVIEW MODAL */}
            {previewMode && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center backdrop-blur-md overflow-hidden p-4"
                    onClick={() => setPreviewMode(false)}
                >
                    <button
                        className="fixed top-4 right-4 text-white hover:text-gray-300 z-[60] bg-white/10 rounded-full p-2"
                        onClick={() => setPreviewMode(false)}
                    >
                        <X size={24} />
                    </button>

                    <div className="h-full w-full flex items-center justify-center overflow-auto" onClick={e => e.stopPropagation()}>
                        {/* Calculate best fit scale for modal */}
                        <div style={{ transform: `scale(${Math.min(window.innerHeight / CANVAS_HEIGHT * 0.95, window.innerWidth / CANVAS_WIDTH * 0.95)})`, transformOrigin: 'center' }}>
                            <CanvasRenderer scale={1} interactable={false} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
