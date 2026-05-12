# GOE ORG · Handoff de Sesión · v06
**Documento:** GOE-ORG-HANDOFF-005
**Sesión:** Claude · Mayo 2026
**Estado:** v06 listo para deploy — próximos pasos definidos

---

## 1. Prompt de Continuación

```
Vengo de una sesión donde desarrollamos "GOE Org" v06, una SPA HTML para
navegar la estructura organizacional de una empresa constructora electromecánica.
El archivo está live en GitHub Pages: datamegashare.github.io/organizacion/

ESTADO ACTUAL (todo funcional y testeado):
- index_org_v06.html: drawer de entregables + flag de disponibilidad
- GAS_v3.gs: setupConfig, setupEntregables, flag SITIO_DISPONIBLE, entregables como objetos
- Sheet ID: 1djz9npDpM4YiikjdS5nPf79ehG8lerxiuqXwEFAnSrg
- GAS URL: https://script.google.com/macros/s/AKfycbxsJTP8o_F01Njtwk7Z2Oz3Z8OhNc__g9EbPGRzoP7DqfuarMr86LNpoIXlsTJk6t4/exec
- Paleta: #CC0000 + negro + blanco / Bebas Neue + DM Sans + DM Mono
- URL scheme: ?obra=1400 → carga hoja 1400; sin parámetro → GENERAL

STACK TÉCNICO:
- Pan/zoom: panzoom@9.4.3 (anvaka, MIT) via unpkg.com
- Conectores del árbol: CSS puro con pseudo-elementos ::before en .org-col
- Sin librerías de organigrama externas
- Sin build tools, CDN solo, compatible GitHub Pages

ARQUITECTURA DEL ÁRBOL (buildOrg): sin cambios desde v05r2
- Lista plana ROLES → árbol recursivo via sub(id)
- Raíz virtual "Gerente de Operaciones" (reporta_a_id === 'gerente_operaciones')
- Instancia panzoom en variable _panzoom, se destruye con .dispose() antes de redibujar

ESTRUCTURA DE DATOS (output del GAS v3, por rol):
{
  id_rol, titulo, area, nivel,
  reporta_a_id, reporta_a,
  funciones[], responsabilidades[],
  entregables[],   ← AHORA son objetos: {nombre, tipo, descripcion, fuente}
  asignados[], titulosExtra[]
}

HOJAS DEL SHEET (v3):
- GENERAL      → 20 roles, estructura completa
- NNNN         → una por obra (asignados en col J)
- Entregables  → id_rol | nombre | tipo | descripcion | fuente (100 registros, 20 roles × ~5)
- Config       → clave | valor (SITIO_DISPONIBLE = TRUE/FALSE)
- Log_GAS      → log automático de operaciones de setup

ACCIONES doGet (GAS v3):
- ?obra=NOMBRE  → JSON { ok, obra, roles[] }
- ?validar=X    → JSON { ok, validacion:{ok,errors,warnings} }
- si SITIO_DISPONIBLE=FALSE → { ok:false, sitioNoDisponible:true, mensaje:'...' }

MENÚ GAS v3:
- ⚙️ Setup hoja GENERAL
- ⚙️ Setup hoja Config        → crea/resetea Config con SITIO_DISPONIBLE=TRUE
- ⚙️ Setup hoja Entregables   → carga 100 registros del PDF GOE-ORG-001 v04
- 🟢 Habilitar sitio           → SITIO_DISPONIBLE=TRUE
- 🔴 Deshabilitar sitio        → SITIO_DISPONIBLE=FALSE
- ➕ Nueva obra desde GENERAL
- ✅ Validar hoja...
- 🔗 Info deploy

FLAG DE DISPONIBILIDAD (v06):
- GAS: _getSitioDisponible() lee Config → fail-open (si no existe Config, sitio disponible)
- Frontend: fetchData() detecta sitioNoDisponible:true → overlay bloqueante
- Overlay: #overlay-nodisponible, mensaje "INFORMACIÓN NO DISPONIBLE POR EL MOMENTO"

DRAWER ENTREGABLES (v06):
- Ícono ⊞ (.sec-hdr-btn) en header de card "ENTREGABLES" en vista detalle de rol
- Si rol sin entregables → ícono disabled (gris, no clickeable)
- openDrawer(idRol): abre #drawer-entregables desde la derecha
- Cierra: click en backdrop (#drawer-backdrop), botón X, o tecla ESC
- Tabla 4 columnas: Entregable / Tipo / Qué contiene / De dónde vienen los datos

PDF (v06):
- 3 columnas superiores: Funciones / Responsabilidades / Entregables (solo nombres — igual que antes)
- Sección adicional al pie de cada ficha: tabla .pdf-ent-table con 4 columnas completas
- Solo se renderiza si entregables[] son objetos (typeof e==='object')

ADJUNTAR A LA PRÓXIMA SESIÓN:
- index_org_v06.html (archivo activo)
- GAS_v3.gs (activo — no requiere cambios salvo nuevas features)
- Este handoff GOE-ORG-HANDOFF-005.md
```

---

## 2. Estado de Archivos

| Archivo | Versión | Estado |
|---------|---------|--------|
| index_org_v05r2.html | v05r2 | Supersedido |
| index_org_v06.html | v06 ✓ | **ACTIVO — pendiente deploy** |
| GAS_v2.gs | v2 | Supersedido |
| GAS_v3.gs | v3 ✓ | **ACTIVO — deployado** |
| GOE-ORG-HANDOFF-001.docx | v01 | Sesión 1 |
| GOE-ORG-HANDOFF-002.md | v02 | Sesión 2 |
| GOE-ORG-HANDOFF-003.md | v03 | Sesión 3 |
| GOE-ORG-HANDOFF-004.md | v04 | Sesión 4 |
| GOE-ORG-HANDOFF-005.md | v05 ✓ | **Este documento** |

---

## 3. Arquitectura Actual (v06)

```
Google Sheet (1djz9npDpM4YiikjdS5nPf79ehG8lerxiuqXwEFAnSrg)
    ├── Hoja GENERAL        → 20 roles, contenido completo, sin asignados
    ├── Hoja 1400           → obra de prueba, asignados de prueba
    ├── Hoja Entregables    → id_rol | nombre | tipo | descripcion | fuente (100 filas)
    ├── Hoja Config         → SITIO_DISPONIBLE | TRUE/FALSE
    ├── Hoja Log_GAS        → log automático de operaciones
    └── Hoja NNNN           → una por obra (crear con menú GOE Org → Nueva obra)

GAS Web App (público, anonymous) — GAS_v3.gs
    ├── doGet(?obra=X)      → verifica flag → JSON { ok, obra, roles[] }
    ├── doGet(?validar=X)   → JSON { ok, validacion:{ok,errors,warnings} }
    └── Menú Sheet: Setup / Config / Entregables / Habilitar / Deshabilitar / ...

GitHub Pages: datamegashare.github.io/organizacion/
    └── index_org_v06.html
        ├── Flag: overlay bloqueante si SITIO_DISPONIBLE=FALSE
        ├── Vista ORG: árbol recursivo CSS + pan/zoom (panzoom.js anvaka)
        ├── Vista LISTA: cards filtradas por área y búsqueda
        ├── Vista TABLA: solo modoObra, resumen con chips de asignados
        ├── Vista DETALLE: card Entregables con ícono ⊞ → drawer lateral
        ├── Drawer: tabla 4 columnas (nombre / tipo / descripción / fuente)
        ├── Sidebar colapsable con toggle
        ├── Botón Actualizar: re-fetch + spinner overlay
        ├── Dark/light theme toggle
        └── Export PDF A4 (carátula + ficha por rol + tabla entregables al pie)
```

---

## 4. Historial de Versiones (esta sesión)

| Versión | Cambios |
|---------|---------|
| **v05r2** | Base recibida: árbol custom, 3 vistas, fetch GAS, PDF, dark mode, spinner loading |
| **GAS v3** | setupConfig(), setupEntregables() con 100 registros del PDF, flag SITIO_DISPONIBLE, entregables[] como objetos {nombre,tipo,descripcion,fuente}, Log_GAS automático |
| **v06** | Flag disponibilidad: overlay bloqueante cuando GAS devuelve sitioNoDisponible:true. Drawer entregables: ícono ⊞ en card, drawer desde la derecha, tabla 4 columnas, cierre por backdrop/X/ESC. PDF: tabla entregables al pie de cada ficha. Versión actualizada a v06. |

---

## 5. Columnas del Sheet

### Hoja GENERAL / obras
| Col | Campo | Notas |
|-----|-------|-------|
| A | id_rol | clave única por rol (puede repetirse para múltiples asignados) |
| B | titulo | display del puesto |
| C | area | Dirección / Construcción / Administración / etc. |
| D | nivel | numérico, 1=top |
| E | reporta_a_id | id del superior (o "gerente_operaciones" para raíz) |
| F | reporta_a | label display del superior |
| G | funciones | ítems separados por `\n` |
| H | responsabilidades | ítems separados por `\n` |
| I | entregables | ítems separados por `\n` (legacy, ya no usado para vista detalle) |
| J | nombre_asignado | nombre y apellido (puede estar vacío) |

### Hoja Entregables
| Col | Campo | Notas |
|-----|-------|-------|
| A | id_rol | join con hoja principal |
| B | nombre | nombre del entregable/reporte |
| C | tipo | Informe / Reporte / Registro / Plan / Acta / Certificado / Planilla |
| D | descripcion | qué contiene y para qué sirve |
| E | fuente | de dónde vienen los datos |

### Hoja Config
| Col | Campo | Notas |
|-----|-------|-------|
| A | clave | ej: SITIO_DISPONIBLE |
| B | valor | TRUE / FALSE |

---

## 6. Features Implementadas (v06 acumulado)

- [x] Fetch dinámico desde GAS con loading/error state
- [x] Spinner overlay en carga inicial y Actualizar
- [x] **Flag SITIO_DISPONIBLE → overlay bloqueante en frontend** ← v06
- [x] Badge obra en header (`?obra=1400` → "OBRA: 1400")
- [x] Vista ORG: árbol jerárquico recursivo con pan/zoom nativo
- [x] Conectores CSS exactos (pseudo-elementos, sin calc aproximado)
- [x] Multi-asignados: nodos apilados con separador visual
- [x] Vista LISTA: cards filtradas por área y búsqueda
- [x] Vista TABLA: solo en modoObra, resumen con chips de asignados
- [x] Sidebar colapsable con toggle
- [x] Botón Actualizar (re-fetch sin reload)
- [x] Dark/light theme toggle
- [x] Export PDF A4 (carátula + ficha por rol)
- [x] **Entregables como objetos {nombre, tipo, descripcion, fuente}** ← v06
- [x] **Ícono ⊞ en card Entregables → drawer lateral** ← v06
- [x] **Drawer: tabla 4 columnas, cierre backdrop/X/ESC** ← v06
- [x] **PDF: tabla entregables al pie de cada ficha** ← v06
- [x] GAS: setupSheet, crearObraDesdeGeneral, validarHoja, getInfo
- [x] GAS: setupConfig, setupEntregables (100 registros), habilitar/deshabilitar sitio
- [x] GAS: Log_GAS automático en operaciones de setup

---

## 7. Pendientes Registrados

### v07 — Candidatos
- [ ] Restricción acceso GAS (OAuth o API key)
- [ ] Responsive mobile organigrama
- [ ] Ajuste padding/gap del árbol para árboles muy anchos (muchos hermanos)
- [ ] `fuentes.html` standalone — no aplica aquí, es de ClimaObra

### Otros proyectos pendientes (registrados en memoria)
- [ ] Loading spinners en `dashboard.js` (KPI cards) y `materiales.js` (tabla) — DMS Inventario
- [ ] Frontend Etapa 3 DMS Inventario: pdt.js, reservas.js, salidas.js, devoluciones.js
- [ ] ClimaObra: verificar trigger 05:00 del 13/05 con GAS v13.10

---

## 8. Decisiones de Arquitectura Registradas

| Decisión | Alternativa descartada | Motivo |
|----------|----------------------|--------|
| panzoom (anvaka) via unpkg | @panzoom/panzoom (timmywil) | CDN cdnjs daba 404; unpkg verificado |
| Conectores CSS pseudo-elementos | div absoluto con calc() | calc() era aproximación fija |
| Sin OrgChart.js (dabeng) | Reemplazar buildOrg() | Costo alto, riesgo de regresión |
| Entregables en hoja separada | Columnas extra en hoja GENERAL | Más limpio, N entregables por rol sin romper estructura de asignados |
| Flag fail-open (sin Config = disponible) | Fail-closed | Evita bloquear el sitio si alguien borra Config por error |
| Drawer desde la derecha | Modal centrado | No deforma ni oculta la vista de rol; UX más fluida |

---

*Generado al cierre de sesión — Mayo 2026*
