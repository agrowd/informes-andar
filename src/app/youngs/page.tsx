"use client";

import { useEffect, useMemo, useState } from 'react';
import ImageUpload from '../_components/ImageUpload';
import QualityOfLifeChart from '../_components/QualityOfLifeChart';
import ExcelImportWizardModal from '../_components/ExcelImportWizardModal';
import { integrantesCirculoTipos } from '@/lib/form/options';

type Young = {
  _id?: string;
  id?: string;
  nombreCompleto?: string;
  dni?: string;
  taller?: string;
  legajo?: string;
  obraSocial?: string;
  assignedFacilitators?: string[];
  fechaNacimiento?: string | null;
  foto?: string;
  circuloApoyo?: Array<{ nombre?: string; vinculo?: string }>;
  pcp?: any;
};

export default function YoungsPage() {
  const [items, setItems] = useState<Young[]>([]);
  const [facilitadores, setFacilitadores] = useState<any[]>([]);
  const [talleres, setTalleres] = useState<any[]>([]);
  const [form, setForm] = useState<Young>({
    nombreCompleto: '',
    dni: '',
    taller: '',
    legajo: '',
    obraSocial: '',
    assignedFacilitators: [],
    fechaNacimiento: '',
    foto: '',
    circuloApoyo: [],
    pcp: {}
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Estados de navegación
  const [view, setView] = useState<'list' | 'detail' | 'create'>('list');
  const [selectedYoung, setSelectedYoung] = useState<Young | null>(null);
  const [activeTab, setActiveTab] = useState<'perfil' | 'pcp' | 'asignaciones' | 'historial' | 'analiticas'>('perfil');
  const [reportsHistory, setReportsHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [monthlyForms, setMonthlyForms] = useState<any[]>([]);
  const [loadingMonthlyForms, setLoadingMonthlyForms] = useState(false);
  const [selectedFormIds, setSelectedFormIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [generatingTrimestral, setGeneratingTrimestral] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [evolutionData, setEvolutionData] = useState<any[]>([]);
  const [loadingEvolution, setLoadingEvolution] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Estados de generación de PCP con IA
  const [showPcpAiModal, setShowPcpAiModal] = useState(false);
  const [pcpAiPrompt, setPcpAiPrompt] = useState('');
  const [generatingPcp, setGeneratingPcp] = useState(false);

  // Estados de asistente de importación Excel
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [importWizardYoungId, setImportWizardYoungId] = useState('');
  const [importWizardMonths, setImportWizardMonths] = useState<any[]>([]);

  // Sub-pestañas PCP
  const [pcpSubTab, setPcpSubTab] = useState<'rutinas' | 'perfil' | 'planFuturo'>('rutinas');

  const handlePrintPcp = () => {
    if (!form.pcp?.anio) return alert('No hay PCP activa para imprimir');
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert('Permite las ventanas emergentes para imprimir');

    const suenosList = (form.pcp?.perfil?.suenos || []).map((s: string) => `<li>${s}</li>`).join('') || '<li>No registrado</li>';
    const capList = (form.pcp?.perfil?.capacidades || []).map((c: string) => `<li>${c}</li>`).join('') || '<li>No registrado</li>';
    
    const dims = [
      { id: 'BF', nombre: 'Bienestar Físico (BF)' },
      { id: 'DP', nombre: 'Desarrollo Personal (DP)' },
      { id: 'RI', nombre: 'Relaciones Interpersonales (RI)' },
      { id: 'IS', nombre: 'Inclusión Social (IS)' },
      { id: 'BE', nombre: 'Bienestar Emocional (BE)' },
      { id: 'AU', nombre: 'Autodeterminación (AU)' },
      { id: 'BM', nombre: 'Bienestar Material (BM)' },
      { id: 'DR', nombre: 'Derechos (DR)' }
    ];
    
    const pfRows = dims.map(d => {
      const pfObj = form.pcp?.planFuturo?.[d.id] || { objetivos: '', espacios: '', apoyos: '', responsables: '' };
      return `
        <tr>
          <td style="font-weight: bold; background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; font-size: 13px;">${d.nombre}</td>
          <td style="border: 1px solid #cbd5e1; padding: 10px; font-size: 13px;">${pfObj.objetivos || '—'}</td>
          <td style="border: 1px solid #cbd5e1; padding: 10px; font-size: 13px;">${pfObj.espacios || '—'}</td>
          <td style="border: 1px solid #cbd5e1; padding: 10px; font-size: 13px;">${pfObj.apoyos || '—'}</td>
          <td style="border: 1px solid #cbd5e1; padding: 10px; font-size: 13px;">${pfObj.responsables || '—'}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>PCP - ${form.nombreCompleto}</title>
          <style>
            body { font-family: 'Georgia', serif; color: #1e293b; padding: 40px; line-height: 1.6; }
            h1 { text-align: center; color: #1e3a8a; margin-bottom: 5px; }
            .header-info { text-align: center; color: #64748b; margin-bottom: 40px; font-size: 14px; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 18px; font-weight: bold; color: #1e3a8a; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 15px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 13px; color: #475569; }
            td { border: 1px solid #cbd5e1; padding: 10px; }
            ul { padding-left: 20px; margin: 5px 0; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; text-align: right;">
            <button onclick="window.print()" style="padding: 10px 20px; font-size: 14px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">🖨️ Imprimir Documento</button>
          </div>
          <h1>Planificación Centrada en la Persona (PCP)</h1>
          <div class="header-info">
            <strong>Concurrente:</strong> ${form.nombreCompleto} | <strong>Año PCP:</strong> ${form.pcp?.anio} | <strong>Taller:</strong> ${form.taller || '—'}
          </div>
          
          <div class="section">
            <div class="section-title">1. Mapa de Rutinas</div>
            <div class="grid">
              <div class="card">
                <strong>Mi Semana (Lunes a Viernes):</strong>
                <p>${form.pcp?.rutinas?.semana || '—'}</p>
              </div>
              <div class="card">
                <strong>Fin de Semana:</strong>
                <p>${form.pcp?.rutinas?.finDeSemana || '—'}</p>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">2. Perfil de la Persona</div>
            <div class="grid">
              <div class="card">
                <strong>Metas y Sueños:</strong>
                <ul>${suenosList}</ul>
              </div>
              <div class="card">
                <strong>Capacidades:</strong>
                <ul>${capList}</ul>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">3. Resultados de Escalas de Calidad de Vida</div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
              <div class="card" style="text-align: center;">
                <div style="font-weight: bold; color: #475569;">GENCAT</div>
                <div style="font-size: 16px; margin-top: 5px; font-weight: bold;">${form.pcp?.perfil?.resultadosEscalas?.gencat || '—'}</div>
              </div>
              <div class="card" style="text-align: center;">
                <div style="font-weight: bold; color: #475569;">SIS</div>
                <div style="font-size: 16px; margin-top: 5px; font-weight: bold;">${form.pcp?.perfil?.resultadosEscalas?.sis || '—'}</div>
              </div>
              <div class="card" style="text-align: center;">
                <div style="font-weight: bold; color: #475569;">INICO-FEAPS</div>
                <div style="font-size: 16px; margin-top: 5px; font-weight: bold;">${form.pcp?.perfil?.resultadosEscalas?.inico || '—'}</div>
              </div>
              <div class="card" style="text-align: center;">
                <div style="font-weight: bold; color: #475569;">SAN MARTIN</div>
                <div style="font-size: 16px; margin-top: 5px; font-weight: bold;">${form.pcp?.perfil?.resultadosEscalas?.sanMartin || '—'}</div>
              </div>
            </div>
          </div>

          <div class="section" style="page-break-before: always;">
            <div class="section-title">4. Plan de Futuro Personal</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 150px;">Dimensión</th>
                  <th>Objetivos</th>
                  <th>Espacios</th>
                  <th>Apoyos</th>
                  <th>Responsables</th>
                </tr>
              </thead>
              <tbody>
                ${pfRows}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleGeneratePcp = async () => {
    if (!pcpAiPrompt.trim()) return alert('Por favor escribe una descripción de prueba');
    setGeneratingPcp(true);
    try {
      const res = await fetch('/api/youngs/generate-pcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: pcpAiPrompt })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.pcp) {
          const generatedPcp = initializePCP(json.pcp);
          setForm(prev => ({ ...prev, pcp: generatedPcp }));
          setShowPcpAiModal(false);
          setPcpAiPrompt('');
          alert('✨ PCP generada con éxito por la IA. Revísala en esta pestaña PCP y haz click en "Guardar Datos PCP" abajo para persistir los cambios.');
        } else {
          alert('No se pudo generar la estructura de PCP.');
        }
      } else {
        const json = await res.json();
        alert(json.error || 'Error al generar PCP con IA');
      }
    } catch (err) {
      console.error('Error generando PCP:', err);
      alert('Error de conexión al generar PCP');
    } finally {
      setGeneratingPcp(false);
    }
  };

  const handleWizardSuccess = (reportId: string) => {
    if (editingId) {
      loadReportsHistory(String(editingId));
      loadEvolution(String(editingId));
    }
    setActiveTab('historial');
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('/api/youngs/import-excel', {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        const json = await res.json();
        loadYoungs();
        if (json.importedMonths && json.importedMonths.length > 0) {
          setImportWizardYoungId(json.youngId || '');
          setImportWizardMonths(json.importedMonths);
          setImportWizardOpen(true);
        } else {
          alert(json.message || 'Excel importado correctamente');
        }
        if (json.youngId) {
          const params = new URLSearchParams({ page: '1', pageSize: '20' });
          const fetchRes = await fetch(`/api/youngs?${params.toString()}`);
          if (fetchRes.ok) {
            const fetchJson = await fetchRes.json();
            setItems(fetchJson.items || []);
            const imported = (fetchJson.items || []).find((y: any) => String(y.id || y._id) === String(json.youngId));
            if (imported) {
              openDetail(imported);
            }
          }
        }
      } else {
        const json = await res.json();
        alert(json.error || 'Error al importar el archivo Excel');
      }
    } catch (err) {
      console.error('Error importando Excel:', err);
      alert('Error de conexión al importar Excel');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const loadYoungs = async (pageNum: number = page) => {
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        pageSize: '20'
      });
      const res = await fetch(`/api/youngs?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setItems(json.items || []);
      setTotalPages(json.totalPages || 1);
      setTotal(json.total || 0);
      setPage(pageNum);
    } catch (error) {
      console.error('Error cargando jóvenes:', error);
    }
  };

  const loadReportsHistory = async (youngId: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/reports?youngId=${youngId}`);
      if (res.ok) {
        const json = await res.json();
        setReportsHistory(json.items || []);
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadMonthlyForms = async (youngId: string) => {
    setLoadingMonthlyForms(true);
    try {
      const res = await fetch(`/api/forms?youngId=${youngId}&pageSize=100`);
      if (res.ok) {
        const json = await res.json();
        setMonthlyForms(json.items || []);
      }
    } catch (error) {
      console.error('Error cargando borradores mensuales:', error);
    } finally {
      setLoadingMonthlyForms(false);
    }
  };

  const duplicateMonthlyForm = async (id: string, currentPeriod: string) => {
    let sugerido = '';
    if (currentPeriod) {
      const match = currentPeriod.match(/^(\d{4})-(\d{2})$/);
      if (match) {
        let year = parseInt(match[1]);
        let month = parseInt(match[2]);
        month++;
        if (month > 12) {
          month = 1;
          year++;
        }
        sugerido = `${year}-${String(month).padStart(2, '0')}`;
      }
    }
    
    const nuevoPeriodo = prompt(
      `¿Para qué período (mes) deseas duplicar este borrador?\n(Formato sugerido: AAAA-MM)`,
      sugerido || currentPeriod || ''
    );
    
    if (nuevoPeriodo === null) return;
    const trimmed = nuevoPeriodo.trim();
    if (!trimmed) {
      alert('Debes ingresar un período válido.');
      return;
    }
    
    try {
      const res = await fetch(`/api/forms/${id}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodo: trimmed })
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Error duplicando formulario' }));
        throw new Error(error.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      alert('✅ Borrador duplicado correctamente. Serás redirigido para editarlo.');
      window.location.href = `/form?formId=${data.id}`;
    } catch (error: any) {
      console.error('Error duplicando borrador:', error);
      alert('Error: ' + (error.message || 'No se pudo duplicar el borrador'));
    }
  };

  const handleGenerateTrimestralForYoung = async () => {
    const selectedIdsArray = Array.from(selectedFormIds);
    if (selectedIdsArray.length < 1 || selectedIdsArray.length > 3) {
      alert('Selecciona entre 1 y 3 borradores mensuales.');
      return;
    }
    
    setGeneratingTrimestral(true);
    try {
      const res = await fetch('/api/reports/trimestral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formIds: selectedIdsArray })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error generando informe trimestral' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const result = await res.json();
      alert('✅ Informe Trimestral generado con éxito. Se iniciará la descarga en formato Word.');
      
      setSelectedFormIds(new Set());
      setSelectionMode(false);
      
      const youngId = form.id || form._id;
      if (youngId) {
        loadReportsHistory(youngId);
      }
      
      window.location.href = `/api/reports/${result.reportId}/.docx`;
    } catch (error: any) {
      console.error('Error al generar informe trimestral:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setGeneratingTrimestral(false);
    }
  };

  const loadEvolution = async (youngId: string) => {
    setLoadingEvolution(true);
    try {
      const res = await fetch(`/api/youngs/${youngId}/evolution`);
      if (res.ok) {
        const json = await res.json();
        setEvolutionData(json.evolution || []);
      }
    } catch (error) {
      console.error('Error cargando evolución:', error);
    } finally {
      setLoadingEvolution(false);
    }
  };

  useEffect(() => {
    loadYoungs();
    fetch('/api/users').then(r => r.json()).then(j => setFacilitadores(j.items || []));
    fetch('/api/talleres').then(r => r.json()).then(j => setTalleres(j.items || []));
  }, []);

  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    const normalized = value.includes('T') ? value.split('T')[0] : value;
    const parts = normalized.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return value;
  };

  const renderAvatar = (young: Young, size = 110) => {
    if (young.foto) {
      return (
        <div className="avatar-wrap" style={{ width: size, height: size }}>
          <img
            src={young.foto}
            alt={young.nombreCompleto}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      );
    }
    return (
      <div className="avatar-wrap" style={{ 
        width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', color: '#4338ca', fontSize: size * 0.4, fontWeight: 800
      }}>
        {young.nombreCompleto?.[0]?.toUpperCase() || 'J'}
      </div>
    );
  };

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const v = search.toLowerCase();
    return items.filter(y => y.nombreCompleto?.toLowerCase().includes(v) || y.dni?.includes(v));
  }, [items, search]);

  const initializePCP = (pcp?: any) => {
    const base = pcp || {};
    return {
      anio: base.anio || '',
      rutinas: {
        semana: base.rutinas?.semana || '',
        finDeSemana: base.rutinas?.finDeSemana || ''
      },
      perfil: {
        suenos: Array.isArray(base.perfil?.suenos) ? base.perfil.suenos : [],
        capacidades: Array.isArray(base.perfil?.capacidades) ? base.perfil.capacidades : [],
        resultadosEscalas: {
          gencat: base.perfil?.resultadosEscalas?.gencat || '',
          sis: base.perfil?.resultadosEscalas?.sis || '',
          inico: base.perfil?.resultadosEscalas?.inico || '',
          sanMartin: base.perfil?.resultadosEscalas?.sanMartin || ''
        }
      },
      planFuturo: {
        BF: {
          objetivos: base.planFuturo?.BF?.objetivos || '',
          espacios: base.planFuturo?.BF?.espacios || '',
          apoyos: base.planFuturo?.BF?.apoyos || '',
          responsables: base.planFuturo?.BF?.responsables || ''
        },
        DP: {
          objetivos: base.planFuturo?.DP?.objetivos || '',
          espacios: base.planFuturo?.DP?.espacios || '',
          apoyos: base.planFuturo?.DP?.apoyos || '',
          responsables: base.planFuturo?.DP?.responsables || ''
        },
        RI: {
          objetivos: base.planFuturo?.RI?.objetivos || '',
          espacios: base.planFuturo?.RI?.espacios || '',
          apoyos: base.planFuturo?.RI?.apoyos || '',
          responsables: base.planFuturo?.RI?.responsables || ''
        },
        IS: {
          objetivos: base.planFuturo?.IS?.objetivos || '',
          espacios: base.planFuturo?.IS?.espacios || '',
          apoyos: base.planFuturo?.IS?.apoyos || '',
          responsables: base.planFuturo?.IS?.responsables || ''
        },
        BE: {
          objetivos: base.planFuturo?.BE?.objetivos || '',
          espacios: base.planFuturo?.BE?.espacios || '',
          apoyos: base.planFuturo?.BE?.apoyos || '',
          responsables: base.planFuturo?.BE?.responsables || ''
        },
        AU: {
          objetivos: base.planFuturo?.AU?.objetivos || '',
          espacios: base.planFuturo?.AU?.espacios || '',
          apoyos: base.planFuturo?.AU?.apoyos || '',
          responsables: base.planFuturo?.AU?.responsables || ''
        },
        BM: {
          objetivos: base.planFuturo?.BM?.objetivos || '',
          espacios: base.planFuturo?.BM?.espacios || '',
          apoyos: base.planFuturo?.BM?.apoyos || '',
          responsables: base.planFuturo?.BM?.responsables || ''
        },
        DR: {
          objetivos: base.planFuturo?.DR?.objetivos || '',
          espacios: base.planFuturo?.DR?.espacios || '',
          apoyos: base.planFuturo?.DR?.apoyos || '',
          responsables: base.planFuturo?.DR?.responsables || ''
        }
      }
    };
  };

  const resetForm = () => {
    setForm({ nombreCompleto: '', dni: '', taller: '', legajo: '', obraSocial: '', assignedFacilitators: [], fechaNacimiento: '', foto: '', circuloApoyo: [], pcp: initializePCP() });
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.nombreCompleto) return alert('El nombre es obligatorio');
    
    setIsSaving(true);
    try {
      const url = editingId ? `/api/youngs/${editingId}` : '/api/youngs';
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        alert('Cambios guardados con éxito');
        loadYoungs();
        if (!editingId) setView('list');
        else {
          setSelectedYoung({...form});
          setActiveTab('perfil');
        }
      } else {
        alert('Error al guardar los datos');
      }
    } catch (err) {
      alert('Error de conexión al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const openDetail = (young: Young) => {
    setSelectedYoung(young);
    setEditingId(young.id || young._id || null);
    setForm({ 
      ...young, 
      nombreCompleto: young.nombreCompleto || '',
      dni: young.dni || '',
      taller: young.taller || '',
      legajo: young.legajo || '',
      obraSocial: young.obraSocial || '',
      fechaNacimiento: young.fechaNacimiento?.split('T')[0] || '',
      assignedFacilitators: young.assignedFacilitators || [],
      circuloApoyo: young.circuloApoyo || [],
      pcp: initializePCP(young.pcp)
    });
    setView('detail');
    setActiveTab('perfil');
    const id = young.id || young._id;
    if (id) {
      loadReportsHistory(id);
      loadMonthlyForms(id);
      loadEvolution(id);
      setSelectedFormIds(new Set());
      setSelectionMode(false);
    }
  };

  const deleteYoung = async (id: string) => {
    if (!confirm('¿ESTÁS SEGURO? Se borrará permanentemente toda la información de este joven.')) return;
    const res = await fetch(`/api/youngs/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadYoungs();
      setView('list');
      alert('Joven eliminado correctamente');
    }
  };

  // Vistas
  if (view === 'create') {
    return (
      <div className="ga-container">
        <div style={{ marginBottom: 30 }}>
          <button className="ga-btn" onClick={() => setView('list')}>← Volver al listado</button>
        </div>
        <h1>Alta de Nuevo Joven</h1>
        
        <div className="ga-card" style={{ padding: 30 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
            <section>
              <h3 style={{ marginBottom: 15, borderBottom: '2px solid #f1f5f9', paddingBottom: 8 }}>1. Foto y Nombre</h3>
              <div style={{ display: 'flex', gap: 25, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ width: 140 }}>
                  <ImageUpload value={form.foto || ''} onChange={url => setForm({...form, foto: url})} onLoading={setIsUploading} label="Foto" type="young" />
                </div>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <label>Nombre Completo del Joven<br/>
                    <input className="ga-input" style={{ fontSize: 18, padding: 12 }} placeholder="Ej: Juan Pérez" value={form.nombreCompleto} onChange={e => setForm({...form, nombreCompleto: e.target.value})}/>
                  </label>
                </div>
              </div>
            </section>

            <section>
              <h3 style={{ marginBottom: 15, borderBottom: '2px solid #f1f5f9', paddingBottom: 8 }}>2. Información Identitaria</h3>
              <div className="ga-form-grid">
                <label>DNI / Documento<br/><input className="ga-input" placeholder="Solo números" value={form.dni} onChange={e => setForm({...form, dni: e.target.value})}/></label>
                <label>Fecha de Nacimiento<br/><input type="date" className="ga-input" value={form.fechaNacimiento || ''} onChange={e => setForm({...form, fechaNacimiento: e.target.value})}/></label>
                <label>Taller Asignado<br/>
                  <select className="ga-select" value={form.taller} onChange={e => setForm({...form, taller: e.target.value})}>
                    <option value="">Seleccionar taller...</option>
                    {talleres.map(t => <option key={t.id || t._id} value={t.nombre}>{t.nombre}</option>)}
                  </select>
                </label>
              </div>
            </section>

            <section>
              <h3 style={{ marginBottom: 15, borderBottom: '2px solid #f1f5f9', paddingBottom: 8 }}>3. Datos Administrativos</h3>
              <div className="ga-form-grid">
                <label>Nº de Legajo<br/><input className="ga-input" placeholder="0000" value={form.legajo} onChange={e => setForm({...form, legajo: e.target.value})}/></label>
                <label>Obra Social / Prepaga<br/><input className="ga-input" placeholder="Nombre de la cobertura" value={form.obraSocial} onChange={e => setForm({...form, obraSocial: e.target.value})}/></label>
              </div>
            </section>
          </div>
          
          <div style={{ marginTop: 40, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <button className="ga-btn primary" style={{ padding: '12px 40px', fontSize: 16 }} onClick={handleSave} disabled={isSaving || isUploading}>
              {isSaving ? 'Guardando...' : isUploading ? 'Subiendo foto...' : 'Finalizar Alta'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'detail' && selectedYoung) {
    return (
      <div className="ga-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 30 }}>
          <button className="ga-btn" onClick={() => setView('list')} style={{ padding: '8px 12px' }}>← Volver</button>
          <h1 style={{ margin: 0 }}>Perfil de {selectedYoung.nombreCompleto}</h1>
        </div>

        <div className="ga-tabs-nav">
          <button className={`ga-tab ${activeTab === 'perfil' ? 'active' : ''}`} onClick={() => setActiveTab('perfil')}>Ficha Técnica</button>
          <button className={`ga-tab ${activeTab === 'pcp' ? 'active' : ''}`} onClick={() => setActiveTab('pcp')}>PCP</button>
          <button className={`ga-tab ${activeTab === 'asignaciones' ? 'active' : ''}`} onClick={() => setActiveTab('asignaciones')}>Seguimiento</button>
          <button className={`ga-tab ${activeTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveTab('historial')}>Historial</button>
          <button className={`ga-tab ${activeTab === 'analiticas' ? 'active' : ''}`} onClick={() => setActiveTab('analiticas')}>Analíticas</button>
        </div>

        {activeTab === 'perfil' && (
          <div className="ga-card" style={{ padding: 30 }}>
            <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap' }}>
              <div style={{ width: 180 }}>
                <ImageUpload value={form.foto || ''} onChange={url => setForm({...form, foto: url})} onLoading={setIsUploading} label="Cambiar Foto" type="young" />
              </div>
              <div style={{ flex: 1, minWidth: 300 }}>
                <div className="ga-form-grid">
                  <label style={{ gridColumn: '1/-1' }}>Nombre Completo<br/><input className="ga-input" value={form.nombreCompleto} onChange={e => setForm({...form, nombreCompleto: e.target.value})}/></label>
                  <label>DNI<br/><input className="ga-input" value={form.dni} onChange={e => setForm({...form, dni: e.target.value})}/></label>
                  <label>Fecha Nacimiento<br/><input type="date" className="ga-input" value={form.fechaNacimiento || ''} onChange={e => setForm({...form, fechaNacimiento: e.target.value})}/></label>
                  <label>Nº Legajo<br/><input className="ga-input" value={form.legajo} onChange={e => setForm({...form, legajo: e.target.value})}/></label>
                  <label>Obra Social<br/><input className="ga-input" value={form.obraSocial} onChange={e => setForm({...form, obraSocial: e.target.value})}/></label>
                </div>
              </div>
            </div>

            <h3 style={{ marginTop: 40, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>Círculo de Apoyo</h3>
            <div style={{ marginTop: 15 }}>
              {(form.circuloApoyo || []).map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <select className="ga-select" style={{ width: 180 }} value={m.vinculo} onChange={e => {
                    const next = [...form.circuloApoyo!]; next[i] = {...next[i], vinculo: e.target.value}; setForm({...form, circuloApoyo: next});
                  }}>
                    <option value="">Vínculo...</option>
                    {integrantesCirculoTipos.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <input className="ga-input" placeholder="Nombre completo" value={m.nombre} onChange={e => {
                    const next = [...form.circuloApoyo!]; next[i] = {...next[i], nombre: e.target.value}; setForm({...form, circuloApoyo: next});
                  }}/>
                  <button className="ga-btn" style={{ color: 'var(--error)' }} onClick={() => {
                    setForm({...form, circuloApoyo: form.circuloApoyo!.filter((_, idx) => idx !== i)});
                  }}>✕</button>
                </div>
              ))}
              <button className="ga-btn secondary" onClick={() => setForm({...form, circuloApoyo: [...(form.circuloApoyo || []), {nombre:'', vinculo:''}]})}>+ Agregar Integrante</button>
            </div>

            <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: 25 }}>
              <button className="ga-btn primary" style={{ padding: '10px 30px' }} onClick={handleSave} disabled={isSaving || isUploading}>
                {isSaving ? 'Guardando...' : isUploading ? 'Subiendo foto...' : 'Guardar Todos los Cambios'}
              </button>
              <button className="ga-btn" style={{ color: 'white', background: 'var(--error)', border: 'none' }} onClick={() => deleteYoung(selectedYoung.id || selectedYoung._id || '')}>Eliminar Joven Definitivamente</button>
            </div>
          </div>
        )}

        {activeTab === 'pcp' && (
          <div className="ga-card" style={{ padding: 30 }}>
            {/* Header del panel PCP */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 15, flexWrap: 'wrap', gap: 15 }}>
              <h2 style={{ margin: 0 }}>Planificación Centrada en la Persona (PCP)</h2>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {form.pcp?.anio && (
                  <button
                    type="button"
                    className="ga-btn secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, height: 38 }}
                    onClick={handlePrintPcp}
                  >
                    🖨️ Imprimir PCP
                  </button>
                )}
                <button 
                  type="button" 
                  className="ga-btn accent" 
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 16px', fontSize: 13, height: 38 }}
                  onClick={() => setShowPcpAiModal(true)}
                >
                  ✨ Generar con IA
                </button>
                {form.pcp?.anio && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <label style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>Año PCP:</label>
                    <input 
                      className="ga-input" 
                      style={{ width: 80, padding: '6px 10px' }} 
                      value={form.pcp?.anio || ''} 
                      onChange={e => {
                        const nextPcp = { ...form.pcp, anio: e.target.value };
                        setForm({ ...form, pcp: nextPcp });
                      }} 
                      placeholder="Ej: 2026" 
                    />
                  </div>
                )}
              </div>
            </div>

            {!form.pcp?.anio ? (
              /* ESTADO VACÍO (EMPTY STATE) */
              <div style={{
                padding: '50px 20px',
                textAlign: 'center',
                background: '#f8fafc',
                border: '2px dashed #cbd5e1',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                margin: '20px 0'
              }}>
                <div style={{ fontSize: '50px' }}>📋</div>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '18px', fontWeight: 700 }}>Sin PCP Activa para este Concurrente</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px', maxWidth: '480px', lineHeight: '1.6' }}>
                  La Planificación Centrada en la Persona (PCP) es la base estructurada que la IA interpreta para generar informes de calidad. Puedes crearla manualmente de inmediato o generarla automáticamente a partir de una descripción.
                </p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button 
                    type="button" 
                    className="ga-btn accent"
                    style={{ padding: '10px 20px', fontWeight: 700 }}
                    onClick={() => setShowPcpAiModal(true)}
                  >
                    ✨ Generar PCP con IA
                  </button>
                  <button 
                    type="button" 
                    className="ga-btn secondary"
                    style={{ padding: '10px 20px', fontWeight: 600 }}
                    onClick={() => {
                      const nextPcp = initializePCP({ anio: new Date().getFullYear().toString() });
                      setForm({ ...form, pcp: nextPcp });
                    }}
                  >
                    ✍️ Crear PCP Manualmente
                  </button>
                </div>
              </div>
            ) : (
              /* PCP ACTIVA: SUB-TAB NAVIGATION Y CONTENIDO */
              <>
                {/* Sub-tab navigation */}
                <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', paddingBottom: '10px', overflowX: 'auto' }}>
                  <button
                    type="button"
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: 'none',
                      background: pcpSubTab === 'rutinas' ? '#eff6ff' : 'transparent',
                      color: pcpSubTab === 'rutinas' ? '#2563eb' : '#64748b',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                    onClick={() => setPcpSubTab('rutinas')}
                  >
                    🕒 1. Rutinas y Escalas
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: 'none',
                      background: pcpSubTab === 'perfil' ? '#eff6ff' : 'transparent',
                      color: pcpSubTab === 'perfil' ? '#2563eb' : '#64748b',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                    onClick={() => setPcpSubTab('perfil')}
                  >
                    💭 2. Sueños y Capacidades
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: 'none',
                      background: pcpSubTab === 'planFuturo' ? '#eff6ff' : 'transparent',
                      color: pcpSubTab === 'planFuturo' ? '#2563eb' : '#64748b',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                    onClick={() => setPcpSubTab('planFuturo')}
                  >
                    🎯 3. Plan de Futuro Personal
                  </button>
                </div>

                {/* CONTENIDOS SUB-TABS */}
                {pcpSubTab === 'rutinas' && (
                  <div>
                    {/* RUTINAS */}
                    <div style={{ marginBottom: 30 }}>
                      <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: 8, marginBottom: 15, fontSize: '16px', color: '#1e3a8a' }}>Mapa de Rutinas</h3>
                      <div className="ga-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <div>
                          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Mi Semana (Lunes a Viernes)</label>
                          <textarea 
                            rows={6}
                            className="ga-input"
                            value={form.pcp?.rutinas?.semana || ''}
                            onChange={e => {
                              const nextPcp = { ...form.pcp, rutinas: { ...form.pcp?.rutinas, semana: e.target.value } };
                              setForm({ ...form, pcp: nextPcp });
                            }}
                            placeholder="Describe la rutina de lunes a viernes..."
                          />
                        </div>
                        <div>
                          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Fin de Semana (Sábado y Domingo)</label>
                          <textarea 
                            rows={6}
                            className="ga-input"
                            value={form.pcp?.rutinas?.finDeSemana || ''}
                            onChange={e => {
                              const nextPcp = { ...form.pcp, rutinas: { ...form.pcp?.rutinas, finDeSemana: e.target.value } };
                              setForm({ ...form, pcp: nextPcp });
                            }}
                            placeholder="Describe la rutina del fin de semana..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* ESCALAS */}
                    <div style={{ marginBottom: 20 }}>
                      <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: 8, marginBottom: 15, fontSize: '16px', color: '#1e3a8a' }}>Resultados de Escalas de Calidad de Vida</h3>
                      <div className="ga-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                        <div>
                          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>GENCAT</label>
                          <input 
                            className="ga-input"
                            value={form.pcp?.perfil?.resultadosEscalas?.gencat || ''}
                            onChange={e => {
                              const nextPcp = { 
                                ...form.pcp, 
                                perfil: { 
                                  ...form.pcp?.perfil, 
                                  resultadosEscalas: { ...form.pcp?.perfil?.resultadosEscalas, gencat: e.target.value } 
                                } 
                              };
                              setForm({ ...form, pcp: nextPcp });
                            }}
                            placeholder="Resultados GENCAT"
                          />
                        </div>
                        <div>
                          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>SIS</label>
                          <input 
                            className="ga-input"
                            value={form.pcp?.perfil?.resultadosEscalas?.sis || ''}
                            onChange={e => {
                              const nextPcp = { 
                                ...form.pcp, 
                                perfil: { 
                                  ...form.pcp?.perfil, 
                                  resultadosEscalas: { ...form.pcp?.perfil?.resultadosEscalas, sis: e.target.value } 
                                } 
                              };
                              setForm({ ...form, pcp: nextPcp });
                            }}
                            placeholder="Resultados SIS"
                          />
                        </div>
                        <div>
                          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>INICO-FEAPS</label>
                          <input 
                            className="ga-input"
                            value={form.pcp?.perfil?.resultadosEscalas?.inico || ''}
                            onChange={e => {
                              const nextPcp = { 
                                ...form.pcp, 
                                perfil: { 
                                  ...form.pcp?.perfil, 
                                  resultadosEscalas: { ...form.pcp?.perfil?.resultadosEscalas, inico: e.target.value } 
                                } 
                              };
                              setForm({ ...form, pcp: nextPcp });
                            }}
                            placeholder="Resultados INICO"
                          />
                        </div>
                        <div>
                          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>SAN MARTIN</label>
                          <input 
                            className="ga-input"
                            value={form.pcp?.perfil?.resultadosEscalas?.sanMartin || ''}
                            onChange={e => {
                              const nextPcp = { 
                                ...form.pcp, 
                                perfil: { 
                                  ...form.pcp?.perfil, 
                                  resultadosEscalas: { ...form.pcp?.perfil?.resultadosEscalas, sanMartin: e.target.value } 
                                } 
                              };
                              setForm({ ...form, pcp: nextPcp });
                            }}
                            placeholder="Resultados SAN MARTIN"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {pcpSubTab === 'perfil' && (
                  <div>
                    {/* SUEÑOS Y CAPACIDADES */}
                    <div style={{ marginBottom: 20 }}>
                      <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: 8, marginBottom: 15, fontSize: '16px', color: '#1e3a8a' }}>Sueños y Capacidades de la Persona</h3>
                      <div className="ga-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        {/* SUEÑOS */}
                        <div>
                          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Sueños del Concurrente</label>
                          {(form.pcp?.perfil?.suenos || []).map((sueno: string, idx: number) => (
                            <div key={idx} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                              <input 
                                className="ga-input"
                                value={sueno}
                                onChange={e => {
                                  const nextSuenos = [...form.pcp.perfil.suenos];
                                  nextSuenos[idx] = e.target.value;
                                  const nextPcp = { ...form.pcp, perfil: { ...form.pcp.perfil, suenos: nextSuenos } };
                                  setForm({ ...form, pcp: nextPcp });
                                }}
                                placeholder="Ingresa un sueño..."
                              />
                              <button type="button" className="ga-btn" style={{ color: 'var(--error)' }} onClick={() => {
                                const nextSuenos = form.pcp.perfil.suenos.filter((_: any, i: number) => i !== idx);
                                const nextPcp = { ...form.pcp, perfil: { ...form.pcp.perfil, suenos: nextSuenos } };
                                setForm({ ...form, pcp: nextPcp });
                              }}>✕</button>
                            </div>
                          ))}
                          <button type="button" className="ga-btn secondary" onClick={() => {
                            const nextSuenos = [...(form.pcp?.perfil?.suenos || []), ''];
                            const nextPcp = { ...form.pcp, perfil: { ...form.pcp?.perfil, suenos: nextSuenos } };
                            setForm({ ...form, pcp: nextPcp });
                          }}>+ Agregar Sueño</button>
                        </div>

                        {/* CAPACIDADES */}
                        <div>
                          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Capacidades y Fortalezas</label>
                          {(form.pcp?.perfil?.capacidades || []).map((capacidad: string, idx: number) => (
                            <div key={idx} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                              <input 
                                className="ga-input"
                                value={capacidad}
                                onChange={e => {
                                  const nextCap = [...form.pcp.perfil.capacidades];
                                  nextCap[idx] = e.target.value;
                                  const nextPcp = { ...form.pcp, perfil: { ...form.pcp.perfil, capacidades: nextCap } };
                                  setForm({ ...form, pcp: nextPcp });
                                }}
                                placeholder="Ingresa una capacidad..."
                              />
                              <button type="button" className="ga-btn" style={{ color: 'var(--error)' }} onClick={() => {
                                const nextCap = form.pcp.perfil.capacidades.filter((_: any, i: number) => i !== idx);
                                const nextPcp = { ...form.pcp, perfil: { ...form.pcp.perfil, capacidades: nextCap } };
                                setForm({ ...form, pcp: nextPcp });
                              }}>✕</button>
                            </div>
                          ))}
                          <button type="button" className="ga-btn secondary" onClick={() => {
                            const nextCap = [...(form.pcp?.perfil?.capacidades || []), ''];
                            const nextPcp = { ...form.pcp, perfil: { ...form.pcp?.perfil, capacidades: nextCap } };
                            setForm({ ...form, pcp: nextPcp });
                          }}>+ Agregar Capacidad</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {pcpSubTab === 'planFuturo' && (
                  <div>
                    {/* PLAN DE FUTURO */}
                    <div style={{ marginBottom: 20 }}>
                      <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: 8, marginBottom: 15, fontSize: '16px', color: '#1e3a8a' }}>Plan de Futuro Personal</h3>
                      <div className="ga-table-mobile-wrap">
                        <table className="ga-table">
                          <thead>
                            <tr style={{ background: '#f8fafc' }}>
                              <th style={{ width: '200px' }}>Dimensión</th>
                              <th>Objetivos</th>
                              <th>Espacios</th>
                              <th>Apoyos</th>
                              <th>Responsables</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { id: 'BF', nombre: 'Bienestar Físico (BF)' },
                              { id: 'DP', nombre: 'Desarrollo Personal (DP)' },
                              { id: 'RI', nombre: 'Relaciones Interpersonales (RI)' },
                              { id: 'IS', nombre: 'Inclusión Social (IS)' },
                              { id: 'BE', nombre: 'Bienestar Emocional (BE)' },
                              { id: 'AU', nombre: 'Autodeterminación (AU)' },
                              { id: 'BM', nombre: 'Bienestar Material (BM)' },
                              { id: 'DR', nombre: 'Derechos (DR)' }
                            ].map(dim => {
                              const dimKey = dim.id;
                              const pfObj = form.pcp?.planFuturo?.[dimKey] || { objetivos: '', espacios: '', apoyos: '', responsables: '' };
                              const handlePfChange = (field: string, val: string) => {
                                const nextPF = { ...form.pcp?.planFuturo };
                                nextPF[dimKey] = { ...pfObj, [field]: val };
                                const nextPcp = { ...form.pcp, planFuturo: nextPF };
                                setForm({ ...form, pcp: nextPcp });
                              };
                              return (
                                <tr key={dim.id}>
                                  <td style={{ fontWeight: 600, fontSize: 13, background: '#f8fafc' }}>{dim.nombre}</td>
                                  <td>
                                    <input 
                                      className="ga-input" 
                                      style={{ padding: 6, fontSize: 13 }}
                                      value={pfObj.objetivos || ''}
                                      onChange={e => handlePfChange('objetivos', e.target.value)}
                                      placeholder="Objetivos..."
                                    />
                                  </td>
                                  <td>
                                    <input 
                                      className="ga-input" 
                                      style={{ padding: 6, fontSize: 13 }}
                                      value={pfObj.espacios || ''}
                                      onChange={e => handlePfChange('espacios', e.target.value)}
                                      placeholder="Espacios..."
                                    />
                                  </td>
                                  <td>
                                    <input 
                                      className="ga-input" 
                                      style={{ padding: 6, fontSize: 13 }}
                                      value={pfObj.apoyos || ''}
                                      onChange={e => handlePfChange('apoyos', e.target.value)}
                                      placeholder="Apoyos..."
                                    />
                                  </td>
                                  <td>
                                    <input 
                                      className="ga-input" 
                                      style={{ padding: 6, fontSize: 13 }}
                                      value={pfObj.responsables || ''}
                                      onChange={e => handlePfChange('responsables', e.target.value)}
                                      placeholder="Responsables..."
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botón de Guardado */}
                <div style={{ marginTop: 40, borderTop: '1px solid #f1f5f9', paddingTop: 25, display: 'flex', justifyContent: 'space-between' }}>
                  <button className="ga-btn primary" style={{ padding: '10px 30px' }} onClick={handleSave} disabled={isSaving || isUploading}>
                    {isSaving ? 'Guardando PCP...' : 'Guardar Datos PCP'}
                  </button>
                  <button
                    type="button"
                    className="ga-btn"
                    style={{ color: '#ef4444', background: 'none', border: '1px solid #fca5a5', padding: '10px 20px' }}
                    onClick={() => {
                      if (confirm('¿Deseas eliminar la PCP de este concurrente? Todos los datos de su planificación del año actual se borrarán.')) {
                        const nextPcp = { ...form.pcp, anio: '' };
                        setForm({ ...form, pcp: nextPcp });
                      }
                    }}
                  >
                    🗑️ Borrar PCP
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'asignaciones' && (
          <div className="ga-card" style={{ padding: 30 }}>
            <h3>Seguimiento y Responsables</h3>
            <div className="ga-form-grid">
              <label>Taller Actual<br/>
                <select className="ga-select" value={form.taller} onChange={e => setForm({...form, taller: e.target.value})}>
                  <option value="">Sin asignar</option>
                  {talleres.map(t => <option key={t.id || t._id} value={t.nombre}>{t.nombre}</option>)}
                </select>
              </label>
              <label style={{ gridColumn: '1/-1' }}>Facilitadores Responsables<br/>
                <select multiple className="ga-select" style={{ height: 200, marginTop: 5 }} value={form.assignedFacilitators} onChange={e => setForm({...form, assignedFacilitators: Array.from(e.target.selectedOptions).map(o => o.value)})}>
                  {facilitadores.map(f => <option key={f.id || f._id} value={f.id || f._id}>{f.name || f.email}</option>)}
                </select>
                <small style={{ color: 'var(--muted)', display: 'block', marginTop: 8 }}>Usa Ctrl/Cmd para seleccionar varios responsables.</small>
              </label>
            </div>
            <button className="ga-btn primary" style={{ marginTop: 30, padding: '10px 30px' }} onClick={handleSave}>Actualizar Seguimiento</button>
          </div>
        )}

        {activeTab === 'historial' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
            {/* Sección de Informes Trimestrales */}
            <div className="ga-card" style={{ padding: 30 }}>
              <h3 style={{ marginBottom: 20, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📄</span> Informes Evolutivos Trimestrales (PDF/Word)
              </h3>
              {loadingHistory ? (
                <div style={{ padding: 40, textAlign: 'center' }}>Cargando informes...</div>
              ) : reportsHistory.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', background: '#f8fafc', borderRadius: 12 }}>
                  No hay informes registrados para este joven.
                </div>
              ) : (
                <div className="ga-table-mobile-wrap">
                  <table className="ga-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Periodo</th>
                        <th>Estado</th>
                        <th style={{ textAlign: 'right' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportsHistory.map(r => (
                        <tr key={r.id} className="ga-table-row-hover">
                          <td>{formatDate(r.createdAt)}</td>
                          <td><strong>{r.periodo}</strong></td>
                          <td><span className={`ga-status-pill ${r.status?.toLowerCase()}`}>{r.status}</span></td>
                          <td style={{ textAlign: 'right' }}>
                            <a href={`/reports/${r.id}`} className="ga-btn secondary" style={{ fontSize: 12, marginRight: 8 }}>Ver Informe Completo</a>
                            <a href={`/api/reports/${r.id}/.docx`} className="ga-btn primary" style={{ fontSize: 12 }}>📥 Descargar Word</a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Sección de Borradores Mensuales (Checklists) */}
            <div className="ga-card" style={{ padding: 30 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                <h3 style={{ margin: 0, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📋</span> Borradores / Formularios Mensuales (Checklists)
                </h3>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button 
                    className={`ga-btn ${selectionMode ? 'accent' : 'secondary'}`}
                    onClick={() => {
                      setSelectionMode(!selectionMode);
                      if (!selectionMode) setSelectedFormIds(new Set());
                    }}
                    style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600 }}
                  >
                    {selectionMode ? '✅ Cancelar Fusión' : '🔗 Fusionar Borradores'}
                  </button>
                  <a 
                    href={`/form?youngId=${editingId}`}
                    className="ga-btn primary"
                    style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <span>➕</span> Nuevo Borrador
                  </a>
                </div>
              </div>

              {selectionMode && (
                <div style={{ 
                  padding: '12px 18px', 
                  background: '#eff6ff', 
                  border: '1px solid #bfdbfe', 
                  borderRadius: '8px',
                  color: '#1e40af',
                  fontSize: '13px',
                  fontWeight: 500,
                  marginBottom: 15
                }}>
                  💡 Selecciona entre 1 y 3 borradores mensuales para generar el informe trimestral.
                </div>
              )}

              {loadingMonthlyForms ? (
                <div style={{ padding: 40, textAlign: 'center' }}>Cargando borradores...</div>
              ) : monthlyForms.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', background: '#f8fafc', borderRadius: 12 }}>
                  No hay borradores mensuales cargados para este joven. Puedes crear uno desde el botón "Nuevo Borrador".
                </div>
              ) : (
                <div className="ga-table-mobile-wrap">
                  <table className="ga-table">
                    <thead>
                      <tr>
                        {selectionMode && <th style={{ width: 40, textAlign: 'center' }}></th>}
                        <th>Período</th>
                        <th>Facilitador</th>
                        <th>Estado</th>
                        <th>Última actualización</th>
                        <th style={{ textAlign: 'center', width: 250 }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyForms.map(it => {
                        const id = it._id || it.id;
                        const isSelected = selectedFormIds.has(id);
                        return (
                          <tr 
                            key={id}
                            className="ga-table-row-hover"
                            style={{
                              background: isSelected ? '#eff6ff' : undefined,
                              cursor: selectionMode ? 'pointer' : undefined
                            }}
                            onClick={selectionMode ? () => {
                              setSelectedFormIds(prev => {
                                const next = new Set(prev);
                                if (next.has(id)) next.delete(id);
                                else next.add(id);
                                return next;
                              });
                            } : undefined}
                          >
                            {selectionMode && (
                              <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                <input 
                                  type="checkbox" 
                                  checked={isSelected}
                                  onChange={() => {
                                    setSelectedFormIds(prev => {
                                      const next = new Set(prev);
                                      if (next.has(id)) next.delete(id);
                                      else next.add(id);
                                      return next;
                                    });
                                  }}
                                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                                />
                              </td>
                            )}
                            <td style={{ fontWeight: 'bold' }}>{it.periodo}</td>
                            <td style={{ fontSize: 13 }}>{it.facilitadorNombre || 'Sin facilitador'}</td>
                            <td>
                              <span className={`ga-badge ${it.status === 'APROBADO' ? 'approved' : it.status === 'EN_REVISION' ? 'review' : 'draft'}`}>
                                {it.status || 'BORRADOR'}
                              </span>
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                              {it.updatedAt ? new Date(it.updatedAt).toLocaleDateString('es-AR') : '—'}
                            </td>
                            <td onClick={e => e.stopPropagation()}>
                              <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                <a 
                                  href={`/form?formId=${id}`} 
                                  className="ga-btn secondary" 
                                  style={{ fontSize: 12, padding: '4px 8px' }}
                                >
                                  ✏️ Editar
                                </a>
                                <a 
                                  href={`/api/forms/${id}/export-excel`} 
                                  className="ga-btn secondary" 
                                  style={{ fontSize: 12, padding: '4px 8px' }}
                                >
                                  📥 Excel
                                </a>
                                <button 
                                  className="ga-btn secondary" 
                                  onClick={() => duplicateMonthlyForm(id, it.periodo)}
                                  style={{ fontSize: 12, padding: '4px 8px' }}
                                  title="Duplicar para el siguiente mes"
                                >
                                  📋 Duplicar
                                </button>
                                <button 
                                  className="ga-btn" 
                                  style={{ background: '#fee2e2', borderColor: '#fca5a5', color: '#991b1b', fontSize: 12, padding: '4px 8px' }}
                                  onClick={async () => {
                                    if (!confirm('¿Estás seguro de que deseas ELIMINAR este borrador mensual?')) return;
                                    try {
                                      const res = await fetch(`/api/forms/${id}`, { method: 'DELETE' });
                                      if (res.ok) {
                                        alert('Borrador eliminado');
                                        if (editingId) loadMonthlyForms(String(editingId));
                                      } else {
                                        alert('Error al eliminar');
                                      }
                                    } catch (err) {
                                      console.error(err);
                                      alert('Error de conexión');
                                    }
                                  }}
                                  title="Eliminar borrador"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Botón flotante/panel de fusión cuando hay seleccionados */}
              {selectedFormIds.size > 0 && (
                <div style={{
                  marginTop: 25,
                  padding: '15px 25px',
                  background: '#1e293b',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: 'white',
                  flexWrap: 'wrap',
                  gap: 10
                }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: 15 }}>
                      {selectedFormIds.size} {selectedFormIds.size === 1 ? 'borrador mensual seleccionado' : 'borradores mensuales seleccionados'}
                    </strong>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      {selectedFormIds.size >= 1 && selectedFormIds.size <= 3 
                        ? '✓ Cantidad válida para fusión trimestral.' 
                        : '⚠️ Selecciona entre 1 y 3 borradores.'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button 
                      className="ga-btn secondary" 
                      onClick={() => setSelectedFormIds(new Set())}
                      style={{ color: 'white', borderColor: '#475569', background: 'transparent' }}
                    >
                      Deseleccionar
                    </button>
                    <button 
                      className="ga-btn primary" 
                      disabled={selectedFormIds.size < 1 || selectedFormIds.size > 3 || generatingTrimestral}
                      onClick={handleGenerateTrimestralForYoung}
                      style={{ background: '#2563eb', border: 'none' }}
                    >
                      {generatingTrimestral ? '⏳ Generando con IA...' : '🔗 Fusionar y Generar Trimestral'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analiticas' && (
          <div className="ga-card" style={{ padding: 30 }}>
            <h3 style={{ marginBottom: 20 }}>Visualización de Progreso</h3>
            {loadingEvolution ? (
              <div style={{ padding: 40, textAlign: 'center' }}>Cargando analíticas...</div>
            ) : evolutionData.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', background: '#f8fafc', borderRadius: 12 }}>
                No hay datos suficientes para generar el gráfico comparativo.
              </div>
            ) : (
              <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <QualityOfLifeChart periods={evolutionData} />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ga-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <div>
          <h1 style={{ margin: 0 }}>Jóvenes</h1>
          <p style={{ color: 'var(--muted)', margin: 0 }}>Selecciona un joven para ver su ficha completa.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="ga-btn secondary" style={{ padding: '10px 25px', cursor: 'pointer' }}>
            {isImporting ? 'Importando...' : '📥 Importar Excel'}
            <input 
              type="file" 
              accept=".xlsx" 
              style={{ display: 'none' }} 
              disabled={isImporting}
              onChange={handleExcelImport}
            />
          </label>
          <button className="ga-btn primary" style={{ padding: '10px 25px' }} onClick={() => { resetForm(); setView('create'); }}>
            + Nuevo Joven
          </button>
        </div>
      </div>

      <div className="ga-card" style={{ marginBottom: 30 }}>
        <input 
          className="ga-input" 
          style={{ width: '100%', maxWidth: 600, fontSize: 16, padding: '12px 20px' }} 
          placeholder="Buscar por nombre, DNI o taller..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
      </div>

      <div className="ga-young-grid">
        {filteredItems.map(y => (
          <div key={y.id || y._id} className="ga-young-card" onClick={() => openDetail(y)}>
            {renderAvatar(y)}
            <div className="name">{y.nombreCompleto}</div>
            <div className="taller">{y.taller || 'SIN TALLER'}</div>
            <div className="dni">DNI: {y.dni || '—'}</div>
          </div>
        ))}
        {filteredItems.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 100, color: 'var(--muted)' }}>
            <h3>No se encontraron resultados</h3>
            <p>Intenta con otros términos de búsqueda.</p>
          </div>
        )}
      </div>

      {/* PAGINACIÓN */}
      <div style={{ marginTop: 40, display: 'flex', justifyContent: 'center', gap: 15, alignItems: 'center' }}>
        <button className="ga-btn" onClick={() => loadYoungs(page - 1)} disabled={page === 1}>Anterior</button>
        <span style={{ fontWeight: 600 }}>{page} / {totalPages}</span>
        <button className="ga-btn" onClick={() => loadYoungs(page + 1)} disabled={page >= totalPages}>Siguiente</button>
      </div>

      {/* Modal de PCP con IA */}
      {showPcpAiModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 24, maxWidth: 600, width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: 15
          }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>✨ Generar PCP con IA</h2>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>
              Describe brevemente los intereses, metas, rutinas y capacidades del concurrente. La IA interpretará este texto para estructurar todos los campos de la PCP de forma coherente.
            </p>
            <textarea
              className="ga-input"
              rows={8}
              style={{ width: '100%', resize: 'vertical', padding: '12px' }}
              value={pcpAiPrompt}
              onChange={e => setPcpAiPrompt(e.target.value)}
              placeholder="Ejemplo: Juan es un joven muy puntual. Su sueño es poder viajar de forma autónoma en colectivo para ir al taller y participar de los eventos de fútbol los fines de semana. Tiene buena motricidad gruesa pero le cuesta concentrarse en tareas artísticas..."
              disabled={generatingPcp}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
              <button 
                type="button"
                className="ga-btn secondary"
                onClick={() => { setShowPcpAiModal(false); setPcpAiPrompt(''); }}
                disabled={generatingPcp}
              >
                Cancelar
              </button>
              <button 
                type="button"
                className="ga-btn accent"
                onClick={handleGeneratePcp}
                disabled={generatingPcp || !pcpAiPrompt.trim()}
              >
                {generatingPcp ? '⏳ Procesando con IA...' : '✨ Generar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Asistente de Fusión Post-Importación */}
      {importWizardOpen && (
        <ExcelImportWizardModal
          isOpen={importWizardOpen}
          youngId={importWizardYoungId}
          importedMonths={importWizardMonths}
          onClose={() => setImportWizardOpen(false)}
          onSuccess={handleWizardSuccess}
        />
      )}
    </div>
  );
}
