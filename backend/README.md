# Turtle Project Backend

Flask API Server for the Turtle Identification System.

## Installation

1. Make sure Python 3.8+ is installed.

2. Install dependencies:

```bash
pip install -r requirements.txt
```

## Configuration

1. Create a `.env` file in the `backend` directory (copy from `env.template`):

```bash
# On Windows (PowerShell)
Copy-Item env.template .env

# On Linux/Mac
cp env.template .env
```

2. Update the `.env` file with your configuration:

```env
# Server Port (default: 5000)
PORT=5000

# Flask Debug Mode
FLASK_DEBUG=true

# JWT Secret - MUST match the JWT_SECRET in auth-backend/.env
JWT_SECRET=your-secret-key-change-in-production
```

**Important:** The `JWT_SECRET` must match the `JWT_SECRET` in `auth-backend/.env` so that the Flask backend can verify JWT tokens from the auth-backend.

## Starting the Server

1. Navigate to the backend directory:

```bash
cd backend
```

2. Start the Flask server:

```bash
python app.py
```

The server runs by default on `http://localhost:5000`.

## API Endpoints

### Health Check

- `GET /api/health` - Checks if the server is running

### Photo Upload

- `POST /api/upload` - Uploads a photo

  - **Admin**: Processes immediately and returns top 5 matches
  - **Community**: Saves to review queue with top 5 matches

  Form Data:

  - `file`: The image file
  - `role`: 'admin' or 'community'
  - `email`: User's email address

### Review Queue

- `GET /api/review-queue` - Returns all pending review items (Admin only)

### Approve Review

- `POST /api/review/<request_id>/approve` - Approves a review item (Admin only)

  Body:

  ```json
  {
    "match_turtle_id": "T101" // The selected turtle ID
  }
  ```

### Get Images

- `GET /api/images` - Returns an image from the file system
  - Query parameter: `path=<encoded_image_path>`

## Data Structure

The backend uses the following directory structure:

```
backend/
├── data/                    # Main data directory
│   ├── Review_Queue/        # Community uploads (waiting for review)
│   ├── Community_Uploads/   # Saved community uploads
│   └── [State]/[Location]/  # Official turtle data
│       └── [TurtleID]/
│           ├── ref_data/     # Reference images
│           └── loose_images/ # Additional observations
├── app.py                   # Flask API Server
├── turtle_manager.py        # Main logic for turtle management
├── image_processing.py      # SIFT/VLAD image processing
└── search_utils.py          # FAISS search functions
```

## Important Notes

- On first startup, the system will automatically generate FAISS indexes and vocabulary if they don't exist yet.
- Community uploads are saved in `data/Review_Queue/` and wait for admin review.
- Admin uploads are processed immediately and the top 5 matches are returned.

## Clearing Uploaded Data

To clear all uploaded data (Review Queue, Community Uploads, temporary files):

```bash
python clear_uploads.py
```

This will:

- Delete all items in the Review Queue
- Delete all Community Uploads
- Clear temporary uploaded files

**Note:** This does NOT delete:

- Official turtle data (State/Location folders)
- FAISS indexes and vocabulary
- Trained models

To clear only the Review Queue:

```bash
python clear_uploads.py --review-only
```

## Troubleshooting

### Port Already in Use

If port 5000 is already in use, change the port in your `.env` file:

```env
PORT=5001
```

Or set it as an environment variable before starting:

```bash
PORT=5001 python app.py
```

### Environment Configuration

The backend uses a separate `.env` file that is completely independent from `auth-backend/.env`. The only shared configuration is `JWT_SECRET`, which must match between both backends for authentication to work.

- `backend/.env` - Flask backend configuration (PORT, FLASK_DEBUG, JWT_SECRET)
- `auth-backend/.env` - Auth backend configuration (PORT, JWT_SECRET, etc.)

These are kept separate to avoid configuration conflicts.

### Missing Dependencies

Make sure all packages are installed:

```bash
pip install -r requirements.txt
```

### FAISS Installation Issues

If `faiss-cpu` cannot be installed, try:

```bash
pip install faiss-cpu --no-cache-dir
```
