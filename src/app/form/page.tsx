"use client";
import { useEffect, useMemo, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import EditableText from '@/app/_components/EditableText';
import ImageUpload from '@/app/_components/ImageUpload';
import Modal from '@/app/_components/Modal';
import { CAN_EDIT_FORM_FIELDS } from '@/types';
import Ajv2020 from 'ajv/dist/2020';
import type { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import formSchema from '@/lib/schemas/form.schema.json';
import {
	participacionCirculoOptions,
	participacionExperienciasOptions,
	dimensionesCalidadVida,
	objetivoFocos,
	objetivoEstrategias,
	escuchaPreferencias,
	escuchaAreasInteres,
	nivelesAutonomia,
	prevalenciasEmocionales,
	expresionEmocionalGeneral,
	vinculoEntorno,
	bienestarSubjetivo,
	regulacionEmocional,
	situacionesInfluyen,
	estrategiasAcompanamiento,
	tecnicasAutorregulacion,
	apoyosOpciones,
	ajustesOpciones,
	contextosApoyo,
	logrosOpciones,
	metasOpciones,
	recursosOpciones,
	areasPrioritarias,
	recomendacionesOpciones,
	nuevasExperiencias,
	tipoApoyoExperiencias,
	motivosNoParticipa,
	involucramientoCirculo,
	acompanaronMayorCompromiso,
	respetoDecisionesOpciones,
	integrantesCirculoTipos
} from '@/lib/form/options';
import { getTooltip } from '@/lib/form/tooltips';

// --- Subcomponentes extraídos para evitar pérdida de foco ---

const OptionNote = ({ path, option, value, data, onChange }: { path: string; option: string; value: string, data: any, onChange: (path: string, val: any) => void }) => {
	const [editing, setEditing] = useState(false);
	const [note, setNote] = useState(value || '');
	const [mounted, setMounted] = useState(false);
	const [error, setError] = useState('');
	const notesPath = path + 'Notas';
	const noteKey = option;

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (mounted) {
			setNote(value || '');
		}
	}, [value, mounted]);

	const closeModal = () => {
		setEditing(false);
		setNote(value || '');
		setError('');
	};

	const onSave = () => {
		if (!note.trim()) {
			setError('Este detalle es obligatorio.');
			return;
		}
		const keys = notesPath.split('.');
		let currentNotes: any = {};
		let cur: any = data;
		for (const k of keys) {
			cur = cur?.[k];
		}
		if (cur && typeof cur === 'object') {
			currentNotes = { ...cur };
		}
		currentNotes[noteKey] = note.trim();
		onChange(notesPath, currentNotes);
		setEditing(false);
		setError('');
	};

	const onDelete = () => {
		const keys = notesPath.split('.');
		let currentNotes: any = {};
		let cur: any = data;
		for (const k of keys) {
			cur = cur?.[k];
		}
		if (cur && typeof cur === 'object') {
			currentNotes = { ...cur };
		}
		delete currentNotes[noteKey];
		if (Object.keys(currentNotes).length > 0) {
			onChange(notesPath, currentNotes);
		} else {
			onChange(notesPath, {});
		}
		setEditing(false);
		setNote('');
		setError('');
	};

	if (!mounted) return null;

	if (!editing) {
		return (
			<span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
				{value && (
					<span style={{ background: '#eef2ff', color: '#4338ca', borderRadius: 6, padding: '4px 8px', fontSize: 13, lineHeight: 1.3, whiteSpace: 'pre-line' }}>
						{value}
					</span>
				)}
				<button
					type="button"
					onClick={() => setEditing(true)}
					style={{ background: '#fff', border: '1px solid rgba(79,70,229,0.4)', borderRadius: 999, cursor: 'pointer', padding: '4px 10px', fontSize: 12, color: '#4338ca', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}
					title={value ? 'Editar detalle' : 'Agregar detalle'}
				>
					<span aria-hidden="true">✎</span>
					<span>{value ? 'Editar detalle' : 'Agregar detalle'}</span>
				</button>
				{!value && <span style={{ fontSize: 12, color: '#b91c1c' }}>Completar el detalle para esta selección.</span>}
			</span>
		);
	}

	return (
		<>
			<div className="option-note-modal" onClick={(e) => { if (e.currentTarget === e.target) { closeModal(); } }}>
				<div className="ga-card" style={{ padding: 12, minWidth: 300, maxWidth: 500 }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
						<b>Agregar nota: {option}</b>
						<button type="button" className="ga-btn" onClick={closeModal}>✕</button>
					</div>
					<textarea value={note} onChange={(e) => setNote(e.target.value)} className="ga-textarea-large" placeholder="Agrega detalles adicionales..." rows={4} />
					{error && <div style={{ color: '#b91c1c', marginTop: 4, fontSize: 13 }}>{error}</div>}
					<div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
						<button type="button" className="ga-btn primary" onClick={onSave}>Guardar</button>
						{value && <button type="button" className="ga-btn" onClick={onDelete} style={{ background: '#fee' }}>Eliminar</button>}
						<button type="button" className="ga-btn" onClick={closeModal}>Cancelar</button>
					</div>
				</div>
			</div>
			<style>{`.option-note-modal{position:fixed;inset:0;background:rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;z-index:1000}`}</style>
		</>
	);
};

const CheckboxGroup = ({ label, path, options, showNotes = false, data, onChange, setOtroModal, otroPaths }: { label: ReactNode; path: string; options: string[]; showNotes?: boolean, data: any, onChange: (path: string, val: any) => void, setOtroModal: any, otroPaths: any }) => {
	const values: string[] = useMemo(() => {
		const keys = path.split('.');
		let cur: any = data;
		for (const k of keys) cur = cur?.[k];
		return Array.isArray(cur) ? cur : [];
	}, [data, path]);
	
	const getNote = (opt: string) => {
		const notesPath = path + 'Notas';
		const keys = notesPath.split('.');
		let cur: any = data;
		for (const k of keys) cur = cur?.[k];
		return cur?.[opt] || '';
	};

	const getOtroValue = () => {
		const otroPath = otroPaths[path];
		if (!otroPath) return '';
		const keys = otroPath.split('.');
		let cur: any = data;
		for (const k of keys) cur = cur?.[k];
		return typeof cur === 'string' ? cur : '';
	};
	
	const toggle = (opt: string) => {
		const isOtro = opt === 'Otro' || opt === 'Otra' || opt === 'Otro/Observaciones';
		if (isOtro && !values.includes(opt)) {
			const otroPath = otroPaths[path];
			if (otroPath) {
				setOtroModal({ path: otroPath, option: opt, isOpen: true, value: getOtroValue() });
				return;
			}
		}
		const next = values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt];
		onChange(path, next);
		if (isOtro && !next.includes(opt)) {
			const otroPath = otroPaths[path];
			if (otroPath) onChange(otroPath, '');
		}
	};
	
	return (
		<div style={{ margin: '8px 0' }}>
			<b>{label}</b>
			<div className="ga-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10, marginTop: 6 }}>
				{options.map((op, idx) => {
					const id = `${path.replace(/\./g,'-')}-${idx}`;
					const isSelected = values.includes(op);
					const note = getNote(op);
					return (
						<div key={op} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, borderRadius: 10, border: isSelected ? '1px solid #93c5fd' : '1px solid var(--border)', background: isSelected ? '#f0f7ff' : '#fff', boxShadow: isSelected ? '0 0 0 1px rgba(59,130,246,0.15)' : 'none' }}>
							<label htmlFor={id} style={{ cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
								<input id={id} type="checkbox" checked={isSelected} onChange={() => toggle(op)} style={{ marginTop: 4 }} />
								<span style={{ flex: 1 }}>{op}</span>
								{getTooltip(op) && <span className="ga-help" title={getTooltip(op) || ''}>i</span>}
							</label>
							{isSelected && showNotes && (
								<div>
									<OptionNote path={path} option={op} value={note} data={data} onChange={onChange} />
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
};

const Select = ({ label, path, options, data, onChange, canEditFields }: { label: ReactNode; path: string; options: string[], data: any, onChange: (path: string, val: any) => void, canEditFields: boolean }) => {
	const isDisabled = !canEditFields && path.startsWith('datosGenerales.');
	const value: string = useMemo(() => {
		const keys = path.split('.');
		let cur: any = data;
		for (const k of keys) cur = cur?.[k];
		return typeof cur === 'string' ? cur : '';
	}, [data, path]);
	return (
		<label style={{ display: 'block', margin: '8px 0' }}>{label}<br />
			<select className="ga-select" value={value} onChange={(e) => onChange(path, e.target.value)} disabled={isDisabled}>
				<option value="">Seleccione…</option>
				{options.map((op) => <option key={op} value={op}>{op}</option>)}
			</select>
		</label>
	);
};

const SectionComment = ({ path, label, data, onChange }: { path: string, label?: string, data: any, onChange: (path: string, val: any) => void }) => {
	const value = getValueByPath(data, path) || '';
	return (
		<div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #eee' }}>
			<label style={{ display: 'block' }}>
				<b style={{ color: '#1a365d' }}>{label || 'Comentario de personalización (Obligatorio)'}</b>
				<p style={{ fontSize: 12, color: '#666', marginTop: 4, marginBottom: 8 }}>
					Agregue una descripción personalizada de este período para el joven. Evite frases genéricas.
				</p>
				<textarea className={`ga-textarea-large ${!value.trim() ? 'ga-input-error' : ''}`} rows={4} value={value} onChange={(e) => onChange(path, e.target.value)} placeholder="Ej: Durante este mes, [Nombre] ha mostrado un gran avance en..." />
				{!value.trim() && <small style={{ color: '#d00', fontWeight: 500 }}>Este comentario es obligatorio para individualizar el informe.</small>}
			</label>
		</div>
	);
};

const INITIAL_TEXT_MARCO = `Se acompaña al joven en la construcción y logro de sus metas personales, considerando las dimensiones de su calidad de vida y brindando los apoyos necesarios para el desarrollo de habilidades como la toma de decisiones, la planificación, la autorregulación emocional y la participación activa. Este proceso se realiza de manera progresiva, respetando sus tiempos, promoviendo su autonomía y fortaleciendo su protagonismo en la toma de decisiones sobre su vida.`;

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(formSchema as any);

const initialData: any = {
	datosGenerales: { nombreCompleto: '', periodo: '', numeroLegajo: '', facilitadorNombre: '', metaSueño: '', fotoJoven: '' },
	objetivo: { textoMarco: INITIAL_TEXT_MARCO, focosComentario: '', estrategiasComentario: '', comentario: '' },
	escucha: { preferenciasComentario: '', areasInteresComentario: '', comentario: '' },
	estadoEmocional: { situacionesComentario: '', estrategiasComentario: '', autorregulacionComentario: '', comentario: '' },
	apoyosAjustes: { apoyosComentario: '', ajustesComentario: '', comentario: '' },
	evaluacion: { dimensiones: dimensionesCalidadVida.map((d) => ({ dimension: d })) },
	logros: { items: [], comentario: '' },
	logrosImagenes: [],
	suenosMetas: { metasComentario: '', recursosComentario: '', comentario: '' },
	experiencias: { tiposComentario: '', apoyoComentario: '', comentario: '' },
	circuloApoyo: { valoracion: { grupal: '', individual: '', nombresIndividual: '' }, acompanaronMayorCompromiso: [], comentario: '' },
	sugerencias: { areasComentario: '', recomendacionesComentario: '', comentario: '' }
};

const friendlyFieldNames: Record<string, string> = {
	'datosGenerales.nombreCompleto': 'Nombre completo del/la joven',
	'datosGenerales.periodo': 'Período',
	'datosGenerales.numeroLegajo': 'Número de legajo',
	'datosGenerales.obraSocial': 'Obra social',
	'datosGenerales.metaSueño': 'Meta o sueño',
	'circuloApoyo.miembros': 'Integrantes del círculo de apoyo',
	'circuloApoyo.participacion': 'Nivel de participación del círculo',
	'circuloApoyo.acompanaronMayorCompromiso': 'Integrantes con mayor compromiso',
	'objetivo.focos': 'Focos del acompañamiento',
	'objetivo.focosComentario': 'Comentario sobre Focos',
	'objetivo.estrategias': 'Estrategias implementadas',
	'objetivo.estrategiasComentario': 'Comentario sobre Estrategias',
	'escucha.preferencias': 'Preferencias / decisiones',
	'escucha.preferenciasComentario': 'Comentario sobre Preferencias',
	'escucha.areasInteres': 'Áreas de interés',
	'escucha.areasInteresComentario': 'Comentario sobre Áreas de interés',
	'estadoEmocional.prevalencias': 'Prevalencias emocionales',
	'estadoEmocional.expresionGeneral': 'Expresión emocional general',
	'estadoEmocional.regulacion': 'Regulación emocional',
	'estadoEmocional.situacionesComentario': 'Comentario sobre Situaciones que influyeron',
	'estadoEmocional.estrategiasComentario': 'Comentario sobre Estrategias de acompañamiento',
	'estadoEmocional.autorregulacionComentario': 'Comentario sobre Técnicas de autorregulación',
	'apoyosAjustes.apoyos': 'Apoyos',
	'apoyosAjustes.apoyosComentario': 'Comentario sobre Apoyos',
	'apoyosAjustes.ajustesComentario': 'Comentario sobre Ajustes',
	'evaluacion.dimensiones': 'Dimensiones de evaluación',
	'logros.items': 'Logros',
	'logros.comentario': 'Comentario sobre Logros',
	'sugerencias.areasPrioritarias': 'Áreas prioritarias',
	'sugerencias.areasComentario': 'Comentario sobre Áreas prioritarias',
	'sugerencias.recomendaciones': 'Recomendaciones',
	'sugerencias.recomendacionesComentario': 'Comentario sobre Recomendaciones'
};

const checkboxPathsRequireNotes: string[] = [];

const normalizePath = (instancePath: string, error?: ErrorObject) => {
	let path = instancePath.replace(/^\//, '').replace(/\//g, '.');
	const params: any = error?.params || {};
	if (error?.keyword === 'required' && typeof params.missingProperty === 'string') {
		path = path ? `${path}.${params.missingProperty}` : params.missingProperty;
	}
	return path;
};

const getValueByPath = (root: any, path: string) => {
	if (!path) return root;
	const keys = path.split('.');
	let cur: any = root;
	for (const k of keys) {
		cur = cur?.[k];
	}
	return cur;
};

const getReadableLabel = (path: string) => {
	if (friendlyFieldNames[path]) return friendlyFieldNames[path];
	if (!path) return 'Formulario';
	return path
		.split('.')
		.filter(Boolean)
		.map((segment) => {
			if (/^\d+$/.test(segment)) {
				return `elemento ${Number(segment) + 1}`;
			}
			return segment
				.replace(/([A-Z])/g, ' $1')
				.replace(/_/g, ' ')
				.replace(/^./, (c) => c.toUpperCase());
		})
		.join(' › ');
};

const formatAjvError = (error: ErrorObject): string => {
	const normalizedPath = normalizePath(error.instancePath || '', error);
	const label = getReadableLabel(normalizedPath);
	switch (error.keyword) {
		case 'required':
			return `El campo "${label}" es obligatorio.`;
		case 'minLength':
			return `El campo "${label}" no puede quedar vacío.`;
		case 'format':
			return `El campo "${label}" tiene un formato inválido.`;
		case 'type':
		case 'enum':
			return `El valor ingresado en "${label}" no es válido.`;
		default:
			return `Revisá "${label}": ${error.message}`;
	}
};

function FormContent() {
	const { data: session } = useSession();
	const router = useRouter();
	
	const [data, setData] = useState<any>(initialData);
	const [loadingFormData, setLoadingFormData] = useState(false);

	const [errors, setErrors] = useState<string[]>([]);
	const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
	const [apiResp, setApiResp] = useState<any>(null);
	const [youngs, setYoungs] = useState<any[]>([]);
	const [hints, setHints] = useState<any>({});
	const [toasts, setToasts] = useState<{ id: number; type: 'success'|'error'|'info'; text: string; expiresAt?: number }[]>([]);
	const [modalOpen, setModalOpen] = useState<{ key: string; isOpen: boolean }>({ key: '', isOpen: false });
	const [otroModal, setOtroModal] = useState<{ path: string; option: string; isOpen: boolean; value: string }>({ path: '', option: '', isOpen: false, value: '' });
	const [previewModal, setPreviewModal] = useState<{ isOpen: boolean; html: string }>({ isOpen: false, html: '' });
	const [step, setStep] = useState(0);
	const [generating, setGenerating] = useState(false);
	const [currentFormId, setCurrentFormId] = useState<string | null>(null);
	const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const lastSavedDataRef = useRef<string>('');
	const lastToastRef = useRef<number>(0);
	
	const userRole = (session?.user as any)?.role || 'FACILITADOR';
	const canEditFields = CAN_EDIT_FORM_FIELDS.includes(userRole as any);
	const readyToGenerate = useMemo(() => !!(data?.datosGenerales?.nombreCompleto && data?.datosGenerales?.periodo), [data]);
	const sectionStyle = (n: number) => (step === n ? {} : { display: 'none' as const });
	const circuloVinculosDatalistId = 'form-circulo-vinculos';
	
	const addToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
		const id = Date.now();
		if (Date.now() - lastToastRef.current < 2000 && toasts.some(t => t.text === text)) return;
		
		lastToastRef.current = Date.now();
		setToasts(prev => [{ id, type, text }, ...prev]);
		
		setTimeout(() => {
			setToasts(prev => prev.filter(t => t.id !== id));
		}, 5000);
	};

	useEffect(() => { 
		const loadHints = async () => {
			try {
				const r = await fetch('/api/docs/hints');
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				const h = await r.json();
				setHints(h);
			} catch (err) {
				console.error('Error cargando hints:', err);
				addToast('Error al cargar sugerencias (hints)', 'error');
			}
		};
		loadHints();
	}, []);

	useEffect(() => {
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
		}

		const dataString = JSON.stringify(data);
		
		if (dataString === lastSavedDataRef.current) {
			return;
		}

		if (!data?.datosGenerales?.nombreCompleto || !data?.datosGenerales?.periodo) {
			try {
				localStorage.setItem('formData', dataString);
			} catch (e) {
				console.error('Error guardando en localStorage:', e);
			}
			return;
		}

		setSaving('saving');

		try {
			localStorage.setItem('formData', dataString);
		} catch (e) {
			console.error('Error guardando en localStorage:', e);
		}

		saveTimeoutRef.current = setTimeout(async () => {
			try {
				const url = '/api/forms';
				const method = currentFormId ? 'PUT' : 'POST';
				const body = currentFormId 
					? JSON.stringify({ id: currentFormId, data })
					: JSON.stringify({ data, saveAsDraft: true });

				const res = await fetch(url, {
					method,
					headers: { 'Content-Type': 'application/json' },
					body
				});

				if (!res.ok) {
					const errBody = await res.json().catch(() => ({}));
					throw new Error(errBody.error || `HTTP ${res.status}`);
				}

				const result = await res.json();
				if (result.id && !currentFormId) {
					setCurrentFormId(result.id);
				}

				lastSavedDataRef.current = dataString;
				setSaving('saved');
				
				setTimeout(() => setSaving('idle'), 2000);
			} catch (err: any) {
				console.error('Error en guardado automático:', err);
				setSaving('error');
				addToast(`Error en guardado automático: ${err.message}`, 'error');
				setTimeout(() => setSaving('idle'), 3000);
			}
		}, 2000);

		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, [data, currentFormId]);

	useEffect(() => {
		const loadYoungs = async () => {
			try {
				const r = await fetch('/api/youngs');
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				const j = await r.json();
				setYoungs(j.items || []);
			} catch (err) {
				console.error('Error cargando jóvenes:', err);
				addToast('Error al cargar lista de jóvenes', 'error');
			}
		};
		loadYoungs();
	}, []);

	useEffect(() => {
		const youngId = data?.datosGenerales?.youngId;
		
		if (!youngId) {
			setData((prev: any) => ({
				...prev,
				datosGenerales: {
					...(prev?.datosGenerales || {}),
					nombreCompleto: '',
					fotoJoven: '',
					numeroLegajo: '',
					obraSocial: '',
					fechaNacimiento: '',
					youngId: ''
				},
				circuloApoyo: {
					...(prev?.circuloApoyo || {}),
					miembros: []
				}
			}));
			return;
		}

		const selectedYoung = youngs.find((y: any) => y && String(y._id || y.id) === String(youngId));
		if (selectedYoung) {
			setData((prev: any) => {
				const next = { ...prev };
				if (!next.datosGenerales) next.datosGenerales = {};
				
				if (selectedYoung.nombreCompleto) {
					next.datosGenerales.nombreCompleto = selectedYoung.nombreCompleto;
				}
				
				if (selectedYoung.foto) {
					next.datosGenerales.fotoJoven = selectedYoung.foto;
				}

				if (selectedYoung.legajo) {
					next.datosGenerales.numeroLegajo = selectedYoung.legajo;
				}

				if (selectedYoung.obraSocial) {
					next.datosGenerales.obraSocial = selectedYoung.obraSocial;
				}

				if (selectedYoung.fechaNacimiento) {
					const fecha = typeof selectedYoung.fechaNacimiento === 'string' 
						? selectedYoung.fechaNacimiento.split('T')[0]
						: new Date(selectedYoung.fechaNacimiento).toISOString().split('T')[0];
					next.datosGenerales.fechaNacimiento = fecha;
				}

				if (selectedYoung.circuloApoyo && Array.isArray(selectedYoung.circuloApoyo) && selectedYoung.circuloApoyo.length > 0) {
					if (!next.circuloApoyo) next.circuloApoyo = {};
					if (!next.circuloApoyo.miembros || next.circuloApoyo.miembros.length === 0) {
						next.circuloApoyo.miembros = selectedYoung.circuloApoyo.map((m: any) => ({
							nombre: m.nombre || '',
							vinculo: m.vinculo || ''
						}));
					}
				}

				return next;
			});
			
			addToast(`Datos de ${selectedYoung.nombreCompleto} cargados automáticamente`, 'success');
		}
	}, [data?.datosGenerales?.youngId, youngs]);

	// Auto-completar nombre del facilitador logueado si está vacío
	useEffect(() => {
		if (session?.user?.name) {
			setData((prev: any) => {
				if (prev && prev.datosGenerales && !prev.datosGenerales.facilitadorNombre) {
					return {
						...prev,
						datosGenerales: {
							...prev.datosGenerales,
							facilitadorNombre: session.user.name
						}
					};
				}
				return prev;
			});
		}
	}, [session?.user?.name]);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		
		const urlParams = new URLSearchParams(window.location.search);
		const reportId = urlParams.get('reportId');
		const formId = urlParams.get('formId');
		
		const repairData = (rawData: any) => {
			if (!rawData) return initialData;
			const repaired = { ...rawData };
			if (!repaired.objetivo) repaired.objetivo = {};
			if (!repaired.objetivo.textoMarco) repaired.objetivo.textoMarco = INITIAL_TEXT_MARCO;
			
			// Migrar esquema de logros (antes era array de strings, ahora es objeto con items y comentario)
			if (Array.isArray(repaired.logros)) {
				repaired.logros = { items: repaired.logros, comentario: '' };
			} else if (!repaired.logros || typeof repaired.logros !== 'object') {
				repaired.logros = { items: [], comentario: '' };
			}
			return repaired;
		};

		const loadInitialData = async () => {
			setLoadingFormData(true);
			try {
				if (reportId) {
					const r = await fetch(`/api/reports/${reportId}/to-form`);
					if (!r.ok) throw new Error(`HTTP ${r.status}`);
					const result = await r.json();
					if (result.formData) {
						const repaired = repairData(result.formData);
						setData(repaired);
						if (result.formId) {
							setCurrentFormId(result.formId);
						}
						lastSavedDataRef.current = JSON.stringify(repaired);
						localStorage.setItem('formData', lastSavedDataRef.current);
						addToast(`Informe cargado. Período: ${result.periodo || 'N/A'}`, 'success');
					}
				} else if (formId) {
					setCurrentFormId(formId);
					const r = await fetch(`/api/forms/${formId}/.json`);
					if (!r.ok) throw new Error(`HTTP ${r.status}`);
					const result = await r.json();
					if (result.data) {
						const repaired = repairData(result.data);
						setData(repaired);
						lastSavedDataRef.current = JSON.stringify(repaired);
						localStorage.setItem('formData', lastSavedDataRef.current);
						addToast(`Formulario cargado. Período: ${result.periodo || 'N/A'}`, 'success');
					}
				} else if (urlParams.get('youngId')) {
					const youngIdParam = urlParams.get('youngId');
					const repaired = repairData(initialData);
					if (!repaired.datosGenerales) repaired.datosGenerales = {};
					repaired.datosGenerales.youngId = youngIdParam;
					
					// Auto-completar facilitador si está logueado
					if (session?.user?.name) {
						repaired.datosGenerales.facilitadorNombre = session.user.name;
					}
					
					setData(repaired);
					setCurrentFormId(null);
					lastSavedDataRef.current = JSON.stringify(repaired);
					localStorage.setItem('formData', lastSavedDataRef.current);
					addToast('Iniciando nuevo borrador para el joven', 'info');
				} else {
					const r = await fetch('/api/forms?page=1&pageSize=1');
					if (!r.ok) throw new Error(`HTTP ${r.status}`);
					const result = await r.json();
					if (result.items && result.items.length > 0) {
						const lastForm = result.items[0];
						if (lastForm.data) {
							const repaired = repairData(lastForm.data);
							setData(repaired);
							setCurrentFormId(lastForm._id || lastForm.id);
							lastSavedDataRef.current = JSON.stringify(repaired);
							localStorage.setItem('formData', lastSavedDataRef.current);
							addToast(`Último borrador cargado. Período: ${lastForm.periodo || 'N/A'}`, 'info');
						}
					} else {
						const saved = localStorage.getItem('formData');
						if (saved) {
							const parsed = JSON.parse(saved);
							const repaired = repairData(parsed);
							setData(repaired);
							lastSavedDataRef.current = JSON.stringify(repaired);
						}
					}
				}
			} catch (err: any) {
				console.error('Error cargando datos iniciales:', err);
				addToast(`Error al cargar datos: ${err.message}`, 'error');
				try {
					const saved = localStorage.getItem('formData');
					if (saved) {
						const parsed = JSON.parse(saved);
						const repaired = repairData(parsed);
						setData(repaired);
						lastSavedDataRef.current = JSON.stringify(repaired);
					}
				} catch (e) {}
			} finally {
				setLoadingFormData(false);
			}
		};
		loadInitialData();
	}, []);

	const otroPaths: Record<string, string> = {
		'escucha.areasInteres': 'escucha.areasInteresOtro',
		'objetivo.focos': 'objetivo.focosOtro',
		'objetivo.estrategias': 'objetivo.estrategiasOtro',
		'estadoEmocional.prevalencias': 'estadoEmocional.prevalenciasOtro',
		'estadoEmocional.situacionesInfluyen': 'estadoEmocional.situacionesInfluyenOtro',
		'apoyosAjustes.apoyos': 'apoyosAjustes.apoyosOtro',
		'apoyosAjustes.ajustes': 'apoyosAjustes.ajustesOtro',
		'apoyosAjustes.contextos': 'apoyosAjustes.contextosOtro',
		'logros.items': 'logrosOtro',
		'experiencias.tiposVividas': 'experiencias.tiposVividasOtro',
		'experiencias.tipoApoyo': 'experiencias.tipoApoyoOtro',
		'experiencias.motivosNoParticipa': 'experiencias.motivosNoParticipaOtro',
		'suenosMetas.metas': 'suenosMetas.metasOtro',
		'suenosMetas.recursosNecesarios': 'suenosMetas.recursosNecesariosOtro',
		'circuloApoyo.acompanaronMayorCompromiso': 'circuloApoyo.acompanaronMayorCompromisoOtro',
		'circuloApoyo.respetoDecisiones': 'circuloApoyo.respetoDecisionesOtro',
		'sugerencias.areasPrioritarias': 'sugerencias.areasPrioritariasOtro',
		'sugerencias.recomendaciones': 'sugerencias.recomendacionesOtro',
		'escucha.preferencias': 'escucha.preferenciasOtro'
	};

	const openModal = (key: string) => setModalOpen({ key, isOpen: true });
	const closeModal = () => setModalOpen({ key: '', isOpen: false });

	const saveOtroModal = () => {
		if (!otroModal.value.trim()) {
			alert('Debe especificar el detalle de "Otro". Este campo es obligatorio.');
			return;
		}
		onChange(otroModal.path, otroModal.value.trim());
		
		const arrayPath = Object.keys(otroPaths).find(key => otroPaths[key] === otroModal.path);
		if (arrayPath) {
			const arrayKeys = arrayPath.split('.');
			let cur: any = data;
			for (const k of arrayKeys) cur = cur?.[k];
			const currentValues = Array.isArray(cur) ? cur : [];
			if (!currentValues.includes(otroModal.option)) {
				onChange(arrayPath, [...currentValues, otroModal.option]);
			}
		}
		
		setOtroModal({ path: '', option: '', isOpen: false, value: '' });
		addToast('Campo "Otro" completado correctamente', 'success');
	};

	const cancelOtroModal = () => {
		if (!otroModal.value.trim()) {
			alert('Debe completar el campo "Otro" para poder continuar. Este campo es obligatorio.');
			return;
		}
		alert('Para continuar, debe hacer clic en "Guardar y continuar". El campo "Otro" es obligatorio.');
	};

	const steps = [
		'1. Datos generales',
		'1.x Círculo de Apoyo',
		'2. Objetivo del proceso',
		'3. Escucha activa y autodeterminación',
		'4. Estado emocional y bienestar',
		'5. Apoyos y ajustes',
		'6. Evaluación de dimensiones',
		'7. Logros',
		'8. Sueños y metas',
		'9. Experiencias significativas',
		'10. Sugerencias y recomendaciones'
	];

	const canProceed = (s: number) => {
		if (otroModal.isOpen) {
			addToast('Debe completar el campo "Otro" antes de continuar', 'error');
			return false;
		}
		
		if (s === 0) {
			return !!(data.datosGenerales?.nombreCompleto && data.datosGenerales?.periodo);
		}
		return true;
	};

	const handleStepChange = (newStep: number) => {
		if (otroModal.isOpen) {
			addToast('Debe completar el campo "Otro" antes de cambiar de sección', 'error');
			return;
		}
		setStep(newStep);
	};

	const onChange = (path: string, value: any) => {
		if (!canEditFields) {
			const isNoteField = path.includes('Notas');
			const isOptionSelection = path.includes('.') && !path.startsWith('datosGenerales.');
			const isAllowedGeneralField = path === 'datosGenerales.youngId' || path === 'datosGenerales.periodo' || path === 'datosGenerales.metaSueño' || path === 'datosGenerales.facilitadorNombre';
			
			if (!isNoteField && !isOptionSelection && path.startsWith('datosGenerales.') && !isAllowedGeneralField) {
				return;
			}
		}
		
		if (path === 'experiencias.participacion') {
			if (value === participacionExperienciasOptions[2]) {
				setTimeout(() => openModal('experiencias'), 300);
			}
		}
		if (path === 'circuloApoyo.participacion' && value === participacionCirculoOptions[4]) {
			setTimeout(() => openModal('circuloApoyo'), 300);
		}
		
		setData((prev: any) => {
			const next = { ...prev };
			const keys = path.split('.');
			let cur: any = next;
			for (let i = 0; i < keys.length - 1; i++) {
				cur[keys[i]] = cur[keys[i]] ?? {};
				cur = cur[keys[i]];
			}
			cur[keys[keys.length - 1]] = value;
			return next;
		});
	};

	const validateNow = () => {
		const ok = validate(data);
		const ajvErrorsRaw = (validate.errors || []) as ErrorObject[];
		const ajvErrors = ajvErrorsRaw.map((err) => formatAjvError(err));
		const extraErrors: string[] = [];
		
		if (data?.experiencias?.participacion === participacionExperienciasOptions[2] && !(data?.experiencias?.motivosNoParticipa || []).length) {
			extraErrors.push(`${getReadableLabel('experiencias.motivosNoParticipa')} es requerido cuando participacion="${participacionExperienciasOptions[2]}"`);
		}
		
		const validarOtro = (arrayPath: string, otroPath: string, nombre: string) => {
			const arrayKeys = arrayPath.split('.');
			let cur: any = data;
			for (const k of arrayKeys) cur = cur?.[k];
			const hasOtro = Array.isArray(cur) && (cur.includes('Otro') || cur.includes('Otra') || cur.includes('Otro/Observaciones'));
			if (hasOtro) {
				const otroKeys = otroPath.split('.');
				let otroCur: any = data;
				for (const k of otroKeys) otroCur = otroCur?.[k];
				if (!otroCur || !String(otroCur).trim()) {
					extraErrors.push(`${otroPath} es requerido cuando se selecciona "Otro" en ${nombre}`);
				}
			}
		};
		
		Object.entries(otroPaths).forEach(([arrayPath, otroPath]) => {
			validarOtro(arrayPath, otroPath, arrayPath);
		});
		
		const requiredCheckboxes: Record<string, string> = {
			'objetivo.focos': 'Debe seleccionar al menos un foco del acompañamiento',
			'objetivo.estrategias': 'Debe seleccionar al menos una estrategia implementada',
			'estadoEmocional.prevalencias': 'Debe seleccionar al menos una prevalencia emocional',
			'estadoEmocional.expresionGeneral': 'Debe seleccionar al menos una expresión emocional general',
			'estadoEmocional.regulacion': 'Debe seleccionar al menos una opción de regulación emocional',
			'apoyosAjustes.apoyos': 'Debe seleccionar al menos un tipo de apoyo',
			'evaluacion.dimensiones': 'Debe completar todas las dimensiones de calidad de vida'
		};
		
		Object.entries(requiredCheckboxes).forEach(([path, message]) => {
			const keys = path.split('.');
			let cur: any = data;
			for (const k of keys) cur = cur?.[k];
			if (path === 'evaluacion.dimensiones') {
				if (!Array.isArray(cur) || cur.length === 0 || !cur.every((d: any) => d.actual && d.evolucion)) {
					extraErrors.push(message);
				}
			} else {
				if (!Array.isArray(cur) || cur.length === 0) {
					extraErrors.push(message);
				}
			}
		});
		
		checkboxPathsRequireNotes.forEach((path) => {
			const selected = getValueByPath(data, path);
			if (!Array.isArray(selected) || selected.length === 0) return;
			const notes = getValueByPath(data, `${path}Notas`) || {};
			selected.forEach((opt) => {
				const noteValue = typeof notes === 'object' ? notes?.[opt] : '';
				if (!noteValue || !String(noteValue).trim()) {
					extraErrors.push(`Agrega el detalle para "${opt}" en ${getReadableLabel(path)}.`);
				}
			});
		});

		const commentPaths = [
			'circuloApoyo.comentario',
			'objetivo.comentario',
			'objetivo.focosComentario',
			'objetivo.estrategiasComentario',
			'escucha.preferenciasComentario',
			'escucha.areasInteresComentario',
			'escucha.comentario',
			'estadoEmocional.situacionesComentario',
			'estadoEmocional.estrategiasComentario',
			'estadoEmocional.autorregulacionComentario',
			'estadoEmocional.comentario',
			'apoyosAjustes.apoyosComentario',
			'apoyosAjustes.ajustesComentario',
			'apoyosAjustes.comentario',
			'logros.comentario',
			'suenosMetas.metasComentario',
			'suenosMetas.recursosComentario',
			'suenosMetas.comentario',
			'experiencias.tiposComentario',
			'experiencias.apoyoComentario',
			'experiencias.comentario',
			'sugerencias.areasComentario',
			'sugerencias.recomendacionesComentario',
			'sugerencias.comentario'
		];
		commentPaths.forEach(path => {
			const val = getValueByPath(data, path);
			if (!val || !val.trim()) {
				extraErrors.push(`El comentario en "${getReadableLabel(path)}" es obligatorio para personalizar el informe.`);
			}
		});

		if ((data.circuloApoyo?.valoracion?.individual === 'ROJO' || data.circuloApoyo?.valoracion?.individual === 'AMARILLO') && !data.circuloApoyo?.valoracion?.nombresIndividual?.trim()) {
			extraErrors.push('En el Círculo de Apoyo, debe especificar los nombres de las personas que no están participando adecuadamente.');
		}
		
		const allErrors = [...ajvErrors, ...extraErrors];
		setErrors(allErrors);
		
		if (otroModal.isOpen) {
			addToast('Debe completar el campo "Otro" antes de continuar', 'error');
			return false;
		}
		
		return ok && allErrors.length === 0;
	};

	const previewReport = async () => {
		if (!validateNow()) {
			addToast('Complete todos los campos requeridos antes de previsualizar', 'error');
			return;
		}
		
		setGenerating(true);
		try {
			const res = await fetch('/api/generate-report', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ form: data, previewOnly: true, formId: currentFormId })
			});
			if (!res.ok) {
				const error = await res.json().catch(() => ({ error: 'Error generando vista previa' }));
				throw new Error(error.error || `HTTP ${res.status}`);
			}
			const json = await res.json();
			if (json.html) {
				setPreviewModal({ isOpen: true, html: json.html });
			} else {
				throw new Error('No se pudo generar la vista previa');
			}
		} catch (err: any) {
			console.error('Error al generar vista previa:', err);
			addToast(err.message || 'Error al generar vista previa', 'error');
		} finally {
			setGenerating(false);
		}
	};

	const generate = async () => {
		if (!validateNow()) return;
		setGenerating(true);
		try {
			const saveRes = await fetch('/api/forms', { 
				method: 'POST', 
				headers: { 'Content-Type': 'application/json' }, 
				body: JSON.stringify({ data, saveAsDraft: false })
			});
			if (!saveRes.ok) {
				const error = await saveRes.json().catch(() => ({ error: 'Error guardando formulario' }));
				throw new Error(error.error || `HTTP ${saveRes.status}`);
			}
			const savedForm = await saveRes.json();

			const periodo = data?.datosGenerales?.periodo;
			const youngId = data?.datosGenerales?.youngId;
			
			let existingReport: any = null;
			if (periodo && youngId) {
				try {
					const checkRes = await fetch(`/api/reports?periodo=${periodo}&youngId=${youngId}`);
					if (checkRes.ok) {
						const checkData = await checkRes.json();
						if (checkData.items && checkData.items.length > 0) {
							existingReport = checkData.items[0];
						}
					}
				} catch (err) {
					console.log('No se pudo verificar informe existente:', err);
				}
			}

			let updateExisting = false;
			if (existingReport) {
				updateExisting = confirm(
					`Ya existe un informe para el período "${periodo}" de este joven.\n\n` +
					`¿Deseas REGENERAR el informe existente (versión ${existingReport.version || 1})?\n\n` +
					`- Sí: Actualiza el informe existente\n` +
					`- No: Crea un nuevo informe`
				);
			}
			
			const res = await fetch('/api/generate-report', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					form: data,
					updateExisting,
					existingReportId: existingReport?.id,
					formId: currentFormId
				})
			});
			if (!res.ok) {
				const error = await res.json().catch(() => ({ error: 'Error generando informe' }));
				throw new Error(error.error || `HTTP ${res.status}`);
			}
			const json = await res.json();
			setApiResp(json);
			let message = '';
			if (json.updated) {
				message = `✅ Informe regenerado exitosamente (versión ${json.version || 1}). El informe anterior ha sido actualizado. PDF disponible.`;
			} else if (updateExisting && existingReport) {
				message = `✅ Nuevo informe creado (versión ${json.version || 1}) para el período "${periodo}". El informe anterior sigue disponible. PDF disponible.`;
			} else {
				message = json?.pdfUrl ? '✅ Informe generado y PDF disponible.' : '✅ Informe generado.';
			}
			addToast(message, 'success');
			
			// Redirigir al usuario a la lista de informes para que pueda ver/descargar el PDF
			setTimeout(() => {
				router.push('/reports');
			}, 1500);
		} catch (err: any) {
			console.error('Error al generar informe:', err);
			addToast(err.message || 'Error al generar informe', 'error');
		} finally {
			setGenerating(false);
		}
	};


	if (loadingFormData) {
		return (
			<div style={{ padding: 20, textAlign: 'center' }}>
				Cargando datos del formulario...
			</div>
		);
	}

	return (
		<div>
			<EditableText k="form.titulo" fallback="Formulario del Informe Evolutivo" tag="h1" />

			{/* Banner de Información Premium del Joven y Formulario */}
			<div className="ga-form-info-banner" style={{
				background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
				border: '1px solid #e2e8f0',
				borderRadius: '12px',
				padding: '16px 20px',
				marginBottom: '24px',
				boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
				display: 'grid',
				gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
				gap: '16px',
				alignItems: 'center',
				transition: 'all 0.2s ease',
			}}>
				<div>
					<span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
						Joven / Concurrente
					</span>
					<span style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
						{data.datosGenerales?.nombreCompleto || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No seleccionado</span>}
					</span>
					{data.datosGenerales?.youngId && (
						<span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '2px' }}>
							ID Joven: <code style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: '4px' }}>{data.datosGenerales.youngId}</code>
						</span>
					)}
				</div>

				<div>
					<span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
						Facilitador / Acompañante
					</span>
					<span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
						{data.datosGenerales?.facilitadorNombre || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No asignado</span>}
					</span>
				</div>

				<div>
					<span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
						Período / Fecha del Informe
					</span>
					<span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
						{data.datosGenerales?.periodo || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No definido</span>}
					</span>
				</div>

				<div>
					<span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
						Identificador del Formulario
					</span>
					<span style={{ fontSize: '13px', fontWeight: 500, color: '#475569', display: 'block' }}>
						{currentFormId ? (
							<code style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: '6px', fontSize: '12px' }}>
								{currentFormId}
							</code>
						) : (
							<span style={{ background: '#fef3c7', color: '#d97706', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
								Nuevo Borrador
							</span>
						)}
					</span>
				</div>
			</div>

			<div className="ga-wizard-nav">
				{steps.map((s, i) => (
					<button key={s} className={`ga-chip ${i === step ? 'active' : ''}`} onClick={() => handleStepChange(i)}>{s}</button>
				))}
			</div>
			<div className="ga-progress"><span style={{ width: `${(step + 1) * 100 / steps.length}%` }} /></div>
			<section className="ga-card" style={sectionStyle(0)}>
				<EditableText k="sec.1.titulo" fallback="Datos Generales" tag="h2" />
				<div className="ga-form-grid">
					<label><EditableText k="sec.1.joven" fallback="Joven" tag="span" /> <span style={{ color: '#d00' }}>*</span><br />
						<select className="ga-select" value={data.datosGenerales?.youngId || ''} onChange={(e) => onChange('datosGenerales.youngId', e.target.value)}>
							<option value="">Seleccione…</option>
							{youngs.map((y) => (
								<option key={y._id || y.id} value={y._id || y.id}>
									{y.nombreCompleto} {y.dni ? ` - DNI: ${y.dni}` : ''} {y.legajo ? ` - Legajo: ${y.legajo}` : ''}
								</option>
							))}
						</select>
					</label>
					<label><EditableText k="sec.1.nombreCompleto" fallback="Nombre completo" tag="span" /> <span style={{ color: '#d00' }}>*</span><br />
						<input 
							className={`ga-input ${!data.datosGenerales?.nombreCompleto ? 'ga-input-error' : ''}`} 
							value={data.datosGenerales?.nombreCompleto || ''} 
							onChange={(e) => onChange('datosGenerales.nombreCompleto', e.target.value)} 
							disabled={!canEditFields || !!data.datosGenerales?.youngId}
							readOnly={!!data.datosGenerales?.youngId}
							style={data.datosGenerales?.youngId ? { background: '#f5f5f5', cursor: 'not-allowed' } : {}}
						/>
						{data.datosGenerales?.youngId && <small style={{ color: '#666', fontSize: 11, display: 'block', marginTop: 4 }}>Este campo se carga automáticamente del perfil del joven</small>}
					</label>
					<label><EditableText k="sec.1.periodo" fallback="Período" tag="span" /> <span style={{ color: '#d00' }}>*</span><br />
						<input 
							className={`ga-input ${!data.datosGenerales?.periodo ? 'ga-input-error' : ''}`} 
							type="text" 
							placeholder="Ej: 2025-01" 
							value={data.datosGenerales?.periodo || ''} 
							onChange={(e) => onChange('datosGenerales.periodo', e.target.value)} 
							disabled={false} 
						/>
					</label>
					<label><EditableText k="sec.1.metaSueño" fallback="Meta o sueño del/la joven" tag="span" /><br />
						<input 
							className="ga-input" 
							value={data.datosGenerales?.metaSueño || ''} 
							onChange={(e) => onChange('datosGenerales.metaSueño', e.target.value)} 
							placeholder="Meta o sueño expresado por el/la joven" 
							disabled={false}
						/>
						<small style={{ color: '#666', fontSize: 11, display: 'block', marginTop: 4 }}>Este campo puede editarse independientemente del perfil del joven</small>
					</label>
					<label><EditableText k="sec.1.legajo" fallback="Número de legajo" tag="span" /><br />
						<input 
							className="ga-input" 
							value={data.datosGenerales?.numeroLegajo || ''} 
							onChange={(e) => onChange('datosGenerales.numeroLegajo', e.target.value)} 
							disabled={!canEditFields || !!data.datosGenerales?.youngId}
							readOnly={!!data.datosGenerales?.youngId}
							style={data.datosGenerales?.youngId ? { background: '#f5f5f5', cursor: 'not-allowed' } : {}}
						/>
						{data.datosGenerales?.youngId && <small style={{ color: '#666', fontSize: 11, display: 'block', marginTop: 4 }}>Este campo se carga automáticamente del perfil del joven</small>}
					</label>
					<label><EditableText k="sec.1.obraSocial" fallback="Obra social" tag="span" /><br />
						<input 
							className="ga-input" 
							value={data.datosGenerales?.obraSocial || ''} 
							onChange={(e) => onChange('datosGenerales.obraSocial', e.target.value)} 
							disabled={!canEditFields || !!data.datosGenerales?.youngId}
							readOnly={!!data.datosGenerales?.youngId}
							style={data.datosGenerales?.youngId ? { background: '#f5f5f5', cursor: 'not-allowed' } : {}}
						/>
						{data.datosGenerales?.youngId && <small style={{ color: '#666', fontSize: 11, display: 'block', marginTop: 4 }}>Este campo se carga automáticamente del perfil del joven</small>}
					</label>
					<label><EditableText k="sec.1.fechaNacimiento" fallback="Fecha de nacimiento" tag="span" /><br />
						<input 
							className="ga-input" 
							type="date"
							value={data.datosGenerales?.fechaNacimiento || ''} 
							onChange={(e) => onChange('datosGenerales.fechaNacimiento', e.target.value)} 
							disabled={!canEditFields || !!data.datosGenerales?.youngId}
							readOnly={!!data.datosGenerales?.youngId}
							style={data.datosGenerales?.youngId ? { background: '#f5f5f5', cursor: 'not-allowed' } : {}}
						/>
						{data.datosGenerales?.youngId && <small style={{ color: '#666', fontSize: 11, display: 'block', marginTop: 4 }}>Este campo se carga automáticamente del perfil del joven</small>}
					</label>
					<label><EditableText k="sec.1.facilitador" fallback="Facilitador/a" tag="span" /><br />
						<input className="ga-input" value={data.datosGenerales?.facilitadorNombre || ''} onChange={(e) => onChange('datosGenerales.facilitadorNombre', e.target.value)} placeholder="Se vincula al joven seleccionado" disabled={false} />
					</label>
					<div style={{ gridColumn: '1 / -1' }}>
						<ImageUpload
							value={data.datosGenerales?.fotoJoven || ''}
							onChange={(url) => onChange('datosGenerales.fotoJoven', url)}
							label="Foto del/la joven"
							type="young"
							disabled={!canEditFields || !!data.datosGenerales?.youngId}
						/>
						{data.datosGenerales?.youngId && <small style={{ color: '#666', fontSize: 11, display: 'block', marginTop: 4 }}>Esta foto se carga automáticamente del perfil del joven</small>}
					</div>
				</div>
			</section>

			<section className="ga-card" style={sectionStyle(1)}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
				<EditableText k="sec.1x.titulo" fallback="Valoración del Círculo de Apoyo" tag="h2" />
					<button
						type="button"
						onClick={() => openModal('circuloApoyo')}
						style={{
							background: '#f0f7ff',
							border: '1px solid #667eea',
							borderRadius: '50%',
							width: 24,
							height: 24,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							cursor: 'pointer',
							fontSize: 14,
							color: '#667eea',
							fontWeight: 'bold',
							padding: 0
						}}
						title="Ver instrucciones"
					>
						?
					</button>
				</div>
				<p style={{ color: '#666', fontSize: 12 }}><EditableText k="hint.circuloApoyo" fallback={hints.circuloApoyo || ''} tag="span" /></p>
				<p className="ga-hint" style={{ marginBottom: 12, fontSize: 13, color: '#555', fontStyle: 'italic' }}>
					<strong>Instrucción:</strong> En general se debe marcar todas las opciones posibles y especificar si es necesario.
				</p>
				<div style={{ marginTop: 8 }}>
					<b>Integrantes (nombre y vínculo)</b>
					<p style={{ fontSize: 12, color: '#666', marginTop: 4, marginBottom: 8 }}>
						<strong>Importante:</strong> Debe responder con el nombre completo. Ejemplo: "Madre Analía", "Padre Juan", etc.
					</p>
					{(data.circuloApoyo?.miembros || []).map((m: any, i: number) => (
						<div key={i} style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
							<input
								className="ga-input"
								list={circuloVinculosDatalistId}
								placeholder="Vínculo (ej: Madre)"
								value={m?.vinculo || ''}
								onChange={(e) => {
									const arr = [...(data.circuloApoyo?.miembros || [])];
									arr[i] = { ...arr[i], vinculo: e.target.value };
									onChange('circuloApoyo.miembros', arr);
								}}
								style={{ flex: '1 1 160px', minWidth: 140 }}
							/>
							<input
								className="ga-input"
								placeholder="Nombre de la persona (ej: Cristina)"
								value={m?.nombre || ''}
								onChange={(e) => {
									const arr = [...(data.circuloApoyo?.miembros || [])];
									arr[i] = { ...arr[i], nombre: e.target.value };
									onChange('circuloApoyo.miembros', arr);
								}}
								style={{ flex: '2 1 220px', minWidth: 160 }}
							/>
							<button
								type="button"
								className="ga-btn"
								onClick={() => {
									const arr = (data.circuloApoyo?.miembros || []).filter((_: any, idx: number) => idx !== i);
									onChange('circuloApoyo.miembros', arr);
								}}
								style={{ background: '#fee', color: '#c33' }}
							>
								Quitar
							</button>
						</div>
					))}
					<button style={{ marginTop: 6 }} onClick={() => onChange('circuloApoyo.miembros', [...(data.circuloApoyo?.miembros || []), { nombre: '', vinculo: '' }])}>+ Agregar integrante</button>
					<datalist id={circuloVinculosDatalistId}>
						{integrantesCirculoTipos.map((tipo) => (
							<option key={tipo} value={tipo} />
						))}
					</datalist>
					<p style={{ fontSize: 12, color: '#555', marginTop: 6 }}>
						Primero elegí el vínculo (Madre, Hermana, etc.) y luego completá el nombre propio (ej: Cristina).
					</p>
				</div>
				<CheckboxGroup data={data} onChange={onChange} setOtroModal={setOtroModal} otroPaths={otroPaths} label={<EditableText k="sec.1x.acompanaron" fallback="¿Quiénes lo acompañaron con mayor compromiso? (Marcar todos los que correspondan. Menciona el nombre de las personas)" tag="span" />} path="circuloApoyo.acompanaronMayorCompromiso" options={acompanaronMayorCompromiso} />
				<Select data={data} onChange={onChange} canEditFields={canEditFields} label={<EditableText k="sec.1x.participacion" fallback="Nivel de participación" tag="span" />} path="circuloApoyo.participacion" options={participacionCirculoOptions} />
				<Select data={data} onChange={onChange} canEditFields={canEditFields} label={<EditableText k="sec.1x.involucramiento" fallback="Grado de involucramiento general" tag="span" />} path="circuloApoyo.gradoInvolucramiento" options={involucramientoCirculo} />
				<CheckboxGroup data={data} onChange={onChange} setOtroModal={setOtroModal} otroPaths={otroPaths} label={<EditableText k="sec.1x.respeto" fallback="¿El círculo respetó sus elecciones y decisiones?" tag="span" />} path="circuloApoyo.respetoDecisiones" options={respetoDecisionesOpciones} />
				<div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
					<div>
						<b>Participación grupal</b><br />
						<div style={{ display: 'flex', gap: 6 }}>
							<button type="button" className={`ga-chip ${data?.circuloApoyo?.valoracion?.grupal==='ROJO'?'active':''}`} style={{ background:'#fdd', border:'1px solid #e66' }} onClick={() => onChange('circuloApoyo.valoracion.grupal','ROJO')}>Rojo</button>
							<button type="button" className={`ga-chip ${data?.circuloApoyo?.valoracion?.grupal==='AMARILLO'?'active':''}`} style={{ background:'#fffbcc', border:'1px solid #e6d566' }} onClick={() => onChange('circuloApoyo.valoracion.grupal','AMARILLO')}>Amarillo</button>
							<button type="button" className={`ga-chip ${data?.circuloApoyo?.valoracion?.grupal==='VERDE'?'active':''}`} style={{ background:'#defade', border:'1px solid #6ac46a' }} onClick={() => onChange('circuloApoyo.valoracion.grupal','VERDE')}>Verde</button>
						</div>
					</div>
					<div>
						<b>Participación individual</b><br />
						<div style={{ display: 'flex', gap: 6 }}>
							<button type="button" className={`ga-chip ${data?.circuloApoyo?.valoracion?.individual==='ROJO'?'active':''}`} style={{ background:'#fdd', border:'1px solid #e66' }} onClick={() => onChange('circuloApoyo.valoracion.individual','ROJO')}>Rojo</button>
							<button type="button" className={`ga-chip ${data?.circuloApoyo?.valoracion?.individual==='AMARILLO'?'active':''}`} style={{ background:'#fffbcc', border:'1px solid #e6d566' }} onClick={() => onChange('circuloApoyo.valoracion.individual','AMARILLO')}>Amarillo</button>
							<button type="button" className={`ga-chip ${data?.circuloApoyo?.valoracion?.individual==='VERDE'?'active':''}`} style={{ background:'#defade', border:'1px solid #6ac46a' }} onClick={() => onChange('circuloApoyo.valoracion.individual','VERDE')}>Verde</button>
						</div>
					</div>
				</div>
				{(data?.circuloApoyo?.valoracion?.individual === 'ROJO' || data?.circuloApoyo?.valoracion?.individual === 'AMARILLO') && (
					<div style={{ marginTop: 12, padding: 12, background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a' }}>
						<label style={{ display: 'block' }}>
							<b>¿Quiénes son las personas que no están participando adecuadamente?</b><br />
							<input 
								className="ga-input" 
								value={data?.circuloApoyo?.valoracion?.nombresIndividual || ''} 
								onChange={(e) => onChange('circuloApoyo.valoracion.nombresIndividual', e.target.value)}
								placeholder="Ej: Padre Juan, Hermana María..."
							/>
						</label>
					</div>
				)}
				<SectionComment data={data} onChange={onChange} path="circuloApoyo.comentario" />
			</section>

			<section className="ga-card" style={sectionStyle(2)}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
					<EditableText k="sec.2.titulo" fallback="Objetivo del proceso" tag="h2" />
					<button
						type="button"
						onClick={() => openModal('objetivo')}
						style={{
							background: '#f0f7ff',
							border: '1px solid #667eea',
							borderRadius: '50%',
							width: 24,
							height: 24,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							cursor: 'pointer',
							fontSize: 14,
							color: '#667eea',
							fontWeight: 'bold',
							padding: 0
						}}
						title="Ver instrucciones"
					>
						?
					</button>
				</div>
				<p style={{ color: '#666', fontSize: 12 }}><EditableText k="hint.objetivo" fallback={hints.objetivo || ''} tag="span" /></p>
				<label>
					<strong><EditableText k="sec.2.label" fallback="Texto Marco Institucional (Se adapta si es necesario):" tag="span" /></strong><br />
					<textarea 
						rows={6} 
						style={{ width: '100%', fontSize: '14px', lineHeight: '1.5', padding: '10px', marginTop: '8px' }} 
						value={data.objetivo?.textoMarco || ''} 
						onChange={(e) => onChange('objetivo.textoMarco', e.target.value)} 
						placeholder={INITIAL_TEXT_MARCO}
					/>
				</label>
				<p className="ga-hint" style={{ marginTop: 8, marginBottom: 8, fontSize: 13, color: '#555' }}>
					<strong>2.1 Focos:</strong> Se promovieron experiencias que fortalecen su autonomía en la vida cotidiana. <strong>Especifique detalles</strong> en el comentario de abajo.
				</p>
				<CheckboxGroup data={data} onChange={onChange} setOtroModal={setOtroModal} otroPaths={otroPaths} label={<EditableText k="sec.2.focos" fallback="Focos del acompañamiento" tag="span" />} path="objetivo.focos" options={objetivoFocos} showNotes={false} />
				<SectionComment data={data} onChange={onChange} path="objetivo.focosComentario" label="Comentario sobre Focos del acompañamiento (Obligatorio)" />
				
				<p className="ga-hint" style={{ marginTop: 16, marginBottom: 8, fontSize: 13, color: '#555' }}>
					<strong>2.2 Estrategias:</strong> <strong>Especifique detalles</strong> sobre las estrategias implementadas en el comentario de abajo.
				</p>
				<CheckboxGroup data={data} onChange={onChange} setOtroModal={setOtroModal} otroPaths={otroPaths} label={<EditableText k="sec.2.estrategias" fallback="Estrategias implementadas" tag="span" />} path="objetivo.estrategias" options={objetivoEstrategias} showNotes={false} />
				<SectionComment data={data} onChange={onChange} path="objetivo.estrategiasComentario" label="Comentario sobre Estrategias implementadas (Obligatorio)" />
				<SectionComment data={data} onChange={onChange} path="objetivo.comentario" />
			</section>

			<section className="ga-card" style={sectionStyle(3)}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
					<EditableText k="sec.3.titulo" fallback="Escucha activa y autodeterminación" tag="h2" />
					<button
						type="button"
						onClick={() => openModal('escucha')}
						style={{
							background: '#f0f7ff',
							border: '1px solid #667eea',
							borderRadius: '50%',
							width: 24,
							height: 24,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							cursor: 'pointer',
							fontSize: 14,
							color: '#667eea',
							fontWeight: 'bold',
							padding: 0
						}}
						title="Ver instrucciones"
					>
						?
					</button>
				</div>
				<p style={{ color: '#666', fontSize: 12 }}><EditableText k="hint.escucha" fallback={hints.escucha || ''} tag="span" /></p>
				<p className="ga-hint" style={{ marginTop: 8, marginBottom: 8, fontSize: 13, color: '#555' }}>
					<strong>3.1 Preferencias / decisiones:</strong> <strong>Especifique detalles</strong> en el comentario de abajo.
				</p>
				<CheckboxGroup data={data} onChange={onChange} setOtroModal={setOtroModal} otroPaths={otroPaths} label={<EditableText k="sec.3.preferencias" fallback="Preferencias / decisiones" tag="span" />} path="escucha.preferencias" options={escuchaPreferencias} showNotes={false} />
				<SectionComment data={data} onChange={onChange} path="escucha.preferenciasComentario" label="Comentario sobre Preferencias / decisiones (Obligatorio)" />
				
				<p className="ga-hint" style={{ marginTop: 16, marginBottom: 8, fontSize: 13, color: '#555' }}>
					<strong>3.2 Áreas de interés:</strong> <strong>Especifique detalles</strong> en el comentario de abajo.
				</p>
				<CheckboxGroup data={data} onChange={onChange} setOtroModal={setOtroModal} otroPaths={otroPaths} label={<EditableText k="sec.3.areasInteres" fallback="Áreas de interés" tag="span" />} path="escucha.areasInteres" options={escuchaAreasInteres} showNotes={false} />
				<SectionComment data={data} onChange={onChange} path="escucha.areasInteresComentario" label="Comentario sobre Áreas de interés (Obligatorio)" />
				
				<Select data={data} onChange={onChange} canEditFields={canEditFields} label={<EditableText k="sec.3.nivelAutonomia" fallback="Nivel de autonomía" tag="span" />} path="escucha.nivelAutonomia" options={nivelesAutonomia} />
				<p className="ga-hint"><EditableText k="hint.autonomia" fallback="Aclaraciones: niveles orientativos para describir la autonomía percibida en actividades y decisiones cotidianas." tag="span" /></p>
				<label><EditableText k="sec.3.otroEspecificar" fallback={'Si seleccionaste "Otro" en áreas de interés, especificar'} tag="span" /><br />
					<textarea className="ga-input ga-textarea-large" value={data.escucha?.areasInteresOtro || ''} onChange={(e) => onChange('escucha.areasInteresOtro', e.target.value)} />
				</label>
				<SectionComment data={data} onChange={onChange} path="escucha.comentario" />
			</section>

			<section className="ga-card" style={sectionStyle(4)}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
					<EditableText k="sec.4.titulo" fallback="Estado emocional y bienestar subjetivo" tag="h2" />
					<button
						type="button"
						onClick={() => openModal('estadoEmocional')}
						style={{
							background: '#f0f7ff',
							border: '1px solid #667eea',
							borderRadius: '50%',
							width: 24,
							height: 24,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							cursor: 'pointer',
							fontSize: 14,
							color: '#667eea',
							fontWeight: 'bold',
							padding: 0
						}}
						title="Ver instrucciones"
					>
						?
					</button>
				</div>
				<p style={{ color: '#666', fontSize: 12 }}><EditableText k="hint.estadoEmocional" fallback={hints.estadoEmocional || ''} tag="span" /></p>
				<CheckboxGroup data={data} onChange={onChange} setOtroModal={setOtroModal} otroPaths={otroPaths} label={<EditableText k="sec.4.prevalencias" fallback="Prevalencia de estados emocionales" tag="span" />} path="estadoEmocional.prevalencias" options={prevalenciasEmocionales} showNotes={false} />
				<CheckboxGroup data={data} onChange={onChange} setOtroModal={setOtroModal} otroPaths={otroPaths} label={<EditableText k="sec.4.expresionGeneral" fallback="Expresión emocional general" tag="span" />} path="estadoEmocional.expresionGeneral" options={expresionEmocionalGeneral} showNotes={false} />
				<p className="ga-hint" style={{ marginTop: 8, marginBottom: 8, fontSize: 13, color: '#555' }}>
					<strong>Vínculo con el entorno y Bienestar:</strong> <strong>Especifique detalles</strong> en el comentario de abajo.
				</p>
				<CheckboxGroup data={data} onChange={onChange} setOtroModal={setOtroModal} otroPaths={otroPaths} label={<EditableText k="sec.4.vinculo" fallback="Vínculo con el entorno" tag="span" />} path="estadoEmocional.vinculoEntorno" options={vinculoEntorno} showNotes={false} />
				<CheckboxGroup data={data} onChange={onChange} setOtroModal={setOtroModal} otroPaths={otroPaths} label={<EditableText k="sec.4.bienestar" fallback="Bienestar subjetivo" tag="span" />} path="estadoEmocional.bienestarSubjetivo" options={bienestarSubjetivo} showNotes={false} />
				
				<p className="ga-hint" style={{ marginTop: 16, marginBottom: 8, fontSize: 13, color: '#555' }}>
					<strong>Regulación emocional:</strong> <strong>Especifique detalles</strong> en el comentario de abajo.
				</p>
				<CheckboxGroup data={data} onChange={onChange} setOtroModal={setOtroModal} otroPaths={otroPaths} label={<EditableText k="sec.4.regulacion" fallback="Regulación emocional" tag="span" />} path="estadoEmocional.regulacion" options={regulacionEmocional} showNotes={false} />
				
				<p className="ga-hint" style={{ marginTop: 16, marginBottom: 8, fontSize: 13, color: '#555' }}>
					<strong>Situaciones que influyeron:</strong> <strong>Especifique detalles</strong> en el comentario de abajo.
				</p>
				<CheckboxGroup data={data} onChange={onChange} setOtroModal={setOtroModal} otroPaths={otroPaths} label={<EditableText k="sec.4.situaciones" fallback="Situaciones que influyeron" tag="span" />} path="estadoEmocional.situacionesInfluyen" options={situacionesInfluyen} showNotes={false} />
				<SectionComment data={data} onChange={onChange} path="estadoEmocional.situacionesComentario" label="Comentario sobre Situaciones que influyeron (Obligatorio)" />
				
				<p className="ga-hint" style={{ marginTop: 16, marginBottom: 8, fontSize: 13, color: '#555' }}>
					<strong>Estrategias de acompañamiento:</strong> <strong>Especifique detalles</strong> en el comentario de abajo.
				</p>
				<CheckboxGroup data={data} onChange={onChange} setOtroModal={setOtroModal} otroPaths={otroPaths} label={<EditableText k="sec.4.estrategias" fallback="Estrategias de acompañamiento" tag="span" />} path="estadoEmocional.estrategias" options={estrategiasAcompanamiento} showNotes={false} />
				<SectionComment data={data} onChange={onChange} path="estadoEmocional.estrategiasComentario" label="Comentario sobre Estrategias de acompañamiento (Obligatorio)" />
				
				<p className="ga-hint" style={{ marginTop: 16, marginBottom: 8, fontSize: 13, color: '#555' }}>
					<strong>Técnicas de autorregulación:</strong> <strong>Especifique detalles</strong> en el comentario de abajo.
				</p>
				<CheckboxGroup data={data} onChange={onChange} setOtroModal={setOtroModal} otroPaths={otroPaths} label={<EditableText k="sec.4.autorregulacion" fallback="Técnicas de autorregulación" tag="span" />} path="estadoEmocional.tecnicasAutorregulacion" options={tecnicasAutorregulacion} showNotes={false} />
				<SectionComment data={data} onChange={onChange} path="estadoEmocional.autorregulacionComentario" label="Comentario sobre Técnicas de autorregulación (Obligatorio)" />
				
				<SectionComment data={data} onChange={onChange} path="estadoEmocional.comentario" />
			</section>

			<section className="ga-card" style={sectionStyle(5)}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
					<EditableText k="sec.5.titulo" fallback="Apoyos y ajustes brindados" tag="h2" />
					<button
						type="button"
						onClick={() => openModal('apoyosAjustes')}
						style={{
							background: '#f0f7ff',
							border: '1px solid #667eea',
							borderRadius: '50%',
							width: 24,
							height: 24,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							cursor: 'pointer',
							fontSize: 14,
							color: '#667eea',
							fontWeight: 'bold',
							padding: 0
						}}
						title="Ver instrucciones"
					>
						?
					</button>
				</div>
				<p style={{ color: '#666', fontSize: 12 }}><EditableText k="hint.apoyosAjustes" fallback={hints.apoyosAjustes || ''} tag="span" /></p>
				<p className="ga-hint" style={{ marginTop: 8, marginBottom: 8, fontSize: 13, color: '#555' }}>
					<strong>5.1 Apoyos:</strong> <strong>Especifique detalles</strong> en el comentario de abajo.
				</p>
				<CheckboxGroup data={data} onChange={onChange} setOtroModal={setOtroModal} otroPaths={otroPaths} label={<EditableText k="sec.5.apoyos" fallback="Apoyos" tag="span" />} path="apoyosAjustes.apoyos" options={apoyosOpciones} showNotes={false} />
				<SectionComment data={data} onChange={onChange} path="apoyosAjustes.apoyosComentario" label="Comentario sobre Apoyos (Obligatorio)" />
				
				<p className="ga-hint" style={{ marginTop: 16, marginBottom: 8, fontSize: 13, color: '#555' }}>
					<strong>5.3 Ajustes razonables:</strong> <strong>Especifique detalles</strong> en el comentario de abajo.
				</p>
				<CheckboxGroup data={data} onChange={onChange} setOtroModal={setOtroModal} otroPaths={otroPaths} label={<EditableText k="sec.5.ajustes" fallback="Ajustes razonables" tag="span" />} path="apoyosAjustes.ajustes" options={ajustesOpciones} showNotes={false} />
				<SectionComment data={data} onChange={onChange} path="apoyosAjustes.ajustesComentario" label="Comentario sobre Ajustes razonables (Obligatorio)" />
				
				<p className="ga-hint" style={{ marginTop: 16, marginBottom: 8, fontSize: 13, color: '#555' }}>
					<strong>Contextos de aplicación:</strong> Marcar todas las que correspondan.
				</p>
				<CheckboxGroup data={data} onChange={onChange} setOtroModal={setOtroModal} otroPaths={otroPaths} label={<EditableText k="sec.5.contextos" fallback="Contextos de aplicación" tag="span" />} path="apoyosAjustes.contextos" options={contextosApoyo} showNotes={false} />
				<SectionComment data={data} onChange={onChange} path="apoyosAjustes.comentario" />
			</section>

			<section className="ga-card" style={sectionStyle(6)}>
				<EditableText k="sec.6.titulo" fallback="Evaluación de dimensiones (comparativa)" tag="h2" />
				<p style={{ color: '#666', fontSize: 12 }}><EditableText k="hint.evaluacion" fallback={hints.evaluacion || ''} tag="span" /></p>
				<table style={{ borderCollapse: 'collapse', width: '100%' }}>
					<thead>
						<tr>
							<th style={{ border: '1px solid #ccc', padding: 4 }}><EditableText k="sec.6.th.dimension" fallback="Dimensión" tag="span" /></th>
							<th style={{ border: '1px solid #ccc', padding: 4 }}><EditableText k="sec.6.th.anterior" fallback="Anterior" tag="span" /></th>
							<th style={{ border: '1px solid #ccc', padding: 4 }}><EditableText k="sec.6.th.actual" fallback="Actual" tag="span" /></th>
							<th style={{ border: '1px solid #ccc', padding: 4 }}><EditableText k="sec.6.th.evolucion" fallback="Evolución" tag="span" /></th>
							<th style={{ border: '1px solid #ccc', padding: 4 }}><EditableText k="sec.6.th.observacion" fallback="Observación" tag="span" /></th>
						</tr>
					</thead>
					<tbody>
						{(data.evaluacion?.dimensiones || []).map((d: any, i: number) => (
							<tr key={i}>
								<td style={{ border: '1px solid #ccc', padding: 4 }}>{d.dimension}</td>
								<td style={{ border: '1px solid #ccc', padding: 4 }}><input value={d.anterior || ''} onChange={(e) => {
									const arr = [...(data.evaluacion?.dimensiones || [])]; arr[i] = { ...arr[i], anterior: e.target.value }; onChange('evaluacion.dimensiones', arr);
								}} /></td>
								<td style={{ border: '1px solid #ccc', padding: 4 }}><input value={d.actual || ''} onChange={(e) => {
									const arr = [...(data.evaluacion?.dimensiones || [])]; arr[i] = { ...arr[i], actual: e.target.value }; onChange('evaluacion.dimensiones', arr);
								}} /></td>
								<td style={{ border: '1px solid #ccc', padding: 4 }}>
									<select value={d.evolucion || ''} onChange={(e) => { const arr = [...(data.evaluacion?.dimensiones || [])]; arr[i] = { ...arr[i], evolucion: e.target.value }; onChange('evaluacion.dimensiones', arr); }}>
										<option value="">Seleccione…</option>
										{['✔','➖','❌','⏳'].map((x) => <option key={x} value={x}>{x}</option>)}
									</select>
								</td>
								<td style={{ border: '1px solid #ccc', padding: 4 }}><input value={d.observacion || ''} onChange={(e) => {
									const arr = [...(data.evaluacion?.dimensiones || [])]; arr[i] = { ...arr[i], observacion: e.target.value }; onChange('evaluacion.dimensiones', arr);
								}} /></td>
							</tr>
						))}
					</tbody>
				</table>
			</section>

			<section className="ga-card" style={sectionStyle(7)}>
				<EditableText k="sec.7.titulo" fallback="Logros destacados y habilidades" tag="h2" />
				<p className="ga-hint" style={{ marginTop: 8, marginBottom: 8, fontSize: 13, color: '#555' }}>
					<strong>Logros:</strong> <strong>Especifique detalles</strong> en el comentario de abajo.
				</p>
				<CheckboxGroup data={data} onChange={onChange} setOtroModal={setOtroModal} otroPaths={otroPaths} label={<EditableText k="sec.7.logros" fallback="Logros" tag="span" />} path="logros.items" options={logrosOpciones} showNotes={false} />
				<SectionComment data={data} onChange={onChange} path="logros.comentario" label="Comentario sobre Logros y habilidades (Obligatorio)" />
				<div style={{ marginTop: 16 }}>
					<label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
						<EditableText k="sec.7.imagenes" fallback="Imágenes de logros (opcional)" tag="span" />
					</label>
					<p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
						Puedes subir imágenes que documenten los logros y habilidades adquiridas
					</p>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
						{(data.logrosImagenes || []).map((img: string, idx: number) => (
							<div key={idx} style={{ position: 'relative' }}>
								<img 
									src={img} 
									alt={`Logro ${idx + 1}`}
									style={{ 
										width: '100%', 
										height: 150, 
										objectFit: 'cover', 
										borderRadius: 8,
										border: '1px solid var(--border)'
									}} 
								/>
								{canEditFields && (
									<button
										type="button"
										onClick={() => {
											const imgs = [...(data.logrosImagenes || [])];
											imgs.splice(idx, 1);
											onChange('logrosImagenes', imgs);
										}}
										style={{
											position: 'absolute',
											top: 4,
											right: 4,
											background: 'rgba(220, 38, 38, 0.9)',
											color: 'white',
											border: 'none',
											borderRadius: '50%',
											width: 24,
											height: 24,
											cursor: 'pointer',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											fontSize: 14
										}}
									>
										✕
									</button>
								)}
							</div>
						))}
						{canEditFields && (
							<ImageUpload
								value=""
								onChange={(url) => {
									const imgs = [...(data.logrosImagenes || []), url];
									onChange('logrosImagenes', imgs);
								}}
								label=""
								type="form"
								className=""
							/>
						)}
					</div>
				</div>
			</section>

			<section className="ga-card" style={sectionStyle(8)}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
					<EditableText k="sec.8.titulo" fallback="Sueños y metas a futuro" tag="h2" />
					<button
						type="button"
						onClick={() => openModal('suenosMetas')}
						style={{
							background: '#f0f7ff',
							border: '1px solid #667eea',
							borderRadius: '50%',
							width: 24,
							height: 24,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							cursor: 'pointer',
							fontSize: 14,
							color: '#667eea',
							fontWeight: 'bold',
							padding: 0
						}}
						title="Ver instrucciones"
					>
						?
					</button>
				</div>
				<p className="ga-hint" style={{ marginTop: 8, marginBottom: 8, fontSize: 13, color: '#555' }}>
					<strong>8.1 Metas:</strong> <strong>Especifique detalles</strong> en el comentario de abajo.
				</p>
				<CheckboxGroup data={data} onChange={onChange} setOtroModal={setOtroModal} otroPaths={otroPaths} label={<EditableText k="sec.8.metas" fallback="Metas" tag="span" />} path="suenosMetas.metas" options={metasOpciones} showNotes={false} />
				<SectionComment data={data} onChange={onChange} path="suenosMetas.metasComentario" label="Comentario sobre Metas (Obligatorio)" />
				
				<p className="ga-hint" style={{ marginTop: 16, marginBottom: 8, fontSize: 13, color: '#555' }}>
					<strong>8.2 Recursos necesarios:</strong> <strong>Especifique detalles</strong> en el comentario de abajo.
				</p>
				<CheckboxGroup data={data} onChange={onChange} setOtroModal={setOtroModal} otroPaths={otroPaths} label={<EditableText k="sec.8.recursos" fallback="Recursos necesarios" tag="span" />} path="suenosMetas.recursosNecesarios" options={recursosOpciones} showNotes={false} />
				<SectionComment data={data} onChange={onChange} path="suenosMetas.recursosComentario" label="Comentario sobre Recursos necesarios (Obligatorio)" />
				
				<SectionComment data={data} onChange={onChange} path="suenosMetas.comentario" />
			</section>

			<section className="ga-card" style={sectionStyle(9)}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
					<EditableText k="sec.9.titulo" fallback="Experiencias significativas" tag="h2" />
					<button
						type="button"
						onClick={() => openModal('experiencias')}
						style={{
							background: '#f0f7ff',
							border: '1px solid #667eea',
							borderRadius: '50%',
							width: 24,
							height: 24,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							cursor: 'pointer',
							fontSize: 14,
							color: '#667eea',
							fontWeight: 'bold',
							padding: 0
						}}
						title="Ver instrucciones"
					>
						?
					</button>
				</div>
				<Select data={data} onChange={onChange} canEditFields={canEditFields} label={<EditableText k="sec.9.participacion" fallback="Participación" tag="span" />} path="experiencias.participacion" options={participacionExperienciasOptions} />
				<p className="ga-hint" style={{ marginTop: 8, marginBottom: 8, fontSize: 13, color: '#555' }}>
					Si seleccionó "Sí, participó con entusiasmo y de manera activa": Se involucró de forma autónoma, con interés y disfrute. Mostró iniciativa, alegría y apertura a la experiencia.
				</p>
				<p className="ga-hint" style={{ marginTop: 8, marginBottom: 8, fontSize: 13, color: '#555' }}>
					Si seleccionó "Sí, participó con apoyo o acompañamiento": Se sumó a las experiencias con cierto grado de apoyo, mostrando disposición parcial o requerimientos específicos para involucrarse.
				</p>
				<p className="ga-hint" style={{ marginTop: 8, marginBottom: 8, fontSize: 13, color: '#555' }}>
					<strong>Experiencias vividas:</strong> <strong>Especifique detalles</strong> en el comentario de abajo.
				</p>
				<CheckboxGroup data={data} onChange={onChange} setOtroModal={setOtroModal} otroPaths={otroPaths} label={<EditableText k="sec.9.tiposVividas" fallback="Tipos de experiencias vividas" tag="span" />} path="experiencias.tiposVividas" options={nuevasExperiencias} showNotes={false} />
				<SectionComment data={data} onChange={onChange} path="experiencias.tiposComentario" label="Comentario sobre Experiencias vividas (Obligatorio)" />
				
				<p className="ga-hint" style={{ marginTop: 16, marginBottom: 8, fontSize: 13, color: '#555' }}>
					<strong>Tipo de apoyo brindado:</strong> <strong>Especifique detalles</strong> en el comentario de abajo.
				</p>
				<CheckboxGroup data={data} onChange={onChange} setOtroModal={setOtroModal} otroPaths={otroPaths} label={<EditableText k="sec.9.tipoApoyo" fallback="Tipo de apoyo brindado" tag="span" />} path="experiencias.tipoApoyo" options={tipoApoyoExperiencias} showNotes={false} />
				<SectionComment data={data} onChange={onChange} path="experiencias.apoyoComentario" label="Comentario sobre Apoyo recibido (Obligatorio)" />
				
				<p className="ga-hint" style={{ marginTop: 16, marginBottom: 8, fontSize: 13, color: '#555' }}>
					<strong>Motivos si no participó:</strong> Marcar todos los que correspondan.
				</p>
				<CheckboxGroup data={data} onChange={onChange} setOtroModal={setOtroModal} otroPaths={otroPaths} label={<EditableText k="sec.9.motivos" fallback="Motivos si no participó" tag="span" />} path="experiencias.motivosNoParticipa" options={motivosNoParticipa} showNotes={false} />
				<SectionComment data={data} onChange={onChange} path="experiencias.comentario" />
			</section>

			<section className="ga-card" style={sectionStyle(10)}>
				<EditableText k="sec.10.titulo" fallback="Sugerencias y recomendaciones" tag="h2" />
				<p className="ga-hint" style={{ marginTop: 8, marginBottom: 8, fontSize: 13, color: '#555' }}>
					<strong>10.1 Áreas prioritarias:</strong> <strong>Especifique detalles</strong> en el comentario de abajo.
				</p>
				<CheckboxGroup data={data} onChange={onChange} setOtroModal={setOtroModal} otroPaths={otroPaths} label={<EditableText k="sec.10.areas" fallback="Áreas prioritarias" tag="span" />} path="sugerencias.areasPrioritarias" options={areasPrioritarias} showNotes={false} />
				<SectionComment data={data} onChange={onChange} path="sugerencias.areasComentario" label="Comentario sobre Áreas prioritarias (Obligatorio)" />
				
				<p className="ga-hint" style={{ marginTop: 16, marginBottom: 8, fontSize: 13, color: '#555' }}>
					<strong>10.2 Recomendaciones:</strong> <strong>Especifique detalles</strong> en el comentario de abajo.
				</p>
				<CheckboxGroup data={data} onChange={onChange} setOtroModal={setOtroModal} otroPaths={otroPaths} label={<EditableText k="sec.10.recomendaciones" fallback="Recomendaciones" tag="span" />} path="sugerencias.recomendaciones" options={recomendacionesOpciones} showNotes={false} />
				<SectionComment data={data} onChange={onChange} path="sugerencias.recomendacionesComentario" label="Comentario sobre Recomendaciones (Obligatorio)" />
				
				<SectionComment data={data} onChange={onChange} path="sugerencias.comentario" />
			</section>

			<div style={{ marginTop: 12 }} className="ga-row">
				<button className="ga-btn" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Anterior</button>
				<button className="ga-btn secondary" onClick={() => {
					if (otroModal.isOpen) {
						setToasts((t) => [{ id: Date.now(), type: 'error', text: 'Debe completar el campo "Otro" antes de continuar' }, ...t]);
						return;
					}
					if (canProceed(step)) {
						setStep((s) => Math.min(steps.length - 1, s + 1));
					}
				}} disabled={step === steps.length - 1 || otroModal.isOpen}>Siguiente</button>
				<button className="ga-btn" onClick={validateNow} disabled={generating}>Validar</button>
				<button className="ga-btn secondary" onClick={previewReport} disabled={!readyToGenerate || otroModal.isOpen || generating}>
					{generating ? 'Generando...' : otroModal.isOpen ? 'Complete el campo "Otro"' : '👁️ Vista previa'}
				</button>
				<button className="ga-btn primary" onClick={generate} disabled={!readyToGenerate || otroModal.isOpen || generating}>
					{generating ? 'Generando...' : otroModal.isOpen ? 'Complete el campo "Otro"' : 'Generar informe y PDF'}
				</button>
				<span className="ga-right" style={{ 
					color: saving === 'saving' ? '#f59e0b' : saving === 'saved' ? '#10b981' : saving === 'error' ? '#ef4444' : 'var(--muted)',
					fontWeight: saving !== 'idle' ? 500 : 'normal'
				}}>
					{saving === 'saving' ? 'Guardando en DB...' : saving === 'saved' ? '✓ Guardado en DB' : saving === 'error' ? '✗ Error al guardar' : 'Listo para guardar'}
				</span>
			</div>

			{errors.length > 0 && (
				<div style={{ marginTop: 8, color: '#b00' }}>
					<b>Errores de esquema:</b>
					<ul>
						{errors.map((e, i) => (<li key={i}>{e}</li>))}
					</ul>
				</div>
			)}

			{apiResp?.pdfUrl && (
				<div style={{ marginTop: 12 }}>
					<b>PDF:</b> <a href={apiResp.pdfUrl} target="_blank" rel="noreferrer">{apiResp.pdfUrl}</a>
				</div>
			)}

			<div className="ga-toast-wrap">
				{toasts.map((t) => (
					<div 
						key={t.id} 
						className={`ga-toast ${t.type}`} 
						onAnimationEnd={() => {
							if (!t.expiresAt) {
								const expiresAt = Date.now() + 5000;
								setToasts(prev => prev.map(toast => 
									toast.id === t.id ? { ...toast, expiresAt } : toast
								));
								setTimeout(() => {
									setToasts(prev => prev.filter(toast => toast.id !== t.id));
								}, 5000);
							}
						}}
					>
						{t.text}
					</div>
				))}
			</div>

			<Modal isOpen={modalOpen.isOpen && modalOpen.key === 'circuloApoyo'} onClose={closeModal} title="Instrucciones - Círculo de Apoyo">
				<div style={{ fontSize: 14, lineHeight: 1.6 }}>
					<p style={{ marginBottom: 12 }}>
						<strong>Instrucción general:</strong> En general se debe marcar todas las opciones posibles y especificar si es necesario.
					</p>
					<p style={{ marginBottom: 12 }}>
						<strong>Integrantes:</strong> Debe responder con el nombre completo. Ejemplo: "Madre Analía", "Padre Juan", etc.
					</p>
					<p style={{ marginBottom: 12 }}>
						<strong>9.1 ¿Quiénes lo acompañaron con mayor compromiso?</strong> Marcar todos los que correspondan. Menciona el nombre de las personas.
					</p>
					<p style={{ marginBottom: 12 }}>
						<strong>Nivel de participación:</strong> La opción "No se convocó adecuadamente" es solo para reflexión interna del facilitador, no aparecerá en el informe final.
					</p>
					<p style={{ marginBottom: 0 }}>
						<strong>Grado de involucramiento:</strong> Se valora si el círculo de apoyo acompaña activamente a la persona, no solo en decisiones importantes, sino también en su vida diaria, respetando sus valores y objetivos personales.
					</p>
				</div>
			</Modal>

			<Modal isOpen={modalOpen.isOpen && modalOpen.key === 'objetivo'} onClose={closeModal} title="Instrucciones - Objetivo del Proceso">
				<div style={{ fontSize: 14, lineHeight: 1.6 }}>
					<p style={{ marginBottom: 12 }}>
						<strong>Nota importante:</strong> El texto marco da el inicio al informe y debe replicarse en todos los informes porque la mirada parte desde el acompañamiento de sus metas, no de lo que creemos que es mejor para él o ella.
					</p>
					<p style={{ marginBottom: 12 }}>
						<strong>2.1 Focos del acompañamiento:</strong> Se promovieron experiencias que fortalecen su autonomía en la vida cotidiana. <strong>Especifique cuáles</strong> usando el lapicito junto a cada opción seleccionada.
					</p>
					<p style={{ marginBottom: 12 }}>
						<strong>2.2 Estrategias implementadas:</strong> <strong>Debe especificar</strong> para cada estrategia seleccionada:
					</p>
					<ul style={{ marginLeft: 20, marginBottom: 12 }}>
						<li>Talleres con objetivos prácticos → <strong>CUALES</strong></li>
						<li>Actividades de la vida diaria → <strong>CUALES</strong></li>
						<li>Dispositivos de apoyo personalizados → <strong>CUALES</strong></li>
						<li>Intervenciones en crisis/emergencias → <strong>EN QUE SITUACION? QUIENES PARTICIPARON? Y CUAL FUE SU ABORDAJE?</strong></li>
						<li>Acompañamiento terapéutico externo → <strong>CUAL?</strong></li>
						<li>Reuniones con el círculo de apoyo → <strong>SI SE REALIZARON SI O NO</strong></li>
						<li>Acciones en la comunidad → <strong>SI HUBO Y DONDE</strong> (comercios, clubes, espacios públicos)</li>
					</ul>
					<p style={{ marginBottom: 0 }}>
						Use el lapicito para agregar estos detalles junto a cada opción seleccionada.
					</p>
				</div>
			</Modal>

			<Modal isOpen={modalOpen.isOpen && modalOpen.key === 'escucha'} onClose={closeModal} title="Instrucciones - Escucha Activa y Autodeterminación">
				<div style={{ fontSize: 14, lineHeight: 1.6 }}>
					<p style={{ marginBottom: 12 }}>
						<strong>Instrucción:</strong> Expresó sus preferencias de forma clara y consistente ELIGIENDO Y TOMANDO DECISIONES. Use el lapicito junto a cada opción para agregar ejemplos o detalles específicos.
					</p>
					<p style={{ marginBottom: 12 }}>
						<strong>3.2 Áreas de interés:</strong> <strong>Se debe marcar todas las opciones necesarias y especificar</strong> usando el lapicito. Ejemplos:
					</p>
					<ul style={{ marginLeft: 20, marginBottom: 12 }}>
						<li>Actividades de la vida cotidiana → <strong>CUAL</strong> (ej: cocina, compras, aseo)</li>
						<li>Oficios → <strong>CUAL</strong> (ej: carpintería, huerta, costura, panadería)</li>
						<li>Cultura → <strong>CUAL</strong> (ej: música, danza, teatro, literatura)</li>
						<li>Viajes o salidas recreativas → <strong>CUALES A DONDE?</strong></li>
						<li>Participación social o comunitaria → <strong>QUE ACTIVIDADES Y DONDE?</strong></li>
					</ul>
					<p style={{ marginBottom: 12 }}>
						<strong>3.3 Nivel de autonomía:</strong> Niveles orientativos para describir la autonomía percibida en actividades y decisiones cotidianas.
					</p>
					<p style={{ marginBottom: 0 }}>
						Recuerde usar el lapicito junto a cada opción seleccionada para agregar detalles específicos y ejemplos concretos.
					</p>
				</div>
			</Modal>

			<Modal isOpen={modalOpen.isOpen && modalOpen.key === 'estadoEmocional'} onClose={closeModal} title="Instrucciones - Estado Emocional y Bienestar Subjetivo">
				<div style={{ fontSize: 14, lineHeight: 1.6 }}>
					<p style={{ marginBottom: 12 }}>
						<strong>Prevalencia de estados emocionales:</strong> Marca la opción correspondiente y <strong>especifica si fuera necesario</strong> usando el lapicito.
					</p>
					<p style={{ marginBottom: 12 }}>
						<strong>Vínculo con el entorno:</strong> <strong>Se debe marcar todas las opciones necesarias y especificar</strong>. Ejemplo: "Se siente cómodo/a en los espacios que frecuenta" → especificar <strong>CUALES</strong> usando el lapicito.
					</p>
					<p style={{ marginBottom: 12 }}>
						<strong>Bienestar subjetivo:</strong> Percepción interna del propio bienestar. <strong>TAMBIÉN DEBE ESPECIFICAR Y MARCAR LO QUE CORRESPONDA</strong>. Para opciones como:
					</p>
					<ul style={{ marginLeft: 20, marginBottom: 12 }}>
						<li>"En ocasiones muestra falta de interés" → <strong>especificar situaciones</strong></li>
						<li>"Verbaliza preocupaciones o miedos" → <strong>¿cuáles?</strong></li>
						<li>"Tiene expectativas, metas o deseos para el futuro" → <strong>¿cuáles?</strong></li>
					</ul>
					<p style={{ marginBottom: 12 }}>
						<strong>4.1 y 4.2 Situaciones que influyeron:</strong> <strong>Marcar todas las que correspondan</strong>.
					</p>
					<p style={{ marginBottom: 12 }}>
						<strong>4.3 Estrategias de acompañamiento:</strong> <strong>Marcar todas las que correspondan. Especificar</strong> usando el lapicito.
					</p>
					<p style={{ marginBottom: 12 }}>
						<strong>Técnicas de autorregulación - Ejemplos para facilitadores:</strong>
					</p>
					<ul style={{ marginLeft: 20, marginBottom: 0 }}>
						<li>Usa respiración, pausas o cuenta mental para calmarse</li>
						<li>Se aleja del estímulo o del lugar voluntariamente</li>
						<li>Identifica y expresa lo que siente</li>
						<li>Recurre a adultos o referentes cuando necesita ayuda</li>
						<li>Utiliza apoyos visuales (emoticones, pictogramas, etc.)</li>
						<li>Emplea técnicas aprendidas (relajación, yoga, etc.)</li>
						<li>Realiza movimientos corporales para regularse</li>
						<li>Usa objetos sensoriales o actividades artísticas para calmarse</li>
						<li>Solicita momentos de silencio o tiempo a solas</li>
						<li>Avisa o anticipa cuando se siente mal</li>
						<li>Escucha sugerencias y pone en práctica estrategias</li>
					</ul>
				</div>
			</Modal>

			<Modal isOpen={modalOpen.isOpen && modalOpen.key === 'apoyosAjustes'} onClose={closeModal} title="Instrucciones - Apoyos y Ajustes Brindados">
				<div style={{ fontSize: 14, lineHeight: 1.6 }}>
					<div style={{ padding: 12, background: '#f0f7ff', borderRadius: 8, marginBottom: 16 }}>
						<p style={{ margin: '0 0 8px 0' }}>
							<strong>En la PCP, los apoyos</strong> son todas aquellas estrategias, servicios, recursos humanos o materiales que se implementan para que la persona pueda desarrollar su vida con autonomía y dignidad, en función de sus propios proyectos de vida.
						</p>
						<p style={{ margin: 0 }}>
							<strong>Los ajustes razonables</strong> son modificaciones o adaptaciones necesarias y adecuadas que no imponen una carga desproporcionada, para garantizar que la persona pueda disfrutar o ejercer, en igualdad de condiciones con las demás, todos sus derechos.
						</p>
					</div>
					<p style={{ marginBottom: 12 }}>
						<strong>5.1 Apoyos:</strong> <strong>Marcar todos los que correspondan</strong>, considerando necesidades, intereses y preferencias de la persona. Use el lapicito para especificar detalles cuando sea necesario.
					</p>
					<p style={{ marginBottom: 12 }}>
						<strong>5.3 Ajustes razonables:</strong> Marcar o describir según corresponda. Use el lapicito para especificar detalles.
					</p>
					<p style={{ marginBottom: 0 }}>
						<strong>Contextos de aplicación:</strong> Indicar en qué contextos se aplicaron los apoyos y ajustes (talleres, hogar, comunidad, transporte, salud, recreación, etc.).
					</p>
				</div>
			</Modal>

			<Modal isOpen={modalOpen.isOpen && modalOpen.key === 'suenosMetas'} onClose={closeModal} title="Instrucciones - Sueños y Metas a Futuro">
				<div style={{ fontSize: 14, lineHeight: 1.6 }}>
					<p style={{ marginBottom: 12 }}>
						<strong>8.1 Metas o sueños:</strong> Marcar las que correspondan. <strong>ESPECIFIQUE</strong> para cada meta seleccionada usando el lapicito. Ejemplos:
					</p>
					<ul style={{ marginLeft: 20, marginBottom: 12 }}>
						<li>Convivir con pareja o amistades → <strong>ESPECIFIQUE</strong></li>
						<li>Obtener empleo → <strong>ESPECIFIQUE</strong></li>
						<li>Formar una familia → <strong>ESPECIFIQUE</strong></li>
						<li>Viajar → <strong>ESPECIFIQUE</strong> (¿a dónde?, ¿con quién?)</li>
						<li>Estudiar o capacitarse → <strong>ESPECIFIQUE</strong> (¿qué quiere estudiar?)</li>
						<li>Mudarse solo/a → <strong>ESPECIFIQUE</strong></li>
						<li>Tener un emprendimiento → <strong>ESPECIFIQUE</strong></li>
					</ul>
					<p style={{ marginBottom: 0 }}>
						<strong>8.2 Recursos necesarios:</strong> <strong>Marcar todos los que correspondan</strong> para avanzar hacia esas metas.
					</p>
				</div>
			</Modal>

			<Modal 
				isOpen={previewModal.isOpen} 
				onClose={() => setPreviewModal({ isOpen: false, html: '' })} 
				title="Vista previa del informe"
			>
				<div style={{ fontSize: 12, marginBottom: 16, padding: 12, background: '#f0f7ff', borderRadius: 8 }}>
					<strong>Vista previa:</strong> Esta es cómo se verá el informe en el PDF. Puede cerrar este modal y hacer cambios antes de generar el PDF final.
				</div>
				<div 
					dangerouslySetInnerHTML={{ __html: previewModal.html }}
					style={{ 
						border: '1px solid #ddd', 
						borderRadius: 8, 
						padding: 16, 
						background: 'white',
						maxHeight: '70vh',
						overflow: 'auto'
					}}
				/>
				<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
					<button className="ga-btn" onClick={() => setPreviewModal({ isOpen: false, html: '' })}>
						Cerrar
					</button>
					<button className="ga-btn primary" onClick={() => {
						setPreviewModal({ isOpen: false, html: '' });
						generate();
					}} disabled={generating}>
						Generar PDF
					</button>
				</div>
			</Modal>

			<Modal 
				isOpen={otroModal.isOpen} 
				onClose={cancelOtroModal} 
				title={`Especificar "${otroModal.option}" - Campo obligatorio`}
			>
				<div style={{ marginBottom: 16 }}>
					<label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
						Por favor, especifique el detalle de "{otroModal.option}":
					</label>
					<textarea
						className="ga-input ga-textarea-large"
						value={otroModal.value}
						onChange={(e) => setOtroModal({ ...otroModal, value: e.target.value })}
						placeholder="Ingrese el detalle aquí..."
						style={{ minHeight: 120, width: '100%' }}
						autoFocus
					/>
					<small style={{ display: 'block', marginTop: 8, color: '#666' }}>
						Este campo es obligatorio. No podrá continuar hasta completarlo.
					</small>
				</div>
				<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
					<button className="ga-btn" onClick={cancelOtroModal}>
						Cancelar
					</button>
					<button 
						className="ga-btn primary" 
						onClick={saveOtroModal}
						disabled={!otroModal.value.trim()}
					>
						Guardar y continuar
					</button>
				</div>
			</Modal>

			<Modal isOpen={modalOpen.isOpen && modalOpen.key === 'experiencias'} onClose={closeModal} title="Instrucciones - Experiencias Significativas">
				<div style={{ fontSize: 14, lineHeight: 1.6 }}>
					<p style={{ marginBottom: 12 }}>
						<strong>7.2 ¿Participó de nuevas experiencias significativas durante el período evaluado?</strong>
					</p>
					<p style={{ marginBottom: 12 }}>
						<strong>Si seleccionó "Sí, participó con entusiasmo y de manera activa":</strong> Se involucró de forma autónoma, con interés y disfrute. Mostró iniciativa, alegría y apertura a la experiencia.
					</p>
					<p style={{ marginBottom: 12 }}>
						<strong>Si seleccionó "Sí, participó con apoyo o acompañamiento":</strong> Se sumó a las experiencias con cierto grado de apoyo, mostrando disposición parcial o requerimientos específicos para involucrarse.
					</p>
					<p style={{ marginBottom: 12 }}>
						<strong>Tipos de experiencias vividas:</strong> <strong>Marcar todas las que correspondan</strong>.
					</p>
					<p style={{ marginBottom: 12 }}>
						<strong>Tipo de apoyo brindado:</strong> <strong>Marcar todos los que correspondan</strong>. Ejemplos:
					</p>
					<ul style={{ marginLeft: 20, marginBottom: 12 }}>
						<li>Apoyo emocional (motivación, contención, refuerzo de seguridad)</li>
						<li>Apoyo físico o técnico (acompañamiento en desplazamientos, ayudas técnicas)</li>
						<li>Facilitación comunicacional (uso de SAAC, apoyo en la comprensión o interacción)</li>
						<li>Adaptaciones en la actividad (materiales, tiempos, roles, estructura)</li>
					</ul>
					<p style={{ marginBottom: 12 }}>
						<strong>Si seleccionó "No participó por decisión propia":</strong> Se le ofrecieron oportunidades de participar, pero expresó rechazo o falta de interés. <strong>Marcar los motivos que correspondan</strong>.
					</p>
					<p style={{ marginBottom: 0 }}>
						<strong>Detalle de la experiencia vivida:</strong> Use el campo de texto para describir en detalle las experiencias significativas del período.
					</p>
				</div>
			</Modal>

			<div className={`ga-save-status ${saving}`}>
				{saving === 'saving' && <>⏳ Guardando cambios...</>}
				{saving === 'saved' && <>✅ Cambios guardados</>}
				{saving === 'error' && <>❌ Error al guardar</>}
			</div>
		</div>);
}

export default function FormPage() {
	const { data: session, status } = useSession();
	const router = useRouter();

	useEffect(() => {
		if (status === 'unauthenticated') {
			console.log('[FormPage] No autenticado, redirigiendo a login');
			router.push('/login');
		}
	}, [status, router]);

	if (status === 'loading') {
		return <div style={{ padding: 20, textAlign: 'center' }}>Cargando...</div>;
	}
	
	if (status === 'unauthenticated') {
		return <div style={{ padding: 20, textAlign: 'center' }}>Redirigiendo al login...</div>;
	}

	return <FormContent />;
}
