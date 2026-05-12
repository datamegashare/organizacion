# GOE ORG · Handoff de Sesión · v05r2
**Documento:** GOE-ORG-HANDOFF-004  
**Sesión:** Claude · Mayo 2026  
**Estado:** v05r2 listo para deploy — próximos pasos definidos

---

## 1. Prompt de Continuación

```
Vengo de una sesión donde desarrollamos "GOE Org" v05r2, una SPA HTML para 
navegar la estructura organizacional de una empresa constructora electromecánica.
El archivo está live en GitHub Pages: datamegashare.github.io/organizacion/

ESTADO ACTUAL (todo funcional y testeado):
- index_org_v05r2.html: fetch dinámico desde GAS, 3 vistas (Org/Lista/Tabla)
- GAS_v2.gs: doGet, setupSheet, crearObraDesdeGeneral, validarHoja, getInfo
- Sheet ID: 1djz9npDpM4YiikjdS5nPf79ehG8lerxiuqXwEFAnSrg
- GAS URL: https://script.google.com/macros/s/AKfycbxsJTP8o_F01Njtwk7Z2Oz3Z8OhNc__g9EbPGRzoP7DqfuarMr86LNpoIXlsTJk6t4/exec
- Paleta: #CC0000 + negro + blanco / Bebas Neue + DM Sans + DM Mono
- URL scheme: ?obra=1400 → carga hoja 1400; sin parámetro → GENERAL

STACK TÉCNICO:
- Pan/zoom: panzoom@9.4.3 (anvaka, MIT) via unpkg.com — API: panzoom(el, opts) minúscula
- Conectores del árbol: CSS puro con pseudo-elementos ::before en .org-col
- Sin librerías de organigrama externas (se evaluó OrgChart.js dabeng y se descartó)
- Sin build tools, CDN solo, compatible GitHub Pages

ARQUITECTURA DEL ÁRBOL (buildOrg):
- Lista plana ROLES → árbol recursivo via sub(id)
- Raíz virtual "Gerente de Operaciones" (reporta_a_id === 'gerente_operaciones')
- Múltiples hijos: <div class="org-row"> + <div class="org-col"> por hijo
- Hijo único: conexión directa sin org-row
- Múltiples asignados por id_rol: <div class="org-multi-stack"> con .org-multi-sep entre nodos
- Instancia panzoom en variable _panzoom, se destruye con .dispose() antes de redibujar
- Event listeners wheel/dblclick con flag dataset.panzoomBound para no acumular

CONECTORES CSS (sistema v05r1):
- .org-col::before dibuja la horizontal: left/right exactos según posición
- .org-col:first-child::before  → left:50%; right:0   (mitad derecha)
- .org-col:last-child::before   → left:0; right:50%   (mitad izquierda)
- .org-col:first-child:last-child::before → display:none (hijo único)
- .org-vline / .org-vline-inner → líneas verticales (1px, 20px alto)

SPINNER LOADING (sistema v05r2):
- #org-loading: overlay absolute inset:0 sobre #org-panzoom-wrap, z-index:10
- Clase .visible → display:flex (centrado)
- showLoading(msg) / hideLoading() — helpers JS reutilizables
- Se activa en init() con "Cargando estructura..." y en refreshData() con "Actualizando..."
- Siempre se oculta en bloque finally (garantizado aunque falle el fetch)

ESTRUCTURA DE DATOS (output del GAS, por rol):
{
  id_rol, titulo, area, nivel,
  reporta_a_id, reporta_a,
  funciones[], responsabilidades[], entregables[],
  asignados[], titulosExtra[]
}
Regla múltiples asignados: mismo id_rol, N filas en Sheet.
Primera fila: contenido completo + nombre_asignado.
Filas siguientes: solo id_rol, titulo alternativo, nombre_asignado.
GAS consolida en objeto único con asignados[] y titulosExtra[].

ADJUNTAR A LA PRÓXIMA SESIÓN:
- index_org_v05r2.html (archivo activo)
- GAS_v2.gs (sin cambios desde v02)
```

---

## 2. Estado de Archivos

| Archivo | Versión | Estado |
|---------|---------|--------|
| index_org_v03.html | v03 | Supersedido |
| index_org_v04.html | v04 | Supersedido |
| index_org_v05.html | v05 | Supersedido |
| index_org_v05r1.html | v05r1 | Supersedido |
| index_org_v05r2.html | v05r2 ✓ | **LIVE — archivo activo** |
| GAS_v2.gs | v2 ✓ | **ACTIVO — sin cambios** |
| GOE_GENERAL.csv | v1 ✓ | Importado en Sheet |
| GOE-ORG-HANDOFF-001.docx | v01 | Sesión 1 |
| GOE-ORG-HANDOFF-002.md | v02 | Sesión 2 |
| GOE-ORG-HANDOFF-003.md | v03 | Sesión 3 |
| GOE-ORG-HANDOFF-004.md | v04 | **Este documento** |

---

## 3. Arquitectura Actual (v05r2)

```
Google Sheet (1djz9npDpM4YiikjdS5nPf79ehG8lerxiuqXwEFAnSrg)
    ├── Hoja GENERAL   → 20 roles, contenido completo, sin asignados
    ├── Hoja 1400      → obra de prueba, asignados de prueba
    └── Hoja NNNN      → una por obra (crear con menú GOE Org → Nueva obra)

GAS Web App (público, anonymous)
    ├── doGet(?obra=X)    → JSON { ok, obra, roles[] }
    ├── doGet(?validar=X) → JSON { ok, validacion:{ok,errors,warnings} }
    └── Menú Sheet: Setup / Nueva Obra / Validar / Info deploy

GitHub Pages: datamegashare.github.io/organizacion/
    └── index_org_v05r2.html
        ├── Lee ?obra= de URL → showLoading → fetch GAS → buildOrg → hideLoading
        ├── modoObra: true si ?obra= !== GENERAL
        ├── Vista ORG: árbol recursivo CSS + pan/zoom (panzoom.js anvaka)
        ├── Vista LISTA: cards filtradas por área y búsqueda
        ├── Vista TABLA: solo modoObra, resumen con chips de asignados
        ├── Sidebar colapsable con toggle
        ├── Botón Actualizar: re-fetch + spinner overlay
        ├── Dark/light theme toggle
        └── Export PDF A4 (carátula + ficha por rol)
```

---

## 4. Historial de Versiones (esta sesión)

| Versión | Cambios |
|---------|---------|
| **v04** | Base recibida: árbol custom, 3 vistas, fetch GAS, PDF, dark mode |
| **v05** | Pan/zoom (panzoom anvaka), fix pdf-cover duplicado, título con stats, switchView flex, fix acumulación listeners |
| **v05 hotfix** | CDN corregido: cdnjs 404 → unpkg.com/panzoom@9.4.3; API Panzoom→panzoom (minúscula); beforeMouseDown para excluir nodos |
| **v05r1** | Conectores CSS con pseudo-elementos ::before (fix líneas cortadas y multi-asignados sin conector) |
| **v05r2** | Spinner loading overlay en carga inicial y botón Actualizar |

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
| J | nombre_asignado | nombre y apellido (puede estar vacío) |

---

## 6. Features Implementadas (v05r2)

- [x] Fetch dinámico desde GAS con loading/error state
- [x] Spinner overlay en carga inicial y Actualizar
- [x] Badge obra en header (`?obra=1400` → "OBRA: 1400")
- [x] Vista ORG: árbol jerárquico recursivo con pan/zoom nativo
- [x] Conectores CSS exactos (pseudo-elementos, sin calc aproximado)
- [x] Multi-asignados: nodos apilados con separador visual
- [x] Título dinámico con stats Asignados/Vacantes (solo modoObra)
- [x] Vista LISTA: cards filtradas por área y búsqueda
- [x] Vista TABLA: solo en modoObra, resumen con chips de asignados
- [x] Sidebar colapsable con toggle
- [x] Botón Actualizar (re-fetch sin reload)
- [x] Badges asignados (verde) / TBD (amarillo) — solo modoObra
- [x] Dark/light theme toggle
- [x] Export PDF A4 (carátula + ficha por rol)
- [x] GAS: setupSheet, crearObraDesdeGeneral, validarHoja, getInfo
- [x] GAS: endpoint ?validar= para diagnóstico

---

## 7. Pendientes Registrados

### v06 — Candidatos
- [ ] Rediseño visual sección Entregables (fichas en detalle y PDF)
- [ ] Restricción acceso GAS (OAuth o API key)
- [ ] Responsive mobile organigrama
- [ ] Ajuste padding/gap del árbol para árboles muy anchos (muchos hermanos)

### Otros proyectos pendientes (registrados en memoria)
- [ ] Loading spinners en `dashboard.js` (KPI cards) y `materiales.js` (tabla) — DMS Inventario
- [ ] Frontend Etapa 3 DMS Inventario: pdt.js, reservas.js, salidas.js, devoluciones.js

---

## 8. Decisiones de Arquitectura Registradas

| Decisión | Alternativa descartada | Motivo |
|----------|----------------------|--------|
| panzoom (anvaka) via unpkg | @panzoom/panzoom (timmywil) | CDN cdnjs daba 404; unpkg verificado |
| Conectores CSS pseudo-elementos | div absoluto con calc() | calc() era aproximación fija, no medía DOM real |
| Sin OrgChart.js (dabeng) | Reemplazar buildOrg() con librería | Costo alto, riesgo de regresión; los problemas eran 2 bugs puntuales |
| Un nodo por rol con asignados internos | Explotar N entradas por asignado | Más simple, selectRole() sin mapeo inverso |
