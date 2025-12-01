# Turtle Project Backend

Flask API Server for the Turtle Identification System.

## Installation

1. Make sure Python 3.8+ is installed.

2. Install dependencies:

```bash
pip install -r requirements.txt
```

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

If port 5000 is already in use, change the port in `app.py`:

```python
app.run(debug=True, host='0.0.0.0', port=5000)  # Change port here
```

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
