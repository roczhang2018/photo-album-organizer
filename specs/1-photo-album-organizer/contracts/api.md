# API Contracts: Photo Album Organizer

## Database Service API

### Album Operations

#### Create Album
```javascript
async function createAlbum(name, weekGroup, sortOrder = 0)
```
**Parameters**:
- `name` (string): Album display name
- `weekGroup` (string): ISO week format (YYYY-W##)
- `sortOrder` (number): Order within week group

**Returns**: `Promise<Album>`
**Throws**: ValidationError if name is empty or weekGroup is invalid

#### Get Albums
```javascript
async function getAlbums(weekGroup = null)
```
**Parameters**:
- `weekGroup` (string, optional): Filter by specific week group

**Returns**: `Promise<Album[]>`
**Description**: Returns albums sorted by week group and sort order

#### Update Album
```javascript
async function updateAlbum(id, updates)
```
**Parameters**:
- `id` (number): Album ID
- `updates` (object): Fields to update (name, sortOrder)

**Returns**: `Promise<Album>`
**Throws**: NotFoundError if album doesn't exist

#### Delete Album
```javascript
async function deleteAlbum(id)
```
**Parameters**:
- `id` (number): Album ID

**Returns**: `Promise<void>`
**Throws**: NotFoundError if album doesn't exist
**Note**: Cascades to delete all photos in album

#### Reorder Albums
```javascript
async function reorderAlbums(weekGroup, newOrder)
```
**Parameters**:
- `weekGroup` (string): Week group to reorder
- `newOrder` (number[]): Array of album IDs in new order

**Returns**: `Promise<void>`
**Description**: Updates sort_order for albums in week group

### Photo Operations

#### Add Photo to Album
```javascript
async function addPhotoToAlbum(albumId, file)
```
**Parameters**:
- `albumId` (number): Target album ID
- `file` (File): Photo file object

**Returns**: `Promise<Photo>`
**Throws**: ValidationError if file is not supported image format

#### Get Photos in Album
```javascript
async function getPhotosInAlbum(albumId)
```
**Parameters**:
- `albumId` (number): Album ID

**Returns**: `Promise<Photo[]>`
**Throws**: NotFoundError if album doesn't exist

#### Remove Photo from Album
```javascript
async function removePhotoFromAlbum(photoId)
```
**Parameters**:
- `photoId` (number): Photo ID

**Returns**: `Promise<void>`
**Throws**: NotFoundError if photo doesn't exist

#### Get Photo File
```javascript
async function getPhotoFile(photoId)
```
**Parameters**:
- `photoId` (number): Photo ID

**Returns**: `Promise<File>`
**Throws**: NotFoundError if photo doesn't exist

### Utility Operations

#### Generate Thumbnail
```javascript
async function generateThumbnail(file, maxSize = 200)
```
**Parameters**:
- `file` (File): Source image file
- `maxSize` (number): Maximum thumbnail size in pixels

**Returns**: `Promise<Blob>`
**Description**: Creates thumbnail using Canvas API

#### Validate Image File
```javascript
function validateImageFile(file)
```
**Parameters**:
- `file` (File): File to validate

**Returns**: `boolean`
**Description**: Checks if file is supported image format

#### Generate Week Group
```javascript
function generateWeekGroup(date = new Date())
```
**Parameters**:
- `date` (Date): Date to generate week group for

**Returns**: `string`
**Description**: Returns ISO week format (YYYY-W##)

## File System API

### File Access Operations

#### Select Photos
```javascript
async function selectPhotos()
```
**Returns**: `Promise<File[]>`
**Description**: Opens file picker for multiple image files

#### Read Photo File
```javascript
async function readPhotoFile(filePath)
```
**Parameters**:
- `filePath` (string): Path to photo file

**Returns**: `Promise<File>`
**Throws**: FileNotFoundError if file doesn't exist

#### Get Photo Metadata
```javascript
async function getPhotoMetadata(file)
```
**Parameters**:
- `file` (File): Photo file

**Returns**: `Promise<{filename: string, size: number, type: string}>`

## Event System API

### Custom Events

#### Album Events
```javascript
// Album created
window.dispatchEvent(new CustomEvent('album:created', {detail: album}));

// Album updated
window.dispatchEvent(new CustomEvent('album:updated', {detail: album}));

// Album deleted
window.dispatchEvent(new CustomEvent('album:deleted', {detail: {id}}));

// Albums reordered
window.dispatchEvent(new CustomEvent('albums:reordered', {detail: {weekGroup, newOrder}}));
```

#### Photo Events
```javascript
// Photo added
window.dispatchEvent(new CustomEvent('photo:added', {detail: photo}));

// Photo removed
window.dispatchEvent(new CustomEvent('photo:removed', {detail: {id}}));

// Photos loaded
window.dispatchEvent(new CustomEvent('photos:loaded', {detail: {albumId, photos}}));
```

### Event Listeners
```javascript
// Listen for album changes
window.addEventListener('album:created', (event) => {
    // Update UI
});

// Listen for photo changes
window.addEventListener('photo:added', (event) => {
    // Update photo grid
});
```

## Error Handling

### Error Types
```javascript
class ValidationError extends Error {
    constructor(message, field) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}

class NotFoundError extends Error {
    constructor(resource, id) {
        super(`${resource} with id ${id} not found`);
        this.name = 'NotFoundError';
        this.resource = resource;
        this.id = id;
    }
}

class FileNotFoundError extends Error {
    constructor(filePath) {
        super(`File not found: ${filePath}`);
        this.name = 'FileNotFoundError';
        this.filePath = filePath;
    }
}
```

### Error Response Format
```javascript
{
    error: {
        type: 'ValidationError',
        message: 'Album name cannot be empty',
        field: 'name',
        timestamp: '2024-12-19T10:30:00Z'
    }
}
```
