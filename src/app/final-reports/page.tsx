"use client";
import React, { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import UploadManualDocxModal from '@/app/_components/UploadManualDocxModal';
import UploadExcelModal from '@/app/_components/UploadExcelModal';
import BlockPreviewModal from '@/app/_components/BlockPreviewModal';
import MonthlyFormPreviewModal from '@/app/_components/MonthlyFormPreviewModal';
import ReportPreviewModal from '@/app/_components/ReportPreviewModal';
import { useActiveCycle } from '@/lib/cycleState';
import Link from 'next/link';

interface YoungOverview {
  id: number;
  nombre: string;
  taller: string;
  facilitador: string;
  dni?: string;
  legajo?: string;
  trimestral1: { ok: boolean; id: number | null; periodo: string | null };
  mensuales1: { ok: boolean; has04: boolean; has05: boolean; has06: boolean; has07?: boolean; count: number; missing: string[] };
  trimestral2: { ok: boolean; id: number | null; periodo: string | null };
  mensuales2: { ok: boolean; has08: boolean; has09: boolean; has10?: boolean; count: number; missing: string[] };
  cierreAnual?: {
    has10: boolean;
    has11: boolean;
    has12: boolean;
    form10Id: number | null;
    form11Id: number | null;
    form12Id: number | null;
    count: number;
    missing: string[];
    trimestralCierre: { id: number; periodo: string; status: string; createdAt: string } | null;
    canGenerate: boolean;
  };
  finalReport: { id: number; periodo: string; status: string; createdAt: string } | null;
  canGenerate: boolean;
  strictCanGenerate?: boolean;
  isExceptionUnlocked?: boolean;
  exceptionReason?: string | null;
  missingItems: string[];
}

const GRUPOS = [
  'Todos',
  'Empoderadas',
  'Emprendedores',
  'Artesanos',
  'Buenos Mozos',
  'Atrapasueños',
  'Clave de Sol',
  'Promotores'
];

export default function FinalReportsPage() {
  const { data: session } = useSession();
  const { activeYear } = useActiveCycle();
  const [youngs, setYoungs] = useState<YoungOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'listos' | 'incompletos' | 'generados'>('todos');
  const [cierreStatusFilter, setCierreStatusFilter] = useState<'todos' | 'listos' | 'incompletos' | 'generados'>('todos');
  const [activeModuleTab, setActiveModuleTab] = useState<'final' | 'cierre'>('final');

  // Acciones en curso
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [generatingT2Id, setGeneratingT2Id] = useState<number | null>(null);
  const [generatingCierreId, setGeneratingCierreId] = useState<number | null>(null);
  const [togglingExceptionId, setTogglingExceptionId] = useState<number | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; text: string; details?: string[] } | null>(null);

  // Modales y subida de archivos
  const [uploadDocxModalOpen, setUploadDocxModalOpen] = useState(false);
  const [preselectedYoungId, setPreselectedYoungId] = useState<string>('');
  const [preselectedPeriodo, setPreselectedPeriodo] = useState<string>('');

  const [uploadExcelModalOpen, setUploadExcelModalOpen] = useState(false);
  const [excelModalYoungId, setExcelModalYoungId] = useState<string>('');
  const [excelModalBlockTitle, setExcelModalBlockTitle] = useState<string>('');
  const [excelModalInitialFile, setExcelModalInitialFile] = useState<File | null>(null);

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewYoungId, setPreviewYoungId] = useState<number | null>(null);
  const [previewYoungNombre, setPreviewYoungNombre] = useState<string>('');
  const [previewBlockNumber, setPreviewBlockNumber] = useState<1 | 2 | 3 | 4>(1);

  // Previsualizaciones universales
  const [previewMonthlyFormId, setPreviewMonthlyFormId] = useState<string | number | null>(null);
  const [previewReportId, setPreviewReportId] = useState<string | number | null>(null);
  const [previewReportTitle, setPreviewReportTitle] = useState<string>('');

  const [activeUploadYoungId, setActiveUploadYoungId] = useState<number | null>(null);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleToggleException = async (young: YoungOverview) => {
    const isUnlocked = !!young.isExceptionUnlocked;
    const nextState = !isUnlocked;
    let reason = young.exceptionReason || '';

    if (nextState && !reason) {
      const inputReason = prompt(
        `Desbloquear excepción para ${young.nombre}.\n\nMotivo / Aclaración (ej. "Concurrente no asistió en el 2º y 3º bloque por razones justificadas"):`,
        'Concurrente no asistió en los bloques o períodos faltantes por razones de inasistencia o salud justificadas'
      );
      if (inputReason === null) return;
      reason = inputReason.trim() || 'Concurrente con inasistencias o ausencia justificada en bloques sin informe';
    }

    setTogglingExceptionId(young.id);
    try {
      const res = await fetch(`/api/youngs/${young.id}/toggle-exception`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unlocked: nextState, reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar estado de excepción');

      setAlert({
        type: nextState ? 'info' : 'success',
        text: data.message || `Excepción ${nextState ? 'activada' : 'desactivada'} para ${young.nombre}.`
      });
      await loadData();
    } catch (err: any) {
      console.error('Error alternando excepción:', err);
      setAlert({ type: 'error', text: err.message || 'Error al cambiar excepción' });
    } finally {
      setTogglingExceptionId(null);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/final?overview=true&year=${activeYear}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.youngs) {
        setYoungs(data.youngs);
      }
    } catch (err: any) {
      console.error('Error cargando datos de informes finales:', err);
      setAlert({ type: 'error', text: 'Error al cargar el diagnóstico institucional de informes finales.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeYear]);

  // Generar Trimestral de Cierre (Octubre - Noviembre - Diciembre)
  const handleGenerateCierre = async (young: YoungOverview) => {
    if (!young.cierreAnual) return;
    const { form10Id, form11Id, form12Id, trimestralCierre } = young.cierreAnual;
    const formIds = [form10Id, form11Id, form12Id].filter(Boolean).map(String);

    if (formIds.length === 0) {
      setAlert({
        type: 'error',
        text: `No se encontraron cuadrículas de Octubre, Noviembre o Diciembre cargadas para ${young.nombre}.`
      });
      return;
    }

    if (trimestralCierre) {
      const confirmRegen = window.confirm(
        `Ya existe el Trimestral de Cierre (#${trimestralCierre.id}) para ${young.nombre}.\n\n¿Deseas regenerarlo con Inteligencia Artificial utilizando las cuadrículas mensuales disponibles?`
      );
      if (!confirmRegen) return;
    }

    setGeneratingCierreId(young.id);
    setAlert({
      type: 'info',
      text: `Generando Trimestral de Cierre (Octubre-Noviembre-Diciembre) con IA para ${young.nombre}... Esto puede demorar unos 15 segundos.`
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const res = await fetch('/api/reports/trimestral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formIds,
          periodoPersonalizado: `${activeYear}-10 – ${activeYear}-12`
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al generar Trimestral de Cierre');
      }

      setAlert({
        type: 'success',
        text: `¡Informe Trimestral de Cierre (Octubre - Diciembre) generado con éxito para ${young.nombre}! (ID #${data.reportId})`
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await loadData();
    } catch (err: any) {
      console.error('Error generando Trimestral de Cierre:', err);
      setAlert({ type: 'error', text: err.message || 'Error al generar Trimestral de Cierre' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setGeneratingCierreId(null);
    }
  };

  // Generar Informe Final Anual
  const handleGenerateFinal = async (young: YoungOverview) => {
    if (!young.canGenerate) {
      const confirmUnlock = confirm(
        `Para generar o regenerar el Informe Final de ${young.nombre} faltan insumos del primer semestre:\n\n` +
        young.missingItems.map(it => `• ${it}`).join('\n') +
        `\n\n¿Deseas activar la Excepción Institucional para generar el informe con los bloques disponibles?`
      );
      if (confirmUnlock) {
        await handleToggleException(young);
      } else {
        setAlert({
          type: 'error',
          text: `No se puede generar el Informe Final de ${young.nombre}: Faltan insumos obligatorios.`,
          details: young.missingItems
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    setGeneratingId(young.id);
    setAlert({ type: 'info', text: `Generando Informe Final Anual con IA para ${young.nombre}... Esto puede demorar unos 15-20 segundos.` });
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const res = await fetch('/api/reports/final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youngId: young.id, year: activeYear })
      });

      const data = await res.json();
      if (!res.ok) {
        setAlert({
          type: 'error',
          text: data.error || 'Error al generar el Informe Final Anual.',
          details: data.missingErrors
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setAlert({
          type: 'success',
          text: `¡Informe Final Anual de ${young.nombre} generado exitosamente! (Reporte ID #${data.reportId})`
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        await loadData();
      }
    } catch (err: any) {
      console.error('Error llamando a API final report:', err);
      setAlert({ type: 'error', text: 'Error de conexión al generar el informe final.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setGeneratingId(null);
    }
  };

  // Eliminar Informe Final para permitir regenerarlo de cero
  const handleDeleteFinal = async (reportId: number, youngNombre: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el Informe Final de ${youngNombre}? Esta acción permitirá generar uno nuevo desde cero.`)) return;
    try {
      const res = await fetch(`/api/reports/${reportId}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al eliminar');
      }
      setAlert({ type: 'info', text: `Informe Final #${reportId} eliminado. Ya puedes volver a generarlo.` });
      await loadData();
    } catch (err: any) {
      setAlert({ type: 'error', text: err.message || 'Error al eliminar el informe final' });
    }
  };

  // Generación rápida de Trimestral 2 (a partir de Abr, May, Jun)
  const handleGenerateTrimestral2 = async (young: YoungOverview) => {
    if (young.trimestral2.ok) {
      const confirmRegen = window.confirm(
        `Ya existe el Informe Trimestral 2 (#${young.trimestral2.id}) para ${young.nombre}.\n\n¿Estás seguro de que deseas regenerar el informe Trimestral 2 con IA a partir de las cuadrículas mensuales de Abril, Mayo y Junio?`
      );
      if (!confirmRegen) return;
    }
    setGeneratingT2Id(young.id);
    setAlert(null);

    try {
      const formsRes = await fetch(`/api/forms?youngId=${young.id}&pageSize=50&year=${activeYear}`);
      const formsData = await formsRes.json();
      const items = formsData.items || [];
      const mForms = items.filter((f: any) => {
        const p = (f.periodo || '').toLowerCase();
        return p.includes('04') || p.includes('05') || p.includes('06') ||
               p.includes('abril') || p.includes('mayo') || p.includes('junio');
      });

      if (mForms.length < 3) {
        setAlert({
          type: 'error',
          text: `Se requieren las 3 evaluaciones de Abril, Mayo y Junio para generar el Trimestral 2. Encontradas: ${mForms.length}/3.`
        });
        setGeneratingT2Id(null);
        return;
      }

      const formIds = mForms
        .map((f: any) => String(f.id || f._id))
        .filter((id: string) => id && id !== 'undefined' && !isNaN(parseInt(id)));

      const res = await fetch('/api/reports/trimestral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formIds })
      });

      const data = await res.json();
      if (!res.ok) {
        setAlert({ type: 'error', text: data.error || 'Error al generar Trimestral 2' });
      } else {
        setAlert({
          type: 'success',
          text: `¡Informe Trimestral 2 (Abril - Mayo - Junio) generado exitosamente con ID #${data.reportId}!`
        });
        await loadData();
      }
    } catch (err: any) {
      console.error('Error generando Trimestral 2:', err);
      setAlert({ type: 'error', text: 'Error de red al generar el Trimestral 2' });
    } finally {
      setGeneratingT2Id(null);
    }
  };

  const handleExcelFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeUploadYoungId) return;
    const file = e.target.files[0];
    setIsUploadingExcel(true);
    setAlert(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('youngId', String(activeUploadYoungId));
    formData.append('year', activeYear);

    try {
      const res = await fetch('/api/youngs/import-excel', {
        method: 'POST',
        body: formData
      });

      const json = await res.json();
      if (res.ok) {
        setAlert({
          type: 'success',
          text: json.message || 'Planilla Excel mensual importada correctamente.'
        });
        await loadData();
      } else {
        setAlert({ type: 'error', text: json.error || 'Error importando Excel' });
      }
    } catch (err: any) {
      console.error('Error subiendo Excel:', err);
      setAlert({ type: 'error', text: 'Error de conexión al subir la planilla Excel' });
    } finally {
      setIsUploadingExcel(false);
      setActiveUploadYoungId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openDocxModalForYoung = (youngId: number, defaultPeriodo?: string) => {
    setPreselectedYoungId(String(youngId));
    setPreselectedPeriodo(defaultPeriodo || '');
    setUploadDocxModalOpen(true);
  };

  const openExcelModalForYoung = (youngId: number, blockTitle?: string, droppedFile?: File) => {
    setExcelModalYoungId(String(youngId));
    setExcelModalBlockTitle(blockTitle || '');
    setExcelModalInitialFile(droppedFile || null);
    setUploadExcelModalOpen(true);
  };

  const openBlockPreview = (youngId: number, youngNombre: string, blockNumber: 1 | 2 | 3 | 4) => {
    setPreviewYoungId(youngId);
    setPreviewYoungNombre(youngNombre);
    setPreviewBlockNumber(blockNumber);
    setPreviewModalOpen(true);
  };

  // Conteos Generales
  const totalCount = youngs.length;
  const generatedCount = youngs.filter(y => !!y.finalReport).length;
  const readyCount = youngs.filter(y => y.canGenerate && !y.finalReport).length;
  const incompleteCount = youngs.filter(y => !y.canGenerate && !y.finalReport).length;

  // Conteos Cierre Q4
  const cierreOctCount = youngs.filter(y => !!y.cierreAnual?.has10).length;
  const cierreNovCount = youngs.filter(y => !!y.cierreAnual?.has11).length;
  const cierreDicCount = youngs.filter(y => !!y.cierreAnual?.has12).length;
  const cierreGenCount = youngs.filter(y => !!y.cierreAnual?.trimestralCierre).length;
  const cierreReadyCount = youngs.filter(y => (y.cierreAnual?.count || 0) > 0 && !y.cierreAnual?.trimestralCierre && (selectedGroup === 'Todos' || y.taller === selectedGroup)).length;
  const cierrePendingCount = youngs.filter(y => (y.cierreAnual?.count || 0) === 0 && !y.cierreAnual?.trimestralCierre && (selectedGroup === 'Todos' || y.taller === selectedGroup)).length;
  const cierreGeneratedFilteredCount = youngs.filter(y => !!y.cierreAnual?.trimestralCierre && (selectedGroup === 'Todos' || y.taller === selectedGroup)).length;

  // Filtrado de concurrentes
  const filteredYoungs = youngs.filter(y => {
    if (selectedGroup !== 'Todos' && y.taller !== selectedGroup) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = y.nombre.toLowerCase().includes(q);
      const matchDni = y.dni && y.dni.includes(q);
      if (!matchName && !matchDni) return false;
    }
    if (activeModuleTab === 'final') {
      if (statusFilter === 'listos') return y.canGenerate && !y.finalReport;
      if (statusFilter === 'generados') return !!y.finalReport;
      if (statusFilter === 'incompletos') return !y.canGenerate && !y.finalReport;
    } else {
      const hasCierreReport = !!y.cierreAnual?.trimestralCierre;
      const hasAnyMonth = (y.cierreAnual?.count || 0) > 0;
      if (cierreStatusFilter === 'listos') return hasAnyMonth && !hasCierreReport;
      if (cierreStatusFilter === 'generados') return hasCierreReport;
      if (cierreStatusFilter === 'incompletos') return !hasAnyMonth && !hasCierreReport;
    }
    return true;
  });

  return (
    <div className="ga-container" style={{ paddingBottom: 80 }}>
      {/* Input oculto para subida de Excel */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".xlsx,.xls"
        onChange={handleExcelFileSelected}
      />

      {/* Modal de Word Manual */}
      <UploadManualDocxModal
        isOpen={uploadDocxModalOpen}
        initialYoungId={preselectedYoungId}
        initialPeriodo={preselectedPeriodo}
        onClose={() => setUploadDocxModalOpen(false)}
        onSuccess={() => {
          setUploadDocxModalOpen(false);
          loadData();
          setAlert({
            type: 'success',
            text: 'Informe Word subido e interpretado correctamente.'
          });
        }}
      />

      {/* Modal de Planilla Excel (Drag & Drop) */}
      <UploadExcelModal
        isOpen={uploadExcelModalOpen}
        initialYoungId={excelModalYoungId}
        initialFile={excelModalInitialFile}
        targetBlockTitle={excelModalBlockTitle}
        onClose={() => setUploadExcelModalOpen(false)}
        onSuccess={() => {
          setUploadExcelModalOpen(false);
          loadData();
          setAlert({
            type: 'success',
            text: 'Planilla Excel mensual importada e integrada correctamente.'
          });
        }}
      />

      {/* Modal de Previsualización Rápida de Cuadrícula Mensual */}
      <MonthlyFormPreviewModal
        isOpen={!!previewMonthlyFormId}
        formId={previewMonthlyFormId}
        onClose={() => setPreviewMonthlyFormId(null)}
      />

      {/* Modal de Previsualización de Informe Consolidado */}
      <ReportPreviewModal
        isOpen={!!previewReportId}
        reportId={previewReportId}
        reportTitle={previewReportTitle}
        onClose={() => setPreviewReportId(null)}
      />

      {/* Modal de Vista Previa de Bloque */}
      <BlockPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        youngId={previewYoungId}
        youngNombre={previewYoungNombre}
        blockNumber={previewBlockNumber}
        onReassigned={() => {
          loadData();
          setAlert({
            type: 'info',
            text: 'Bloque reasignado exitosamente.'
          });
        }}
      />

      {/* Selector Principal de Módulo (1. Informe Final vs 2. Cierre de Año Q4) */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 20,
        background: 'white',
        padding: '10px 14px',
        borderRadius: 14,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onClick={() => setActiveModuleTab('final')}
          style={{
            flex: '1 1 280px',
            padding: '14px 20px',
            borderRadius: 10,
            border: activeModuleTab === 'final' ? '2px solid #d97706' : '1px solid #cbd5e1',
            background: activeModuleTab === 'final' ? '#fffbeb' : '#f8fafc',
            color: activeModuleTab === 'final' ? '#92400e' : '#64748b',
            fontWeight: 800,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            transition: 'all 0.15s ease',
            boxShadow: activeModuleTab === 'final' ? '0 2px 6px rgba(217, 119, 6, 0.15)' : 'none'
          }}
        >
          <span style={{ fontSize: 20 }}>🏆</span>
          <span>1. Informe Final Anual (Ene - Sep/Oct)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveModuleTab('cierre')}
          style={{
            flex: '1 1 280px',
            padding: '14px 20px',
            borderRadius: 10,
            border: activeModuleTab === 'cierre' ? '2px solid #2563eb' : '1px solid #cbd5e1',
            background: activeModuleTab === 'cierre' ? '#eff6ff' : '#f8fafc',
            color: activeModuleTab === 'cierre' ? '#1d4ed8' : '#64748b',
            fontWeight: 800,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            transition: 'all 0.15s ease',
            boxShadow: activeModuleTab === 'cierre' ? '0 2px 6px rgba(37, 99, 235, 0.15)' : 'none'
          }}
        >
          <span style={{ fontSize: 20 }}>🎄</span>
          <span>2. Cierre de Año (Trimestral Octubre - Noviembre - Diciembre)</span>
        </button>
      </div>

      {/* Hero Header Dinámico según Módulo */}
      {activeModuleTab === 'final' ? (
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: 16,
          padding: '32px 28px',
          color: 'white',
          marginBottom: 28,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{
              background: '#D97706',
              color: 'white',
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.05em'
            }}>
              MÓDULO INSTITUCIONAL ANUAL
            </span>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>
              Asociación Civil Granja Andar
            </span>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 10px 0', color: '#f8fafc' }}>
            🏆 Gestión de Informes Finales Anuales
          </h1>
          <p style={{ fontSize: 15, color: '#cbd5e1', margin: '0 0 24px 0', maxWidth: 880, lineHeight: 1.5 }}>
            El <strong>Informe Final Anual</strong> integra y consolida longitudinalmente todo el ciclo anual del concurrente a partir de sus 4 insumos obligatorios, expresado en las 12 dimensiones institucionales en tiempo presente y tono 100% positivo.
          </p>

          {/* Diagrama Visual de los 4 Bloques */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 12,
            padding: '18px 20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: 16
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Estructura Institucional de Composición Obligatoria:
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
              alignItems: 'center'
            }}>
              <div style={{ background: 'rgba(255,255,255,0.08)', padding: 12, borderRadius: 8, borderLeft: '4px solid #8B5CF6' }}>
                <div style={{ fontSize: 11, color: '#c4b5fd', fontWeight: 600 }}>1. TRIMESTRAL 1</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Ene - Feb - Mar</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Word manual institucional</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.08)', padding: 12, borderRadius: 8, borderLeft: '4px solid #3B82F6' }}>
                <div style={{ fontSize: 11, color: '#93c5fd', fontWeight: 600 }}>2. MENSUALES 1</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Abril + Mayo + Junio</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>3 meses completos evaluados</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.08)', padding: 12, borderRadius: 8, borderLeft: '4px solid #8B5CF6' }}>
                <div style={{ fontSize: 11, color: '#c4b5fd', fontWeight: 600 }}>3. TRIMESTRAL 2</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Abril - Mayo - Junio</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Informe trimestral de texto</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.08)', padding: 12, borderRadius: 8, borderLeft: '4px solid #3B82F6' }}>
                <div style={{ fontSize: 11, color: '#93c5fd', fontWeight: 600 }}>4. MENSUALES 2</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Agosto + Septiembre</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>2 meses completos evaluados</div>
              </div>
            </div>
          </div>

          {/* Regla Estricta */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            padding: '10px 16px',
            borderRadius: 8,
            fontSize: 13,
            color: '#fca5a5'
          }}>
            <span style={{ fontSize: 18 }}>🔒</span>
            <div>
              <strong>Regla de Validación Estricta:</strong> Se requiere el <strong>100% de los 4 bloques completos</strong> para generar el Informe Final. Si falta algún mes o trimestre, la generación estará <strong>bloqueada</strong> hasta completar los registros.
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
          borderRadius: 16,
          padding: '32px 28px',
          color: 'white',
          marginBottom: 28,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{
              background: '#2563eb',
              color: 'white',
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.05em'
            }}>
              MÓDULO DE CIERRE INSTITUCIONAL (Q4)
            </span>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>
              Asociación Civil Granja Andar
            </span>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 10px 0', color: '#f8fafc' }}>
            🎄 Cierre de Año: Trimestral Octubre - Noviembre - Diciembre
          </h1>
          <p style={{ fontSize: 15, color: '#cbd5e1', margin: '0 0 24px 0', maxWidth: 880, lineHeight: 1.5 }}>
            Para cerrar el ciclo lectivo en Diciembre (mes corto de cierre institucional), los facilitadores cargan las cuadrículas de <strong>Octubre</strong>, <strong>Noviembre</strong> y <strong>Diciembre</strong>. Desde este panel podés revisar el avance de cada mes, previsualizar las cuadrículas con 1 clic, subir planillas Excel y generar el <strong>Informe Trimestral de Cierre oficial</strong> consolidado con IA.
          </p>

          {/* Diagrama Visual de los 3 Meses */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 12,
            padding: '18px 20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: 16
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Composición de Cuadrículas del Trimestral de Cierre:
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
              alignItems: 'center'
            }}>
              <div style={{ background: 'rgba(255,255,255,0.08)', padding: 12, borderRadius: 8, borderLeft: '4px solid #f59e0b' }}>
                <div style={{ fontSize: 11, color: '#fde68a', fontWeight: 600 }}>MES 1</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>🍂 Octubre</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Cuadrícula mensual y observaciones</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.08)', padding: 12, borderRadius: 8, borderLeft: '4px solid #3b82f6' }}>
                <div style={{ fontSize: 11, color: '#93c5fd', fontWeight: 600 }}>MES 2</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>🍁 Noviembre</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Cuadrícula mensual y observaciones</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.08)', padding: 12, borderRadius: 8, borderLeft: '4px solid #10b981' }}>
                <div style={{ fontSize: 11, color: '#a7f3d0', fontWeight: 600 }}>MES 3 (CIERRE)</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>🎄 Diciembre</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Cuadrícula de cierre de año</div>
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            padding: '10px 16px',
            borderRadius: 8,
            fontSize: 13,
            color: '#bfdbfe'
          }}>
            <span style={{ fontSize: 18 }}>⚡</span>
            <div>
              <strong>Carga Mensual Continua:</strong> A medida que los profesores cargan cada cuadrícula mensual, podés previsualizarla inmediatamente y generar el Trimestral de Cierre con las evaluaciones disponibles.
            </div>
          </div>
        </div>
      )}

      {/* Alertas */}
      {alert && (
        <div style={{
          padding: '14px 18px',
          borderRadius: 8,
          marginBottom: 24,
          background: alert.type === 'success' ? '#ecfdf5' : alert.type === 'error' ? '#fef2f2' : '#eff6ff',
          border: `1px solid ${alert.type === 'success' ? '#10b981' : alert.type === 'error' ? '#ef4444' : '#3b82f6'}`,
          color: alert.type === 'success' ? '#065f46' : alert.type === 'error' ? '#991b1b' : '#1e40af',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{alert.text}</div>
            {alert.details && alert.details.length > 0 && (
              <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, fontSize: 13 }}>
                {alert.details.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            )}
          </div>
          <button
            onClick={() => setAlert(null)}
            style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Tarjetas KPI Dinámicas */}
      {activeModuleTab === 'final' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div style={{ background: 'white', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Concurrentes</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{totalCount}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Población activa institucional</div>
          </div>

          <div style={{ background: 'white', padding: 20, borderRadius: 12, border: '1px solid #fed7aa', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#c2410c', textTransform: 'uppercase' }}>🏆 Informes Finales Emitidos</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: '#ea580c', marginTop: 4 }}>{generatedCount}</div>
            <div style={{ fontSize: 12, color: '#9a3412', marginTop: 4 }}>Listos para descarga Word y PDF</div>
          </div>

          <div style={{ background: 'white', padding: 20, borderRadius: 12, border: '1px solid #bbf7d0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#15803d', textTransform: 'uppercase' }}>⚡ Listos para Generar (4/4)</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>{readyCount}</div>
            <div style={{ fontSize: 12, color: '#166534', marginTop: 4 }}>Con los 4 insumos completos</div>
          </div>

          <div style={{ background: 'white', padding: 20, borderRadius: 12, border: '1px solid #fecdd3', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#be123c', textTransform: 'uppercase' }}>⚠️ Insumos Incompletos</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: '#e11d48', marginTop: 4 }}>{incompleteCount}</div>
            <div style={{ fontSize: 12, color: '#9f1239', marginTop: 4 }}>Requieren cargar Word o Excel</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div style={{ background: 'white', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Concurrentes</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{totalCount}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Cierre lectivo {activeYear}</div>
          </div>

          <div style={{ background: 'white', padding: 18, borderRadius: 12, border: '1px solid #fde68a', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>🍂 Octubre Cargado</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#d97706', marginTop: 4 }}>{cierreOctCount} <span style={{ fontSize: 14, color: '#92400e', fontWeight: 500 }}>/ {totalCount}</span></div>
            <div style={{ fontSize: 11, color: '#92400e', marginTop: 4 }}>Cuadrículas evaluadas</div>
          </div>

          <div style={{ background: 'white', padding: 18, borderRadius: 12, border: '1px solid #bfdbfe', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' }}>🍁 Noviembre Cargado</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#2563eb', marginTop: 4 }}>{cierreNovCount} <span style={{ fontSize: 14, color: '#1e40af', fontWeight: 500 }}>/ {totalCount}</span></div>
            <div style={{ fontSize: 11, color: '#1e40af', marginTop: 4 }}>Cuadrículas evaluadas</div>
          </div>

          <div style={{ background: 'white', padding: 18, borderRadius: 12, border: '1px solid #a7f3d0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>🎄 Diciembre Cargado</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#059669', marginTop: 4 }}>{cierreDicCount} <span style={{ fontSize: 14, color: '#065f46', fontWeight: 500 }}>/ {totalCount}</span></div>
            <div style={{ fontSize: 11, color: '#065f46', marginTop: 4 }}>Cuadrículas finales</div>
          </div>

          <div style={{ background: 'white', padding: 18, borderRadius: 12, border: '1px solid #ddd6fe', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>📑 Trimestral Cierre</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#7c3aed', marginTop: 4 }}>{cierreGenCount} <span style={{ fontSize: 14, color: '#5b21b6', fontWeight: 500 }}>/ {totalCount}</span></div>
            <div style={{ fontSize: 11, color: '#5b21b6', marginTop: 4 }}>Informes emitidos</div>
          </div>
        </div>
      )}

      {/* Píldoras de Grupos Oficiales */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
        padding: '12px 16px',
        background: 'white',
        borderRadius: 12,
        border: '1px solid #e2e8f0'
      }}>
        {GRUPOS.map(grupo => {
          const count = grupo === 'Todos' ? youngs.length : youngs.filter(y => y.taller === grupo).length;
          const isSelected = selectedGroup === grupo;
          return (
            <button
              key={grupo}
              onClick={() => setSelectedGroup(grupo)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: 'none',
                background: isSelected ? '#1e293b' : '#f1f5f9',
                color: isSelected ? 'white' : '#475569',
                fontSize: 13,
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>{grupo}</span>
              <span style={{
                background: isSelected ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                padding: '2px 6px',
                borderRadius: 10,
                fontSize: 11
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filtros de Búsqueda y Estado */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
        background: 'white',
        padding: 16,
        borderRadius: 12,
        border: '1px solid #e2e8f0'
      }}>
        {/* Buscador */}
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: 450 }}>
          <input
            type="text"
            placeholder="🔍 Buscar por nombre de joven o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 14,
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Pestañas de Estado */}
        {activeModuleTab === 'final' ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setStatusFilter('todos')}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: statusFilter === 'todos' ? '#f8fafc' : 'white',
                fontWeight: statusFilter === 'todos' ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              Todos ({filteredYoungs.length})
            </button>
            <button
              onClick={() => setStatusFilter('listos')}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #86efac',
                background: statusFilter === 'listos' ? '#f0fdf4' : 'white',
                color: '#15803d',
                fontWeight: statusFilter === 'listos' ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              ⚡ Listos para Generar ({youngs.filter(y => y.canGenerate && !y.finalReport && (selectedGroup === 'Todos' || y.taller === selectedGroup)).length})
            </button>
            <button
              onClick={() => setStatusFilter('generados')}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #fdba74',
                background: statusFilter === 'generados' ? '#fff7ed' : 'white',
                color: '#c2410c',
                fontWeight: statusFilter === 'generados' ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              🏆 Con Informe Final ({youngs.filter(y => !!y.finalReport && (selectedGroup === 'Todos' || y.taller === selectedGroup)).length})
            </button>
            <button
              onClick={() => setStatusFilter('incompletos')}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #fca5a5',
                background: statusFilter === 'incompletos' ? '#fef2f2' : 'white',
                color: '#b91c1c',
                fontWeight: statusFilter === 'incompletos' ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              ⚠️ Incompletos ({youngs.filter(y => !y.canGenerate && !y.finalReport && (selectedGroup === 'Todos' || y.taller === selectedGroup)).length})
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setCierreStatusFilter('todos')}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: cierreStatusFilter === 'todos' ? '#f8fafc' : 'white',
                fontWeight: cierreStatusFilter === 'todos' ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              Todos ({filteredYoungs.length})
            </button>
            <button
              onClick={() => setCierreStatusFilter('listos')}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #86efac',
                background: cierreStatusFilter === 'listos' ? '#f0fdf4' : 'white',
                color: '#15803d',
                fontWeight: cierreStatusFilter === 'listos' ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              ⚡ Con Cuadrículas para Generar ({cierreReadyCount})
            </button>
            <button
              onClick={() => setCierreStatusFilter('generados')}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #c4b5fd',
                background: cierreStatusFilter === 'generados' ? '#f5f3ff' : 'white',
                color: '#6d28d9',
                fontWeight: cierreStatusFilter === 'generados' ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              🎄 Con Trimestral Cierre ({cierreGeneratedFilteredCount})
            </button>
            <button
              onClick={() => setCierreStatusFilter('incompletos')}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #fca5a5',
                background: cierreStatusFilter === 'incompletos' ? '#fef2f2' : 'white',
                color: '#b91c1c',
                fontWeight: cierreStatusFilter === 'incompletos' ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              ⚠️ Sin Cuadrículas ({cierrePendingCount})
            </button>
          </div>
        )}
      </div>

      {/* Lista de Concurrentes */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 16, color: '#64748b' }}>Analizando diagnósticos y cuadrículas mensuales...</div>
        </div>
      ) : filteredYoungs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, color: '#64748b' }}>No se encontraron concurrentes para los filtros seleccionados.</div>
        </div>
      ) : activeModuleTab === 'final' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredYoungs.map(young => {
            const isGenerating = generatingId === young.id;
            const isGeneratingT2 = generatingT2Id === young.id;

            return (
              <div
                key={young.id}
                style={{
                  background: 'white',
                  borderRadius: 14,
                  border: young.finalReport 
                    ? '2px solid #fbbf24' 
                    : young.canGenerate 
                    ? '2px solid #22c55e' 
                    : '1px solid #e2e8f0',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
                  padding: 20
                }}
              >
                {/* Cabecera del Concurrente */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      background: '#e0f2fe',
                      color: '#0369a1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 17
                    }}>
                      {young.nombre.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
                        {young.nombre}
                      </div>
                      <div style={{ fontSize: 13, color: '#64748b', display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                        <span style={{
                          background: '#f1f5f9',
                          color: '#334155',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: 11
                        }}>
                          {young.taller}
                        </span>
                        <span>Facilitador: <strong>{young.facilitador}</strong></span>
                        {young.dni && young.dni.length <= 15 && /^[0-9.\s-]+$/.test(young.dni) && <span>• DNI: {young.dni}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Estado Principal y Excepción */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {young.isExceptionUnlocked && (
                      <span
                        title={young.exceptionReason || 'Excepción de insumos activa'}
                        style={{
                          background: '#fef3c7',
                          color: '#b45309',
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          border: '1px solid #fcd34d'
                        }}
                      >
                        🔓 Excepción Activa
                      </span>
                    )}

                    <button
                      onClick={() => handleToggleException(young)}
                      disabled={togglingExceptionId === young.id}
                      title={young.isExceptionUnlocked ? "Quitar excepción y restaurar regla estricta de 4 insumos" : "Activar excepción para desbloquear individualmente si no asistió en algún bloque"}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 20,
                        border: young.isExceptionUnlocked ? '1px solid #f59e0b' : '1px dashed #94a3b8',
                        background: young.isExceptionUnlocked ? '#fffbeb' : '#f8fafc',
                        color: young.isExceptionUnlocked ? '#b45309' : '#475569',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      {togglingExceptionId === young.id ? '⏳...' : young.isExceptionUnlocked ? '🔒 Quitar Excepción' : '🔓 Excepción Insumos'}
                    </button>

                    {young.finalReport ? (
                      <span style={{
                        background: '#fef3c7',
                        color: '#92400e',
                        padding: '6px 14px',
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        border: '1px solid #fcd34d'
                      }}>
                        🏆 Informe Final Emitido (#{young.finalReport.id})
                      </span>
                    ) : young.canGenerate ? (
                      <span style={{
                        background: young.isExceptionUnlocked && !young.strictCanGenerate ? '#fff7ed' : '#dcfce7',
                        color: young.isExceptionUnlocked && !young.strictCanGenerate ? '#c2410c' : '#166534',
                        padding: '6px 14px',
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        border: `1px solid ${young.isExceptionUnlocked && !young.strictCanGenerate ? '#ffedd5' : '#86efac'}`
                      }}>
                        {young.isExceptionUnlocked && !young.strictCanGenerate ? '🔓 Desbloqueado por Excepción' : '✅ 4 de 4 Insumos Listos'}
                      </span>
                    ) : (
                      <span style={{
                        background: '#f1f5f9',
                        color: '#64748b',
                        padding: '6px 14px',
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        ⚠️ Insumos Incompletos
                      </span>
                    )}
                  </div>
                </div>

                {/* Grilla de los 4 Bloques */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: 12,
                  marginBottom: 16
                }}>
                  {/* Bloque 1 */}
                  <div style={{
                    padding: 12,
                    borderRadius: 8,
                    background: young.trimestral1.ok ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${young.trimestral1.ok ? '#bbf7d0' : '#fecaca'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: young.trimestral1.ok ? '#166534' : '#991b1b' }}>
                        1. TRIMESTRAL 1 (ENE-MAR)
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {young.trimestral1.ok && (
                          <button
                            onClick={() => openBlockPreview(young.id, young.nombre, 1)}
                            title="Vista previa de este informe"
                            style={{
                              background: '#e0f2fe',
                              color: '#0369a1',
                              border: '1px solid #bae6fd',
                              borderRadius: 4,
                              fontSize: 11,
                              padding: '2px 6px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            👁️ Ver
                          </button>
                        )}
                        <span>{young.trimestral1.ok ? '✅' : '❌'}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>
                      {young.trimestral1.ok ? (
                        <span>Informe #{young.trimestral1.id} ({young.trimestral1.periodo})</span>
                      ) : (
                        <span style={{ color: '#dc2626' }}>Falta Word de Verano</span>
                      )}
                    </div>
                    <button
                      onClick={() => openDocxModalForYoung(young.id, `${activeYear}-01 – ${activeYear}-03`)}
                      style={{
                        marginTop: 8,
                        width: '100%',
                        padding: '5px 8px',
                        background: young.trimestral1.ok ? '#eff6ff' : '#fee2e2',
                        color: young.trimestral1.ok ? '#1d4ed8' : '#991b1b',
                        border: `1px solid ${young.trimestral1.ok ? '#bfdbfe' : '#fca5a5'}`,
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      📤 {young.trimestral1.ok ? 'Reemplazar Word de Verano' : 'Subir Word Ene-Mar'}
                    </button>
                  </div>

                  {/* Bloque 2 */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        const f = e.dataTransfer.files[0];
                        if (f.name.endsWith('.xlsx') || f.name.endsWith('.xls')) {
                          openExcelModalForYoung(young.id, 'Bloque 2 (Abril - Junio)', f);
                        }
                      }
                    }}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      background: young.mensuales1.ok ? '#f0fdf4' : '#fffbeb',
                      border: `1px solid ${young.mensuales1.ok ? '#bbf7d0' : '#fde68a'}`,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: young.mensuales1.ok ? '#166534' : '#92400e' }}>
                        2. MENSUALES 1 (ABR-JUN)
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {(young.mensuales1.ok || young.mensuales1.count > 0) && (
                          <button
                            onClick={() => openBlockPreview(young.id, young.nombre, 2)}
                            title="Vista previa de las evaluaciones mensuales"
                            style={{
                              background: '#e0f2fe',
                              color: '#0369a1',
                              border: '1px solid #bae6fd',
                              borderRadius: 4,
                              fontSize: 11,
                              padding: '2px 6px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            👁️ Ver
                          </button>
                        )}
                        <span>{young.mensuales1.ok ? '✅' : '⚠️'}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>
                      {young.mensuales1.ok ? (
                        <span>{young.mensuales1.has07 ? '4 meses evaluados (incluye Julio)' : '3 de 3 meses evaluados'}</span>
                      ) : (
                        <span style={{ color: '#d97706' }}>
                          Faltan: {young.mensuales1.missing.join(', ')}
                          {young.mensuales1.has07 ? ' (Julio cargado)' : ''}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => openExcelModalForYoung(young.id, 'Bloque 2 (Abril - Junio)')}
                      disabled={isUploadingExcel}
                      title="Hacé click para abrir o arrastrá tu archivo Excel (.xlsx) directamente sobre este recuadro"
                      style={{
                        marginTop: 8,
                        width: '100%',
                        padding: '6px 8px',
                        background: young.mensuales1.ok ? '#f0fdf4' : '#fef3c7',
                        color: young.mensuales1.ok ? '#15803d' : '#92400e',
                        border: `1px solid ${young.mensuales1.ok ? '#bbf7d0' : '#fcd34d'}`,
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                      }}
                    >
                      📥 {young.mensuales1.ok ? 'Cargar / Arrastrar Excel' : 'Subir / Arrastrar Excel'}
                    </button>
                  </div>

                  {/* Bloque 3 */}
                  <div style={{
                    padding: 12,
                    borderRadius: 8,
                    background: young.trimestral2.ok ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${young.trimestral2.ok ? '#bbf7d0' : '#fecaca'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: young.trimestral2.ok ? '#166534' : '#991b1b' }}>
                        3. TRIMESTRAL 2 (ABR-JUN)
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {young.trimestral2.ok && (
                          <button
                            onClick={() => openBlockPreview(young.id, young.nombre, 3)}
                            title="Vista previa de este informe"
                            style={{
                              background: '#e0f2fe',
                              color: '#0369a1',
                              border: '1px solid #bae6fd',
                              borderRadius: 4,
                              fontSize: 11,
                              padding: '2px 6px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            👁️ Ver
                          </button>
                        )}
                        <span>{young.trimestral2.ok ? '✅' : '❌'}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>
                      {young.trimestral2.ok ? (
                        <span>Informe #{young.trimestral2.id} ({young.trimestral2.periodo})</span>
                      ) : (
                        <span style={{ color: '#dc2626' }}>Falta Trimestral 2</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                      <button
                        onClick={() => openDocxModalForYoung(young.id, `${activeYear}-04 – ${activeYear}-06`)}
                        style={{
                          width: '100%',
                          padding: '5px 8px',
                          background: young.trimestral2.ok ? '#eff6ff' : '#fee2e2',
                          color: young.trimestral2.ok ? '#1d4ed8' : '#991b1b',
                          border: `1px solid ${young.trimestral2.ok ? '#93c5fd' : '#fca5a5'}`,
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        📤 {young.trimestral2.ok ? 'Reemplazar Word Abr-Jun' : 'Subir Word Abr-Jun (Profesor)'}
                      </button>
                      {young.mensuales1.ok && (
                        <button
                          onClick={() => handleGenerateTrimestral2(young)}
                          disabled={isGeneratingT2}
                          style={{
                            width: '100%',
                            padding: '5px 8px',
                            background: '#f3e8ff',
                            color: '#6b21a8',
                            border: '1px solid #d8b4fe',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {isGeneratingT2 ? '⏳ Generando...' : (young.trimestral2.ok ? '⚡ Regenerar Trimestral 2 (IA)' : '⚡ Generar Trimestral 2 (IA)')}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bloque 4 */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        const f = e.dataTransfer.files[0];
                        if (f.name.endsWith('.xlsx') || f.name.endsWith('.xls')) {
                          openExcelModalForYoung(young.id, 'Bloque 4 (Agosto - Diciembre)', f);
                        }
                      }
                    }}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      background: young.mensuales2.ok ? '#f0fdf4' : '#fffbeb',
                      border: `1px solid ${young.mensuales2.ok ? '#bbf7d0' : '#fde68a'}`,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: young.mensuales2.ok ? '#166534' : '#92400e' }}>
                        4. MENSUALES 2 (AGO-OCT)
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {young.mensuales2.ok && (
                          <button
                            onClick={() => openBlockPreview(young.id, young.nombre, 4)}
                            title="Vista previa de las evaluaciones mensuales"
                            style={{
                              background: '#e0f2fe',
                              color: '#0369a1',
                              border: '1px solid #bae6fd',
                              borderRadius: 4,
                              fontSize: 11,
                              padding: '2px 6px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            👁️ Ver
                          </button>
                        )}
                        <span>{young.mensuales2.ok ? '✅' : '⚠️'}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>
                      {young.mensuales2.ok ? (
                        <span>{young.mensuales2.has10 ? '3 meses evaluados (incluye Octubre)' : '2 de 2 meses evaluados'}</span>
                      ) : (
                        <span style={{ color: '#d97706' }}>Faltan: {young.mensuales2.missing.join(', ')}</span>
                      )}
                    </div>
                    <button
                      onClick={() => openExcelModalForYoung(young.id, 'Bloque 4 (Agosto - Diciembre)')}
                      disabled={isUploadingExcel}
                      title="Hacé click para abrir o arrastrá tu archivo Excel (.xlsx) directamente sobre este recuadro"
                      style={{
                        marginTop: 8,
                        width: '100%',
                        padding: '6px 8px',
                        background: young.mensuales2.ok ? '#f0fdf4' : '#fef3c7',
                        color: young.mensuales2.ok ? '#15803d' : '#92400e',
                        border: `1px solid ${young.mensuales2.ok ? '#bbf7d0' : '#fcd34d'}`,
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                      }}
                    >
                      📥 {young.mensuales2.ok ? 'Cargar / Arrastrar Excel' : 'Subir / Arrastrar Excel'}
                    </button>
                  </div>
                </div>

                {/* Acciones Finales */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  paddingTop: 12,
                  borderTop: '1px solid #f1f5f9'
                }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {young.finalReport ? (
                      <span>Emitido el {new Date(young.finalReport.createdAt).toLocaleDateString('es-AR')}</span>
                    ) : young.isExceptionUnlocked && !young.strictCanGenerate ? (
                      <span style={{ color: '#d97706', fontWeight: 600 }}>
                        🔓 Desbloqueado por excepción individual. Se aclarará en la narrativa los períodos no evaluados por inasistencia.
                      </span>
                    ) : young.canGenerate ? (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>¡Todos los insumos listos! Podés generar el informe final anual.</span>
                    ) : (
                      <span style={{ color: '#dc2626' }}>Bloqueado: Se requiere completar los insumos marcados o activar la excepción de insumos.</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {young.finalReport ? (
                      <>
                        <Link
                          href={`/reports/${young.finalReport.id}`}
                          style={{
                            padding: '8px 14px',
                            background: '#0284c7',
                            color: 'white',
                            borderRadius: 6,
                            textDecoration: 'none',
                            fontSize: 13,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          👁️ Ver / Editar
                        </Link>
                        <a
                          href={`/api/reports/${young.finalReport.id}/.docx`}
                          download
                          style={{
                            padding: '8px 14px',
                            background: '#059669',
                            color: 'white',
                            borderRadius: 6,
                            textDecoration: 'none',
                            fontSize: 13,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          📥 Word (.docx)
                        </a>
                        <button
                          onClick={() => handleGenerateFinal(young)}
                          disabled={isGenerating}
                          title="Volver a generar el Informe Final consolidando nuevamente con IA"
                          style={{
                            padding: '8px 12px',
                            background: '#d97706',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: isGenerating ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          {isGenerating ? '⏳...' : '🔄 Regenerar'}
                        </button>
                        <button
                          onClick={() => handleDeleteFinal(young.finalReport!.id, young.nombre)}
                          title="Eliminar este informe final para regenerarlo desde cero"
                          style={{
                            padding: '8px 10px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          🗑️
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleGenerateFinal(young)}
                        disabled={!young.canGenerate || isGenerating}
                        style={{
                          padding: '10px 18px',
                          background: young.canGenerate ? '#16a34a' : '#94a3b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: young.canGenerate && !isGenerating ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          boxShadow: young.canGenerate ? '0 2px 6px rgba(22, 163, 74, 0.3)' : 'none'
                        }}
                      >
                        {isGenerating ? (
                          <>⏳ Consolidando con IA...</>
                        ) : young.canGenerate ? (
                          <>⚡ Generar Informe Final Anual</>
                        ) : (
                          <>🔒 Bloqueado: Insumos Incompletos</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA DE CIERRE DE AÑO: TRIMESTRAL OCTUBRE - NOVIEMBRE - DICIEMBRE */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredYoungs.map(young => {
            const cierre = young.cierreAnual || {
              has10: false,
              has11: false,
              has12: false,
              form10Id: null,
              form11Id: null,
              form12Id: null,
              count: 0,
              missing: ['Octubre', 'Noviembre', 'Diciembre'],
              trimestralCierre: null,
              canGenerate: false
            };
            const isGeneratingCierre = generatingCierreId === young.id;

            return (
              <div
                key={young.id}
                style={{
                  background: 'white',
                  borderRadius: 14,
                  border: cierre.trimestralCierre
                    ? '2px solid #8b5cf6'
                    : cierre.count > 0
                    ? '2px solid #3b82f6'
                    : '1px solid #e2e8f0',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
                  padding: 20
                }}
              >
                {/* Cabecera del Concurrente */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 17
                    }}>
                      {young.nombre.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
                        {young.nombre}
                      </div>
                      <div style={{ fontSize: 13, color: '#64748b', display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                        <span style={{
                          background: '#f1f5f9',
                          color: '#334155',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: 11
                        }}>
                          {young.taller}
                        </span>
                        <span>Facilitador: <strong>{young.facilitador}</strong></span>
                        {young.dni && young.dni.length <= 15 && /^[0-9.\s-]+$/.test(young.dni) && <span>• DNI: {young.dni}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Estado Principal Cierre */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {cierre.trimestralCierre ? (
                      <span style={{
                        background: '#f5f3ff',
                        color: '#6d28d9',
                        padding: '6px 14px',
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        border: '1px solid #ddd6fe'
                      }}>
                        🎄 Trimestral de Cierre Emitido (#{cierre.trimestralCierre.id})
                      </span>
                    ) : cierre.count > 0 ? (
                      <span style={{
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        padding: '6px 14px',
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        border: '1px solid #bfdbfe'
                      }}>
                        ⚡ {cierre.count} de 3 Meses Cargados
                      </span>
                    ) : (
                      <span style={{
                        background: '#f1f5f9',
                        color: '#64748b',
                        padding: '6px 14px',
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        ⚠️ Pendiente de Carga
                      </span>
                    )}
                  </div>
                </div>

                {/* Grilla de los 3 Meses de Cierre (Octubre, Noviembre, Diciembre) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 12,
                  marginBottom: 16
                }}>
                  {/* Octubre */}
                  <div style={{
                    padding: 14,
                    borderRadius: 10,
                    background: cierre.has10 ? '#f0fdf4' : '#fffbeb',
                    border: `1px solid ${cierre.has10 ? '#bbf7d0' : '#fde68a'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: cierre.has10 ? '#166534' : '#92400e' }}>
                        🍂 1. OCTUBRE ({activeYear}-10)
                      </span>
                      <span>{cierre.has10 ? '✅' : '⚠️'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#334155', marginTop: 6 }}>
                      {cierre.has10 ? (
                        <span>Cuadrícula cargada (Form #{cierre.form10Id})</span>
                      ) : (
                        <span style={{ color: '#d97706' }}>Cuadrícula pendiente de carga</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      {cierre.has10 && (
                        <button
                          type="button"
                          onClick={() => setPreviewMonthlyFormId(cierre.form10Id)}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            background: '#e0f2fe',
                            color: '#0369a1',
                            border: '1px solid #bae6fd',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4
                          }}
                        >
                          👁️ Ver Cuadrícula
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openExcelModalForYoung(young.id, `Octubre ${activeYear}`)}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          background: cierre.has10 ? '#f8fafc' : '#fef3c7',
                          color: cierre.has10 ? '#475569' : '#92400e',
                          border: `1px solid ${cierre.has10 ? '#cbd5e1' : '#fcd34d'}`,
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4
                        }}
                      >
                        📥 {cierre.has10 ? 'Reemplazar Excel' : 'Subir Excel'}
                      </button>
                    </div>
                  </div>

                  {/* Noviembre */}
                  <div style={{
                    padding: 14,
                    borderRadius: 10,
                    background: cierre.has11 ? '#f0fdf4' : '#fffbeb',
                    border: `1px solid ${cierre.has11 ? '#bbf7d0' : '#fde68a'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: cierre.has11 ? '#166534' : '#92400e' }}>
                        🍁 2. NOVIEMBRE ({activeYear}-11)
                      </span>
                      <span>{cierre.has11 ? '✅' : '⚠️'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#334155', marginTop: 6 }}>
                      {cierre.has11 ? (
                        <span>Cuadrícula cargada (Form #{cierre.form11Id})</span>
                      ) : (
                        <span style={{ color: '#d97706' }}>Cuadrícula pendiente de carga</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      {cierre.has11 && (
                        <button
                          type="button"
                          onClick={() => setPreviewMonthlyFormId(cierre.form11Id)}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            background: '#e0f2fe',
                            color: '#0369a1',
                            border: '1px solid #bae6fd',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4
                          }}
                        >
                          👁️ Ver Cuadrícula
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openExcelModalForYoung(young.id, `Noviembre ${activeYear}`)}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          background: cierre.has11 ? '#f8fafc' : '#fef3c7',
                          color: cierre.has11 ? '#475569' : '#92400e',
                          border: `1px solid ${cierre.has11 ? '#cbd5e1' : '#fcd34d'}`,
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4
                        }}
                      >
                        📥 {cierre.has11 ? 'Reemplazar Excel' : 'Subir Excel'}
                      </button>
                    </div>
                  </div>

                  {/* Diciembre */}
                  <div style={{
                    padding: 14,
                    borderRadius: 10,
                    background: cierre.has12 ? '#f0fdf4' : '#fffbeb',
                    border: `1px solid ${cierre.has12 ? '#bbf7d0' : '#fde68a'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: cierre.has12 ? '#166534' : '#92400e' }}>
                        🎄 3. DICIEMBRE ({activeYear}-12)
                      </span>
                      <span>{cierre.has12 ? '✅' : '⚠️'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#334155', marginTop: 6 }}>
                      {cierre.has12 ? (
                        <span>Cuadrícula cargada (Form #{cierre.form12Id})</span>
                      ) : (
                        <span style={{ color: '#d97706' }}>Cuadrícula pendiente de carga</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      {cierre.has12 && (
                        <button
                          type="button"
                          onClick={() => setPreviewMonthlyFormId(cierre.form12Id)}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            background: '#e0f2fe',
                            color: '#0369a1',
                            border: '1px solid #bae6fd',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4
                          }}
                        >
                          👁️ Ver Cuadrícula
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openExcelModalForYoung(young.id, `Diciembre ${activeYear}`)}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          background: cierre.has12 ? '#f8fafc' : '#fef3c7',
                          color: cierre.has12 ? '#475569' : '#92400e',
                          border: `1px solid ${cierre.has12 ? '#cbd5e1' : '#fcd34d'}`,
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4
                        }}
                      >
                        📥 {cierre.has12 ? 'Reemplazar Excel' : 'Subir Excel'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Acciones Cierre */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  paddingTop: 12,
                  borderTop: '1px solid #f1f5f9'
                }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {cierre.trimestralCierre ? (
                      <span style={{ color: '#6d28d9', fontWeight: 600 }}>
                        Emitido el {new Date(cierre.trimestralCierre.createdAt).toLocaleDateString('es-AR')} • Período: {cierre.trimestralCierre.periodo}
                      </span>
                    ) : cierre.count > 0 ? (
                      <span style={{ color: '#1d4ed8', fontWeight: 600 }}>
                        {cierre.count} de 3 meses disponibles ({[cierre.has10 ? 'Octubre' : '', cierre.has11 ? 'Noviembre' : '', cierre.has12 ? 'Diciembre' : ''].filter(Boolean).join(', ')}). Listo para generar informe de cierre.
                      </span>
                    ) : (
                      <span style={{ color: '#dc2626' }}>
                        Esperando que los profesores carguen las cuadrículas de Octubre, Noviembre o Diciembre.
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {cierre.trimestralCierre ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewReportId(cierre.trimestralCierre!.id);
                            setPreviewReportTitle(`Trimestral de Cierre - ${young.nombre}`);
                          }}
                          style={{
                            padding: '8px 14px',
                            background: '#7c3aed',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          👁️ Previsualizar
                        </button>
                        <Link
                          href={`/reports/${cierre.trimestralCierre.id}`}
                          style={{
                            padding: '8px 14px',
                            background: '#0284c7',
                            color: 'white',
                            borderRadius: 6,
                            textDecoration: 'none',
                            fontSize: 13,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          ✏️ Editar
                        </Link>
                        <a
                          href={`/api/reports/${cierre.trimestralCierre.id}/.docx`}
                          download
                          style={{
                            padding: '8px 14px',
                            background: '#059669',
                            color: 'white',
                            borderRadius: 6,
                            textDecoration: 'none',
                            fontSize: 13,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          📥 Word (.docx)
                        </a>
                        <button
                          onClick={() => handleGenerateCierre(young)}
                          disabled={isGeneratingCierre}
                          title="Volver a generar el Trimestral de Cierre consolidando nuevamente con IA"
                          style={{
                            padding: '8px 12px',
                            background: '#d97706',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: isGeneratingCierre ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          {isGeneratingCierre ? '⏳...' : '🔄 Regenerar Cierre (IA)'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleGenerateCierre(young)}
                        disabled={cierre.count === 0 || isGeneratingCierre}
                        style={{
                          padding: '10px 18px',
                          background: cierre.count > 0 ? '#2563eb' : '#94a3b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: cierre.count > 0 && !isGeneratingCierre ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          boxShadow: cierre.count > 0 ? '0 2px 6px rgba(37, 99, 235, 0.3)' : 'none'
                        }}
                      >
                        {isGeneratingCierre ? (
                          <>⏳ Consolidando con IA...</>
                        ) : cierre.count > 0 ? (
                          <>⚡ Generar Trimestral Cierre (Oct-Nov-Dic)</>
                        ) : (
                          <>🔒 Requiere Cuadrícula</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
