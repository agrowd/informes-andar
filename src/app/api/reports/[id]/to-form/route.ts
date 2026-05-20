import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { ReportModel } from '@/models/Report';
import { FormModel } from '@/models/Form';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const reportId = params.id;

    // Obtener informe
    let report: any = null;
    
    if (sql) {
      // Postgres
      const result = await sql`
        SELECT * FROM reports WHERE id = ${parseInt(reportId)}
      `;
      if (result.rows.length > 0) {
        report = {
          id: result.rows[0].id,
          data: result.rows[0].data,
          periodo: result.rows[0].periodo,
          form_id: result.rows[0].form_id,
          young_id: result.rows[0].young_id,
          _id: String(result.rows[0].id)
        };
      }
    } else if (process.env.MONGODB_URI) {
      // MongoDB
      report = await ReportModel.findById(reportId).lean();
    }

    if (!report) {
      return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 });
    }

    let formData: any = null;
    let formIdToUse: string | null = null;
    const formId = report.form_id || report.formId;

    if (formId) {
      try {
        if (sql) {
          const formResult = await sql`
            SELECT * FROM forms WHERE id = ${parseInt(String(formId))}
          `;
          if (formResult.rows.length > 0) {
            formData = formResult.rows[0].data;
            formIdToUse = String(formResult.rows[0].id);
          }
        } else if (process.env.MONGODB_URI) {
          const form = await FormModel.findById(formId).lean();
          if (form) {
            formData = form.data;
            formIdToUse = String(form._id);
          }
        }
      } catch (err) {
        console.error('Error al recuperar formulario fuente, cayendo a reconstrucción:', err);
      }
    }

    // Fallback: Si no hay un formulario guardado asociado (ej: informes trimestrales fusionados, o drafts huérfanos),
    // reconstruimos un formData que cumpla con el form.schema.json a partir del report.data
    if (!formData) {
      const repData = report.data || {};
      const repDG = repData.datosGenerales || {};
      const repSecciones = repData.secciones || {};

      const mapFragmentText = (seccion: any) => {
        if (Array.isArray(seccion)) {
          return seccion
            .map((f: any) => f.texto)
            .filter((t: string) => t && t !== 'No informado')
            .join('\n');
        }
        return typeof seccion === 'string' ? seccion : '';
      };

      const INITIAL_TEXT_MARCO = `Se acompaña al joven en la construcción y logro de sus metas personales, considerando las dimensiones de su calidad de vida y brindando los apoyos necesarios para el desarrollo de habilidades como la toma de decisiones, la planificación, la autorregulación emocional y la participación activa. Este proceso se realiza de manera progresiva, respetando sus tiempos, promoviendo su autonomía y fortaleciendo su protagonismo en la toma de decisiones sobre su vida.`;

      formData = {
        datosGenerales: {
          nombreCompleto: repDG.nombreCompleto || '',
          periodo: report.periodo || repDG.periodo || '',
          numeroLegajo: repDG.numeroLegajo || '',
          facilitadorNombre: repDG.facilitadorNombre || '',
          metaSueño: repDG.metaSueño || '',
          fotoJoven: repDG.fotoJoven || '',
          obraSocial: repDG.obraSocial || '',
          fechaNacimiento: repDG.fechaNacimiento || '',
          youngId: report.young_id ? String(report.young_id) : (repDG.youngId ? String(repDG.youngId) : '')
        },
        objetivo: {
          textoMarco: repDG.textoMarco || INITIAL_TEXT_MARCO,
          focos: repDG.focos || [],
          estrategias: repDG.estrategias || [],
          comentario: mapFragmentText(repSecciones.objetivo) || ''
        },
        escucha: {
          preferencias: repDG.preferencias || [],
          areasInteres: repDG.areasInteres || [],
          comentario: mapFragmentText(repSecciones.escucha) || ''
        },
        estadoEmocional: {
          prevalencias: repDG.prevalencias || [],
          expresionGeneral: repDG.expresionGeneral || '',
          regulacion: repDG.regulacion || '',
          situacionesInfluyen: repDG.situacionesInfluyen || [],
          estrategiasAcompanamiento: repDG.estrategiasAcompanamiento || [],
          tecnicasAutorregulacion: repDG.tecnicasAutorregulacion || [],
          comentario: mapFragmentText(repSecciones.estadoEmocional) || ''
        },
        apoyosAjustes: {
          apoyos: repDG.apoyos || [],
          ajustes: repDG.ajustes || [],
          contextos: repDG.contextos || [],
          comentario: mapFragmentText(repSecciones.apoyosAjustes) || ''
        },
        evaluacion: {
          dimensiones: repData.evaluacionDimensiones || repData.evaluacion?.dimensiones || []
        },
        logros: {
          items: repDG.logros || [],
          comentario: mapFragmentText(repSecciones.logros) || ''
        },
        suenosMetas: {
          metas: repDG.metas || [],
          recursosNecesarios: repDG.recursosNecesarios || [],
          comentario: mapFragmentText(repSecciones.suenosMetas) || ''
        },
        experiencias: {
          tiposVividas: repDG.tiposVividas || [],
          tipoApoyo: repDG.tipoApoyo || '',
          motivosNoParticipa: repDG.motivosNoParticipa || [],
          comentario: mapFragmentText(repSecciones.experiencias) || ''
        },
        circuloApoyo: {
          miembros: (repDG.circuloApoyoDetalle || []).map((m: any) => ({
            nombre: m.nombre || '',
            vinculo: m.vinculo || ''
          })),
          participacion: repDG.circuloApoyoParticipacion || '',
          gradoInvolucramiento: repDG.circuloApoyoInvolucramiento || '',
          valoracion: {
            grupal: repDG.circuloApoyoValoracion?.grupal || '',
            individual: repDG.circuloApoyoValoracion?.individual || '',
            nombresIndividual: ''
          },
          comentario: mapFragmentText(repSecciones.circuloApoyo) || ''
        },
        sugerencias: {
          areasPrioritarias: repDG.areasPrioritarias || [],
          recomendaciones: repDG.recomendaciones || [],
          comentario: mapFragmentText(repSecciones.sugerencias) || ''
        }
      };
    }

    return NextResponse.json({ 
      formData,
      reportId: report.id || String(report._id),
      formId: formIdToUse,
      periodo: report.periodo
    });
  } catch (error: any) {
    console.error('Error obteniendo datos del informe para formulario:', error);
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}


