// ============================================================
// GOE ORG · GAS_v3.gs
// Cambios respecto a v2:
//   · setupConfig()        → hoja Config con flag SITIO_DISPONIBLE
//   · setupEntregables()   → hoja Entregables con datos del PDF v04
//   · doGet()              → verifica flag antes de responder
//   · getSheetData()       → entregables[] como array de objetos {nombre,tipo,descripcion,fuente}
// ============================================================

const SHEET_ID      = '1djz9npDpM4YiikjdS5nPf79ehG8lerxiuqXwEFAnSrg';
const DEFAULT_SHEET = 'GENERAL';

const COL = {
  id_rol:            0,  // A
  titulo:            1,  // B
  area:              2,  // C
  nivel:             3,  // D
  reporta_a_id:      4,  // E
  reporta_a:         5,  // F
  funciones:         6,  // G
  responsabilidades: 7,  // H
  entregables:       8,  // I  (legacy — ya no se usa para la vista detalle)
  nombre_asignado:   9   // J
};

const HEADERS = [
  'id_rol','titulo','area','nivel',
  'reporta_a_id','reporta_a',
  'funciones','responsabilidades','entregables',
  'nombre_asignado'
];

const COL_ENT = {
  id_rol:      0,  // A
  nombre:      1,  // B
  tipo:        2,  // C
  descripcion: 3,  // D
  fuente:      4   // E
};

const HEADERS_ENT = ['id_rol','nombre','tipo','descripcion','fuente'];

// ============================================================
// MENÚ
// ============================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('GOE Org')
    .addItem('⚙️  Setup hoja GENERAL',          'setupSheet')
    .addItem('⚙️  Setup hoja Config',            'setupConfig')
    .addItem('⚙️  Setup hoja Entregables',       'setupEntregables')
    .addSeparator()
    .addItem('🟢  Habilitar sitio',              'habilitarSitio')
    .addItem('🔴  Deshabilitar sitio',           'deshabilitarSitio')
    .addSeparator()
    .addItem('➕  Nueva obra desde GENERAL',     'crearObraDesdeGeneral')
    .addItem('✅  Validar hoja...',               'validarHojaUI')
    .addSeparator()
    .addItem('🔗  Info deploy (URL Web App)',     'getInfo')
    .addToUi();
}

// ============================================================
// SETUP CONFIG
// Crea hoja "Config" con flag SITIO_DISPONIBLE = TRUE
// ============================================================
function setupConfig() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const ui = SpreadsheetApp.getUi();
  const LOG = ['=== setupConfig() ===', new Date().toLocaleString()];

  let sheet = ss.getSheetByName('Config');
  if (sheet) {
    const resp = ui.alert('Hoja existente', 'La hoja Config ya existe. ¿Sobreescribir?', ui.ButtonSet.YES_NO);
    if (resp !== ui.Button.YES) { ui.alert('Operación cancelada.'); return; }
    sheet.clearContents();
    LOG.push('Hoja Config existente — contenido borrado.');
  } else {
    sheet = ss.insertSheet('Config');
    LOG.push('Hoja Config creada.');
  }

  // Headers
  const hdrRange = sheet.getRange(1, 1, 1, 2);
  hdrRange.setValues([['clave', 'valor']]);
  hdrRange.setFontWeight('bold');
  hdrRange.setBackground('#CC0000');
  hdrRange.setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);

  // Flag inicial
  sheet.getRange(2, 1, 1, 2).setValues([['SITIO_DISPONIBLE', 'TRUE']]);
  LOG.push('Flag SITIO_DISPONIBLE = TRUE insertado.');

  // Ancho de columnas
  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 100);

  LOG.push('=== FIN — setupConfig() OK ===');
  _logSheet(ss, LOG);
  ui.alert('✅ Hoja Config creada.\nFlag SITIO_DISPONIBLE = TRUE\n\nUsá el menú para habilitar o deshabilitar el sitio.');
}

// ============================================================
// HABILITAR / DESHABILITAR SITIO
// ============================================================
function habilitarSitio()      { _setSitioDisponible(true);  }
function deshabilitarSitio()   { _setSitioDisponible(false); }

function _setSitioDisponible(value) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const ui = SpreadsheetApp.getUi();
  const sheet = ss.getSheetByName('Config');
  if (!sheet) { ui.alert('Error: hoja Config no encontrada. Ejecutá Setup Config primero.'); return; }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) { ui.alert('Error: hoja Config vacía.'); return; }

  const rows = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === 'SITIO_DISPONIBLE') {
      sheet.getRange(i + 2, 2).setValue(value ? 'TRUE' : 'FALSE');
      ui.alert(`✅ Sitio ${value ? 'habilitado' : 'deshabilitado'}.\nSITIO_DISPONIBLE = ${value ? 'TRUE' : 'FALSE'}`);
      return;
    }
  }
  ui.alert('Error: clave SITIO_DISPONIBLE no encontrada en Config.');
}

// ============================================================
// SETUP ENTREGABLES
// Crea hoja "Entregables" y carga todos los datos del PDF v04
// ============================================================
function setupEntregables() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const ui = SpreadsheetApp.getUi();
  const LOG = ['=== setupEntregables() ===', new Date().toLocaleString()];

  let sheet = ss.getSheetByName('Entregables');
  if (sheet) {
    const resp = ui.alert('Hoja existente', 'La hoja Entregables ya existe. ¿Sobreescribir?', ui.ButtonSet.YES_NO);
    if (resp !== ui.Button.YES) { ui.alert('Operación cancelada.'); return; }
    sheet.clearContents();
    LOG.push('Hoja Entregables existente — contenido borrado.');
  } else {
    sheet = ss.insertSheet('Entregables');
    LOG.push('Hoja Entregables creada.');
  }

  // Headers
  const hdrRange = sheet.getRange(1, 1, 1, HEADERS_ENT.length);
  hdrRange.setValues([HEADERS_ENT]);
  hdrRange.setFontWeight('bold');
  hdrRange.setBackground('#CC0000');
  hdrRange.setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);

  // ── DATOS — fuente: GOE-ORG-001_Entregables_v04.pdf ──────
  const data = [

    // ── DIRECCIÓN · Gerente de Proyecto ──────────────────────
    ['gerente_proyecto',
     'Informe mensual de gestión del proyecto',
     'Informe',
     'Dashboard ejecutivo con estado del proyecto: avance físico y financiero, indicadores CSMA, desvíos relevantes y forecast de resultado. Incluye análisis de causas y acciones correctivas.',
     'Consolida el informe de avance del Jefe de Control de Gestión, el reporte de H&S del Jefe de H&S, el reporte de calidad del Jefe de QA/QC y la situación contractual del Administrador de Contrato.'],

    ['gerente_proyecto',
     'Plan de Ejecución del Proyecto (PEP)',
     'Plan',
     'Documento maestro que define metodología, organización, cronograma, presupuesto, riesgos y estándares aplicables al proyecto. Se aprueba al inicio y se actualiza ante cambios de alcance significativos.',
     'Elaborado internamente con aportes del Gerente de Construcción (metodología de campo), Jefe de Control de Gestión (cronograma y costo), Jefe de OT (ingeniería), y Jefe de Administración (recursos y contratos).'],

    ['gerente_proyecto',
     'Actas de reuniones de coordinación',
     'Acta',
     'Registros formales de las reuniones de coordinación interna (con jefes de área) y con el cliente. Incluyen temas tratados, acuerdos, responsables y plazos.',
     'Generadas por el Gerente de Proyecto o su asistente a partir de las reuniones. Las internas involucran a todos los jefes de área; las externas, al equipo y representantes del cliente.'],

    ['gerente_proyecto',
     'Forecast de costos y proyección de resultado económico',
     'Informe',
     'Proyección mensual del resultado económico del proyecto (EAC/ETC), identificando desvíos respecto al presupuesto original y las causas principales.',
     'Elaborado por el Jefe de Control de Gestión en base al avance físico certificado, los costos reales registrados por Administración y las proyecciones de producción de Construcción.'],

    ['gerente_proyecto',
     'Reporte de gestión de riesgos y plan de mitigación',
     'Reporte',
     'Registro actualizado de los riesgos identificados del proyecto (técnicos, contractuales, de RRHH, climáticos), con probabilidad, impacto y acciones de mitigación asignadas.',
     'El Gerente de Proyecto lo elabora con aportes de los jefes de área, quienes informan riesgos propios de su sector. El Administrador de Contrato aporta los contractuales; H&S, los de seguridad; OT, los técnicos.'],

    // ── CONSTRUCCIÓN · Gerente de Construcción ───────────────
    ['gerente_construccion',
     'Informe semanal de avance físico por frente de trabajo',
     'Informe',
     'Estado de avance de cada frente activo expresado en porcentaje de completitud, horas ejecutadas vs. planificadas y proyección de cierre. Identifica los frentes con desvío.',
     'Datos provistos por cada Jefe de Obra a través de sus partes diarios. El Gerente de Construcción consolida y analiza la tendencia.'],

    ['gerente_construccion',
     'Plan de recursos y equipos',
     'Plan',
     'Planilla mensual actualizada con la dotación de mano de obra (propia y subcontratada) y equipos asignados por frente, con proyección de necesidades para las próximas semanas.',
     'Elaborado por el Gerente de Construcción en base al lookahead del Encargado de Planificación y los requerimientos reportados por los Jefes de Obra.'],

    ['gerente_construccion',
     'Registro de interferencias técnicas y estado de resolución',
     'Registro',
     'Lista de todas las interferencias de diseño, espacio o disciplinas que frenan el avance. Incluye fecha de detección, responsable de resolución y estado (abierta/cerrada).',
     'Los Jefes de Obra reportan las interferencias detectadas en campo. El Gerente de Construcción las registra y gestiona su resolución coordinando con la Oficina Técnica.'],

    ['gerente_construccion',
     'Reporte de productividad y rendimiento de cuadrillas',
     'Reporte',
     'Indicadores de productividad por disciplina: rendimiento real vs. rendimiento estándar del paquete de trabajo, horas improductivas y tendencia de la semana.',
     'Se construye a partir de los partes diarios de los Supervisores (producción por cuadrilla) y las horas del parte de RRHH. El Encargado de Planificación puede proveer los valores de referencia del cronograma.'],

    ['gerente_construccion',
     'Actas de coordinación con inspección de obra y subcontratistas',
     'Acta',
     'Registro formal de reuniones con el cliente (inspección) y los subcontratistas activos. Documenta avance, observaciones, compromisos y plazos acordados.',
     'Generadas por el Gerente de Construcción, con participación de los Jefes de Obra según el frente involucrado y, cuando aplica, del Administrador de Contrato.'],

    // ── CONSTRUCCIÓN · Jefe de Obra ──────────────────────────
    ['jefe_obra',
     'Parte diario de avance de obra por disciplina o sector',
     'Registro',
     'Resumen diario de las actividades ejecutadas, cantidad de personal activo, avance físico por ítem y principales novedades o inconvenientes del día.',
     'Completado por el Jefe de Obra en base a los reportes verbales y escritos de los Supervisores a su cargo. Se elabora al cierre de cada jornada.'],

    ['jefe_obra',
     'Solicitudes de materiales con trazabilidad al paquete de trabajo',
     'Registro',
     'Pedido formal de materiales al Almacén, indicando ítem, cantidad, unidad y el código del paquete de trabajo que lo requiere. Permite controlar el uso de materiales por paquete.',
     'Generada por el Jefe de Obra a partir de las necesidades del cronograma y los requerimientos de los Supervisores. Se valida contra la lista de materiales (BOM) del paquete de trabajo, que provee Oficina Técnica.'],

    ['jefe_obra',
     'Registro de no conformidades detectadas en campo',
     'Registro',
     'Listado de trabajos ejecutados que no cumplen con planos, especificaciones o procedimientos. Incluye descripción, ubicación, estado de corrección y referencia a la NCR emitida por QAQC.',
     'El Jefe de Obra detecta y reporta las NC; el Jefe de QA/QC emite la NCR formal y gestiona el cierre. Existe comunicación directa entre ambos para coordinar la corrección.'],

    ['jefe_obra',
     'Informe de completitud de paquetes de trabajo',
     'Informe',
     'Estado actualizado de cada paquete de trabajo bajo su responsabilidad: liberado, en ejecución, con restricciones o cerrado. Indica el porcentaje de avance de las actividades principales.',
     'El Jefe de Obra lo elabora a partir de los partes de los Supervisores. Se contrasta con la línea base del cronograma que provee el Encargado de Planificación.'],

    ['jefe_obra',
     'Reporte de personal activo y asistencia diaria',
     'Registro',
     'Parte diario con la nómina de personal presente en el frente (propio y subcontratado), ausencias y novedades. Sirve de base para la liquidación y el control de productividad.',
     'Compilado por el Jefe de Obra en base a los partes de asistencia que entrega cada Capataz al inicio de la jornada.'],

    // ── CONSTRUCCIÓN · Supervisor ────────────────────────────
    ['supervisor',
     'Parte diario de producción por cuadrilla y actividad',
     'Registro',
     'Registro diario que informa por cada cuadrilla: actividad ejecutada, cantidad producida (metros, unidades, etc.), horas trabajadas y observaciones relevantes.',
     'Completado por el Supervisor con datos directos de campo, validados con el Capataz de cada cuadrilla al cierre de jornada. Es el dato base de todo el sistema de avance físico.'],

    ['supervisor',
     'ATS/JSA (Análisis de Trabajo Seguro)',
     'Registro',
     'Análisis de riesgos específicos de cada tarea antes de su inicio, con las medidas de control definidas y la firma de todos los trabajadores participantes.',
     'Elaborado conjuntamente por el Supervisor y los Capataces antes de iniciar tareas de riesgo. El Jefe de H&S o sus inspectores pueden participar en tareas críticas.'],

    ['supervisor',
     'Registro de asistencia y novedades de personal',
     'Registro',
     'Parte de asistencia diaria con el detalle del personal presente, ausentes, llegadas tarde y cualquier novedad laboral (licencias, accidentes, etc.).',
     'Los Capataces informan al Supervisor al inicio de la jornada. El Supervisor consolida y eleva al Jefe de Obra.'],

    ['supervisor',
     'Reporte de avance de paquete de trabajo',
     'Reporte',
     'Estado de avance expresado en porcentaje de completitud por actividad dentro del paquete de trabajo activo, comparado contra el plan semanal.',
     'Elaborado por el Supervisor en base a la producción diaria acumulada. Se contrasta con el lookahead de tres semanas que emite el Encargado de Planificación.'],

    ['supervisor',
     'Listado de restricciones y requerimientos pendientes',
     'Reporte',
     'Lista de los impedimentos concretos que frenan o podrían frenar la producción del día siguiente: materiales faltantes, definiciones técnicas pendientes, equipos no disponibles, permisos, etc.',
     'Generado por el Supervisor al cierre de la jornada, en base a lo observado en campo y a los requerimientos de los Capataces. Se eleva al Jefe de Obra para su gestión.'],

    // ── CONSTRUCCIÓN · Capataz ───────────────────────────────
    ['capataz',
     'Reporte verbal/digital de avance diario',
     'Reporte',
     'Comunicación diaria al Supervisor sobre lo ejecutado por su cuadrilla: actividad, cantidad producida y eventuales problemas encontrados. Puede ser verbal con respaldo en planilla simple o app móvil.',
     'El Capataz lo genera directamente de su observación en campo al cierre de jornada. Es la fuente primaria de todos los datos de producción del proyecto.'],

    ['capataz',
     'Registro de materiales consumidos y herramientas utilizadas',
     'Registro',
     'Anotación de los materiales usados en el día por tipo y cantidad, y las herramientas entregadas/devueltas al pañol. Permite controlar consumos reales vs. presupuestados.',
     'Elaborado por el Capataz en base al uso real de su cuadrilla. Se complementa con los vales de entrega del Encargado de Pañol y las salidas del Almacén.'],

    ['capataz',
     'Participación registrada en charlas de H&S y ATS/JSA',
     'Registro',
     'Firma en el registro de asistencia a la charla diaria de seguridad (toolbox) y firma del ATS/JSA correspondiente a las tareas del día.',
     'El Jefe de H&S o su inspector encabezan la charla diaria y llevan el registro. El ATS/JSA es elaborado junto al Supervisor antes del inicio de cada tarea riesgosa.'],

    ['capataz',
     'Parte de novedades del personal',
     'Registro',
     'Listado de asistencia de su cuadrilla con ausencias, llegadas tarde y cualquier novedad (accidentes, conflictos, EPP dañado). Se eleva al Supervisor al inicio de la jornada.',
     'El Capataz lo confecciona al ingreso de la jornada, verificando presencia de cada operario a su cargo.'],

    ['capataz',
     'Checklist de verificación previa al inicio de trabajos críticos',
     'Registro',
     'Listado de verificación de condiciones previas para tareas que requieren controles formales: trabajos en altura, espacios confinados, trabajos en caliente, izajes, etc.',
     'Elaborado por el Capataz junto al Supervisor, en base a los procedimientos de H&S del proyecto. El Jefe de H&S define cuáles tareas requieren checklist y provee el formato.'],

    // ── ADMINISTRACIÓN DE CONTRATOS · Administrador de Contrato
    ['administrador_contrato',
     'Registro de órdenes de cambio y adicionales',
     'Registro',
     'Base de datos con todas las órdenes de cambio en proceso o aprobadas: descripción del cambio, monto, estado de aprobación del cliente y referencia a la documentación soporte.',
     'El Administrador de Contrato lo elabora y mantiene. Los cambios son detectados por el Gerente de Construcción (impactos de campo), Oficina Técnica (cambios de ingeniería) o el propio cliente. El Jefe de Control de Gestión aporta el impacto en tiempo y costo.'],

    ['administrador_contrato',
     'Informe mensual de situación contractual',
     'Informe',
     'Resumen del estado del contrato: alcance ejecutado, desvíos vs. alcance original, reclamaciones en trámite, órdenes de cambio pendientes de aprobación y riesgos contractuales identificados.',
     'El Administrador de Contrato lo elabora con información del Gerente de Proyecto (situación general), Jefe de Control de Gestión (avance y costos) y la documentación contractual que gestiona directamente.'],

    ['administrador_contrato',
     'Certificados de avance y valuaciones al cliente',
     'Certificado',
     'Documento formal presentado mensualmente al cliente con el avance físico certificado, los precios unitarios aplicables y el monto a facturar en el período.',
     'El Encargado de Certificación prepara las mediciones y cómputos; el Administrador de Contrato revisa la consistencia contractual (precios, condiciones, plazos) y aprueba antes de la presentación.'],

    ['administrador_contrato',
     'Actas de reuniones contractuales con el cliente',
     'Acta',
     'Registro formal de cada reunión con el cliente sobre temas contractuales: reconocimiento de adicionales, disputas, penalidades, condiciones de pago.',
     'Generadas por el Administrador de Contrato con participación del Gerente de Proyecto y, según el tema, del área legal de la compañía.'],

    ['administrador_contrato',
     'Reporte de cobros y saldos pendientes',
     'Reporte',
     'Estado de cuenta de los certificados presentados al cliente: fecha de presentación, monto, fecha de aprobación y estado de cobro (cobrado, pendiente, en disputa).',
     'El Administrador de Contrato lo elabora en base a los registros propios de presentación y a la información de cobros que provee el Jefe de Administración.'],

    // ── CONTROL DE GESTIÓN · Jefe de Control de Gestión ──────
    ['jefe_control_gestion',
     'Informe mensual de gestión (dashboard de avance, desvíos y forecast)',
     'Informe',
     'Documento principal del área: consolida avance físico real vs. plan, indicadores de valor ganado (CPI/SPI), desvíos críticos por frente y proyección del resultado del proyecto (EAC).',
     'El Encargado de Planificación provee la curva S y el análisis de desvíos; el Encargado de Certificación aporta el avance financiero; Administración provee los costos reales. El Jefe de CG integra y analiza.'],

    ['jefe_control_gestion',
     'Cronograma maestro con curva S y análisis EVM',
     'Plan',
     'Cronograma consolidado del proyecto actualizado mensualmente, con la curva de avance planificado vs. real y los principales indicadores de valor ganado (CPI, SPI, EAC, ETC).',
     'Base técnica elaborada y mantenida por el Encargado de Planificación (P6/MSP). El Jefe de CG valida, agrega el análisis EVM y lo presenta al Gerente de Proyecto.'],

    ['jefe_control_gestion',
     'Reporte semanal de avance físico por disciplina / frente',
     'Reporte',
     'Tablero semanal de avance: porcentaje completado por disciplina, frente o CWP, comparado contra el plan. Identifica frentes críticos y tendencia respecto a semanas anteriores.',
     'El Encargado de Planificación recopila el avance de los Jefes de Obra y lo vuelca al cronograma. El Jefe de CG revisa, agrega contexto y distribuye.'],

    ['jefe_control_gestion',
     'Estado de certificación mensual y proyección de ingresos',
     'Informe',
     'Resumen del certificado del período: monto presentado, comparación con el avance físico real y proyección de certificación para los próximos dos meses.',
     'El Encargado de Certificación elabora el certificado; el Jefe de CG integra la información con el avance y la proyección del cronograma para construir el forecast de ingresos.'],

    ['jefe_control_gestion',
     'Informe de análisis de desvíos con causas raíz y acciones correctivas',
     'Informe',
     'Para los frentes con desvío significativo, análisis de la causa raíz (falta de materiales, recursos insuficientes, interferencias, clima, etc.) y las acciones correctivas propuestas con responsable y plazo.',
     'El Jefe de CG lo elabora coordinando con el Gerente de Construcción (causas de campo) y el Jefe de OT (causas de ingeniería). Se incluye en el informe mensual al Gerente de Proyecto.'],

    // ── ADMINISTRACIÓN · Jefe de Administración ──────────────
    ['jefe_administracion',
     'Informe mensual de situación financiera',
     'Informe',
     'Estado de caja del mes: ingresos recibidos, egresos por categoría (jornales, materiales, subcontratistas, gastos generales), saldo disponible y proyección del próximo período.',
     'El Jefe de Administración lo elabora consolidando la información de los encargados a su cargo: compras, RRHH (jornales) y SSGG (gastos generales).'],

    ['jefe_administracion',
     'Conciliaciones bancarias y estado de cuentas de proveedores',
     'Registro',
     'Verificación mensual del saldo bancario vs. los registros contables de la obra, más el resumen de saldos pendientes con proveedores (facturas recibidas vs. pagadas).',
     'El Jefe de Administración lo elabora en base a los extractos bancarios, las órdenes de compra del Encargado de Compras y las facturas registradas internamente.'],

    ['jefe_administracion',
     'Nómina de personal activo con legajos completos',
     'Registro',
     'Lista actualizada del personal propio y subcontratado activo en la obra, con el estado de su legajo (documentación habilitante al día o con desvíos).',
     'Provisto por el Encargado de RRHH. El Jefe de Administración valida y reporta al Gerente de Proyecto y al Jefe de H&S, quien necesita el dato para controlar habilitaciones.'],

    ['jefe_administracion',
     'Planilla de liquidación de haberes y jornales',
     'Planilla',
     'Liquidación mensual/quincenal del personal propio conforme al CCT de la construcción: categoría, jornales base, adicionales, descuentos y neto a pagar.',
     'El Encargado de RRHH elabora la planilla con los datos de asistencia que vienen de los partes de campo (Capataces → Supervisores → Jefes de Obra). El Jefe de Administración aprueba.'],

    ['jefe_administracion',
     'Reporte de estado de facturas de proveedores y subcontratistas',
     'Reporte',
     'Seguimiento de las facturas recibidas por proveedor: fecha de recepción, monto, fecha de aprobación técnica y estado de pago.',
     'El Encargado de Compras provee el dato de aprobación técnica (conformidad de recepción). El Jefe de Administración registra el estado de pago y proyecta vencimientos.'],

    // ── CALIDAD · Jefe de QA/QC ──────────────────────────────
    ['jefe_qaqc',
     'Plan de Calidad del proyecto',
     'Plan',
     'Documento que define los requisitos de calidad aplicables, los procedimientos de inspección y ensayo por disciplina (ITPs), el sistema de NCR y los criterios de aceptación. Aprobado por el cliente al inicio.',
     'Elaborado por el Jefe de QA/QC en base a los requisitos contractuales, las normas aplicables (ISO 9001, ASME, API, etc.) y los estándares del cliente. Se coordina con Oficina Técnica para los criterios técnicos.'],

    ['jefe_qaqc',
     'Registro de inspecciones y ensayos (ITPs completados)',
     'Registro',
     'Carpeta de Planes de Inspección y Ensayo (ITP) por disciplina, con cada punto de inspección firmado por el inspector de QC y, cuando aplica, por el inspector del cliente.',
     'Los inspectores de QC generan los registros en campo. El Jefe de QA/QC supervisa, firma y archiva. Los datos de cuándo inspeccionar los proveen el Jefe de Obra y el estado del paquete de trabajo.'],

    ['jefe_qaqc',
     'Informe mensual de gestión de calidad',
     'Informe',
     'Dashboard de calidad del período: cantidad de NCRs abiertas y cerradas, tiempo promedio de cierre, indicadores de rechazos por disciplina y estado de los planes de acción vigentes.',
     'El Jefe de QA/QC lo elabora a partir del registro propio de NCRs y los datos de inspección de su equipo. Se eleva al Gerente de Proyecto y se incorpora al informe mensual.'],

    ['jefe_qaqc',
     'Dossier de calidad de obra',
     'Plan',
     'Compilado completo de todos los registros de calidad del proyecto (ITPs, NCRs cerradas, certificados de materiales, resultados de ensayos) organizado para ser entregado formalmente al cliente al cierre.',
     'El Jefe de QA/QC lo organiza y completa durante toda la ejecución. Los documentos provienen de sus propios registros, del Almacén (certificados de materiales) y de Oficina Técnica (as-built).'],

    ['jefe_qaqc',
     'Informes de auditorías internas y estado de acciones correctivas',
     'Informe',
     'Resultado de las auditorías periódicas al sistema de calidad: desvíos encontrados, responsables, plan de acción y estado de implementación.',
     'El Jefe de QA/QC planifica y ejecuta las auditorías. Los auditados son todas las áreas del proyecto. Las acciones correctivas son de responsabilidad del área auditada.'],

    // ── H&S · Jefe de H&S ────────────────────────────────────
    ['jefe_hs',
     'Legajo Técnico de H&S',
     'Plan',
     'Documento legal obligatorio que incluye el programa de H&S, análisis de riesgos generales, procedimientos de trabajo, plan de emergencias y registros de capacitación. Presentado ante la ART y el cliente al inicio.',
     'Elaborado íntegramente por el Jefe de H&S, con información del tipo de obra, las actividades a ejecutar (que provee el Gerente de Construcción) y los requisitos específicos del cliente.'],

    ['jefe_hs',
     'Informe mensual de H&S',
     'Informe',
     'Dashboard de seguridad del mes: horas hombre trabajadas, índices de frecuencia y gravedad de accidentes, incidentes sin pérdida de tiempo, estado de capacitaciones e inspecciones realizadas.',
     'El Jefe de H&S lo elabora con los datos propios del área (inspecciones, incidentes, capacitaciones) y las horas-hombre que provee el Encargado de RRHH.'],

    ['jefe_hs',
     'Registros de capacitación del personal',
     'Registro',
     'Planillas de asistencia a inducciones, charlas de seguridad, cursos específicos (trabajo en altura, espacios confinados, etc.) con fecha, contenido y firma de cada participante.',
     'Generados por el Jefe de H&S y su equipo en cada instancia de capacitación. El Encargado de RRHH los incluye en el legajo de cada trabajador.'],

    ['jefe_hs',
     'Informes de investigación de incidentes/accidentes',
     'Informe',
     'Para cada evento: descripción, causa raíz (árbol de causas o 5 porqués), acciones correctivas para evitar recurrencia, responsables y plazos de implementación.',
     'El Jefe de H&S investiga con participación del Supervisor y Capataz del frente involucrado. El Gerente de Construcción y el Gerente de Proyecto son informados y aprueban el plan de acción.'],

    ['jefe_hs',
     'Mediciones ambientales registradas en libro de contaminantes',
     'Registro',
     'Registros de mediciones periódicas de ruido, iluminación, polvos y otras variables ambientales en los puestos de trabajo, conforme a la normativa vigente.',
     'El Jefe de H&S realiza o coordina las mediciones con profesional habilitado. Los resultados se registran en el Libro de Contaminantes y se incorporan al Legajo Técnico.'],

    // ── OFICINA TÉCNICA · Jefe de OT ─────────────────────────
    ['jefe_oficina_tecnica',
     'Lista Maestra de Documentos (MDR)',
     'Registro',
     'Registro completo de todos los documentos del proyecto (planos, especificaciones, procedimientos) con su número, revisión vigente, estado de aprobación y distribución realizada.',
     'El Control de Documentos la mantiene actualizada. El Jefe de OT valida y la usa para asegurar que campo trabaje siempre con la revisión vigente.'],

    ['jefe_oficina_tecnica',
     'Registro de RFIs con estado y fechas de resolución',
     'Registro',
     'Seguimiento de todas las consultas técnicas abiertas al cliente: descripción de la consulta, fecha de envío, fecha de respuesta comprometida y estado.',
     'Las RFIs son generadas por el Jefe de Obra o el Proyectista ante dudas técnicas de campo. El Jefe de OT las revisa, aprueba y gestiona la respuesta con el cliente.'],

    ['jefe_oficina_tecnica',
     'Paquetes de documentación técnica emitidos a campo',
     'Registro',
     'Conjunto de planos, especificaciones y procedimientos que conforman la documentación de un paquete de trabajo, entregados formalmente con acuse de recibo del Jefe de Obra.',
     'El Proyectista elabora/compila la documentación; el Control de Documentos gestiona la emisión y distribución. El Jefe de OT aprueba antes de emitir a campo.'],

    ['jefe_oficina_tecnica',
     'Pedidos de materiales técnicos con especificaciones aprobadas',
     'Registro',
     'Solicitudes de compra de materiales técnicos específicos (válvulas, instrumentos, cables especiales, etc.) con las especificaciones técnicas necesarias para que Compras pueda cotizar correctamente.',
     'El Proyectista elabora las especificaciones técnicas; el Jefe de OT las aprueba y las envía al Encargado de Compras.'],

    ['jefe_oficina_tecnica',
     'Informe mensual de estado de ingeniería y documentación',
     'Informe',
     'Estado del flujo documental: documentos pendientes de recibir del cliente, RFIs sin respuesta, cambios de ingeniería en proceso y riesgos que podrían impactar en el avance.',
     'El Jefe de OT lo elabora con información de Control de Documentos (estado de MDR) y el Proyectista (estado de trabajos en proceso). Se eleva al Gerente de Proyecto.'],

    // ── ADMINISTRACIÓN · Encargado de Compras ────────────────
    ['encargado_compras',
     'Órdenes de compra con trazabilidad al requerimiento de origen',
     'Registro',
     'Documento formal emitido al proveedor: ítem, cantidad, precio, plazo de entrega y condiciones de pago. Vinculado al número de requerimiento que lo originó para permitir el seguimiento.',
     'El Encargado de Compras la emite a partir del requerimiento aprobado por el Jefe de Administración. Para materiales técnicos, la especificación proviene de Oficina Técnica; para materiales de consumo general, del Jefe de Obra.'],

    ['encargado_compras',
     'Cuadros comparativos de cotizaciones',
     'Registro',
     'Planilla que compara las ofertas de al menos tres proveedores por proceso de compra: precio, plazo, condiciones de pago, antecedentes y recomendación de adjudicación.',
     'El Encargado de Compras lo elabora con las cotizaciones recibidas de los proveedores. Para ítems técnicos, el Jefe de OT puede participar en la evaluación técnica.'],

    ['encargado_compras',
     'Informe semanal de estado de compras pendientes',
     'Informe',
     'Tablero de seguimiento de las OC activas: ítems en proceso de cotización, OC emitidas con entrega pendiente, OC con atraso respecto al plazo comprometido y riesgos de desabastecimiento.',
     'Elaborado por el Encargado de Compras en base al estado de sus propias OC y a los compromisos de entrega de los proveedores. Se eleva semanalmente al Jefe de Administración.'],

    ['encargado_compras',
     'Registro de proveedores calificados',
     'Registro',
     'Base de datos de proveedores habilitados: razón social, CUIT, categoría de suministro, historial de desempeño (plazo, calidad) y estado de documentación habilitante.',
     'Mantenido por el Encargado de Compras en base a la experiencia de compras pasadas y los informes de recepción del Almacén y de QAQC (calidad de los materiales recibidos).'],

    ['encargado_compras',
     'Remitos y documentación de recepción de materiales',
     'Registro',
     'Remitos conformados de los materiales recibidos: con verificación de cantidades y condiciones, y vinculados a la OC correspondiente. Son el respaldo para la aprobación de facturas.',
     'El Encargado de Almacén verifica físicamente la recepción y conforma el remito. El Encargado de Compras archiva como cierre del proceso de compra.'],

    // ── ADMINISTRACIÓN · Encargado de RRHH ──────────────────
    ['encargado_rrhh',
     'Nómina actualizada del personal de obra',
     'Registro',
     'Lista del personal activo (propio y subcontratado) con categoría, fecha de ingreso, estado de legajo y estado de habilitaciones vigentes (ART, obra social, capacitaciones obligatorias).',
     'Mantenida por el Encargado de RRHH. Los altas y bajas las inician los Jefes de Obra cuando incorporan o desvinculan personal. El Jefe de H&S consulta esta nómina para controlar las habilitaciones.'],

    ['encargado_rrhh',
     'Planilla de novedades para liquidación',
     'Planilla',
     'Consolidado mensual/quincenal de: ausencias justificadas e injustificadas, horas extra, trabajo en días feriados, adicionales por categoría y cualquier novedad que impacte en el jornal.',
     'Los datos de asistencia provienen de los partes de campo (Capataces → Supervisores → Jefes de Obra). El Encargado de RRHH los consolida y los procesa con el convenio aplicable (CCT de la construcción).'],

    ['encargado_rrhh',
     'Registro de capacitaciones y habilitaciones del personal',
     'Registro',
     'Base de datos de las capacitaciones realizadas y habilitaciones vigentes por trabajador: inducción, cursos de H&S, categoría gremial, vencimiento de libreta sanitaria, etc.',
     'El Jefe de H&S provee los registros de capacitaciones de seguridad. El sindicato (UOCRA) certifica las categorías gremiales. El Encargado de RRHH integra y archiva en cada legajo.'],

    ['encargado_rrhh',
     'Informe de altas y bajas del período',
     'Informe',
     'Resumen mensual de los movimientos de personal: ingresos nuevos, egresos (renuncia, vencimiento, despido), transferencias y variación de la dotación total.',
     'Elaborado por el Encargado de RRHH en base a los movimientos registrados en el período. Se eleva al Jefe de Administración y al Gerente de Proyecto para el control de recursos.'],

    ['encargado_rrhh',
     'Checklist de requisitos de ingreso del personal subcontratado',
     'Registro',
     'Lista de verificación completada antes de cada incorporación de personal subcontratado: seguro de vida, ART, examen médico preocupacional, inducción de H&S completada y documentación gremial al día.',
     'El Encargado de RRHH solicita la documentación al subcontratista y verifica su validez. El Jefe de H&S define qué requisitos son obligatorios para ingresar a obra.'],

    // ── ADMINISTRACIÓN · Encargado de SSGG ──────────────────
    ['encargado_ssgg',
     'Registro de equipos en obra',
     'Registro',
     'Inventario actualizado de los equipos en la obra (grúas, autoelevadores, compresores, vehículos, etc.): propietario (propio/alquilado), estado operativo, vencimiento del seguro y próximo mantenimiento.',
     'Mantenido por el Encargado de SSGG en base al ingreso/egreso de equipos y a los informes de mantenimiento. Los Jefes de Obra informan cuando un equipo presenta problemas.'],

    ['encargado_ssgg',
     'Órdenes de compra y contratos de servicios generales',
     'Registro',
     'Documentos de contratación de servicios de campamento (catering, limpieza, transporte) y de alquiler de equipos, con las condiciones pactadas y los plazos de vigencia.',
     'Elaborados por el Encargado de SSGG y aprobados por el Jefe de Administración. Las necesidades las informan el Gerente de Construcción (equipos de campo) y la propia administración (servicios de campamento).'],

    ['encargado_ssgg',
     'Informe mensual de costos de servicios generales y equipos',
     'Informe',
     'Resumen de los costos del mes por rubro: alquiler de equipos, servicios de campamento, combustibles, transporte, con comparación vs. presupuesto.',
     'El Encargado de SSGG lo elabora en base a las facturas recibidas del período. El Jefe de Administración lo usa para el informe financiero mensual.'],

    ['encargado_ssgg',
     'Registro de mantenimiento de equipos',
     'Registro',
     'Historial de intervenciones por equipo: fecha, tipo de mantenimiento (preventivo/correctivo), descripción de la tarea y estado resultante.',
     'El Encargado de SSGG lo registra a partir de las intervenciones realizadas por el taller o el proveedor. Los operadores de equipos informan fallas o anomalías al Encargado de SSGG.'],

    ['encargado_ssgg',
     'Documentación de devolución de equipos alquilados',
     'Registro',
     'Actas de entrega-recepción al devolver equipos alquilados: estado del equipo, horómetro o kilometraje al momento de devolución y conformidad del proveedor.',
     'Generada conjuntamente por el Encargado de SSGG y el representante del proveedor del equipo al momento de la devolución.'],

    // ── ADMINISTRACIÓN · Encargado de Pañol ──────────────────
    ['encargado_panol',
     'Inventario actualizado del pañol',
     'Registro',
     'Stock real de herramientas y equipos menores en el pañol: cantidad total por ítem, cantidad disponible y cantidad actualmente entregada con identificación del responsable.',
     'Mantenido por el Encargado de Pañol en base a los movimientos de entrega y devolución diarios. Se actualiza en cada movimiento y se valida con inventario físico periódico.'],

    ['encargado_panol',
     'Vales de salida y devolución de herramientas',
     'Registro',
     'Documentos que registran cada entrega de herramienta: ítem, cantidad, fecha, operario o cuadrilla que la recibe y firma. La devolución cierra el vale con estado de la herramienta.',
     'Generados por el Encargado de Pañol en cada transacción. Las necesidades las comunican los Supervisores o Capataces al solicitar herramientas para sus cuadrillas.'],

    ['encargado_panol',
     'Reporte de herramientas dañadas, perdidas o en reparación',
     'Reporte',
     'Listado actualizado de herramientas que no están disponibles por daño, pérdida o reparación, con identificación del último responsable y estado de la gestión de reposición o reparación.',
     'El Encargado de Pañol detecta el daño o la pérdida al momento de la devolución o en el inventario físico. El Supervisor del frente correspondiente es responsable de informar las pérdidas o daños ocurridos en campo.'],

    ['encargado_panol',
     'Informe de necesidades de reposición',
     'Informe',
     'Lista periódica de herramientas que deben reponerse por desgaste, pérdida o incorporación de nuevos frentes, con cantidades y especificaciones para el proceso de compra.',
     'Elaborado por el Encargado de Pañol en base al estado del inventario y a las solicitudes de los Supervisores. Se eleva al Jefe de Administración para gestionar la compra.'],

    ['encargado_panol',
     'Resultado del inventario físico periódico',
     'Registro',
     'Resultado del recuento físico de herramientas: comparación del stock teórico vs. el físico, diferencias detectadas y plan de regularización.',
     'Realizado por el Encargado de Pañol con supervisión del Jefe de Administración o el Gerente de Proyecto. La periodicidad la define el Jefe de Administración.'],

    // ── ADMINISTRACIÓN · Encargado de Almacén ────────────────
    ['encargado_almacen',
     'Kardex o registro de movimientos de materiales',
     'Registro',
     'Registro cronológico de todas las entradas y salidas de materiales: fecha, ítem, cantidad, proveedor/destino y saldo actual. Es el historial completo del movimiento del inventario.',
     'El Encargado de Almacén lo actualiza con cada recepción (respaldada por remito) y cada despacho (respaldado por vale de salida). Es la fuente de verdad del stock.'],

    ['encargado_almacen',
     'Remitos de recepción conformados',
     'Registro',
     'Remito del proveedor con la verificación del Almacén: cantidades recibidas, estado de los materiales y conformidad (o no conformidad) con la OC. Incluye la referencia al certificado de calidad del material cuando aplica.',
     'El Encargado de Almacén realiza la verificación física al momento de la entrega del proveedor. El Jefe de QA/QC puede participar en la recepción de materiales críticos que requieren verificación técnica.'],

    ['encargado_almacen',
     'Vales de despacho de material a campo con trazabilidad al paquete de trabajo',
     'Registro',
     'Documento que registra cada salida de material: ítem, cantidad, código del paquete de trabajo de destino y firma del receptor (Jefe de Obra o Supervisor). Permite vincular el consumo de material con cada paquete.',
     'La solicitud de material proviene del Jefe de Obra (con referencia al paquete de trabajo). El Encargado de Almacén valida contra el stock disponible, despacha y registra.'],

    ['encargado_almacen',
     'Informe semanal de stock disponible y alertas de mínimos',
     'Informe',
     'Resumen del stock actual por categoría de material, con los ítems por debajo del mínimo establecido para que Compras gestione la reposición antes de que se genere una restricción a campo.',
     'El Encargado de Almacén lo elabora en base al Kardex actualizado. Los mínimos de stock los define el Jefe de CG en función del ritmo de consumo del cronograma.'],

    ['encargado_almacen',
     'Resultado del inventario físico periódico',
     'Registro',
     'Comparación del stock teórico (según Kardex) vs. el recuento físico real, con las diferencias detectadas por ítem y el plan de regularización.',
     'Realizado por el Encargado de Almacén con supervisión del Jefe de Administración y participación del Jefe de QA/QC cuando hay materiales con certificado de calidad comprometido.'],

    // ── OFICINA TÉCNICA · Control de Documentos ──────────────
    ['control_documentos',
     'Lista Maestra de Documentos (MDR) actualizada',
     'Registro',
     'Registro de todos los documentos del proyecto con: número, título, disciplina, revisión vigente, estado (en revisión/aprobado/superado) y distribución realizada.',
     'El Encargado de Control de Documentos la actualiza con cada documento emitido o recibido. Los documentos provienen del cliente (ingeniería del cliente), del Proyectista (ingeniería de detalle) y de las distintas áreas del proyecto.'],

    ['control_documentos',
     'Registro de transmitals enviados y recibidos',
     'Registro',
     'Log de todos los envíos y recepciones formales de documentación: número de transmittal, fecha, documentos incluidos, destinatario/remitente y fecha de acuse de recibo.',
     'Gestionado íntegramente por el Encargado de Control de Documentos. Los transmitals al cliente son revisados por el Jefe de OT antes del envío.'],

    ['control_documentos',
     'Acuses de recibo de documentación distribuida a campo',
     'Registro',
     'Confirmación firmada por el Jefe de Obra de que recibió los planos y especificaciones actualizadas de su sector. Garantiza que trabaja con la revisión vigente.',
     'El Encargado de Control de Documentos gestiona la distribución y obtiene el acuse. En obras con documentación digital, puede ser un registro de descarga del sistema.'],

    ['control_documentos',
     'Informe de documentos pendientes de aprobación o emisión',
     'Informe',
     'Lista de documentos que están bloqueados o demorados: planos pendientes de aprobación del cliente, procedimientos sin emitir, documentos con revisión vencida. Identifica el impacto potencial en el avance.',
     'El Encargado de Control de Documentos lo elabora a partir del estado de la MDR. El Jefe de OT determina la criticidad de cada documento pendiente según el cronograma.'],

    ['control_documentos',
     'Dossier documental del proyecto (as-built) al cierre de obra',
     'Plan',
     'Compilado final de toda la documentación del proyecto en su estado definitivo: planos as-built, procedimientos aprobados, transmitals cerrados y MDR final. Entregado formalmente al cliente al cierre.',
     'El Encargado de Control de Documentos organiza y compila. Los planos as-built los provee el Proyectista; los registros de calidad, el Jefe de QA/QC. El Jefe de OT aprueba la entrega final.'],

    // ── OFICINA TÉCNICA · Proyectista ────────────────────────
    ['proyectista',
     'Planos de detalle y esquemas técnicos emitidos para construcción (IFC)',
     'Registro',
     'Planos en estado Issued for Construction (IFC): revisados, aprobados por el Jefe de OT y por el cliente cuando corresponde, listos para ser usados en campo.',
     'El Proyectista los elabora en base a los planos de ingeniería básica del cliente, aplicando los detalles de ejecución propios. Las necesidades de nuevos planos las detectan los Jefes de Obra y las canalizan a través del Jefe de OT.'],

    ['proyectista',
     'Respuestas a RFIs con documentación técnica de soporte',
     'Registro',
     'Respuesta formal a cada consulta técnica (RFI): solución técnica adoptada, planos o esquemas aclaratorios adjuntos y cualquier modificación que impacte en otros documentos.',
     'El Proyectista elabora la solución técnica ante consultas del campo. El Jefe de OT revisa y aprueba antes de responder formalmente. Cuando la respuesta requiere definición del cliente, el Jefe de OT gestiona la consulta.'],

    ['proyectista',
     'Planos as-built completados al cierre de cada paquete de trabajo',
     'Registro',
     'Planos que reflejan exactamente lo que fue construido, con las modificaciones respecto al IFC marcadas. Son la base del dossier de entrega al cliente.',
     'El Proyectista los elabora incorporando las novedades y cambios informados por el Jefe de Obra durante la ejecución del paquete. Es responsabilidad del Jefe de Obra comunicar cualquier desvío respecto al plano IFC.'],

    ['proyectista',
     'Listados de materiales (BOM) para pedidos de compra',
     'Registro',
     'Bill of Materials (BOM) por paquete de trabajo o disciplina, con especificación técnica completa de cada ítem para que Compras pueda cotizar y adquirir correctamente.',
     'Elaborado por el Proyectista a partir de los planos IFC. El Jefe de OT lo revisa y lo envía al Encargado de Compras con copia al Jefe de Obra correspondiente.'],

    ['proyectista',
     'Registro de cambios de ingeniería emitidos',
     'Registro',
     'Log de todas las modificaciones de ingeniería: número de cambio, descripción, documentos afectados, estado de aprobación y distribución. Permite rastrear la evolución del diseño.',
     'El Proyectista registra cada cambio que emite. El Control de Documentos lo incorpora en la MDR. El Jefe de CG usa este registro para evaluar el impacto en el cronograma y el costo.'],

    // ── CONTROL DE GESTIÓN · Encargado de Planificación ──────
    ['encargado_planificacion',
     'Cronograma detallado del proyecto actualizado (P6/MSP)',
     'Plan',
     'Cronograma de Nivel 3/4 actualizado semanalmente con el avance real informado. Muestra la comparación plan vs. real, el camino crítico y el impacto de los desvíos en la fecha de terminación.',
     'El Encargado de Planificación lo mantiene en P6 o MS Project. Los datos de avance real provienen de los Jefes de Obra (parte diario), consolidados por el Gerente de Construcción. Los paquetes de trabajo los provee Oficina Técnica.'],

    ['encargado_planificacion',
     'Lookahead de 3 semanas por disciplina o frente',
     'Plan',
     'Cronograma operativo de corto plazo: actividades planificadas para las próximas 3 semanas, con los recursos y materiales necesarios. Permite a los Jefes de Obra y Supervisores planificar la semana.',
     'Elaborado por el Encargado de Planificación en base al cronograma detallado. Se valida en reunión semanal con los Jefes de Obra para confirmar restricciones y disponibilidad de recursos.'],

    ['encargado_planificacion',
     'Curva S planificado vs. real actualizada semanalmente',
     'Informe',
     'Gráfico que muestra la evolución del avance físico acumulado real contra la línea base planificada, permitiendo visualizar de forma inmediata si el proyecto está adelantado o retrasado.',
     'El Encargado de Planificación la genera a partir del cronograma actualizado con el avance real. Se incluye en el reporte semanal del Jefe de CG al Gerente de Proyecto.'],

    ['encargado_planificacion',
     'Registro de restricciones y estado de levantamiento',
     'Registro',
     'Lista de todas las restricciones que impiden ejecutar actividades planificadas: materiales no recibidos, RFIs pendientes, permisos no otorgados, equipos no disponibles. Con responsable y fecha de levantamiento esperado.',
     'Las restricciones son identificadas por los Jefes de Obra y los Supervisores en la reunión semanal de lookahead. El Encargado de Planificación las registra y hace el seguimiento de su levantamiento.'],

    ['encargado_planificacion',
     'Informe de análisis de camino crítico y tendencias',
     'Informe',
     'Análisis periódico del camino crítico: actividades que impactan directamente en la fecha de terminación, tendencia de desvío y alternativas de recupero con su impacto en recursos y costo.',
     'Elaborado por el Encargado de Planificación en base al cronograma P6/MSP. Se presenta al Jefe de CG para su validación y luego al Gerente de Proyecto y Gerente de Construcción para la toma de decisiones.'],

    // ── CONTROL DE GESTIÓN · Encargado de Certificación ──────
    ['encargado_certificacion',
     'Certificado mensual de avance con planillas de medición',
     'Certificado',
     'Documento formal presentado al cliente: descripción de las actividades ejecutadas en el período, cómputos métricos, precios unitarios contractuales y monto a facturar. Con toda la documentación soporte adjunta.',
     'El Encargado de Certificación coordina las mediciones de campo con los Jefes de Obra y los Supervisores. Los precios unitarios y condiciones contractuales los provee el Administrador de Contrato. El Jefe de CG aprueba antes de presentar.'],

    ['encargado_certificacion',
     'Registro histórico de certificaciones',
     'Registro',
     'Tabla acumulada de todos los certificados del proyecto: número, período, monto presentado, fecha de aprobación por el cliente, fecha de cobro y saldo pendiente.',
     'Mantenido por el Encargado de Certificación. Los datos de aprobación del cliente los provee el Administrador de Contrato; los datos de cobro, el Jefe de Administración.'],

    ['encargado_certificacion',
     'Informe de desvíos entre avance físico y monto certificado',
     'Informe',
     'Análisis de la diferencia entre el avance físico real del período y el monto que se pudo certificar: diferencias por trabajos no medibles aún, retenciones contractuales o actividades en discusión con el cliente.',
     'El Encargado de Certificación lo elabora cruzando el avance físico que reporta el Encargado de Planificación (curva S real) con el monto efectivamente certificado en el período.'],

    ['encargado_certificacion',
     'Proyección de certificación para los próximos períodos',
     'Informe',
     'Estimación de los montos a certificar en los próximos 2 o 3 meses, en base al cronograma planificado y los precios unitarios contractuales. Permite anticipar el ingreso de fondos.',
     'El Encargado de Certificación lo elabora cruzando el lookahead del Encargado de Planificación (actividades a ejecutar) con los precios contractuales. El Jefe de CG lo usa para el forecast financiero.'],

    ['encargado_certificacion',
     'Documentación de respaldo de cada proceso de medición',
     'Registro',
     'Archivo completo de soporte para cada certificado: planillas de medición de campo firmadas, fotografías de avance, registros de control de calidad asociados y aprobaciones del cliente.',
     'El Encargado de Certificación recopila la documentación de múltiples fuentes: mediciones de los Jefes de Obra, registros de QC del Jefe de QA/QC y aprobaciones del cliente que gestiona el Administrador de Contrato.']

  ];

  // Escribir datos en bloque
  sheet.getRange(2, 1, data.length, 5).setValues(data);

  // Ancho de columnas
  sheet.setColumnWidth(1, 200);  // id_rol
  sheet.setColumnWidth(2, 280);  // nombre
  sheet.setColumnWidth(3, 100);  // tipo
  sheet.setColumnWidth(4, 400);  // descripcion
  sheet.setColumnWidth(5, 400);  // fuente

  // Wrap text en descripción y fuente
  sheet.getRange(2, 4, data.length, 2).setWrap(true);

  LOG.push(`${data.length} registros insertados.`);

  // Resumen por rol
  const porRol = {};
  data.forEach(r => { porRol[r[0]] = (porRol[r[0]] || 0) + 1; });
  Object.entries(porRol).forEach(([rol, cnt]) => LOG.push(`  ${rol}: ${cnt} entregables`));
  LOG.push('=== FIN — setupEntregables() OK ===');

  _logSheet(ss, LOG);
  ui.alert(`✅ Hoja Entregables cargada.\n${data.length} registros para ${Object.keys(porRol).length} roles.`);
}

// ============================================================
// SETUP — crea/resetea hoja GENERAL con cabeceras (sin cambios)
// ============================================================
function setupSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const ui = SpreadsheetApp.getUi();
  let sheet = ss.getSheetByName(DEFAULT_SHEET);

  if (sheet) {
    const resp = ui.alert(
      'Hoja existente',
      'La hoja GENERAL ya existe. ¿Sobreescribir cabeceras en fila 1?',
      ui.ButtonSet.YES_NO
    );
    if (resp !== ui.Button.YES) return;
  } else {
    sheet = ss.insertSheet(DEFAULT_SHEET);
  }

  _writeHeaders(sheet);
  ui.alert('✅ Hoja GENERAL lista. Podés pegar el CSV desde la fila 2.');
}

// ============================================================
// CREAR OBRA DESDE GENERAL (sin cambios)
// ============================================================
function crearObraDesdeGeneral() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const ui = SpreadsheetApp.getUi();

  const general = ss.getSheetByName(DEFAULT_SHEET);
  if (!general) {
    ui.alert('Error', 'La hoja GENERAL no existe. Ejecutá Setup primero.', ui.ButtonSet.OK);
    return;
  }

  const resp = ui.prompt('Nueva Obra', 'Ingresá el código o nombre de la obra (ej: 1320):', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;

  const obraName = resp.getResponseText().trim();
  if (!obraName) { ui.alert('El nombre no puede estar vacío.'); return; }
  if (ss.getSheetByName(obraName)) {
    ui.alert('Error', `Ya existe una hoja llamada "${obraName}".`, ui.ButtonSet.OK); return;
  }

  const newSheet = general.copyTo(ss);
  newSheet.setName(obraName);

  const lastRow = newSheet.getLastRow();
  if (lastRow >= 2) {
    newSheet.getRange(2, COL.nombre_asignado + 1, lastRow - 1, 1).clearContent();
  }

  ss.setActiveSheet(newSheet);
  ss.moveActiveSheet(ss.getNumSheets());

  ui.alert('✅ Obra creada', `Hoja "${obraName}" creada desde GENERAL.\nCompletá la columna J (nombre_asignado) con el personal asignado.`, ui.ButtonSet.OK);
}

// ============================================================
// VALIDAR HOJA UI (sin cambios)
// ============================================================
function validarHojaUI() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt(
    'Validar hoja',
    'Nombre de la hoja a validar (dejá vacío para validar la hoja activa):',
    ui.ButtonSet.OK_CANCEL
  );
  if (resp.getSelectedButton() !== ui.Button.OK) return;

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const name = resp.getResponseText().trim() || ss.getActiveSheet().getName();
  const result = validarHoja(name);

  const icon = result.ok ? '✅' : '⚠️';
  const lines = [`${icon} Hoja: ${name}`, `Filas de datos: ${result.totalRows}`, ''];
  if (result.errors.length === 0) {
    lines.push('Sin errores detectados.');
  } else {
    lines.push(`${result.errors.length} error(es) encontrado(s):`);
    result.errors.slice(0, 20).forEach(e => lines.push('  • ' + e));
    if (result.errors.length > 20) lines.push(`  ... y ${result.errors.length - 20} más.`);
  }
  if (result.warnings.length > 0) {
    lines.push('');
    lines.push(`${result.warnings.length} advertencia(s):`);
    result.warnings.slice(0, 10).forEach(w => lines.push('  · ' + w));
  }

  ui.alert('Resultado de validación', lines.join('\n'), ui.ButtonSet.OK);
}

// ============================================================
// VALIDAR HOJA (lógica — sin cambios)
// ============================================================
function validarHoja(sheetName) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  const errors = [];
  const warnings = [];

  if (!sheet) {
    return { ok: false, totalRows: 0, errors: [`Hoja "${sheetName}" no encontrada.`], warnings: [] };
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { ok: false, totalRows: 0, errors: ['La hoja no tiene datos (solo cabecera o vacía).'], warnings: [] };
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
  const ids = {};

  rows.forEach((row, i) => {
    const fila = i + 2;
    const id = String(row[COL.id_rol]).trim();
    const titulo = String(row[COL.titulo]).trim();
    const area = String(row[COL.area]).trim();
    const nivel = row[COL.nivel];
    const reporta_id = String(row[COL.reporta_a_id]).trim();

    if (!id) { errors.push(`Fila ${fila}: id_rol vacío.`); return; }
    if (!titulo) errors.push(`Fila ${fila} (${id}): titulo vacío.`);
    if (!area)   errors.push(`Fila ${fila} (${id}): area vacía.`);
    if (!nivel && nivel !== 0) errors.push(`Fila ${fila} (${id}): nivel vacío.`);
    if (!reporta_id) errors.push(`Fila ${fila} (${id}): reporta_a_id vacío.`);

    const esFunciones = String(row[COL.funciones]).trim();
    if (ids[id]) {
      if (esFunciones) {
        errors.push(`Fila ${fila} (${id}): id_rol duplicado con contenido en funciones.`);
      }
    } else {
      ids[id] = fila;
      if (!esFunciones) warnings.push(`Fila ${fila} (${id}): funciones vacías.`);
      if (!String(row[COL.responsabilidades]).trim()) warnings.push(`Fila ${fila} (${id}): responsabilidades vacías.`);
      if (!String(row[COL.entregables]).trim()) warnings.push(`Fila ${fila} (${id}): entregables vacíos.`);
    }
  });

  const validRoots = ['gerente_operaciones'];
  rows.forEach((row, i) => {
    const id = String(row[COL.id_rol]).trim();
    const reporta_id = String(row[COL.reporta_a_id]).trim();
    if (!id || !reporta_id) return;
    if (!ids[reporta_id] && !validRoots.includes(reporta_id)) {
      warnings.push(`Fila ${i+2} (${id}): reporta_a_id="${reporta_id}" no existe en esta hoja.`);
    }
  });

  return { ok: errors.length === 0, totalRows: rows.length, errors, warnings };
}

// ============================================================
// INFO DEPLOY (sin cambios)
// ============================================================
function getInfo() {
  const url = ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().alert(
    '🔗 URL del Web App',
    url || '⚠️ El Web App no está desplegado.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// ============================================================
// doGet — ACTUALIZADO
// · Verifica SITIO_DISPONIBLE antes de procesar
// · entregables[] como array de objetos {nombre,tipo,descripcion,fuente}
// ============================================================
function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};

  // 1. Verificar flag de disponibilidad
  const disponible = _getSitioDisponible();
  if (!disponible) {
    return buildResponse({
      ok: false,
      sitioNoDisponible: true,
      mensaje: 'Información no disponible por el momento.'
    });
  }

  // 2. Modo validación
  if (params.validar) {
    const result = validarHoja(params.validar);
    return buildResponse({ ok: true, validacion: result });
  }

  // 3. Respuesta normal
  const sheetName = params.obra || DEFAULT_SHEET;
  try {
    const data = getSheetData(sheetName);
    return buildResponse({ ok: true, obra: sheetName, roles: data });
  } catch (err) {
    return buildResponse({ ok: false, error: err.message });
  }
}

// ============================================================
// Lee flag SITIO_DISPONIBLE de hoja Config
// Retorna true si no existe la hoja (fail-open)
// ============================================================
function _getSitioDisponible() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('Config');
    if (!sheet) return true; // si no existe Config, el sitio está disponible

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return true;

    const rows = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (const row of rows) {
      if (String(row[0]).trim() === 'SITIO_DISPONIBLE') {
        return String(row[1]).trim().toUpperCase() !== 'FALSE';
      }
    }
    return true; // clave no encontrada → disponible
  } catch (err) {
    return true; // error leyendo Config → no bloquear
  }
}

// ============================================================
// Lee una hoja y devuelve array de roles consolidados
// ACTUALIZADO: entregables[] como array de objetos
// ============================================================
function getSheetData(sheetName) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Hoja no encontrada: ' + sheetName);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const rows = sheet.getRange(2, 1, lastRow - 1, 10).getValues();

  // Leer hoja Entregables y construir mapa id_rol → []
  const entregablesMap = _getEntregablesMap();

  const rolesMap = {};
  const rolesOrder = [];

  rows.forEach(row => {
    const id_rol = String(row[COL.id_rol]).trim();
    if (!id_rol) return;
    const nombre = String(row[COL.nombre_asignado]).trim();

    if (!rolesMap[id_rol]) {
      rolesMap[id_rol] = {
        id_rol,
        titulo:            String(row[COL.titulo]).trim(),
        area:              String(row[COL.area]).trim(),
        nivel:             Number(row[COL.nivel]) || 0,
        reporta_a_id:      String(row[COL.reporta_a_id]).trim(),
        reporta_a:         String(row[COL.reporta_a]).trim(),
        funciones:         splitLines(row[COL.funciones]),
        responsabilidades: splitLines(row[COL.responsabilidades]),
        entregables:       entregablesMap[id_rol] || [],  // ← objetos desde hoja Entregables
        asignados:         nombre ? [nombre] : [],
        titulosExtra:      []
      };
      rolesOrder.push(id_rol);
    } else {
      if (nombre) rolesMap[id_rol].asignados.push(nombre);
      const tituloExtra = String(row[COL.titulo]).trim();
      rolesMap[id_rol].titulosExtra.push(tituloExtra || rolesMap[id_rol].titulo);
    }
  });

  return rolesOrder.map(id => rolesMap[id]);
}

// ============================================================
// Lee hoja Entregables → mapa { id_rol: [{nombre,tipo,descripcion,fuente}] }
// ============================================================
function _getEntregablesMap() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('Entregables');
    if (!sheet || sheet.getLastRow() < 2) return {};

    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues();
    const map = {};

    rows.forEach(row => {
      const id_rol = String(row[COL_ENT.id_rol]).trim();
      if (!id_rol) return;
      if (!map[id_rol]) map[id_rol] = [];
      map[id_rol].push({
        nombre:      String(row[COL_ENT.nombre]).trim(),
        tipo:        String(row[COL_ENT.tipo]).trim(),
        descripcion: String(row[COL_ENT.descripcion]).trim(),
        fuente:      String(row[COL_ENT.fuente]).trim()
      });
    });

    return map;
  } catch (err) {
    return {}; // si falla la lectura, no romper el doGet
  }
}

// ============================================================
// HELPERS
// ============================================================
function splitLines(cell) {
  const str = String(cell).trim();
  if (!str) return [];
  return str.split('\n').map(s => s.trim()).filter(s => s.length > 0);
}

function buildResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function _writeHeaders(sheet) {
  const range = sheet.getRange(1, 1, 1, HEADERS.length);
  range.setValues([HEADERS]);
  range.setFontWeight('bold');
  range.setBackground('#CC0000');
  range.setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);
}

// ============================================================
// LOG — escribe en hoja "Log_GAS" (la crea si no existe)
// ============================================================
function _logSheet(ss, lines) {
  try {
    let log = ss.getSheetByName('Log_GAS');
    if (!log) {
      log = ss.insertSheet('Log_GAS');
      log.getRange(1, 1, 1, 2).setValues([['Timestamp', 'Mensaje']]);
      log.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#333333').setFontColor('#FFFFFF');
      log.setFrozenRows(1);
    }
    const ts = new Date().toLocaleString();
    const rows = lines.map(l => [ts, l]);
    log.getRange(log.getLastRow() + 1, 1, rows.length, 2).setValues(rows);
  } catch (err) {
    // silencioso — no romper la operación principal
  }
}
