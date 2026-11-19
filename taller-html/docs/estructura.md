# 1. Estructura básica

Toda página web tiene este esqueleto. Cópialo, es tu punto de partida:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Mi primera página</title>
  </head>
  <body>
    ¡Hola mundo!
  </body>
</html>
```

| Parte | Para qué sirve |
|---|---|
| `<!DOCTYPE html>` | Le dice al navegador que es una página HTML |
| `<html>` | Envuelve toda la página |
| `<head>` | Información que **no se ve** (título de la pestaña) |
| `<meta charset="UTF-8">` | Para que se vean bien las tildes y la ñ |
| `<title>` | El texto de la pestaña del navegador |
| `<body>` | Todo lo que **se ve** en pantalla |

!!! example "Reto"
    Cambia `¡Hola mundo!` por tu nombre y el título de la pestaña por "Mi página".
