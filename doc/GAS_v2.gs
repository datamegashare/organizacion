// ============================================================
// GOE ORG · GAS_v2.gs
// Web App pública + menú Sheet completo
// Incluye todo lo de v1 + validarHoja() + crearObraDesdeGeneral()
// ============================================================

const SHEET_ID    = '1djz9npDpM4YiikjdS5nPf79ehG8lerxiuqXwEFAnSrg';
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
  entregables:       8,  // I
  nombre_asignado:   9   // J
};

const HEADERS = [
  'id_rol','titulo','area','nivel',
  'reporta_a_id','reporta_a',
  'funciones','responsabilidades','entregables',
  'nombre_asignado'
];

// ============================================================
// MENÚ
// ============================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('GOE Org')
    .addItem('⚙️  Setup hoja GENERAL',         'setupSheet')
    .addSeparator()
    .addItem('➕  Nueva obra desde GENERAL',    'crearObraDesdeGeneral')
    .addItem('✅  Validar hoja...',              'validarHojaUI')
    .addSeparator()
    .addItem('🔗  Info deploy (URL Web App)',    'getInfo')
    .addToUi();
}

// ============================================================
// SETUP — crea/resetea hoja GENERAL con cabeceras
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
// CREAR OBRA DESDE GENERAL
// Copia la hoja GENERAL a una nueva hoja con nombre=código de obra.
// La nueva hoja conserva estructura y contenido (F/R/E),
// pero deja la columna J (nombre_asignado) en blanco.
// ============================================================
function crearObraDesdeGeneral() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const ui = SpreadsheetApp.getUi();

  // Verificar que GENERAL existe
  const general = ss.getSheetByName(DEFAULT_SHEET);
  if (!general) {
    ui.alert('Error', 'La hoja GENERAL no existe. Ejecutá Setup primero.', ui.ButtonSet.OK);
    return;
  }

  // Pedir nombre de la obra
  const resp = ui.prompt(
    'Nueva Obra',
    'Ingresá el código o nombre de la obra (ej: 1320):',
    ui.ButtonSet.OK_CANCEL
  );
  if (resp.getSelectedButton() !== ui.Button.OK) return;

  const obraName = resp.getResponseText().trim();
  if (!obraName) {
    ui.alert('El nombre no puede estar vacío.'); return;
  }
  if (ss.getSheetByName(obraName)) {
    ui.alert('Error', `Ya existe una hoja llamada "${obraName}".`, ui.ButtonSet.OK); return;
  }

  // Copiar hoja GENERAL
  const newSheet = general.copyTo(ss);
  newSheet.setName(obraName);

  // Limpiar columna J (nombre_asignado) desde fila 2
  const lastRow = newSheet.getLastRow();
  if (lastRow >= 2) {
    newSheet.getRange(2, COL.nombre_asignado + 1, lastRow - 1, 1).clearContent();
  }

  // Mover la nueva hoja al final
  ss.setActiveSheet(newSheet);
  ss.moveActiveSheet(ss.getNumSheets());

  ui.alert('✅ Obra creada', `Hoja "${obraName}" creada desde GENERAL.\nCompletá la columna J (nombre_asignado) con el personal asignado.`, ui.ButtonSet.OK);
}

// ============================================================
// VALIDAR HOJA (UI wrapper — pide nombre)
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

  // Mostrar resultado
  const icon = result.ok ? '✅' : '⚠️';
  const lines = [`${icon} Hoja: ${name}`, `Filas de datos: ${result.totalRows}`,''];
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
// VALIDAR HOJA (lógica — reutilizable desde doGet)
// Retorna { ok, totalRows, errors:[], warnings:[] }
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
    const fila = i + 2; // número de fila real en el sheet
    const id = String(row[COL.id_rol]).trim();
    const titulo = String(row[COL.titulo]).trim();
    const area = String(row[COL.area]).trim();
    const nivel = row[COL.nivel];
    const reporta_id = String(row[COL.reporta_a_id]).trim();

    // Errores críticos
    if (!id) {
      errors.push(`Fila ${fila}: id_rol vacío.`); return;
    }
    if (!titulo) errors.push(`Fila ${fila} (${id}): titulo vacío.`);
    if (!area)   errors.push(`Fila ${fila} (${id}): area vacía.`);
    if (!nivel && nivel !== 0) errors.push(`Fila ${fila} (${id}): nivel vacío.`);
    if (!reporta_id) errors.push(`Fila ${fila} (${id}): reporta_a_id vacío.`);

    // Registrar IDs (para detectar duplicados que no son asignados extra)
    // Fila "extra" de asignado: solo tiene id_rol, titulo y nombre_asignado
    const esFunciones = String(row[COL.funciones]).trim();
    if (ids[id]) {
      // Duplicado permitido solo si la fila extra NO tiene funciones
      if (esFunciones) {
        errors.push(`Fila ${fila} (${id}): id_rol duplicado con contenido en funciones. Solo la primera fila puede tener funciones/resp/entregables.`);
      }
    } else {
      ids[id] = fila;
      // Advertencias de contenido vacío (solo en filas primarias)
      if (!esFunciones)  warnings.push(`Fila ${fila} (${id}): funciones vacías.`);
      if (!String(row[COL.responsabilidades]).trim()) warnings.push(`Fila ${fila} (${id}): responsabilidades vacías.`);
      if (!String(row[COL.entregables]).trim()) warnings.push(`Fila ${fila} (${id}): entregables vacíos.`);
    }
  });

  // Verificar que todos los reporta_a_id apuntan a un id existente (o son raíz)
  const validRoots = ['gerente_operaciones']; // IDs externos permitidos como raíz
  rows.forEach((row, i) => {
    const id = String(row[COL.id_rol]).trim();
    const reporta_id = String(row[COL.reporta_a_id]).trim();
    if (!id || !reporta_id) return;
    if (!ids[reporta_id] && !validRoots.includes(reporta_id)) {
      warnings.push(`Fila ${i+2} (${id}): reporta_a_id="${reporta_id}" no existe en esta hoja.`);
    }
  });

  return {
    ok: errors.length === 0,
    totalRows: rows.length,
    errors,
    warnings
  };
}

// ============================================================
// INFO DEPLOY
// ============================================================
function getInfo() {
  const url = ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().alert(
    '🔗 URL del Web App',
    url || '⚠️ El Web App no está desplegado. Publicalo desde Implementar → Administrar implementaciones.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// ============================================================
// doGet — Web App pública
// Parámetros URL:
//   ?obra=NOMBRE  → lee hoja NOMBRE
//   (sin param)   → lee hoja GENERAL
//   ?validar=NOMBRE → valida hoja y devuelve resultado JSON
// ============================================================
function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};

  // Modo validación (útil para diagnóstico)
  if (params.validar) {
    const result = validarHoja(params.validar);
    return buildResponse({ ok: true, validacion: result });
  }

  const sheetName = params.obra || DEFAULT_SHEET;

  try {
    const data = getSheetData(sheetName);
    return buildResponse({ ok: true, obra: sheetName, roles: data });
  } catch (err) {
    return buildResponse({ ok: false, error: err.message });
  }
}

// ============================================================
// Lee una hoja y devuelve array de roles consolidados
// ============================================================
function getSheetData(sheetName) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Hoja no encontrada: ' + sheetName);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const rows = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
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
        entregables:       splitLines(row[COL.entregables]),
        asignados:         nombre ? [nombre] : [],
        titulosExtra:      []   // títulos de filas secundarias (índice i → asignados[i+1])
      };
      rolesOrder.push(id_rol);
    } else {
      // Fila secundaria: acumular nombre y título alternativo
      if (nombre) rolesMap[id_rol].asignados.push(nombre);
      const tituloExtra = String(row[COL.titulo]).trim();
      rolesMap[id_rol].titulosExtra.push(tituloExtra || rolesMap[id_rol].titulo);
    }
  });

  return rolesOrder.map(id => rolesMap[id]);
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
