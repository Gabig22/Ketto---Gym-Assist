# Ketto Gym Assistant

Asistente flotante de escritorio para Windows creado con Electron, React, TypeScript, Vite y Tailwind.

Ketto ayuda a registrar entrenamientos de gimnasio de forma rapida desde una ventana transparente always-on-top.

## MVP

- Bot minimizado con mascota kettlebell.
- Panel expandido y modo maximizado.
- Mensaje inicial: "Buenas Gabi, soy Ketto. Entrenamos hoy?"
- Rutinas mockeadas Dia A, Dia B y Dia C.
- Registro de series con botones rapidos.
- Entreno libre.
- Historial guardado en localStorage.
- Progreso simple con ultimo entrenamiento, total de series, mayor mejora y volumen aproximado.

## Scripts

```bash
npm install
npm run dev
npm run build
npm start
```

En Windows los scripts limpian `ELECTRON_RUN_AS_NODE` antes de abrir Electron, para evitar que Electron arranque como Node.

## Sin backend

Esta primera version no incluye backend, login, IA ni integraciones con relojes. La persistencia vive en `localStorage`.
