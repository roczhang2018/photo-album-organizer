# Quick Start Guide: Photo Album Organizer

## Project Setup

### Prerequisites
- Node.js 18+ 
- Modern browser with File System Access API support
- Local photo files to organize

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd photo-album-organizer

# Install dependencies
npm install

# Start development server
npm run dev
```

### Project Structure
```
photo-album-organizer/
├── src/
│   ├── components/          # UI components
│   │   ├── AlbumGrid.js    # Album display and drag-and-drop
│   │   ├── PhotoGrid.js    # Photo tile display
│   │   └── FileManager.js  # Photo import
│   ├── services/           # Business logic
│   │   ├── Database.js     # SQLite operations
│   │   ├── FileSystem.js   # File access
│   │   └── ImageProcessor.js # Thumbnail generation
│   ├── utils/              # Utilities
│   │   ├── dateUtils.js    # Week group generation
│   │   └── validation.js   # Input validation
│   ├── styles/             # CSS files
│   │   ├── main.css        # Main styles
│   │   └── components.css  # Component styles
│   ├── index.html          # Main HTML file
│   └── main.js             # Application entry point
├── public/                 # Static assets
├── package.json
└── vite.config.js
```

## Development Workflow

### 1. Database Setup
The SQLite database is automatically initialized on first run:
- Creates `albums` and `photos` tables
- Sets up indexes for performance
- Establishes foreign key relationships

### 2. Adding Photos
1. Click "Add Photos" button
2. Select image files from your computer
3. Photos are automatically organized by week
4. Thumbnails are generated and cached

### 3. Managing Albums
- Albums are automatically grouped by week (YYYY-W## format)
- Drag and drop albums to reorder within week groups
- Click album to view photos in tile layout
- Delete albums to remove all contained photos

### 4. Photo Management
- View photos in responsive tile grid
- Add more photos to existing albums
- Remove individual photos from albums
- Photos remain in original file location

## Key Features

### Automatic Week Grouping
- Photos are automatically organized by ISO week format
- Week groups: 2024-W01, 2024-W02, etc.
- Albums within each week can be reordered

### Drag and Drop
- Reorder albums by dragging within week groups
- Visual feedback during drag operations
- Persists order in database

### Responsive Design
- Works on desktop and mobile devices
- Adaptive tile layouts
- Touch-friendly drag and drop

### Local Storage
- All data stored locally in SQLite database
- No cloud uploads or external dependencies
- Photos remain in original file locations

## API Usage

### Database Operations
```javascript
import { DatabaseService } from './services/Database.js';

// Create new album
const album = await DatabaseService.createAlbum('My Photos', '2024-W01');

// Get all albums
const albums = await DatabaseService.getAlbums();

// Add photo to album
const photo = await DatabaseService.addPhotoToAlbum(albumId, file);
```

### File System Operations
```javascript
import { FileSystemService } from './services/FileSystem.js';

// Select photos from file system
const files = await FileSystemService.selectPhotos();

// Generate thumbnail
const thumbnail = await FileSystemService.generateThumbnail(file);
```

### Event Handling
```javascript
// Listen for album changes
window.addEventListener('album:created', (event) => {
    console.log('New album created:', event.detail);
});

// Listen for photo changes
window.addEventListener('photo:added', (event) => {
    console.log('Photo added:', event.detail);
});
```

## Testing

### Unit Tests
```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test:coverage
```

### Integration Tests
```bash
# Run integration tests
npm run test:integration
```

### Manual Testing
1. Test photo import with various image formats
2. Verify drag and drop functionality
3. Check responsive design on different screen sizes
4. Test database persistence across browser sessions

## Performance Considerations

### Image Optimization
- Thumbnails are generated and cached
- Lazy loading for large photo collections
- Progressive image loading

### Database Performance
- Proper indexing on frequently queried fields
- Efficient queries for album and photo operations
- Connection pooling for concurrent operations

### Memory Management
- Clean up unused image objects
- Limit concurrent thumbnail generation
- Efficient DOM updates for large collections

## Troubleshooting

### Common Issues

#### File System Access Not Available
- Use file input fallback for older browsers
- Check browser permissions for file access
- Verify File System Access API support

#### Database Connection Issues
- Clear browser storage and restart
- Check SQLite database file permissions
- Verify sql.js library loading

#### Performance Issues
- Reduce thumbnail size for large collections
- Implement pagination for photo grids
- Optimize image loading with intersection observer

### Debug Mode
```bash
# Enable debug logging
npm run dev -- --debug
```

## Deployment

### Production Build
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Browser Compatibility
- Modern browsers with ES2020+ support
- File System Access API support recommended
- Fallback to file input for older browsers

### Local Deployment
- Serve built files from any static file server
- No server-side requirements
- Database stored in browser's IndexedDB
