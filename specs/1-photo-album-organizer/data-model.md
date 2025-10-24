# Data Model: Photo Album Organizer

## Database Schema

### Albums Table
```sql
CREATE TABLE albums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    week_group TEXT NOT NULL,  -- Format: "2024-W01", "2024-W02", etc.
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE(week_group, sort_order)
);
```

**Fields**:
- `id`: Unique identifier for the album
- `name`: Display name for the album (e.g., "Week 1 Photos")
- `week_group`: ISO week format (YYYY-W##) for automatic grouping
- `created_date`: When the album was created
- `sort_order`: Order within the week group for drag-and-drop reordering

**Validation Rules**:
- `name` cannot be empty
- `week_group` must follow ISO week format
- `sort_order` must be unique within each week_group

### Photos Table
```sql
CREATE TABLE photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    album_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    added_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
);
```

**Fields**:
- `id`: Unique identifier for the photo
- `album_id`: Reference to the parent album
- `filename`: Original filename of the photo
- `file_path`: Full path to the photo file
- `file_size`: Size of the file in bytes
- `added_date`: When the photo was added to the album

**Validation Rules**:
- `filename` cannot be empty
- `file_path` must be a valid file path
- `file_size` must be positive
- `album_id` must reference an existing album

### Indexes
```sql
-- Optimize album queries by week group
CREATE INDEX idx_albums_week_group ON albums(week_group);

-- Optimize album sorting
CREATE INDEX idx_albums_sort_order ON albums(week_group, sort_order);

-- Optimize photo queries by album
CREATE INDEX idx_photos_album_id ON photos(album_id);

-- Optimize photo queries by filename
CREATE INDEX idx_photos_filename ON photos(filename);
```

## Entity Relationships

### Album Entity
- **One-to-Many** with Photos
- **Attributes**: id, name, week_group, created_date, sort_order
- **State Transitions**: 
  - Created → Active (when first photo added)
  - Active → Deleted (when album deleted)

### Photo Entity
- **Many-to-One** with Album
- **Attributes**: id, album_id, filename, file_path, file_size, added_date
- **State Transitions**:
  - Added → Active (when successfully added to album)
  - Active → Deleted (when removed from album)

## Data Validation Rules

### Album Validation
- Album name must be 1-100 characters
- Week group must match ISO week format (YYYY-W##)
- Sort order must be unique within week group
- Cannot delete album with photos (cascade delete handled by database)

### Photo Validation
- Filename must be 1-255 characters
- File path must exist and be readable
- File size must be between 1 byte and 100MB
- Only supported image formats (JPEG, PNG, GIF, WebP)
- Cannot add duplicate photos to same album

## Data Operations

### Album Operations
- **Create**: Insert new album with auto-generated week group
- **Read**: Query albums by week group, sorted by sort_order
- **Update**: Modify album name or sort_order
- **Delete**: Remove album and all associated photos

### Photo Operations
- **Create**: Add photo to album with metadata
- **Read**: Query photos by album_id
- **Update**: Modify photo metadata (rare)
- **Delete**: Remove photo from album

### Week Group Operations
- **Generate**: Create week group from date (YYYY-W## format)
- **Parse**: Extract year and week number from week group
- **Sort**: Order albums within week group by sort_order

## Data Migration and Backup

### Database Initialization
- Create tables and indexes on first run
- Set up foreign key constraints
- Initialize default data if needed

### Data Backup Strategy
- Export SQLite database to JSON format
- Include file path mappings
- Verify file existence during backup

### Data Recovery
- Import from JSON backup
- Validate file paths and existence
- Rebuild indexes after import
