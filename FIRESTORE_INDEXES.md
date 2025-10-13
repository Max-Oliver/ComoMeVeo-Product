# Índices de Firestore Requeridos

## Error encontrado:
```
FirebaseError: The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/com...
```

## Índices necesarios para la aplicación:

### 1. Para la colección `sessions`:
- **Campos**: `userId` (Ascending), `updatedAt` (Descending)
- **Colección**: `sessions`
- **Descripción**: Permite consultar sesiones por usuario ordenadas por fecha de actualización

### 2. Para la colección `feedback`:
- **Campos**: `sessionId` (Ascending), `createdAt` (Descending)
- **Colección**: `feedback`
- **Descripción**: Permite consultar feedback por sesión ordenado por fecha de creación

### 3. Para la colección `generatedImages`:
- **Campos**: `sessionId` (Ascending), `poseInstruction` (Ascending), `isCached` (Ascending)
- **Colección**: `generatedImages`
- **Descripción**: Permite consultar imágenes generadas por sesión y pose

### 4. Para la colección `generatedImages` (con garmentId):
- **Campos**: `sessionId` (Ascending), `poseInstruction` (Ascending), `garmentId` (Ascending), `isCached` (Ascending)
- **Colección**: `generatedImages`
- **Descripción**: Permite consultar imágenes generadas por sesión, pose y prenda específica

## Cómo crear los índices:

### Opción 1: Desde Firebase Console (Recomendado)
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto "como-me-veo-mvp"
3. Ve a "Firestore Database" > "Índices"
4. Haz clic en "Crear índice"
5. Configura cada índice según las especificaciones de arriba

### Opción 2: Desde el enlace de error
1. Cuando veas el error en la consola, haz clic en el enlace proporcionado
2. Firebase te llevará directamente a la página de creación del índice
3. Haz clic en "Crear índice"

### Opción 3: Usando Firebase CLI
```bash
# Instalar Firebase CLI si no lo tienes
npm install -g firebase-tools

# Iniciar sesión
firebase login

# Crear índices usando firestore.indexes.json
firebase deploy --only firestore:indexes
```

## Archivo firestore.indexes.json (para Firebase CLI):
```json
{
  "indexes": [
    {
      "collectionGroup": "sessions",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "userId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "updatedAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "feedback",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "sessionId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "generatedImages",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "sessionId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "poseInstruction",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "isCached",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "generatedImages",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "sessionId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "poseInstruction",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "garmentId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "isCached",
          "order": "ASCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

## Notas importantes:
- Los índices pueden tardar varios minutos en crearse
- Una vez creados, las consultas funcionarán correctamente
- Firebase puede sugerir índices automáticamente cuando detecta consultas complejas
- Los índices son necesarios para consultas que usan múltiples campos o ordenamiento
