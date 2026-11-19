# 5. Estilo con CSS

`<div>` es una **caja** para agrupar cosas. Con `class` le pones un nombre, y en CSS escribes ese nombre con un **punto** delante para darle diseño.

```html
<style>
  .caja {
    background-color: lightblue;  /* color de fondo */
    color: navy;                  /* color del texto */
    padding: 20px;                /* espacio interno */
    border-radius: 10px;          /* esquinas redondeadas */
    border: 3px solid navy;       /* borde */
  }
</style>

<div class="caja">
  <h2>Soy una caja</h2>
  <p>Todo lo que está aquí dentro tiene estilo.</p>
</div>
```

## Propiedades CSS más usadas

| Propiedad | Qué cambia | Ejemplo |
|---|---|---|
| `color` | Color del texto | `color: red;` |
| `background-color` | Color de fondo | `background-color: #ffcc00;` |
| `font-family` | Tipo de letra | `font-family: Arial;` |
| `font-size` | Tamaño de letra | `font-size: 30px;` |
| `font-weight` | Grosor de letra | `font-weight: bold;` |
| `border` | Borde | `border: 4px dashed green;` |
| `border-radius` | Esquinas redondeadas | `border-radius: 15px;` |
| `width` | Ancho | `width: 300px;` |
| `padding` | Espacio por dentro | `padding: 20px;` |
| `margin` | Espacio por fuera | `margin: 10px;` |
| `box-shadow` | Sombra | `box-shadow: 0 0 20px gold;` |
| `text-align` | Alinear texto | `text-align: center;` |

!!! warning "Importante"
    Cada propiedad termina con **punto y coma** `;` y todo va dentro de llaves `{ }`.

## Colores

- Por nombre en inglés: `red`, `blue`, `green`, `orange`, `purple`, `gold`, `pink`
- Con código: `#ff5733` → busca **"color picker"** en Google para elegir.
- Paletas listas: [coolors.co](https://coolors.co){target=_blank}
