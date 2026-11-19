# 8. Flexbox: ordenar cosas fácilmente

**Flexbox** sirve para **acomodar elementos** en la página: ponerlos uno al lado del otro, centrarlos o repartir el espacio. Con una sola línea ya funciona:

```css
display: flex;
```

!!! info "La idea clave"
    Hay un **contenedor** (la caja de afuera) y sus **hijos** (las cajas de adentro).
    `display: flex` se pone en el **contenedor**, y los hijos se acomodan solos.

## Código base para practicar

Copia esto y luego ve cambiando las propiedades de `.contenedor`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    .contenedor {
      display: flex;                 /* activa Flexbox */
      background-color: #eef2ff;
      border: 3px dashed #4f46e5;
      height: 300px;
      padding: 10px;
    }
    .caja {
      background-color: #4f46e5;
      color: white;
      font-size: 30px;
      width: 100px;
      height: 100px;
      display: flex;                 /* centra el número dentro de cada caja */
      justify-content: center;
      align-items: center;
      border-radius: 10px;
    }
  </style>
</head>
<body>
  <div class="contenedor">
    <div class="caja">1</div>
    <div class="caja">2</div>
    <div class="caja">3</div>
  </div>
</body>
</html>
```

## Las 5 propiedades más útiles

### 1. `justify-content`: reparte en horizontal

| Valor | Qué hace |
|---|---|
| `flex-start` | Todo a la izquierda (por defecto) |
| `center` | Todo al centro |
| `flex-end` | Todo a la derecha |
| `space-between` | Separa al máximo, sin espacio en los bordes |
| `space-around` | Espacio igual alrededor de cada uno |
| `space-evenly` | Espacios exactamente iguales |

```css
.contenedor {
  display: flex;
  justify-content: center;   /* ✏️ prueba: space-between, flex-end... */
}
```

### 2. `align-items`: acomoda en vertical

| Valor | Qué hace |
|---|---|
| `flex-start` | Arriba |
| `center` | Al medio |
| `flex-end` | Abajo |
| `stretch` | Estira las cajas (si no tienen alto fijo) |

```css
.contenedor {
  display: flex;
  align-items: center;       /* ✏️ prueba: flex-start, flex-end */
}
```

!!! tip "El truco más famoso: centrar algo perfecto"
    ```css
    .contenedor {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    ```
    ¡Así está centrada la tarjeta del proyecto!

### 3. `flex-direction`: fila o columna

| Valor | Qué hace |
|---|---|
| `row` | En fila, uno al lado del otro (por defecto) |
| `column` | En columna, uno debajo del otro |
| `row-reverse` | Fila al revés: 3 2 1 |
| `column-reverse` | Columna al revés |

```css
.contenedor {
  display: flex;
  flex-direction: column;    /* ✏️ prueba: row-reverse */
}
```

### 4. `gap`: espacio entre las cajas

```css
.contenedor {
  display: flex;
  gap: 20px;                 /* ✏️ prueba: 5px, 50px */
}
```

### 5. `flex-wrap`: bajar a la siguiente línea

Si hay muchas cajas y no entran, con `wrap` pasan a la siguiente fila (ideal para celulares).

```css
.contenedor {
  display: flex;
  flex-wrap: wrap;
}
```

## Ejemplo real: menú de navegación

```html
<style>
  nav {
    display: flex;
    justify-content: space-between;   /* logo a la izquierda, enlaces a la derecha */
    align-items: center;
    background-color: #2c3e50;
    padding: 15px 30px;
  }
  .logo { color: white; font-size: 24px; font-weight: bold; }
  .enlaces { display: flex; gap: 25px; }
  .enlaces a { color: white; text-decoration: none; }
  .enlaces a:hover { color: yellow; }
</style>

<nav>
  <div class="logo">🚀 MiWeb</div>
  <div class="enlaces">
    <a href="#">Inicio</a>
    <a href="#">Galería</a>
    <a href="#">Contacto</a>
  </div>
</nav>
```

## Ejemplo real: galería de tarjetas

Varias tarjetas, una al lado de la otra, que bajan de línea si no entran:

```html
<style>
  .galeria {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 20px;
    padding: 20px;
  }
  .mini-tarjeta {
    background-color: white;
    width: 180px;
    padding: 20px;
    border-radius: 15px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    text-align: center;
    transition: 0.3s;
  }
  .mini-tarjeta:hover { transform: scale(1.05); }
  body { background-color: #f0f2f5; font-family: Arial; }
</style>

<div class="galeria">
  <div class="mini-tarjeta"><h2>🎮</h2><p>Videojuegos</p></div>
  <div class="mini-tarjeta"><h2>⚽</h2><p>Deportes</p></div>
  <div class="mini-tarjeta"><h2>🎵</h2><p>Música</p></div>
  <div class="mini-tarjeta"><h2>💻</h2><p>Programación</p></div>
</div>
```

## Resumen

| Propiedad | Para qué sirve |
|---|---|
| `display: flex` | Activa Flexbox en el contenedor |
| `justify-content` | Reparte en horizontal |
| `align-items` | Acomoda en vertical |
| `flex-direction` | Fila o columna |
| `gap` | Espacio entre elementos |
| `flex-wrap` | Pasa a otra línea si no entra |

## Retos

- [ ] En el código base, centra las 3 cajas en horizontal y vertical.
- [ ] Pon las cajas en columna.
- [ ] Separa las cajas con `space-between` y `gap: 30px`.
- [ ] Agrega 6 cajas más y usa `flex-wrap: wrap`.
- [ ] Pon **dos tarjetas de presentación** una al lado de la otra usando un contenedor con `display: flex`.

!!! success "Aprende jugando 🐸"
    Practica Flexbox ayudando a las ranas a llegar a su hoja:
    [Flexbox Froggy (en español)](https://flexboxfroggy.com/#es){target=_blank}
