# 7. Trucos que impresionan

Pequeños detalles que hacen tu página **profesional**.

### Cambiar color al pasar el mouse

```css
nav a:hover {
  color: yellow;
}
```

### La tarjeta crece al pasar el mouse

```css
.tarjeta {
  transition: 0.3s;
}
.tarjeta:hover {
  transform: scale(1.05);
}
```

### Fondo degradado

```css
body {
  background: linear-gradient(to right, #8e2de2, #4a00e0);
}
```

### Letras de Google Fonts

Pega esto dentro del `<head>`:

```html
<link href="https://fonts.googleapis.com/css2?family=Poppins&display=swap" rel="stylesheet">
```

Y en tu CSS:

```css
body { font-family: 'Poppins', sans-serif; }
```

Otras fuentes divertidas: `Montserrat`, `Pacifico`, `Bebas Neue`, `Press Start 2P` (estilo videojuego).

### Botón con mensaje (un poco de JavaScript)

```html
<button onclick="alert('¡Gracias por visitar mi página! 😎')">Salúdame</button>
```

### Emojis

Cópialos de [emojipedia.org](https://emojipedia.org){target=_blank} y pégalos en tu texto: 🎮 ⚽ 🎵 💻

### Video de YouTube

En YouTube: **Compartir → Insertar** y copia el código `<iframe>` en tu página.
