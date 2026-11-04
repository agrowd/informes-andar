"use client";
import React from 'react';
import { formatApellidoNombre, sanitizeNarrativeLevels } from '@/lib/formatters';

interface FinalReportViewerProps {
  rep: any;
  meta: {
    id: string;
    periodo: string;
    jovenNombre?: string;
    grupo?: string;
    version?: number;
  };
  editMode: boolean;
  editedData: any;
  setEditedData: (data: any) => void;
  saving?: boolean;
}

function cleanParrafo(text: string): string {
  if (typeof text !== 'string') return '';
  const sanitized = sanitizeNarrativeLevels(text);
  return sanitized
    .replace(/^[ \t]*[\(\[]?[pP][aá]rrafo\s*\d*[\)\]]?[ \t]*[:.\-–—]?[ \t]*/gim, '')
    .replace(/\b[pP][aá]rrafo\s*\d+[ \t]*[:.\-–—][ \t]*/gi, '')
    .trim();
}

export default function FinalReportViewer({
  rep,
  meta,
  editMode,
  editedData,
  setEditedData,
  saving
}: FinalReportViewerProps) {
  const p1 = editMode ? (editedData?.parte1 || {}) : (rep?.parte1_informeFinal || {});
  const p2 = editMode ? (editedData?.parte2 || {}) : (rep?.parte2_planAbordaje || {});
  const dg = rep?.datosGenerales || {};

  const handleP1Change = (field: string, val: any) => {
    setEditedData((prev: any) => ({
      ...prev,
      parte1: {
        ...(prev?.parte1 || {}),
        [field]: val
      }
    }));
  };

  const handleP1LogroChange = (area: string, val: string) => {
    setEditedData((prev: any) => ({
      ...prev,
      parte1: {
        ...(prev?.parte1 || {}),
        logros: {
          ...(prev?.parte1?.logros || {}),
          [area]: val
        }
      }
    }));
  };

  const handleDimensionChange = (index: number, key: 'valoracion' | 'comentario', val: string) => {
    setEditedData((prev: any) => {
      const currentDims = [...(prev?.parte1?.evaluacionDimensiones || [])];
      if (currentDims[index]) {
        currentDims[index] = { ...currentDims[index], [key]: val };
      }
      return {
        ...prev,
        parte1: {
          ...(prev?.parte1 || {}),
          evaluacionDimensiones: currentDims
        }
      };
    });
  };

  const handleP2Change = (field: string, val: any) => {
    setEditedData((prev: any) => ({
      ...prev,
      parte2: {
        ...(prev?.parte2 || {}),
        [field]: val
      }
    }));
  };

  const handleP2LineaChange = (eje: string, val: string) => {
    // split by newline
    const items = val.split('\n').filter(Boolean);
    setEditedData((prev: any) => ({
      ...prev,
      parte2: {
        ...(prev?.parte2 || {}),
        lineasAccion: {
          ...(prev?.parte2?.lineasAccion || {}),
          [eje]: items
        }
      }
    }));
  };

  const dimensionesList = Array.isArray(p1.evaluacionDimensiones) && p1.evaluacionDimensiones.length > 0
    ? p1.evaluacionDimensiones
    : [
        { dimension: 'Bienestar Físico', valoracion: '✔', comentario: 'Participa en actividad física y salud.' },
        { dimension: 'Bienestar Emocional', valoracion: '✔', comentario: 'Reconoce y manifiesta sus emociones.' },
        { dimension: 'Bienestar Material', valoracion: '➖', comentario: 'Cuidado de pertenencias y recursos.' },
        { dimension: 'Desarrollo Personal', valoracion: '✔', comentario: 'Adquiere destrezas prácticas y funcionales.' },
        { dimension: 'Relaciones Interpersonales', valoracion: '✔', comentario: 'Afianza lazos de compañerismo.' },
        { dimension: 'Inclusión Social', valoracion: '✔', comentario: 'Participación en festejos y eventos comunitarios.' },
        { dimension: 'Autodeterminación', valoracion: '✔', comentario: 'Expresa sus preferencias y toma decisiones.' },
        { dimension: 'Derechos', valoracion: '➖', comentario: 'Se respeta su espacio y elecciones.' }
      ];

  const getValoracionBadge = (val: string) => {
    if (val === '✔') {
      return <span style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', padding: '3px 10px', borderRadius: 6, fontWeight: 700, fontSize: 13 }}>✔ Mejoró</span>;
    }
    if (val === '➖') {
      return <span style={{ background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A', padding: '3px 10px', borderRadius: 6, fontWeight: 700, fontSize: 13 }}>➖ Mantuvo</span>;
    }
    return <span style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA', padding: '3px 10px', borderRadius: 6, fontWeight: 700, fontSize: 13 }}>❌ Dificultad</span>;
  };

  const lineasAccion = p2.lineasAccion || {};

  return (
    <div style={{
      background: '#fff',
      maxWidth: '920px',
      margin: '20px auto',
      boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
      borderRadius: 8,
      border: '1px solid #e2e8f0',
      padding: '50px 60px',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      color: '#334155',
      lineHeight: 1.6
    }}>
      {/* ========================================================================= */}
      {/* PARTE 1: INFORME FINAL - ABORDAJE CENTRADO EN LA PERSONA */}
      {/* ========================================================================= */}
      <div style={{ borderBottom: '3px solid #1E3A8A', paddingBottom: 20, marginBottom: 25 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>ASOCIACIÓN CIVIL ANDAR – CENTRO DE DÍA</span>
            <h1 style={{ margin: '4px 0 0 0', color: '#1E3A8A', fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}>
              INFORME FINAL
            </h1>
            <h2 style={{ margin: '2px 0 0 0', color: '#3B82F6', fontSize: 16, fontWeight: 700 }}>
              ABORDAJE CENTRADO EN LA PERSONA
            </h2>
            <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', marginTop: 3 }}>
              (Modelo Social de la Discapacidad – Calidad de Vida – Planificación Centrada en la Persona)
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
              Ciclo Anual {meta.periodo || '2026'}
            </span>
          </div>
        </div>
      </div>

      {/* Datos Personales y Círculo de Apoyo */}
      <div style={{
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: 8,
        padding: '16px 20px',
        marginBottom: 30,
        fontSize: 14,
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.01)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', marginBottom: 10 }}>
          <div><strong>Nombre completo:</strong> {formatApellidoNombre(meta.jovenNombre || dg.nombreCompleto || '')}</div>
          <div><strong>DNI:</strong> {dg.dni || 'Sin registrar'}</div>
          <div><strong>Obra Social:</strong> {dg.obraSocial || ''}</div>
          <div><strong>Grupo / Taller:</strong> {meta.grupo || dg.grupo || 'Centro de Día'}</div>
        </div>
        <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: 10, marginTop: 10, fontSize: 13.5 }}>
          <div><strong>Participación del círculo de apoyo:</strong> {dg.circuloApoyoParticipacion || 'Sí'}</div>
          <div style={{ marginTop: 4 }}><strong>Personas que lo integran:</strong> {dg.circuloApoyoPersonas || `${dg.facilitadorNombre || 'Facilitadores'}, equipo institucional y compañeras de taller.`}</div>
        </div>
      </div>

      {/* SECCIÓN 2: OBJETIVO DEL PROCESO */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ color: '#1E3A8A', fontSize: 15, fontWeight: 800, borderBottom: '1px solid #E2E8F0', paddingBottom: 6, marginBottom: 10 }}>
          2. OBJETIVO DEL PROCESO
        </h3>
        {editMode ? (
          <textarea
            style={{ width: '100%', minHeight: 110, padding: '10px 14px', borderRadius: 6, border: '1.5px solid #CBD5E1', fontSize: 14, lineHeight: 1.6 }}
            value={p1.objetivoProceso || ''}
            onChange={(e) => handleP1Change('objetivoProceso', e.target.value)}
          />
        ) : (
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65, color: '#334155' }}>
            {p1.objetivoProceso || 'Durante este ciclo institucional se trabajó en el desarrollo de habilidades vinculadas al aprendizaje a lo largo de la vida, la comunicación y la participación en actividades sociales.'}
          </p>
        )}
      </div>

      {/* SECCIÓN 3: ESCUCHA ACTIVA Y AUTODETERMINACIÓN */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ color: '#1E3A8A', fontSize: 15, fontWeight: 800, borderBottom: '1px solid #E2E8F0', paddingBottom: 6, marginBottom: 10 }}>
          3. ESCUCHA ACTIVA Y AUTODETERMINACIÓN
        </h3>
        {editMode ? (
          <textarea
            style={{ width: '100%', minHeight: 120, padding: '10px 14px', borderRadius: 6, border: '1.5px solid #CBD5E1', fontSize: 14, lineHeight: 1.6 }}
            value={p1.escuchaActiva || ''}
            onChange={(e) => handleP1Change('escuchaActiva', e.target.value)}
          />
        ) : (
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65, color: '#334155' }}>
            {p1.escuchaActiva}
          </p>
        )}
      </div>

      {/* SECCIÓN 4: ESTADO EMOCIONAL Y BIENESTAR SUBJETIVO */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ color: '#1E3A8A', fontSize: 15, fontWeight: 800, borderBottom: '1px solid #E2E8F0', paddingBottom: 6, marginBottom: 10 }}>
          4. ESTADO EMOCIONAL Y BIENESTAR SUBJETIVO
        </h3>
        {editMode ? (
          <textarea
            style={{ width: '100%', minHeight: 130, padding: '10px 14px', borderRadius: 6, border: '1.5px solid #CBD5E1', fontSize: 14, lineHeight: 1.6 }}
            value={p1.estadoEmocional || ''}
            onChange={(e) => handleP1Change('estadoEmocional', e.target.value)}
          />
        ) : (
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65, color: '#334155' }}>
            {p1.estadoEmocional}
          </p>
        )}
      </div>

      {/* SECCIÓN 5: APOYOS Y AJUSTES BRINDADOS */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ color: '#1E3A8A', fontSize: 15, fontWeight: 800, borderBottom: '1px solid #E2E8F0', paddingBottom: 6, marginBottom: 10 }}>
          5. APOYOS Y AJUSTES BRINDADOS
        </h3>
        {editMode ? (
          <textarea
            style={{ width: '100%', minHeight: 120, padding: '10px 14px', borderRadius: 6, border: '1.5px solid #CBD5E1', fontSize: 14, lineHeight: 1.6 }}
            value={p1.apoyosAjustes || ''}
            onChange={(e) => handleP1Change('apoyosAjustes', e.target.value)}
          />
        ) : (
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65, color: '#334155' }}>
            {p1.apoyosAjustes}
          </p>
        )}
      </div>

      {/* SECCIÓN 6: EVALUACIÓN DE LAS DIMENSIONES DE CALIDAD DE VIDA */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 6, marginBottom: 12 }}>
          <h3 style={{ margin: 0, color: '#1E3A8A', fontSize: 15, fontWeight: 800 }}>
            6. EVALUACIÓN DE LAS DIMENSIONES DE CALIDAD DE VIDA
          </h3>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
            Escala: ✔ Mejoró &nbsp;|&nbsp; ➖ Mantuvo &nbsp;|&nbsp; ❌ Dificultad
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: '#F1F5F9', textAlign: 'left', borderBottom: '2px solid #CBD5E1' }}>
                <th style={{ padding: '10px 14px', fontWeight: 700, color: '#1E293B', width: '28%' }}>Dimensión</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, color: '#1E293B', width: '18%', textAlign: 'center' }}>Valoración</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, color: '#1E293B' }}>Comentario breve</th>
              </tr>
            </thead>
            <tbody>
              {dimensionesList.map((d: any, idx: number) => (
                <tr key={d.dimension || idx} style={{ borderBottom: '1px solid #E2E8F0', background: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1E3A8A' }}>{d.dimension}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    {editMode ? (
                      <select
                        style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: 13, fontWeight: 700 }}
                        value={d.valoracion || '✔'}
                        onChange={(e) => handleDimensionChange(idx, 'valoracion', e.target.value)}
                      >
                        <option value="✔">✔ Mejoró</option>
                        <option value="➖">➖ Mantuvo</option>
                        <option value="❌">❌ Dificultad</option>
                      </select>
                    ) : (
                      getValoracionBadge(d.valoracion)
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#475569' }}>
                    {editMode ? (
                      <input
                        type="text"
                        style={{ width: '100%', padding: '4px 8px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: 13 }}
                        value={d.comentario || ''}
                        onChange={(e) => handleDimensionChange(idx, 'comentario', e.target.value)}
                      />
                    ) : (
                      d.comentario
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECCIÓN 7: LOGROS DESTACADOS Y HABILIDADES ADQUIRIDAS */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ color: '#1E3A8A', fontSize: 15, fontWeight: 800, borderBottom: '1px solid #E2E8F0', paddingBottom: 6, marginBottom: 14 }}>
          7. LOGROS DESTACADOS Y HABILIDADES ADQUIRIDAS
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Prácticas */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '14px 16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 13.5, color: '#1E3A8A', fontWeight: 700 }}>
              🛠️ Habilidades prácticas o funcionales:
            </h4>
            {editMode ? (
              <textarea
                style={{ width: '100%', minHeight: 90, padding: '8px 10px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: 13 }}
                value={p1.logros?.practicas || ''}
                onChange={(e) => handleP1LogroChange('practicas', e.target.value)}
              />
            ) : (
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: '#475569', whiteSpace: 'pre-line' }}>{cleanParrafo(p1.logros?.practicas)}</p>
            )}
          </div>

          {/* Emocionales y sociales */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '14px 16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 13.5, color: '#1E3A8A', fontWeight: 700 }}>
              💬 Habilidades emocionales y sociales:
            </h4>
            {editMode ? (
              <textarea
                style={{ width: '100%', minHeight: 90, padding: '8px 10px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: 13 }}
                value={p1.logros?.emocionalesSociales || ''}
                onChange={(e) => handleP1LogroChange('emocionalesSociales', e.target.value)}
              />
            ) : (
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: '#475569', whiteSpace: 'pre-line' }}>{cleanParrafo(p1.logros?.emocionalesSociales)}</p>
            )}
          </div>

          {/* Participación en decisiones */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '14px 16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 13.5, color: '#1E3A8A', fontWeight: 700 }}>
              🗳️ Participación en decisiones:
            </h4>
            {editMode ? (
              <textarea
                style={{ width: '100%', minHeight: 90, padding: '8px 10px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: 13 }}
                value={p1.logros?.decisiones || ''}
                onChange={(e) => handleP1LogroChange('decisiones', e.target.value)}
              />
            ) : (
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: '#475569', whiteSpace: 'pre-line' }}>{cleanParrafo(p1.logros?.decisiones)}</p>
            )}
          </div>

          {/* Nuevas experiencias */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '14px 16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 13.5, color: '#1E3A8A', fontWeight: 700 }}>
              🌟 Nuevas experiencias u oportunidades:
            </h4>
            {editMode ? (
              <textarea
                style={{ width: '100%', minHeight: 90, padding: '8px 10px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: 13 }}
                value={p1.logros?.nuevasExperiencias || ''}
                onChange={(e) => handleP1LogroChange('nuevasExperiencias', e.target.value)}
              />
            ) : (
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: '#475569', whiteSpace: 'pre-line' }}>{cleanParrafo(p1.logros?.nuevasExperiencias)}</p>
            )}
          </div>
        </div>
      </div>

      {/* SECCIÓN 8: SUEÑOS Y METAS A FUTURO */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ color: '#1E3A8A', fontSize: 15, fontWeight: 800, borderBottom: '1px solid #E2E8F0', paddingBottom: 6, marginBottom: 10 }}>
          8. SUEÑOS Y METAS A FUTURO
        </h3>
        {editMode ? (
          <textarea
            style={{ width: '100%', minHeight: 100, padding: '10px 14px', borderRadius: 6, border: '1.5px solid #CBD5E1', fontSize: 14, lineHeight: 1.6 }}
            value={p1.suenosMetas || ''}
            onChange={(e) => handleP1Change('suenosMetas', e.target.value)}
          />
        ) : (
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65, color: '#334155' }}>
            {p1.suenosMetas}
          </p>
        )}
      </div>

      {/* SECCIÓN 9: VALORACIÓN DEL CÍRCULO DE APOYO */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ color: '#1E3A8A', fontSize: 15, fontWeight: 800, borderBottom: '1px solid #E2E8F0', paddingBottom: 6, marginBottom: 10 }}>
          9. VALORACIÓN DEL CÍRCULO DE APOYO
        </h3>
        {editMode ? (
          <textarea
            style={{ width: '100%', minHeight: 100, padding: '10px 14px', borderRadius: 6, border: '1.5px solid #CBD5E1', fontSize: 14, lineHeight: 1.6 }}
            value={p1.circuloApoyo || ''}
            onChange={(e) => handleP1Change('circuloApoyo', e.target.value)}
          />
        ) : (
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65, color: '#334155' }}>
            {p1.circuloApoyo}
          </p>
        )}
      </div>

      {/* SECCIÓN 10: PROYECCIONES Y LÍNEAS DE ACCIÓN */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={{ color: '#1E3A8A', fontSize: 15, fontWeight: 800, borderBottom: '1px solid #E2E8F0', paddingBottom: 6, marginBottom: 12 }}>
          10. PROYECCIONES Y LÍNEAS DE ACCIÓN
        </h3>
        {editMode ? (
          <textarea
            style={{ width: '100%', minHeight: 120, padding: '10px 14px', borderRadius: 6, border: '1.5px solid #CBD5E1', fontSize: 14, lineHeight: 1.6 }}
            value={Array.isArray(p1.proyecciones) ? p1.proyecciones.join('\n') : (p1.proyecciones || '')}
            onChange={(e) => handleP1Change('proyecciones', e.target.value.split('\n').filter(Boolean))}
          />
        ) : (
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8, color: '#334155' }}>
            {(Array.isArray(p1.proyecciones) ? p1.proyecciones : []).map((pr: string, idx: number) => (
              <li key={idx} style={{ marginBottom: 4 }}>{pr}</li>
            ))}
          </ul>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SEPARADOR DE PÁGINA: INICIO DE PARTE 2 */}
      {/* ========================================================================= */}
      <div style={{
        margin: '50px 0 40px 0',
        paddingTop: 30,
        borderTop: '4px double #CBD5E1',
        position: 'relative',
        textAlign: 'center'
      }}>
        <span style={{
          position: 'absolute',
          top: -14,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#fff',
          padding: '0 20px',
          color: '#64748b',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 1.5
        }}>
          DOCUMENTO COMPLEMENTARIO INSTITUCIONAL
        </span>
      </div>

      {/* ========================================================================= */}
      {/* PARTE 2: PLAN DE ABORDAJE CENTRADO EN LA PERSONA */}
      {/* ========================================================================= */}
      <div style={{ borderBottom: '3px solid #059669', paddingBottom: 15, marginBottom: 25 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, color: '#065F46', fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>
              PLAN DE ABORDAJE CENTRADO EN LA PERSONA {p2.anio || '2026'}
            </h2>
            <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', marginTop: 3 }}>
              Modelo Social de la Discapacidad – Calidad de Vida – Planificación Centrada en la Persona
            </div>
          </div>
          <span style={{ background: '#ECFDF5', color: '#047857', padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, border: '1px solid #A7F3D0' }}>
            Plan Operativo Anual
          </span>
        </div>
      </div>

      {/* Introducción del Plan */}
      <div style={{ background: '#F8FAFC', borderLeft: '4px solid #059669', padding: '12px 18px', marginBottom: 25, borderRadius: '0 8px 8px 0' }}>
        {editMode ? (
          <textarea
            style={{ width: '100%', minHeight: 80, padding: '8px 12px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: 13.5 }}
            value={p2.introduccion || ''}
            onChange={(e) => handleP2Change('introduccion', e.target.value)}
          />
        ) : (
          <p style={{ margin: 0, fontSize: 13.5, fontStyle: 'italic', color: '#475569', lineHeight: 1.6 }}>
            {p2.introduccion || 'Este plan se ha elaborado con el objetivo de mejorar el acceso a los apoyos y servicios necesarios para incrementar la calidad de vida de la persona.'}
          </p>
        )}
      </div>

      {/* Objetivo General */}
      <div style={{
        background: '#EFF6FF',
        border: '1px solid #BFDBFE',
        borderRadius: 8,
        padding: '16px 20px',
        marginBottom: 28
      }}>
        <h3 style={{ margin: '0 0 8px 0', color: '#1E40AF', fontSize: 15, fontWeight: 800 }}>
          🎯 Objetivo General {p2.anio || '2026'}
        </h3>
        {editMode ? (
          <textarea
            style={{ width: '100%', minHeight: 80, padding: '8px 12px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: 14 }}
            value={p2.objetivoGeneral || ''}
            onChange={(e) => handleP2Change('objetivoGeneral', e.target.value)}
          />
        ) : (
          <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: '#1E3A8A', lineHeight: 1.6 }}>
            {p2.objetivoGeneral}
          </p>
        )}
      </div>

      {/* Objetivos Específicos */}
      <div style={{ marginBottom: 30 }}>
        <h3 style={{ color: '#065F46', fontSize: 15, fontWeight: 800, borderBottom: '1px solid #E2E8F0', paddingBottom: 6, marginBottom: 12 }}>
          📌 Objetivos Específicos
        </h3>
        {editMode ? (
          <textarea
            style={{ width: '100%', minHeight: 120, padding: '10px 14px', borderRadius: 6, border: '1.5px solid #CBD5E1', fontSize: 13.5 }}
            value={Array.isArray(p2.objetivosEspecificos) ? p2.objetivosEspecificos.join('\n') : (p2.objetivosEspecificos || '')}
            onChange={(e) => handleP2Change('objetivosEspecificos', e.target.value.split('\n').filter(Boolean))}
          />
        ) : (
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8, color: '#334155' }}>
            {(Array.isArray(p2.objetivosEspecificos) ? p2.objetivosEspecificos : []).map((oe: string, idx: number) => (
              <li key={idx} style={{ marginBottom: 4 }}>{oe}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Líneas de Acción (6 Ejes) */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ color: '#065F46', fontSize: 15, fontWeight: 800, borderBottom: '1px solid #E2E8F0', paddingBottom: 6, marginBottom: 16 }}>
          ⚡ Líneas de Acción {p2.anio || '2026'}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Autonomía */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '14px 16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 13.5, color: '#065F46', fontWeight: 700 }}>
              🏠 Autonomía en la vida diaria:
            </h4>
            {editMode ? (
              <textarea
                style={{ width: '100%', minHeight: 80, padding: '8px 10px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: 13 }}
                value={Array.isArray(lineasAccion.autonomia) ? lineasAccion.autonomia.join('\n') : ''}
                onChange={(e) => handleP2LineaChange('autonomia', e.target.value)}
              />
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: '#475569' }}>
                {(Array.isArray(lineasAccion.autonomia) ? lineasAccion.autonomia : []).map((it: string, i: number) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Regulación emocional */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '14px 16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 13.5, color: '#065F46', fontWeight: 700 }}>
              🧘 Regulación emocional y bienestar subjetivo:
            </h4>
            {editMode ? (
              <textarea
                style={{ width: '100%', minHeight: 80, padding: '8px 10px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: 13 }}
                value={Array.isArray(lineasAccion.regulacionEmocional) ? lineasAccion.regulacionEmocional.join('\n') : ''}
                onChange={(e) => handleP2LineaChange('regulacionEmocional', e.target.value)}
              />
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: '#475569' }}>
                {(Array.isArray(lineasAccion.regulacionEmocional) ? lineasAccion.regulacionEmocional : []).map((it: string, i: number) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Habilidades sociales */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '14px 16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 13.5, color: '#065F46', fontWeight: 700 }}>
              🤝 Habilidades sociales y relaciones:
            </h4>
            {editMode ? (
              <textarea
                style={{ width: '100%', minHeight: 80, padding: '8px 10px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: 13 }}
                value={Array.isArray(lineasAccion.habilidadesSociales) ? lineasAccion.habilidadesSociales.join('\n') : ''}
                onChange={(e) => handleP2LineaChange('habilidadesSociales', e.target.value)}
              />
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: '#475569' }}>
                {(Array.isArray(lineasAccion.habilidadesSociales) ? lineasAccion.habilidadesSociales : []).map((it: string, i: number) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Inclusión comunitaria */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '14px 16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 13.5, color: '#065F46', fontWeight: 700 }}>
              🌍 Inclusión comunitaria y participación social:
            </h4>
            {editMode ? (
              <textarea
                style={{ width: '100%', minHeight: 80, padding: '8px 10px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: 13 }}
                value={Array.isArray(lineasAccion.inclusionComunitaria) ? lineasAccion.inclusionComunitaria.join('\n') : (Array.isArray(lineasAccion.integracionComunitaria) ? lineasAccion.integracionComunitaria.join('\n') : '')}
                onChange={(e) => handleP2LineaChange('inclusionComunitaria', e.target.value)}
              />
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: '#475569' }}>
                {(Array.isArray(lineasAccion.inclusionComunitaria) ? lineasAccion.inclusionComunitaria : (Array.isArray(lineasAccion.integracionComunitaria) ? lineasAccion.integracionComunitaria : [])).map((it: string, i: number) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Autodeterminación */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '14px 16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 13.5, color: '#065F46', fontWeight: 700 }}>
              🧭 Autodeterminación y toma de decisiones:
            </h4>
            {editMode ? (
              <textarea
                style={{ width: '100%', minHeight: 80, padding: '8px 10px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: 13 }}
                value={Array.isArray(lineasAccion.autodeterminacion) ? lineasAccion.autodeterminacion.join('\n') : ''}
                onChange={(e) => handleP2LineaChange('autodeterminacion', e.target.value)}
              />
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: '#475569' }}>
                {(Array.isArray(lineasAccion.autodeterminacion) ? lineasAccion.autodeterminacion : []).map((it: string, i: number) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Acompañamiento familiar */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '14px 16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 13.5, color: '#065F46', fontWeight: 700 }}>
              👨‍👩‍👧‍👦 Acompañamiento familiar:
            </h4>
            {editMode ? (
              <textarea
                style={{ width: '100%', minHeight: 80, padding: '8px 10px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: 13 }}
                value={Array.isArray(lineasAccion.acompanamientoFamiliar) ? lineasAccion.acompanamientoFamiliar.join('\n') : ''}
                onChange={(e) => handleP2LineaChange('acompanamientoFamiliar', e.target.value)}
              />
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: '#475569' }}>
                {(Array.isArray(lineasAccion.acompanamientoFamiliar) ? lineasAccion.acompanamientoFamiliar : []).map((it: string, i: number) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Sueños y Metas */}
      <div style={{ marginBottom: 30 }}>
        <h3 style={{ color: '#065F46', fontSize: 15, fontWeight: 800, borderBottom: '1px solid #E2E8F0', paddingBottom: 6, marginBottom: 10 }}>
          🌈 Sueños y Metas {p2.anio || '2026'}
        </h3>
        {editMode ? (
          <textarea
            style={{ width: '100%', minHeight: 90, padding: '10px 14px', borderRadius: 6, border: '1.5px solid #CBD5E1', fontSize: 13.5 }}
            value={Array.isArray(p2.suenosMetas) ? p2.suenosMetas.join('\n') : (p2.suenosMetas || '')}
            onChange={(e) => handleP2Change('suenosMetas', e.target.value.split('\n').filter(Boolean))}
          />
        ) : (
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8, color: '#334155' }}>
            {(Array.isArray(p2.suenosMetas) ? p2.suenosMetas : []).map((sm: string, idx: number) => (
              <li key={idx} style={{ marginBottom: 4 }}>{sm}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Indicadores de Seguimiento */}
      <div style={{ marginBottom: 30 }}>
        <h3 style={{ color: '#065F46', fontSize: 15, fontWeight: 800, borderBottom: '1px solid #E2E8F0', paddingBottom: 6, marginBottom: 12 }}>
          📊 Indicadores de Seguimiento y Evaluación
        </h3>
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '14px 18px', fontSize: 13.5, lineHeight: 1.8 }}>
          {Object.entries(p2.indicadores || {}).map(([key, val]: any) => (
            <div key={key} style={{ marginBottom: 6 }}>
              <strong style={{ color: '#065F46' }}>
                {key === 'bienestarFisico' && 'Bienestar Físico: '}
                {key === 'bienestarEmocional' && 'Bienestar Emocional: '}
                {key === 'bienestarMaterial' && 'Bienestar Material: '}
                {key === 'desarrolloPersonal' && 'Desarrollo Personal: '}
                {key === 'relacionesInterpersonales' && 'Relaciones Interpersonales: '}
                {(key === 'inclusionSocial' || key === 'integracionSocial') && 'Inclusión Social: '}
                {key === 'autodeterminacion' && 'Autodeterminación: '}
                {key === 'derechos' && 'Derechos: '}
              </strong>
              {editMode ? (
                <input
                  type="text"
                  style={{ width: '100%', padding: '4px 8px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: 13, marginTop: 2 }}
                  value={val || ''}
                  onChange={(e) => {
                    const newInds = { ...(p2.indicadores || {}), [key]: e.target.value };
                    handleP2Change('indicadores', newInds);
                  }}
                />
              ) : (
                <span style={{ color: '#475569' }}>{val}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Lineamientos para el Facilitador */}
      <div style={{
        background: '#F0FDF4',
        border: '1.5px solid #BBF7D0',
        borderRadius: 8,
        padding: '18px 22px',
        marginBottom: 20
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#166534', fontSize: 15, fontWeight: 800 }}>
          💡 Lineamientos para el Facilitador
        </h3>
        {editMode ? (
          <textarea
            style={{ width: '100%', minHeight: 110, padding: '10px 14px', borderRadius: 6, border: '1.5px solid #86EFAC', fontSize: 13.5 }}
            value={Array.isArray(p2.lineamientosFacilitador) ? p2.lineamientosFacilitador.join('\n') : (p2.lineamientosFacilitador || '')}
            onChange={(e) => handleP2Change('lineamientosFacilitador', e.target.value.split('\n').filter(Boolean))}
          />
        ) : (
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, lineHeight: 1.8, color: '#14532D' }}>
            {(Array.isArray(p2.lineamientosFacilitador) ? p2.lineamientosFacilitador : []).map((l: string, idx: number) => (
              <li key={idx} style={{ marginBottom: 4 }}>{l}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
