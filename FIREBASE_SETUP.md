# Configuración de Firebase

## Pasos para configurar Firebase

### 1. Crear un proyecto en Firebase
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Crear un proyecto"
3. Sigue los pasos para crear tu proyecto

### 2. Configurar Authentication
1. En el panel lateral, ve a "Authentication"
2. Haz clic en "Comenzar"
3. Ve a la pestaña "Sign-in method"
4. Habilita los siguientes proveedores:
   - **Correo electrónico/contraseña**: Habilita esta opción
   - **Google**: Habilita esta opción y configura el proyecto de Google Cloud

### 3. Configurar Firestore Database
1. En el panel lateral, ve a "Firestore Database"
2. Haz clic en "Crear base de datos"
3. Selecciona "Comenzar en modo de prueba" (para desarrollo)
4. Elige una ubicación para tu base de datos

### 4. Configurar Storage (opcional)
1. En el panel lateral, ve a "Storage"
2. Haz clic en "Comenzar"
3. Sigue los pasos para configurar Storage

### 5. Obtener la configuración del proyecto
1. Ve a "Configuración del proyecto" (ícono de engranaje)
2. En la sección "Tus aplicaciones", haz clic en el ícono web
3. Registra tu aplicación web
4. Copia la configuración de Firebase

### 6. Actualizar la configuración en el código
Reemplaza el contenido de `config/firebase.ts` con tu configuración:

```typescript
const firebaseConfig = {
  apiKey: "tu-api-key",
  authDomain: "tu-proyecto.firebaseapp.com",
  databaseURL: "https://tu-proyecto-default-rtdb.firebaseio.com",
  projectId: "tu-proyecto-id",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "tu-app-id"
};
```

### 7. Configurar reglas de Firestore (desarrollo)
En Firestore Database > Reglas, usa estas reglas para desarrollo:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuarios pueden leer/escribir sus propios datos
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Sesiones pueden ser leídas/escritas por el usuario propietario
    match /sessions/{sessionId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    
    // Feedback puede ser leído/escrito por el usuario propietario
    match /feedback/{feedbackId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    
    // Imágenes generadas pueden ser leídas/escritas por el usuario propietario
    match /generatedImages/{imageId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
  }
}
```

### 8. Configurar reglas de Storage (REQUERIDO)
En Storage > Reglas, usa estas reglas para desarrollo:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Permitir a usuarios autenticados subir/leer sus propias imágenes
    match /sessions/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Permitir a usuarios autenticados subir/leer imágenes generadas
    match /generated-images/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Permitir a usuarios autenticados subir/leer feedback con imágenes
    match /feedback/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Regla general para desarrollo - usuarios autenticados pueden acceder a sus archivos
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**IMPORTANTE**: Sin estas reglas de Storage, la aplicación no podrá subir imágenes y fallará con errores de permisos.

#### Cómo aplicar las reglas de Storage:
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto "como-me-veo-mvp"
3. En el panel lateral, ve a "Storage"
4. Haz clic en la pestaña "Reglas"
5. Copia y pega las reglas de arriba
6. Haz clic en "Publicar"

### 9. Configurar índices de Firestore (REQUERIDO)
La aplicación necesita índices específicos para funcionar correctamente. Sin estos índices, verás errores como "The query requires an index".

#### Opción 1: Crear índices automáticamente
Si tienes Firebase CLI instalado:
```bash
firebase deploy --only firestore:indexes
```

#### Opción 2: Crear índices manualmente
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto "como-me-veo-mvp"
3. Ve a "Firestore Database" > "Índices"
4. Haz clic en "Crear índice" y configura:

**Índice 1 - Sesiones por usuario:**
- Colección: `sessions`
- Campos: `userId` (Ascending), `updatedAt` (Descending)

**Índice 2 - Feedback por sesión:**
- Colección: `feedback`
- Campos: `sessionId` (Ascending), `createdAt` (Descending)

**Índice 3 - Imágenes generadas:**
- Colección: `generatedImages`
- Campos: `sessionId` (Ascending), `poseInstruction` (Ascending), `isCached` (Ascending)

**Índice 4 - Imágenes generadas con prenda:**
- Colección: `generatedImages`
- Campos: `sessionId` (Ascending), `poseInstruction` (Ascending), `garmentId` (Ascending), `isCached` (Ascending)

#### Opción 3: Usar el enlace de error
Cuando veas el error "The query requires an index" en la consola, haz clic en el enlace proporcionado y Firebase te llevará directamente a crear el índice necesario.

**IMPORTANTE**: Los índices pueden tardar varios minutos en crearse. Una vez creados, las consultas funcionarán correctamente.

## Estructura de datos

### Colecciones en Firestore:

1. **users**: Información del usuario
2. **sessions**: Sesiones de try-on del usuario
3. **feedback**: Feedback de las imágenes generadas
4. **generatedImages**: Cache de imágenes generadas

## Instalación de dependencias

```bash
npm install firebase
```

## Debugging y Troubleshooting

### 1. Verificar conexión a Firebase
Ejecuta el script de prueba:
```bash
node test-firebase.js
```

### 2. Verificar reglas de Firestore
Asegúrate de que las reglas de Firestore permitan las operaciones. Para testing, puedes usar las reglas permisivas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. Verificar en la consola del navegador
- Abre las herramientas de desarrollador (F12)
- Ve a la pestaña Console
- Busca los logs que empiezan con "Creating session", "Updating session", etc.
- Si ves errores de permisos, verifica las reglas de Firestore

### 4. Verificar en Firebase Console
- Ve a [Firebase Console](https://console.firebase.google.com/)
- Selecciona tu proyecto "como-me-veo-mvp"
- Ve a Firestore Database
- Verifica que se estén creando las colecciones: `sessions`, `feedback`, `generatedImages`

### 5. Panel de Debug
La aplicación incluye un panel de debug en la esquina superior izquierda que muestra:
- Estado de autenticación del usuario
- ID de sesión actual
- Información de la sesión actual

### 6. Problemas comunes

**Error: "Missing or insufficient permissions"**
- Verifica que las reglas de Firestore permitan las operaciones
- Asegúrate de que el usuario esté autenticado

**Error: "Firebase: Error (auth/user-not-found)"**
- Verifica que el usuario esté correctamente autenticado
- Revisa que la configuración de Authentication esté habilitada

**No se crean sesiones**
- Verifica que el usuario esté autenticado antes de subir una imagen
- Revisa los logs en la consola para errores específicos

## Funcionalidades implementadas

✅ **Autenticación**
- Sign in con email/password
- Sign in con Google (SSO)
- Gestión de sesiones de usuario

✅ **Almacenamiento de sesiones**
- Guardado automático de sesiones de try-on
- Historial de sesiones del usuario
- Recuperación de sesiones anteriores

✅ **Cache de imágenes**
- Almacenamiento de imágenes generadas
- Evita regenerar imágenes ya creadas
- Mejora el rendimiento

✅ **Sistema de feedback**
- Botones de like/dislike
- Comentarios opcionales
- Historial de feedback por imagen

✅ **UI/UX**
- Modal de autenticación estético
- Panel de feedback integrado
- Historial de sesiones visual
- Diseño consistente con la aplicación
