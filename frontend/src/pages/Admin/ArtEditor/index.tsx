import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Upload, Type, Image as ImageIcon, Layout, Move, Plus, Trash2, Smartphone, Monitor } from 'lucide-react';
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
    { id: 'score', type: 'text', x: 540, y: 1535, fontSize: 100, color: '#000000', align: 'center', label: 'Placar', zIndex: 3, content: '3  X  1' },
    { id: 'championship', type: 'text', x: 540, y: 1690, fontSize: 40, color: '#FFFFFF', align: 'center', label: 'Nome Campeonato', zIndex: 2, content: '{CAMPEONATO}' },
    { id: 'round', type: 'text', x: 540, y: 1750, fontSize: 30, color: '#FFFFFF', align: 'center', label: 'Rodada/Fase', zIndex: 2, content: '{RODADA}' },
];

export function ArtEditor() {
    const [elements, setElements] = useState<Element[]>(DEFAULT_ELEMENTS);
    const [activeElementId, setActiveElementId] = useState<string | null>(null);
    const [templateName, setTemplateName] = useState('Craque do Jogo (Geral)');
    const [bgImage, setBgImage] = useState<string | null>(null); // URL of background
    const [loading, setLoading] = useState(false);

    // Load template or default settings
    useEffect(() => {
        loadTemplate();
    }, [templateName]);

    const loadTemplate = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/art-templates', { params: { name: templateName } });
            if (res.data && res.data.elements) {
                setElements(res.data.elements);
                setBgImage(res.data.bg_url);
            } else {
                // Load Defaults based on Type
                if (templateName.includes('Craque')) {
                    setElements(DEFAULT_ELEMENTS);
                } else if (templateName.includes('Jogo Programado')) {
                    setElements([
                        { id: 'bg', type: 'image', x: 540, y: 960, width: 1080, height: 1920, label: 'Background', zIndex: 0, content: 'bg_scheduled' },
                        { id: 'championship', type: 'text', x: 540, y: 250, fontSize: 45, color: '#FFFFFF', align: 'center', label: 'Campeonato', zIndex: 2, content: '{CAMPEONATO}' },
                        { id: 'team_a', type: 'image', x: 250, y: 800, width: 400, height: 400, label: 'Brasão Mandante', zIndex: 2, content: 'team_a' },
                        { id: 'team_b', type: 'image', x: 830, y: 800, width: 400, height: 400, label: 'Brasão Visitante', zIndex: 2, content: 'team_b' },
                        { id: 'vs', type: 'text', x: 540, y: 1000, fontSize: 80, color: '#FFB700', align: 'center', label: 'X (Versus)', zIndex: 2, content: 'X' },
                        { id: 'date', type: 'text', x: 540, y: 1500, fontSize: 50, color: '#FFB700', align: 'center', label: 'Data', zIndex: 2, content: 'DD/MM HH:MM' },
                        { id: 'local', type: 'text', x: 540, y: 1600, fontSize: 35, color: '#FFFFFF', align: 'center', label: 'Local', zIndex: 2, content: 'Local da Partida' },
                    ]);
                } else {
                    setElements([]);
                }
                setBgImage(null);
            }
        } catch (error) {
            console.error("Erro ao carregar template", error);
        } finally {
            setLoading(false);
        }
    };

    const handleElementChange = (id: string, updates: Partial<Element>) => {
        setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
    };



    // We will use a ref driven approach for updates to avoid re-renders on every pixel drag if possible,
    // or just let it re-render.

    const saveTemplate = async () => {
        setLoading(true);
        try {
            await api.post('/admin/art-templates', {
                name: templateName,
                bg_url: bgImage,
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

    return (
        <div className="flex h-[calc(100vh-64px)] bg-gray-100 overflow-hidden">
            <style>{`
                @font-face { font-family: 'Roboto'; src: url('${api.defaults.baseURL}/assets-fonts/Roboto.ttf'); }
                @font-face { font-family: 'Roboto-Bold'; src: url('${api.defaults.baseURL}/assets-fonts/Roboto-Bold.ttf'); }
                @font-face { font-family: 'Anton'; src: url('${api.defaults.baseURL}/assets-fonts/Anton.ttf'); }
                @font-face { font-family: 'Archivo Black'; src: url('${api.defaults.baseURL}/assets-fonts/Archivo Black.ttf'); }
                @font-face { font-family: 'Bebas Neue'; src: url('${api.defaults.baseURL}/assets-fonts/Bebas Neue.ttf'); }
                @font-face { font-family: 'Cinzel'; src: url('${api.defaults.baseURL}/assets-fonts/Cinzel.ttf'); }
                @font-face { font-family: 'Lato'; src: url('${api.defaults.baseURL}/assets-fonts/Lato.ttf'); }
                @font-face { font-family: 'Lexend'; src: url('${api.defaults.baseURL}/assets-fonts/Lexend.ttf'); }
                @font-face { font-family: 'Lora'; src: url('${api.defaults.baseURL}/assets-fonts/Lora.ttf'); }
                @font-face { font-family: 'Merriweather'; src: url('${api.defaults.baseURL}/assets-fonts/Merriweather.ttf'); }
                @font-face { font-family: 'Montserrat'; src: url('${api.defaults.baseURL}/assets-fonts/Montserrat.ttf'); }
                @font-face { font-family: 'Open Sans'; src: url('${api.defaults.baseURL}/assets-fonts/Open Sans.ttf'); }
                @font-face { font-family: 'Oswald'; src: url('${api.defaults.baseURL}/assets-fonts/Oswald.ttf'); }
                @font-face { font-family: 'Playfair Display'; src: url('${api.defaults.baseURL}/assets-fonts/Playfair Display.ttf'); }
                @font-face { font-family: 'Poppins'; src: url('${api.defaults.baseURL}/assets-fonts/Poppins.ttf'); }
                @font-face { font-family: 'Source Sans 3'; src: url('${api.defaults.baseURL}/assets-fonts/Source Sans 3.ttf'); }
                @font-face { font-family: 'Teko'; src: url('${api.defaults.baseURL}/assets-fonts/Teko.ttf'); }
            `}</style>
            {/* Sidebar Controls */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col z-20 shadow-xl">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2">
                        <Layout className="w-5 h-5 text-indigo-600" /> Editor de Artes
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">Personalize os cards gerados pelo sistema.</p>
                </div>

                <div className="p-4 border-b border-gray-100 flex flex-col gap-3">
                    <label className="text-xs font-bold text-gray-500">TEMPLATE</label>
                    <select
                        value={templateName}
                        onChange={e => setTemplateName(e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm font-bold"
                    >
                        <option>Craque do Jogo (Vertical)</option>
                        <option>Jogo Programado (Feed)</option>
                        <option>Jogo Programado (Story)</option>
                        <option>Confronto (Placar)</option>
                    </select>

                    <button className="flex items-center justify-center gap-2 w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors">
                        <Upload className="w-4 h-4" /> Alterar Fundo Padrão
                    </button>
                    {bgImage && <img src={bgImage} className="w-full h-20 object-cover rounded border" />}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-gray-500">ELEMENTOS</label>
                        <button className="text-indigo-600 hover:bg-indigo-50 p-1 rounded"><Plus size={16} /></button>
                    </div>

                    {elements.map(el => (
                        <div
                            key={el.id}
                            onClick={() => setActiveElementId(el.id)}
                            className={`p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-all ${activeElementId === el.id ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                        >
                            {el.type === 'text' ? <Type size={16} className="text-gray-400" /> : <ImageIcon size={16} className="text-gray-400" />}
                            <div className="flex-1 min-w-0">
                                <span className="text-sm font-bold text-gray-700 block truncate">{el.label}</span>
                                <span className="text-[10px] text-gray-400 font-mono">X:{el.x} Y:{el.y}</span>
                            </div>
                            <div className={`w-2 h-2 rounded-full ${activeElementId === el.id ? 'bg-indigo-500' : 'bg-gray-300'}`} />
                        </div>
                    ))}
                </div>

                {activeElement && (
                    <div className="p-4 bg-gray-50 border-t border-gray-200">
                        <h3 className="text-xs font-bold text-gray-600 mb-3 uppercase flex justify-between items-center">
                            Propriedades
                            <button className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-1">
                                <label className="text-[10px] text-gray-400 block mb-1">Posição X</label>
                                <input
                                    type="number"
                                    value={activeElement.x}
                                    onChange={e => handleElementChange(activeElement.id, { x: parseInt(e.target.value) })}
                                    className="w-full p-1.5 border rounded text-sm font-mono"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="text-[10px] text-gray-400 block mb-1">Posição Y</label>
                                <input
                                    type="number"
                                    value={activeElement.y}
                                    onChange={e => handleElementChange(activeElement.id, { y: parseInt(e.target.value) })}
                                    className="w-full p-1.5 border rounded text-sm font-mono"
                                />
                            </div>
                            {activeElement.type === 'text' && (
                                <>
                                    <div className="col-span-1">
                                        <label className="text-[10px] text-gray-400 block mb-1">Tamanho (px)</label>
                                        <input
                                            type="number"
                                            value={activeElement.fontSize}
                                            onChange={e => handleElementChange(activeElement.id, { fontSize: parseInt(e.target.value) })}
                                            className="w-full p-1.5 border rounded text-sm font-mono"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-[10px] text-gray-400 block mb-1">Cor</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={activeElement.color}
                                                onChange={e => handleElementChange(activeElement.id, { color: e.target.value })}
                                                className="w-full h-8 border rounded cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] text-gray-400 block mb-1">Alinhamento</label>
                                        <div className="flex border rounded overflow-hidden">
                                            {['left', 'center', 'right'].map(align => (
                                                <button
                                                    key={align}
                                                    onClick={() => handleElementChange(activeElement.id, { align: align as any })}
                                                    className={`flex-1 py-1 text-xs capitalize ${activeElement.align === align ? 'bg-indigo-100 text-indigo-700 font-bold' : 'bg-white hover:bg-gray-50'}`}
                                                >
                                                    {align}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] text-gray-400 block mb-1">Fonte</label>
                                        <select
                                            value={activeElement.fontFamily || 'Roboto'}
                                            onChange={e => handleElementChange(activeElement.id, { fontFamily: e.target.value })}
                                            className="w-full p-1.5 border rounded text-sm font-mono"
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
                                        <label className="text-[10px] text-gray-400 block mb-1">Conteúdo (Placeholder)</label>
                                        <input
                                            type="text"
                                            value={activeElement.content}
                                            onChange={e => handleElementChange(activeElement.id, { content: e.target.value })}
                                            className="w-full p-1.5 border rounded text-sm font-mono"
                                        />
                                    </div>
                                </>
                            )}
                            {activeElement.type === 'image' && (
                                <>
                                    <div className="col-span-1">
                                        <label className="text-[10px] text-gray-400 block mb-1">Largura</label>
                                        <input
                                            type="number"
                                            value={activeElement.width}
                                            onChange={e => handleElementChange(activeElement.id, { width: parseInt(e.target.value) })}
                                            className="w-full p-1.5 border rounded text-sm font-mono"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-[10px] text-gray-400 block mb-1">Altura</label>
                                        <input
                                            type="number"
                                            value={activeElement.height}
                                            onChange={e => handleElementChange(activeElement.id, { height: parseInt(e.target.value) })}
                                            className="w-full p-1.5 border rounded text-sm font-mono"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                <div className="p-4 border-t border-gray-200">
                    <button
                        onClick={saveTemplate}
                        disabled={loading}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Salvando...' : <><Save size={18} /> Salvar Template</>}
                    </button>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 overflow-auto bg-gray-200 flex items-center justify-center p-10 relative">

                {/* Scale controls */}
                <div className="absolute top-4 right-4 bg-white/80 backdrop-blur rounded-lg p-2 shadow-sm flex items-center gap-2 z-10">
                    <Monitor size={16} className="text-gray-500" />
                    <span className="text-xs font-bold text-gray-600">Visualização</span>
                </div>

                <div
                    className="bg-white shadow-2xl relative overflow-hidden select-none"
                    style={{
                        width: CANVAS_WIDTH * SCALE,
                        height: CANVAS_HEIGHT * SCALE,
                        transformOrigin: 'center',
                    }}
                >
                    {/* Background Layer */}
                    <div className="absolute inset-0 bg-gray-300 flex items-center justify-center text-gray-400">
                        {bgImage ? (
                            <img src={bgImage} className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-center font-bold opacity-30">
                                BACKGROUND PADRÃO<br />(Visualização)
                            </div>
                        )}
                    </div>

                    {/* Rendering Elements */}
                    {elements.sort((a, b) => a.zIndex - b.zIndex).map(el => (
                        <motion.div
                            drag
                            dragMomentum={false}
                            key={el.id}
                            onDragEnd={(_, info) => {
                                // Calculate new position based on drag delta relative to current scaled canvas
                                // This is tricky with scale. A simpler approach is to rely on visual drag for simple moves
                                // and assume user fine tunes with inputs. 
                                // Proper implementation would calculate bounding client rects.
                                // For MVP fast dev, let's update state with an approx delta.
                                const deltaX = info.offset.x / SCALE;
                                const deltaY = info.offset.y / SCALE;
                                handleElementChange(el.id, { x: Math.round(el.x + deltaX), y: Math.round(el.y + deltaY) });
                            }}
                            onClick={(e) => { e.stopPropagation(); setActiveElementId(el.id); }}
                            className={`absolute hover:outline hover:outline-2 hover:outline-blue-400 ${activeElementId === el.id ? 'outline outline-2 outline-blue-600 z-[100]' : ''}`}
                            style={{
                                left: el.x * SCALE,
                                top: el.y * SCALE,
                                width: el.width ? el.width * SCALE : 'auto',
                                height: el.height ? el.height * SCALE : 'auto',
                                fontSize: el.fontSize ? el.fontSize * SCALE : undefined,
                                color: el.color,
                                fontFamily: el.fontFamily || 'Arial',
                                textAlign: el.align || 'left',
                                transform: 'translate(-50%, -50%)', // Centered anchor
                                whiteSpace: 'nowrap',
                                cursor: 'move'
                            }}
                        >
                            {el.type === 'image' ? (
                                <div className="w-full h-full bg-gray-200/50 border border-gray-400/30 flex items-center justify-center relative overflow-hidden"
                                    style={{ borderRadius: (el.borderRadius || 0) * SCALE }}
                                >
                                    {el.content === 'player_photo' ? <img src="https://ui-avatars.com/api/?name=Jogador&background=random&size=512" className="w-full h-full object-cover" /> :
                                        el.content?.includes('team') ? <div className="text-[10px] font-bold">Logo</div> : null}
                                </div>
                            ) : (
                                <span>{el.content}</span>
                            )}

                            {/* Visual Label on Hover */}
                            <div className="absolute -top-6 left-0 bg-blue-600 text-white text-[8px] px-1 rounded opacity-0 hover:opacity-100 whitespace-nowrap pointer-events-none">
                                {el.label} (X:{el.x}, Y:{el.y})
                            </div>
                        </motion.div>
                    ))}

                    {/* Grid/Guides could go here */}
                </div>
            </div>

            {/* Shortcuts / Help */}
            <div className="absolute bottom-4 right-4 bg-white p-4 rounded-xl shadow-lg border border-gray-100 max-w-xs">
                <h4 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2">
                    <Smartphone size={16} /> Modo Admin
                </h4>
                <p className="text-xs text-gray-500">
                    Arraste os elementos para posicionar. Use o painel lateral para ajuste fino (cores, tamanho).
                    As alterações são salvas para todos os esportes ao clicar em Salvar.
                </p>
            </div>
        </div>
    );
}
