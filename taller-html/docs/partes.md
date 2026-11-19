# 6. Partes de una página real

Casi todas las webs tienen **cabecera**, **menú**, **contenido** y **pie de página**. HTML tiene etiquetas con esos nombres:

| Etiqueta | Significa | Ejemplo |
|---|---|---|
| `<header>` | Cabecera | Logo y nombre del sitio |
| `<nav>` | Menú | Inicio · Galería · Contacto |
| `<main>` | Contenido principal | Publicaciones, tu tarjeta |
| `<section>` | Una sección | "Sobre mí", "Hobbies" |
| `<footer>` | Pie de página | © 2026 |

## Mini página completa

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Mi Mundo Web</title>
  <style>
    body   { font-family: Arial; margin: 0; }
    header { background: #2c3e50; color: white; text-align: center; padding: 15px; }
    nav    { background: #3498db; text-align: center; padding: 10px; }
    nav a  { color: white; text-decoration: none; margin: 0 15px; font-weight: bold; }
    nav a:hover { color: yellow; }
    section { padding: 20px; }
    footer { background: #2c3e50; color: white; text-align: center; padding: 10px; }
  </style>
</head>
<body>
  <header>
    <h1>🚀 Mi Mundo Web</h1>
  </header>

  <nav>
    <a href="#sobre-mi">Sobre mí</a>
    <a href="#hobbies">Hobbies</a>
  </nav>

  <main>
    <section id="sobre-mi">
      <h2>Sobre mí</h2>
      <p>Hola, soy Ana.</p>
    </section>
    <section id="hobbies">
      <h2>Hobbies</h2>
      <p>Me gusta el vóley y la música.</p>
    </section>
  </main>

  <footer>
    <p>Hecho por Ana © 2026</p>
  </footer>
</body>
</html>
```

!!! tip "Dato curioso"
    Si el enlace dice `href="#hobbies"` y la sección tiene `id="hobbies"`, al hacer clic la página **salta** a esa parte. ¡Tu menú funciona!
