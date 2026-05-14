"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import QualityOfLifeChart from '@/app/_components/QualityOfLifeChart';
import EditableText from '@/app/_components/EditableText';

export default function YoungAnalytics() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [young, setYoung] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [evolutionRes, youngRes] = await Promise.all([
          fetch(`/api/youngs/${id}/evolution`),
          fetch(`/api/youngs/${id}`)
        ]);
        
        if (!evolutionRes.ok || !youngRes.ok) throw new Error('Error cargando datos');
        
        const evolutionData = await evolutionRes.json();
        const youngData = await youngRes.json();
        
        setData(evolutionData.evolution);
        setYoung(youngData.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando analíticas...</div>;
  if (!young) return <div style={{ padding: '40px', textAlign: 'center' }}>No se encontró el joven.</div>;

  return (
    <div className="ga-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button className="ga-btn" onClick={() => router.back()}>← Volver</button>
        <h1>Analíticas: {young.nombreCompleto}</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        <div className="ga-card" style={{ height: 'fit-content' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div className="avatar-wrap" style={{ width: '120px', height: '120px', margin: '0 auto 16px', borderRadius: '24px', overflow: 'hidden', border: '4px solid #f1f5f9' }}>
              <img src={young.foto || '/avatar-placeholder.png'} alt={young.nombreCompleto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <h2>{young.nombreCompleto}</h2>
            <div className="ga-status-pill approved">{young.taller || 'Sin taller'}</div>
          </div>
          
          <div style={{ borderTop: '1px solid #eee', paddingTop: '16px', marginTop: '16px' }}>
            <div style={{ marginBottom: '12px' }}>
              <small style={{ color: '#666', fontWeight: 600, display: 'block' }}>Períodos analizados</small>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                {data?.map((p: any) => (
                  <span key={p.id} className="ga-badge review" style={{ fontSize: '11px' }}>{p.periodo}</span>
                ))}
                {(!data || data.length === 0) && <span style={{ fontSize: '13px', color: '#999' }}>Sin datos aún</span>}
              </div>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <small style={{ color: '#666', fontWeight: 600, display: 'block' }}>Última actualización</small>
              <span style={{ fontSize: '14px' }}>{data?.[0]?.updatedAt ? new Date(data[0].updatedAt).toLocaleDateString() : '—'}</span>
            </div>
          </div>
        </div>

        <div>
          {data && data.length > 0 ? (
            <QualityOfLifeChart periods={data} />
          ) : (
            <div className="ga-card" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
              <h3>Aún no hay datos suficientes</h3>
              <p style={{ color: '#666' }}>Se necesitan al menos un formulario completado para mostrar el gráfico de calidad de vida.</p>
              <button className="ga-btn primary" style={{ marginTop: '16px' }} onClick={() => router.push(`/form?youngId=${young.id}`)}>Completar primer formulario</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
