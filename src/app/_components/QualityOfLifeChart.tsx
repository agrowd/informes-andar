"use client";
import React from 'react';

interface Dimension {
  dimension: string;
  actual?: string;
  evolucion?: string;
}

interface Props {
  periods: {
    periodo: string;
    dimensiones: Dimension[];
  }[];
}

const EVOLUTION_VALUES: Record<string, number> = {
  '✔': 100,
  '⏳': 66,
  '➖': 33,
  '❌': 0
};

export default function QualityOfLifeChart({ periods }: Props) {
  if (!periods || periods.length === 0) return <div>No hay datos suficientes para comparar.</div>;

  // Tomar las dimensiones del periodo más reciente como base
  const labels = periods[0].dimensiones.map(d => d.dimension);
  const numDimensions = labels.length;
  const radius = 150;
  const centerX = 200;
  const centerY = 200;

  const getCoordinates = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / numDimensions - Math.PI / 2;
    const r = (value / 100) * radius;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle)
    };
  };

  const colors = [
    { fill: 'rgba(59, 130, 246, 0.4)', stroke: '#2563EB', point: '#1D4ED8' }, // Blue
    { fill: 'rgba(16, 185, 129, 0.4)', stroke: '#10B981', point: '#059669' }, // Green
    { fill: 'rgba(245, 158, 11, 0.4)', stroke: '#F59E0B', point: '#D97706' }, // Amber
  ];

  return (
    <div className="ga-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
      <h3 style={{ marginBottom: '24px' }}>Comparativa de Calidad de Vida</h3>
      
      <div style={{ position: 'relative', width: '400px', height: '400px' }}>
        <svg viewBox="0 0 400 400" style={{ width: '100%', height: '100%' }}>
          {/* Polígonos de fondo (malla) */}
          {[20, 40, 60, 80, 100].map(v => (
            <polygon
              key={v}
              points={labels.map((_, i) => {
                const { x, y } = getCoordinates(i, v);
                return `${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke="#e5e7eb"
              strokeDasharray="4 2"
            />
          ))}

          {/* Ejes */}
          {labels.map((label, i) => {
            const { x, y } = getCoordinates(i, 100);
            const labelPos = getCoordinates(i, 115);
            return (
              <g key={i}>
                <line x1={centerX} y1={centerY} x2={x} y2={y} stroke="#e5e7eb" />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  fontSize="10"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#6b7280"
                  style={{ fontWeight: 600 }}
                >
                  {label.split(' ').map((word, wi) => (
                    <tspan key={wi} x={labelPos.x} dy={wi === 0 ? 0 : 12}>{word}</tspan>
                  ))}
                </text>
              </g>
            );
          })}

          {/* Polígonos de datos */}
          {periods.slice(0, 3).reverse().map((p, pi) => {
            const color = colors[pi % colors.length];
            const points = p.dimensiones.map((d, i) => {
              const val = EVOLUTION_VALUES[d.evolucion || ''] ?? 0;
              const { x, y } = getCoordinates(i, val);
              return `${x},${y}`;
            }).join(' ');

            return (
              <g key={p.periodo}>
                <polygon
                  points={points}
                  fill={color.fill}
                  stroke={color.stroke}
                  strokeWidth="2"
                  style={{ transition: 'all 0.5s ease' }}
                />
                {p.dimensiones.map((d, i) => {
                  const val = EVOLUTION_VALUES[d.evolucion || ''] ?? 0;
                  const { x, y } = getCoordinates(i, val);
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="4"
                      fill={color.point}
                      title={`${p.periodo}: ${d.dimension} (${d.evolucion})`}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginTop: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {periods.slice(0, 3).map((p, pi) => (
          <div key={p.periodo} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: colors[pi % colors.length].stroke }} />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{p.periodo}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '24px', width: '100%' }}>
        <table className="ga-table" style={{ fontSize: '13px' }}>
          <thead>
            <tr>
              <th>Dimensión</th>
              {periods.slice(0, 3).map(p => <th key={p.periodo}>{p.periodo}</th>)}
            </tr>
          </thead>
          <tbody>
            {labels.map((label, li) => (
              <tr key={label} className="ga-table-row-hover">
                <td style={{ fontWeight: 600 }}>{label}</td>
                {periods.slice(0, 3).map(p => {
                  const dim = p.dimensiones.find(d => d.dimension === label);
                  return (
                    <td key={p.periodo} style={{ textAlign: 'center' }}>
                      <span style={{ 
                        fontSize: '16px',
                        color: dim?.evolucion === '✔' ? 'var(--success)' : dim?.evolucion === '❌' ? 'var(--error)' : 'inherit'
                      }}>
                        {dim?.evolucion || '—'}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
