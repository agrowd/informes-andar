export interface ChecklistItem {
  nombre: string;
  enseñado: boolean;
  apoyo: boolean;
  sola: boolean;
}

export interface ChecklistTaller {
  nombre: string;
  items: ChecklistItem[];
}

export const DEFAULT_TALLERES: ChecklistTaller[] = [
  {
    nombre: "DEPORTE",
    items: [
      { nombre: "Desarrollar fuerza", enseñado: false, apoyo: false, sola: false },
      { nombre: "Movilidad articular de miembros superiores", enseñado: false, apoyo: false, sola: false },
      { nombre: "Movilidad articular de miembros inferiores", enseñado: false, apoyo: false, sola: false },
      { nombre: "Lanzar con brazo derecho", enseñado: false, apoyo: false, sola: false },
      { nombre: "Lanzar con brazo izquierdo", enseñado: false, apoyo: false, sola: false },
      { nombre: "Realizar elongación", enseñado: false, apoyo: false, sola: false },
      { nombre: "Elongar zona media", enseñado: false, apoyo: false, sola: false },
      { nombre: "Elongar miembros superiores", enseñado: false, apoyo: false, sola: false },
      { nombre: "Elongar miembros inferiores", enseñado: false, apoyo: false, sola: false },
      { nombre: "Realizar trabajos posturales", enseñado: false, apoyo: false, sola: false },
      { nombre: "Sostener estabilidad", enseñado: false, apoyo: false, sola: false },
      { nombre: "Trasladar elementos", enseñado: false, apoyo: false, sola: false },
      { nombre: "Acoplar elementos", enseñado: false, apoyo: false, sola: false },
      { nombre: "Sostener el tiempo de la actividad", enseñado: false, apoyo: false, sola: false }
    ]
  },
  {
    nombre: "VIAJAR",
    items: [
      { nombre: "Identificar AVD", enseñado: false, apoyo: false, sola: false },
      { nombre: "Reconocer pertenencias", enseñado: false, apoyo: false, sola: false },
      { nombre: "Desarrollar desplazamiento sobre circuito", enseñado: false, apoyo: false, sola: false },
      { nombre: "Estimular el sentido auditivo", enseñado: false, apoyo: false, sola: false },
      { nombre: "Identificar sonidos", enseñado: false, apoyo: false, sola: false },
      { nombre: "Tolerar olores", enseñado: false, apoyo: false, sola: false }
    ]
  },
  {
    nombre: "HABILIDADES SOCIALES",
    items: [
      { nombre: "Gestionar las emociones", enseñado: false, apoyo: false, sola: false },
      { nombre: "Gestionar impulsos negativos", enseñado: false, apoyo: false, sola: false },
      { nombre: "Identificar emociones propias", enseñado: false, apoyo: false, sola: false },
      { nombre: "Comunicar verbalmente", enseñado: false, apoyo: false, sola: false },
      { nombre: "Comunicar no verbalmente", enseñado: false, apoyo: false, sola: false },
      { nombre: "Gestionar impulsos positivos", enseñado: false, apoyo: false, sola: false }
    ]
  },
  {
    nombre: "MUSICOTERAPIA",
    items: [
      { nombre: "Cantar", enseñado: false, apoyo: false, sola: false },
      { nombre: "Manipular instrumentos musicales", enseñado: false, apoyo: false, sola: false },
      { nombre: "Disfrutar de la actividad", enseñado: false, apoyo: false, sola: false }
    ]
  },
  {
    nombre: "MANOS VERDES",
    items: [
      { nombre: "Regar las plantas", enseñado: false, apoyo: false, sola: false },
      { nombre: "Transladar macetas o   herramientas", enseñado: false, apoyo: false, sola: false },
      { nombre: "Plantar planines o esquejos", enseñado: false, apoyo: false, sola: false }
    ]
  }
];
