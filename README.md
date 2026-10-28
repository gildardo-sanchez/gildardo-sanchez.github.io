# Sitio académico de Gildardo Sánchez-Ante

Sitio personal de una sola página, hecho con **Jekyll** para publicarse gratis en
**GitHub Pages**. GitHub compila el sitio automáticamente: no hace falta instalar nada
ni usar GitHub Actions. Todo el contenido vive en archivos YAML dentro de `_data/`,
así que actualizarlo no requiere tocar HTML.

## Qué incluye

- Encabezado con un planificador bidireccional (RRT) animado en `<canvas>`, guiño a la
  tesis doctoral. Respeta “reducir movimiento” del sistema y se repite al hacer clic.
- Líneas de investigación con trabajos representativos y liga a sus publicaciones filtradas.
- 79 publicaciones con búsqueda, filtros por línea y tipo, destacadas, DOI y botón
  “Copiar BibTeX”. Sin JavaScript se ve la lista completa (bueno para buscadores).
- Estudiantes: recuadro para aspirantes, doctorandos en curso y tesis de maestría.
- Docencia, trayectoria (línea de tiempo), formación, distinciones y servicio.
- SEO: `jekyll-seo-tag` (título, descripción, Open Graph), `jekyll-sitemap` y datos
  estructurados `schema.org/Person` con ORCID y Scopus para Google.
- Modo oscuro automático, diseño adaptable a móvil, estilos de impresión y página 404.

## Publicarlo en GitHub Pages (10 minutos)

1. Crea un repositorio público llamado **`USUARIO.github.io`** (cambia `USUARIO` por tu
   nombre de usuario de GitHub). Así el sitio queda en `https://USUARIO.github.io`.
2. Sube todos estos archivos a la raíz del repositorio (botón *Add file → Upload files*
   o con `git push`).
3. En el repositorio ve a **Settings → Pages** y en *Build and deployment* elige
   *Deploy from a branch*, rama `main`, carpeta `/ (root)`.
4. Edita `_config.yml` y cambia `url: "https://USUARIO.github.io"`.
5. En uno o dos minutos el sitio estará en línea.

¿Prefieres otro nombre de repositorio, p. ej. `sitio`? Entonces la dirección será
`https://USUARIO.github.io/sitio` y en `_config.yml` debes poner `baseurl: "/sitio"`.

**Dominio propio** (opcional): en *Settings → Pages → Custom domain* escribe tu dominio y
crea en tu proveedor DNS un registro `CNAME` que apunte a `USUARIO.github.io`.

## Cómo actualizar el contenido

| Quiero…                                  | Edita                         |
|------------------------------------------|-------------------------------|
| Cambiar correo, perfiles, CV en PDF      | `_config.yml`                 |
| Agregar una publicación                  | `_data/publications.yml`      |
| Cambiar las líneas de investigación      | `_data/research.yml`          |
| Agregar o graduar estudiantes            | `_data/students.yml`          |
| Agregar proyectos (la sección aparece sola) | `_data/projects.yml`       |
| Cursos actuales                          | `_data/teaching.yml`          |
| Puestos, formación                       | `_data/experience.yml`        |
| Distinciones y servicio                  | `_data/honors.yml`            |
| Colaboradores                            | `_data/collaborators.yml`     |

Ejemplo de publicación nueva (va arriba, en su año):

```yaml
- title: "Título del artículo"
  authors: "A. Autor; G. Sánchez-Ante; B. Autora"
  venue: "Nombre de la revista 12(3), 45–67"
  year: 2026
  type: journal          # journal | conference | chapter | book | editorial | outreach
  line: agro             # nano | agro | salud | robotica | ia
  doi: "10.xxxx/xxxxx"
  code: "https://github.com/usuario/repo"   # opcional
  pdf: "/assets/papers/archivo.pdf"         # opcional
  selected: true                            # opcional: la marca como destacada
```

Escribe tu nombre siempre como `G. Sánchez-Ante` para que aparezca resaltado.
Desde la web de GitHub puedes editar cualquier archivo con el ícono del lápiz; al
guardar (*Commit changes*) el sitio se actualiza solo.

## Pendientes antes de publicar

- [ ] `email` en `_config.yml` (activa los botones de contacto y de aspirantes).
- [ ] URLs de Google Scholar y ResearchGate en `profiles` (el CV no las incluye).
- [ ] Subir el CV en PDF a `assets/cv/` y llenar `cv_pdf`.
- [ ] `program_url`: liga oficial del doctorado.
- [ ] Cursos que impartes actualmente en `_data/teaching.yml`.
- [ ] Revisar `_data/collaborators.yml` (se dedujo de las coautorías).
- [ ] Opcional: imagen para redes sociales de 1200×630 en `assets/` y activar `image` en `_config.yml`.

## Vista previa local (opcional)

Requiere Ruby. En la carpeta del proyecto:

```bash
bundle install
bundle exec jekyll serve
# abre http://localhost:4000
```

## Estructura

```
_config.yml            configuración y datos personales
_data/*.yml            todo el contenido
_layouts/default.html  plantilla base (encabezado, pie, scripts)
_includes/jsonld.html  datos estructurados para buscadores
index.html             la página (secciones)
assets/css/main.css    estilos
assets/js/planner.js   animación del planificador
assets/js/publications.js  filtros y BibTeX
```
