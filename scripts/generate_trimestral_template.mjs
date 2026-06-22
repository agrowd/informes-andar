import fs from 'node:fs';
import path from 'node:path';
import PizZip from 'pizzip';

try {
  const docxPath = 'informes/2 Juan Pablo Herrera informes trimestral.docx';
  const outputPath = 'templates/trimestral_template.docx';

  // Ensure templates dir exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const content = fs.readFileSync(docxPath, 'binary');
  const zip = new PizZip(content);
  let xml = zip.file('word/document.xml').asText();

  const replacements = [
    { target: 'Juan Pablo Herrera', repl: '{nombreCompleto}' },
    { target: 'Clave de Sol', repl: '{grupo}' },
    { target: 'Arias Juliana - Reartes Ana', repl: '{facilitadores}' },
    { target: 'Estar en la playa y disfrutar del viento en la cara; salir a pasear y comer su comida favorita.', repl: '{metaSueno}' },
    { target: 'La Reja,10 de Junio del 2025', repl: '{fechaInforme}' },
    {
      target: 'Juan Pablo pudo cumplir con los objetivos personales propuestos para este año. Participó en un viaje a San Clemente donde disfrutó plenamente de la playa y del viento en el rostro, mostrando una expresión clara de alegría y disfrute. Además, tuvo la oportunidad de salir a pasear y disfrutar de su comida favorita en un restaurante ubicado en la costanera, logrando así completar ambos aspectos de su meta anual.',
      repl: '{metaAlcanzada}'
    },
    {
      target: 'Durante este trimestre, Juan Pablo asistió de forma regular a las actividades propuestas. Participó en todos los talleres con el acompañamiento constante de las facilitadoras, quienes lo apoyaron tanto de manera verbal como física para sostener su participación. Si bien algunas actividades físicas las tolera muy bien, otras requieren que se realicen en lapsos más breves. A pesar de estas diferencias, demuestra predisposición para sumarse a todas las propuestas.',
      repl: '{participacion}'
    },
    {
      target: 'Juan Pablo mantiene un vínculo positivo con sus compañeros, a quienes reconoce como parte de su grupo cercano. Su forma de comunicarse incluye el contacto físico y gestos afectuosos, lo que refuerza sus lazos sociales. Con sus facilitadoras también establece una relación de confianza y cariño; responde a indicaciones simples y demuestra reconocimiento y afecto a través de sus gestos.',
      repl: '{integracionRelaciones}'
    },
    {
      target: 'Durante este periodo, participó activamente en talleres vinculados con el deporte, el desarrollo de habilidades sociales y la experiencia de viajar. En el taller deportivo, sostuvo las actividades con apoyo físico y verbal, mostrando interés y compromiso. También tuvo una participación destacada en actividades que fortalecen su autonomía, lo cual está directamente relacionado con sus metas personales.',
      repl: '{actividadesRelacionadas}'
    },
    {
      target: 'Juan Pablo continúa desarrollando habilidades vinculadas a la vida cotidiana, tanto en el hogar como en contextos grupales. Dentro del grupo, colabora en la organización del espacio, ayudando a poner el mantel y retirar utensilios del comedor. En relación con sus hábitos de higiene, identifica los elementos necesarios para su aseo, reconoce los espacios donde deben guardarse, y colabora activamente en el momento del cambio de ropa, incluyendo el descarte de su pañal. Este progreso demuestra un fortalecimiento constante de su autonomía funcional.',
      repl: '{vidaIndependiente}'
    },
    {
      target: 'En relación a su meta de viajar, Juan Pablo ha desarrollado importantes habilidades como la movilidad, la empatía, la paciencia, la capacidad de adaptación, la gestión emocional, la comunicación y la autonomía. Se ha observado que se adapta con facilidad a nuevos espacios, como se evidenció en el taller de Manos Verdes, donde participó activamente en las tareas del vivero. Manipuló herramientas como la pala de mano, identificó los lugares adecuados para plantar, y colaboró en el traslado de materiales. Esta experiencia no solo favoreció su autonomía, sino también su bienestar emocional, al generar contacto con la naturaleza y permitirle experimentar diversas sensaciones.',
      repl: '{habilidadesViajar}'
    },
    {
      target: 'Juan Pablo ha mostrado avances en su participación en tareas diarias y en su disposición para interactuar con los demás. A pesar de que algunas actividades, como las artísticas, le resultan más desafiantes y requieren un mayor nivel de tolerancia, se lo motiva a explorarlas como una forma de desarrollar su motricidad fina. En actividades como los encastres, demuestra una notable capacidad de concentración, completando las tareas con dedicación.',
      repl: '{desarrolloPersonal}'
    },
    {
      target: 'A lo largo de este periodo, se trabajaron en Juan Pablo distintas destrezas físicas como la fuerza, la resistencia y la movilidad. Su participación en actividades como caminatas ha sido muy positiva, cumpliendo con los tiempos establecidos. También mostró avances en circuitos con cuñas, lanzamientos de pelotas, juegos de bochas y tejo, así como en ejercicios de coordinación utilizando aros. Su capacidad de concentración se ve claramente reflejada en propuestas como los encastres, que sostiene hasta completarlos.',
      repl: '{metasDeportivas}'
    },
    {
      target: 'Durante este trimestre, Juan Pablo consolidó habilidades sociales esenciales como la comunicación (verbal y no verbal), la empatía, la gestión emocional, el inicio y mantenimiento de interacciones, y la capacidad de adaptarse a distintos entornos sociales. Se lo observa compartiendo espacios con otros jóvenes, incluso fuera de su grupo habitual, sin dificultades. Participa con entusiasmo en celebraciones institucionales y actividades grupales, como los cumples mes. Se trabajan aspectos emocionales en talleres de relajación, actividades sensoriales y el contacto con la naturaleza, todo con el objetivo de ofrecerle un entorno seguro y contenedor para el desarrollo de sus habilidades sociales.',
      repl: '{metasSociales}'
    },
    {
      target: 'Durante este trimestre se trabajaron activamente dimensiones como la autodeterminación, las relaciones interpersonales, el bienestar físico y emocional, y la inclusión social. Juan Pablo tuvo una participación activa en todas las actividades propuestas, sosteniéndose con apoyo físico y verbal. Participó en eventos como el mini encuentro de bochas junto a otros jóvenes, fomentando tanto la socialización como el deporte. En el taller de caminatas, no solo se trabajó la salud física, sino también la posibilidad de compartir con otros grupos. A nivel emocional, participaron en talleres como relajación, Manos Verdes, musicoterapia y arte, lo cual permitió abordar distintas formas de expresión y regulación emocional a través de los sentidos y el contacto con la naturaleza.',
      repl: '{dimensionesCalidadVida}'
    },
    {
      target: 'En el área de percusión, Juan Pablo mostró una buena respuesta, utilizando instrumentos como la flauta y siguiendo instrucciones con las palmas. En el taller de arte, aunque sostiene la atención por períodos breves, participa utilizando elementos como pinceles y esponjas. En el Taller de Manos Verdes se destacó notablemente, manteniendo una participación activa, comprendiendo indicaciones simples y adaptándose con facilidad. En las caminatas, además de demostrar un buen rendimiento físico, colabora con la movilización de su compañera Marisol, empujando su silla de ruedas con ayuda de las facilitadoras, fomentando así la cooperación.',
      repl: '{actividadesComplementarias}'
    },
    {
      target: 'A lo largo de este trimestre, Juan Pablo logró incorporar nuevas rutinas a su vida diaria, fortaleciendo su autonomía. Al repetir determinadas actividades, se va familiarizando con ellas, lo cual a largo plazo facilitará que las pueda realizar por iniciativa propia. Desde el punto de vista físico, mantiene una participación activa y sostenida, lo que favorece su estado de salud general. En cuanto al bienestar emocional, los distintos espacios de contacto con la naturaleza, actividades sensoriales y de relajación le proporcionan contención, estimulación y seguridad, permitiéndole desarrollar un vínculo más armónico consigo mismo y con su entorno.',
      repl: '{mejoraCalidadVida}'
    }
  ];

  for (const rep of replacements) {
    xml = xml.replaceAll(rep.target, rep.repl);
  }

  zip.file('word/document.xml', xml);
  const outBuf = zip.generate({ type: 'nodebuffer' });
  fs.writeFileSync(outputPath, outBuf);
  console.log('Successfully generated', outputPath);
} catch (err) {
  console.error('Error generating trimestral template:', err);
}
