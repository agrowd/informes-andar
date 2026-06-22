export interface ChecklistItem {
  nombre: string;
  nivel: number; // 0 a 4 (0: sin evaluar, 1: enseñado, 2: con apoyo, 3: sola, 4: puede enseñar)
}

export interface ChecklistTaller {
  nombre: string;
  items: ChecklistItem[];
}

export const DEFAULT_TALLERES: ChecklistTaller[] = [
  {
    nombre: "DEPORTE",
    items: [
      { nombre: "Desarrollar fuerza", nivel: 0 },
      { nombre: "Movilidad articular de miembros superiores", nivel: 0 },
      { nombre: "Movilidad articular de miembros inferiores", nivel: 0 },
      { nombre: "Lanzar con brazo derecho", nivel: 0 },
      { nombre: "Lanzar con brazo izquierdo", nivel: 0 },
      { nombre: "Realizar elongación", nivel: 0 },
      { nombre: "Elongar zona media", nivel: 0 },
      { nombre: "Elongar miembros superiores", nivel: 0 },
      { nombre: "Elongar miembros inferiores", nivel: 0 },
      { nombre: "Realizar trabajos posturales", nivel: 0 },
      { nombre: "Sostener estabilidad", nivel: 0 },
      { nombre: "Trasladar elementos", nivel: 0 },
      { nombre: "Acoplar elementos", nivel: 0 },
      { nombre: "Sostener el tiempo de la actividad", nivel: 0 }
    ]
  },
  {
    nombre: "VIAJAR",
    items: [
      { nombre: "Identificar AVD", nivel: 0 },
      { nombre: "Reconocer pertenencias", nivel: 0 },
      { nombre: "Desarrollar desplazamiento sobre circuito", nivel: 0 },
      { nombre: "Estimular el sentido auditivo", nivel: 0 },
      { nombre: "Identificar sonidos", nivel: 0 },
      { nombre: "Tolerar olores", nivel: 0 }
    ]
  },
  {
    nombre: "HABILIDADES SOCIALES",
    items: [
      { nombre: "Gestionar las emociones", nivel: 0 },
      { nombre: "Gestionar impulsos negativos", nivel: 0 },
      { nombre: "Identificar emociones propias", nivel: 0 },
      { nombre: "Comunicar verbalmente", nivel: 0 },
      { nombre: "Comunicar no verbalmente", nivel: 0 },
      { nombre: "Gestionar impulsos positivos", nivel: 0 }
    ]
  },
  {
    nombre: "MUSICOTERAPIA",
    items: [
      { nombre: "Cantar", nivel: 0 },
      { nombre: "Manipular instrumentos musicales", nivel: 0 },
      { nombre: "Disfrutar de la actividad", nivel: 0 }
    ]
  },
  {
    nombre: "MANOS VERDES",
    items: [
      { nombre: "Regar las plantas", nivel: 0 },
      { nombre: "Transladar macetas o   herramientas", nivel: 0 },
      { nombre: "Plantar planines o esquejos", nivel: 0 }
    ]
  }
];
