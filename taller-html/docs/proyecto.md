# Proyecto: Mi tarjeta de presentación

[:material-eye: Ver la tarjeta funcionando](ejemplos/tarjeta.html){ .md-button .md-button--primary target=_blank }

## Paso 1: Copia todo el código

Busca las líneas que dicen **✏️ CAMBIA AQUÍ**: son las que puedes modificar sin miedo.

```html
--8<-- "docs/ejemplos/tarjeta.html"
```

## Paso 2: ¿Para qué sirve cada parte?

| Código HTML | Para qué sirve |
|---|---|
| `<div class="tarjeta">` | La caja que contiene toda la tarjeta |
| `<div class="portada">` | La franja de color de arriba |
| `<img class="foto">` | Tu foto de perfil |
| `<h1 class="nombre">` | Tu nombre |
| `<p class="profesion">` | Lo que haces o quieres ser |
| `<p class="descripcion">` | Una frase sobre ti |
| `<ul class="datos">` | Lista de tus datos |
| `<a class="boton">` | Botones con enlaces |

!!! info "¿Cómo funciona `class`?"
    En el HTML pones `class="nombre"` y en el CSS escribes `.nombre { ... }`. Así el CSS sabe a qué parte darle estilo.

## Paso 3: Personaliza

### Combinaciones de colores

| Estilo | Color 1 | Color 2 |
|---|---|---|
| Atardecer | `#ff7e5f` | `#feb47b` |
| Océano | `#2193b0` | `#6dd5ed` |
| Bosque | `#11998e` | `#38ef7d` |
| Gamer | `#141e30` | `#00ff99` |
| Elegante | `#232526` | `#bfa14a` |

### Estilos de borde

Cambia la palabra del medio en `border: 3px solid #667eea;`

| Estilo | Se ve como |
|---|---|
| `solid` | Línea continua |
| `dashed` | Línea de guiones |
| `dotted` | Línea de puntos |
| `double` | Línea doble (usa 6px o más) |

!!! tip "Consejo"
    Cambia **una sola cosa**, mira el resultado y luego sigue.

[Ver los retos :material-arrow-right:](retos.md){ .md-button }
