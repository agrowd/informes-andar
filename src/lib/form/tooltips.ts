// Tooltips de ayuda por opción, derivadas de notas institucionales.
export const tooltipByOption: Record<string, string> = {
	// Apoyos y ajustes
	'Lenguaje claro y accesible': 'Evitar tecnicismos; frases cortas; confirmar comprensión.',
	'Apoyos visuales personalizados': 'Pictogramas, agendas y secuencias adaptadas a la persona.',
	'Repetición guiada y acompañamiento estructurado': 'Apoyos paso a paso respetando el ritmo individual.',
	'Apoyos tecnológicos funcionales': 'Apps accesibles, dispositivos con recordatorios o instrucciones.',
	'Sistemas aumentativos o alternativos de comunicación': 'Tableros, gestos o dispositivos que complementen el habla.',
	// Escucha 3.x
	'Preferencias sobre actividades': 'Registrar actividades elegidas por la persona; evitar suposiciones.',
	'Decisiones sobre con quién vincularse': 'Respetar elecciones afectivas y amistades.',
	'Elección de talleres según intereses': 'Basar las propuestas en motivaciones expresadas.',
	'Cosas que le gustaría aprender': 'Planificar apoyos para explorar intereses nuevos.',
	'Deseos respecto a salidas/paseos/viajes': 'Anotar lugares/formatos preferidos y apoyos necesarios.',
	'Iniciativa en ideas o proyectos': 'Valorar propuestas y dar espacio para concretarlas.',
	'Solicita cambios o expresa disconformidad': 'Registrar situaciones y respuesta institucional.',
	'Pide apoyo para poder elegir/decidir': 'Ofrecer apoyos sin sustituir la decisión.',
	'Requiere guía para identificar preferencias': 'Usar apoyos visuales, ejemplos y exploración acompañada.',
	// Estado emocional
	'Maneja frustración o cambios': 'Describe ejemplos concretos donde logró regularse.',
	'Se desorganiza ante imprevistos': 'Indicar contextos y apoyos que ayudan.',
	// Experiencias
	'No participó': 'Si elegís esta opción, especificá el/los motivos en el campo correspondiente.'
};

export function getTooltip(option: string): string | undefined {
	return tooltipByOption[option];
}


