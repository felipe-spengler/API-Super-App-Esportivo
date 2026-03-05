import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Save, Upload, Type, Image as ImageIcon, Layout, Move,
    Plus, Trash2, Smartphone, Monitor, X, ChevronDown,
    ChevronRight, ArrowLeft, Wand2, Download
} from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

// Default canvas size (Stories 9:16)
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;
const SCALE = 0.35;

interface Element {
    id: string;
    type: 'text' | 'image';
    x: number;
    y: number;
    width?: number;
    height?: number;
    fontSize?: number;
    color?: string;
    fontFamily?: string;
    align?: 'left' | 'center' | 'right';
    content?: string;
    label: string;
    zIndex: number;
    backgroundColor?: string;
    borderRadius?: number;
}

const TEMPLATE_CONFIRMED: Element[] = [
    { id: 'athlete_photo', type: 'image', x: 540, y: 700, width: 850, height: 850, label: 'Foto do Atleta', zIndex: 1, content: 'athlete_photo', borderRadius: 0 },
    { id: 'athlete_name', type: 'text', x: 540, y: 1200, fontSize: 80, color: '#FFB700', align: 'center', label: 'Nome do Atleta', zIndex: 2, content: '{ATLETA}', fontFamily: 'Roboto-Bold' },
    { id: 'confirmed_label', type: 'text', x: 540, y: 1300, fontSize: 50, color: '#FFFFFF', align: 'center', label: 'Texto Confirmado', zIndex: 2, content: 'ATLETA CONFIRMADO', fontFamily: 'Roboto' },
    { id: 'category', type: 'text', x: 540, y: 1400, fontSize: 35, color: '#FFB700', align: 'center', label: 'Categoria', zIndex: 2, content: '{CATEGORIA}', fontFamily: 'Roboto' },
    { id: 'event_name', type: 'text', x: 540, y: 1650, fontSize: 45, color: '#FFFFFF', align: 'center', label: 'Nome do Evento', zIndex: 2, content: '{EVENTO}', fontFamily: 'Roboto-Bold' },
    { id: 'date_time', type: 'text', x: 540, y: 1720, fontSize: 30, color: '#FFFFFF', align: 'center', label: 'Data e Hora', zIndex: 2, content: '{DATA} - {HORA}', fontFamily: 'Roboto' },
    { id: 'location', type: 'text', x: 540, y: 1770, fontSize: 25, color: '#FFFFFF', align: 'center', label: 'Local', zIndex: 2, content: '{LOCAL}', fontFamily: 'Roboto' },
];

const TEMPLATE_PLACEMENT: Element[] = [
    { id: 'athlete_photo', type: 'image', x: 540, y: 700, width: 850, height: 850, label: 'Foto do Atleta', zIndex: 1, content: 'athlete_photo', borderRadius: 0 },
    { id: 'rank_number', type: 'text', x: 540, y: 1100, fontSize: 200, color: '#FFD700', align: 'center', label: 'Colocação (1, 2, 3...)', zIndex: 3, content: '{COLOCACAO}', fontFamily: 'Roboto-Bold' },
    { id: 'athlete_name', type: 'text', x: 540, y: 1250, fontSize: 70, color: '#FFFFFF', align: 'center', label: 'Nome do Atleta', zIndex: 2, content: '{ATLETA}', fontFamily: 'Roboto-Bold' },
    { id: 'category', type: 'text', x: 540, y: 1350, fontSize: 40, color: '#FFB700', align: 'center', label: 'Categoria', zIndex: 2, content: '{CATEGORIA}', fontFamily: 'Roboto' },
    { id: 'event_name', type: 'text', x: 540, y: 1650, fontSize: 45, color: '#FFFFFF', align: 'center', label: 'Nome do Evento', zIndex: 2, content: '{EVENTO}', fontFamily: 'Roboto-Bold' },
];

export function IndividualArtEditor() {
    const { id: championshipId } = useParams();
    const navigate = useNavigate();
    const [elements, setElements] = useState<Element[]>([]);
    const [activeElementId, setActiveElementId] = useState<string | null>(null);
    const [templateName, setTemplateName] = useState('Atleta Confirmado');
    const [bgImage, setBgImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [persistedBgUrl, setPersistedBgUrl] = useState<string | null>(null);

    useEffect(() => {
        loadTemplate();
    }, [templateName, championshipId]);

    const loadTemplate = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/art-templates', {
                params: {
                    name: templateName,
                    championship_id: championshipId,
                    type: 'individual'
                }
            });

            if (res.data && res.data.elements) {
                setElements(res.data.elements);
                setBgImage(res.data.bg_url || res.data.preview_bg_url);
                setPersistedBgUrl(res.data.bg_url);
            } else {
                setElements(templateName === 'Atleta Confirmado' ? TEMPLATE_CONFIRMED : TEMPLATE_PLACEMENT);
                setBgImage(null);
            }
        } catch (error) {
            console.error("Erro ao carregar template", error);
            setElements(templateName === 'Atleta Confirmado' ? TEMPLATE_CONFIRMED : TEMPLATE_PLACEMENT);
        } finally {
            setLoading(false);
        }
    };

    const saveTemplate = async () => {
        setLoading(true);
        try {
            await api.post('/admin/art-templates', {
                name: templateName,
                bg_url: persistedBgUrl,
                elements: elements,
                canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
                championship_id: championshipId,
                type: 'individual'
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
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', 'art-backgrounds');

        const toastId = toast.loading('Enviando fundo...');
        try {
            const res = await api.post('/admin/upload-image', formData);
            if (res.data && res.data.url) {
                setBgImage(res.data.url);
                setPersistedBgUrl(res.data.url);
                toast.success('Fundo atualizado!', { id: toastId });
            }
        } catch (err) {
            toast.error('Erro ao enviar imagem', { id: toastId });
        }
    };

    const handleElementChange = (id: string, updates: Partial<Element>) => {
        setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
    };

    const activeElement = elements.find(el => el.id === activeElementId);

    const CanvasRenderer = ({ scale = 1, interactable = false }) => (
        <div
            className="bg-white shadow-2xl relative overflow-hidden select-none"
            style={{
                width: CANVAS_WIDTH * scale,
                height: CANVAS_HEIGHT * scale,
            }}
            onClick={() => interactable && setActiveElementId(null)}
        >
            <div className="absolute inset-0 bg-slate-200">
                {bgImage ? (
                    <img src={bgImage} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20 bg-slate-900 text-white font-black text-4xl whitespace-pre text-center px-10">
                        {templateName.toUpperCase()}\nUPLOAD FUNDO
                    </div>
                )}
            </div>

            {elements.sort((a, b) => a.zIndex - b.zIndex).map(el => (
                <motion.div
                    key={el.id}
                    drag={interactable}
                    dragMomentum={false}
                    onDragEnd={(_, info) => {
                        if (!interactable) return;
                        const dx = info.offset.x / scale;
                        const dy = info.offset.y / scale;
                        handleElementChange(el.id, { x: Math.round(el.x + dx), y: Math.round(el.y + dy) });
                    }}
                    onClick={(e) => {
                        if (!interactable) return;
                        e.stopPropagation();
                        setActiveElementId(el.id);
                    }}
                    className={`absolute flex items-center justify-center ${activeElementId === el.id ? 'ring-4 ring-blue-500 z-50 shadow-2xl' : ''}`}
                    style={{
                        left: el.x * scale,
                        top: el.y * scale,
                        width: el.width ? el.width * scale : 'auto',
                        height: el.height ? el.height * scale : 'auto',
                        fontSize: el.fontSize ? el.fontSize * scale : undefined,
                        color: el.color,
                        fontFamily: el.fontFamily || 'Roboto',
                        textAlign: el.align || 'center',
                        transform: 'translate(-50%, -50%)',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.1,
                        cursor: interactable ? 'move' : 'default',
                        pointerEvents: interactable ? 'auto' : 'none'
                    }}
                >
                    {el.type === 'image' ? (
                        <div className="w-full h-full bg-slate-300/30 border border-white/20 flex items-center justify-center relative backdrop-blur-sm overflow-hidden"
                            style={{ borderRadius: (el.borderRadius || 0) * scale }}>
                            <img src="https://ui-avatars.com/api/?name=Atleta&background=random&size=512" className="w-full h-full object-cover opacity-80" />
                        </div>
                    ) : (
                        <span>{el.content}</span>
                    )}
                </motion.div>
            ))}
        </div>
    );

    return (
        <div className="flex h-[calc(100vh-64px)] bg-slate-100 overflow-hidden font-sans">
            <style>{`
                @font-face { font-family: 'Roboto-Bold'; src: url('${api.defaults.baseURL}/assets-fonts/Roboto-Bold.ttf'); }
                @font-face { font-family: 'Roboto'; src: url('${api.defaults.baseURL}/assets-fonts/Roboto.ttf'); }
            `}</style>

            {/* Sidebar Left */}
            <div className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-lg z-20 overflow-hidden shrink-0">
                <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400">
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="font-black text-slate-900 flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-emerald-500" /> Editor Indiv.
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Template</label>
                        <select
                            value={templateName}
                            onChange={e => setTemplateName(e.target.value)}
                            className="w-full p-3 border border-slate-200 rounded-xl font-bold bg-white text-slate-700"
                        >
                            <option>Atleta Confirmado</option>
                            <option>Colocação do Atleta</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Fundo Personalizado</label>
                        <label className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-all text-slate-500 hover:text-emerald-500 hover:border-emerald-500">
                            <Upload size={24} />
                            <span className="text-xs font-black uppercase">Upload imagem</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleBgUpload} />
                        </label>
                    </div>

                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Elementos ({elements.length})</label>
                        <div className="space-y-2">
                            {elements.map(el => (
                                <button
                                    key={el.id}
                                    onClick={() => setActiveElementId(el.id)}
                                    className={`w-full p-3 rounded-xl border flex items-center gap-3 text-left transition-all ${activeElementId === el.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
                                >
                                    {el.type === 'image' ? <ImageIcon size={16} /> : <Type size={16} />}
                                    <span className="text-xs font-bold truncate flex-1">{el.label}</span>
                                    {activeElementId === el.id && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <button
                        onClick={saveTemplate}
                        className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                        <Save size={20} /> SALVAR TEMPLATE
                    </button>
                    <button
                        onClick={() => setPreviewMode(true)}
                        className="w-full py-3 mt-2 bg-emerald-100 text-emerald-700 font-black rounded-xl hover:bg-emerald-200 transition-all flex items-center justify-center gap-2 text-xs"
                    >
                        <Monitor size={16} /> VISUALIZAR EM HD
                    </button>
                </div>
            </div>

            {/* Main Canvas Container */}
            <div className="flex-1 overflow-auto bg-slate-200 flex items-center justify-center p-10 relative">
                <div style={{ transform: `scale(${SCALE})`, transformOrigin: 'center' }} className="shadow-2xl">
                    <CanvasRenderer scale={1} interactable={true} />
                </div>

                {activeElement && (
                    <div className="fixed right-8 top-1/2 -translate-y-1/2 w-72 bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-6 animate-in slide-in-from-right-10 duration-300">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <h3 className="font-black text-slate-900 text-sm">{activeElement.label}</h3>
                            <button onClick={() => setActiveElementId(null)} className="text-slate-300 hover:text-slate-900"><X size={20} /></button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">X</label>
                                    <input type="number" value={activeElement.x} onChange={e => handleElementChange(activeElement.id, { x: parseInt(e.target.value) })} className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg font-mono font-bold text-xs" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Y</label>
                                    <input type="number" value={activeElement.y} onChange={e => handleElementChange(activeElement.id, { y: parseInt(e.target.value) })} className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg font-mono font-bold text-xs" />
                                </div>
                            </div>

                            {activeElement.type === 'text' && (
                                <>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tamanho da Fonte</label>
                                        <input type="number" value={activeElement.fontSize} onChange={e => handleElementChange(activeElement.id, { fontSize: parseInt(e.target.value) })} className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg font-black text-xs" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Cor do Texto</label>
                                        <input type="color" value={activeElement.color} onChange={e => handleElementChange(activeElement.id, { color: e.target.value })} className="w-full h-10 rounded-lg cursor-pointer border-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Alinhamento</label>
                                        <div className="flex p-1 bg-slate-50 rounded-xl border border-slate-100">
                                            {(['left', 'center', 'right'] as const).map(a => (
                                                <button key={a} onClick={() => handleElementChange(activeElement.id, { align: a })} className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeElement.align === a ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>
                                                    {a}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeElement.type === 'image' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">L</label>
                                        <input type="number" value={activeElement.width} onChange={e => handleElementChange(activeElement.id, { width: parseInt(e.target.value) })} className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg font-black text-xs" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">A</label>
                                        <input type="number" value={activeElement.height} onChange={e => handleElementChange(activeElement.id, { height: parseInt(e.target.value) })} className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg font-black text-xs" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            {previewMode && (
                <div className="fixed inset-0 z-50 bg-slate-900/95 flex items-center justify-center p-10 backdrop-blur-xl animate-in fade-in duration-300">
                    <button onClick={() => setPreviewMode(false)} className="absolute top-10 right-10 text-white/50 hover:text-white transition-all"><X size={48} /></button>
                    <div style={{ transform: `scale(${Math.min(window.innerHeight / CANVAS_HEIGHT * 0.9, window.innerWidth / CANVAS_WIDTH * 0.9)})`, transformOrigin: 'center' }}>
                        <CanvasRenderer scale={1} interactable={false} />
                    </div>
                </div>
            )}
        </div>
    );
}
