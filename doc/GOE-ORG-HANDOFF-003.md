# GOE ORG · Handoff de Sesión · v05
**Documento:** GOE-ORG-HANDOFF-003  
**Sesión:** Claude · May 2026  
**Estado:** v04 live y funcional — próximos pasos definidos

---

## 1. Prompt de Continuación

```
Vengo de una sesión donde desarrollamos "GOE Org" v04, una SPA HTML para 
navegar la estructura organizacional de una empresa constructora electromecánica.
El archivo está live en GitHub Pages: datamegashare.github.io/organizacion/

ESTADO ACTUAL (todo funcional y testeado):
- index_org_v04.html: fetch dinámico desde GAS, 3 vistas (Org/Lista/Tabla)
- GAS_v2.gs: doGet, setupSheet, crearObraDesdeGeneral, validarHoja, getInfo
- Sheet ID: 1djz9npDpM4YiikjdS5nPf79ehG8lerxiuqXwEFAnSrg
- GAS URL: https://script.google.com/macros/s/AKfycbxsJTP8o_F01Njtwk7Z2Oz3Z8OhNc__g9EbPGRzoP7DqfuarMr86LNpoIXlTsTJk6t4/exec
- Paleta: #CC0000 + negro + blanco / Bebas Neue + DM Sans + DM Mono
- URL scheme: ?obra=1400 → carga hoja 1400; sin parámetro → GENERAL

PRÓXIMO PASO PRIORITARIO — Reemplazar organigrama custom por librería:

INVESTIGACIÓN REALIZADA (no implementado aún):
Dos candidatos MIT/gratuitos disponibles por CDN:

1. OrgChart.js (dabeng) — RECOMENDADO PRINCIPAL
   - MIT License, sin jQuery en la versión .js (ES6 puro)
   - CDN: https://cdn.jsdelivr.net/npm/orgchart.js@3.8.0/dist/js/orgchart.min.js
   - CSS: https://cdn.jsdelivr.net/npm/orgchart.js@3.8.0/dist/css/orgchart.min.css
   - Pan + zoom built-in, export a imagen, drag/drop nodos
   - Datasource: objeto JS con estructura anidada { name, children:[] }
   - Permite HTML custom dentro de cada nodo (nodeTemplate)
   - Compatible GitHub Pages (puro JS/CSS, sin servidor)
   - Repo: github.com/dabeng/OrgChart.js

2. OrgChart (dabeng, versión jQuery) — alternativa si se necesita jQuery
   - CDN cdnjs: https://cdnjs.cloudflare.com/ajax/libs/orgchart/4.0.1/js/jquery.orgchart.min.js
   - Requiere jQuery

DESCARTAR: BALKAN OrgChartJS (trial/pago), yFiles (pago $13k+), DHTMLX (pago)

TAREA: Reemplazar la función buildOrg() del index_org_v04.html con OrgChart.js.
La integración debe:
- Mantener el stack actual (sin build tools, CDN solo)
- Conservar el diseño visual: paleta #CC0000, fuentes, badges asignados/TBD
- Respetar el nodeTemplate custom (título, área, badge verde/amarillo)
- Mantener click en nodo → selectRole() → vista detalle
- Pan + zoom nativos de la librería
- Funcionar con ?obra= (modoObra) y sin parámetro (GENERAL, sin badges)
- Los múltiples asignados por id_rol (ej: capataz + capataz mecánico) 
  deben seguir mostrando nodos separados

ESTRUCTURA DE DATOS ACTUAL (output del GAS):
Cada rol tiene: id_rol, titulo, area, nivel, reporta_a_id, reporta_a,
funciones[], responsabilidades[], entregables[], asignados[], titulosExtra[]

Para OrgChart.js necesitamos convertir ROLES (lista plana con reporta_a_id)
a estructura anidada. El campo "id" del datasource es id_rol,
"pid" sería reporta_a_id. OrgChart.js acepta también lista plana con pid.

Verificar si OrgChart.js acepta lista plana con {id, pid} antes de convertir.

ARCHIVOS DE LA SESIÓN ANTERIOR A ADJUNTAR:
- index_org_v04.html (versión actual con buildOrg() custom)
- GAS_v2.gs

Arrancá por verificar si OrgChart.js acepta lista plana con pid, 
luego implementá la integración.
```

---

## 2. Estado de Archivos

| Archivo | Versión | Estado |
|---------|---------|--------|
| index_org_v03.html | v03 | Supersedido |
| index_org_v04.html | v04 ✓ | **LIVE** — base para próxima sesión |
| GAS_v1.gs | v1 | Supersedido |
| GAS_v2.gs | v2 ✓ | **ACTIVO** |
| GOE_GENERAL.csv | v1 ✓ | Importado en Sheet |
| GOE-ORG-HANDOFF-001.docx | v01 | Sesión 1 |
| GOE-ORG-HANDOFF-002.md | v02 | Sesión 2 |
| GOE-ORG-HANDOFF-003.md | v03 | **Este documento** |

---

## 3. Arquitectura Actual (v04)

```
Google Sheet (1djz9npDpM4YiikjdS5nPf79ehG8lerxiuqXwEFAnSrg)
    ├── Hoja GENERAL   → 20 roles, contenido completo, sin asignados
    ├── Hoja 1400      → obra de prueba, Pedro asignado a Gerente de Proyecto
    └── Hoja NNNN      → una por obra (crear con menú GOE Org → Nueva obra)

GAS Web App (público, anonymous)
    ├── doGet(?obra=X)    → JSON { ok, obra, roles[] }
    ├── doGet(?validar=X) → JSON { ok, validacion:{ok,errors,warnings} }
    └── Menú Sheet: Setup / Nueva Obra / Validar / Info deploy

GitHub Pages: datamegashare.github.io/organizacion/
    └── index_org_v04.html
        ├── Lee ?obra= de URL → fetch GAS → renderiza
        ├── modoObra: true si ?obra= !== GENERAL
        ├── Vista ORG: organigrama recursivo (custom, a reemplazar)
        ├── Vista LISTA: cards con badges (solo modoObra)
        ├── Vista TABLA: resumen personal (solo modoObra)
        ├── Sidebar colapsable (botón toggle ‹)
        └── Botón Actualizar: re-fetch sin recargar página
```

---

## 4. Estructura JSON del GAS (por rol)

```json
{
  "id_rol": "capataz",
  "titulo": "Capataz",
  "area": "Construcción",
  "nivel": 5,
  "reporta_a_id": "supervisor",
  "reporta_a": "Supervisor",
  "funciones": ["...", "..."],
  "responsabilidades": ["...", "..."],
  "entregables": ["...", "..."],
  "asignados": ["Juan Pérez", "Carlos López"],
  "titulosExtra": ["Capataz Mecánico"]
}
```

**Regla múltiples asignados:** mismo `id_rol`, N filas en el Sheet.
Primera fila: contenido completo (G/H/I) + nombre_asignado.
Filas siguientes: solo A (id_rol), B (titulo alternativo), J (nombre_asignado).
El GAS consolida en un objeto con `asignados[]` y `titulosExtra[]`.

---

## 5. Columnas del Sheet

| Col | Campo | Notas |
|-----|-------|-------|
| A | id_rol | clave única por rol (puede repetirse para múltiples asignados) |
| B | titulo | display del puesto (puede variar en filas secundarias) |
| C | area | Dirección / Construcción / Administración / etc. |
| D | nivel | numérico, 1=top |
| E | reporta_a_id | id del superior (o "gerente_operaciones" para raíz) |
| F | reporta_a | label display del superior |
| G | funciones | ítems separados por `\n` |
| H | responsabilidades | ítems separados por `\n` |
| I | entregables | ítems separados por `\n` |
| J | nombre_asignado | nombre y apellido (puede vacío) |

---

## 6. Features Implementadas (v04)

- [x] Fetch dinámico desde GAS con loading/error state
- [x] Badge obra en header (`?obra=1400` → "OBRA: 1400")
- [x] Vista ORG: organigrama jerárquico recursivo
- [x] Vista LISTA: cards filtradas por área y búsqueda
- [x] Vista TABLA: solo en modoObra, resumen con chips de asignados
- [x] Sidebar colapsable con toggle
- [x] Botón Actualizar (re-fetch sin reload)
- [x] Badges asignados (verde) / TBD (amarillo) — solo modoObra
- [x] Múltiples nodos por id_rol (titulosExtra)
- [x] Dark/light theme toggle
- [x] Export PDF A4 (carátula + ficha por rol)
- [x] GAS: setupSheet, crearObraDesdeGeneral, validarHoja, getInfo
- [x] GAS: endpoint ?validar= para diagnóstico

---

## 7. Pendientes Registrados

### v05 — Prioritario
- [ ] **Reemplazar buildOrg() con OrgChart.js** (dabeng, MIT, CDN jsDelivr)
  - Pan + zoom nativos
  - Layout automático (sin calcular posiciones manualmente)
  - Mejor manejo de árboles anchos
  - nodeTemplate custom manteniendo paleta y badges

### v06+
- [ ] Rediseño visual sección Entregables (fichas en detalle y PDF)
- [ ] Restricción acceso GAS (OAuth o API key)  
- [ ] Responsive mobile organigrama
- [ ] Loading spinners en dashboard.js y materiales.js de DMS Inventario

---

## 8. Investigación Librerías Organigrama (realizada, no implementada)

| Librería | Licencia | CDN | Recomendación |
|----------|----------|-----|---------------|
| OrgChart.js (dabeng) | MIT ✓ | jsDelivr ✓ | **USAR — ES6 puro** |
| OrgChart (dabeng+jQuery) | MIT ✓ | cdnjs ✓ | Alternativa con jQuery |
| BALKAN OrgChartJS | Trial/Pago ✗ | — | Descartar |
| yFiles | Pago $13k+ ✗ | — | Descartar |
| DHTMLX Diagram | Pago ✗ | — | Descartar |

**CDN OrgChart.js:**
```html
<script src="https://cdn.jsdelivr.net/npm/orgchart.js@3.8.0/dist/js/orgchart.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/orgchart.js@3.8.0/dist/css/orgchart.min.css">
```
