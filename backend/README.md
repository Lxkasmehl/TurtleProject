# Turtle Project Backend

Django REST API backend for the Turtle Identification System.

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

## Dependencies

The project requires the following Python packages:

- Django 5.2.7
- djangorestframework (Django REST Framework)
- django-cors-headers
- Pillow (PIL) for image processing

Install dependencies using:

```bash
pip install django==5.2.7 djangorestframework django-cors-headers pillow
```

Or if you have a requirements.txt file:

```bash
pip install -r requirements.txt
```

## Project Structure

```
backend/
├── turtles/              # Main Django project directory
│   ├── manage.py        # Django management script
│   ├── db.sqlite3       # SQLite database (if already created)
│   ├── turtles/         # Project settings
│   │   ├── settings.py
│   │   └── urls.py
│   └── identification/  # Main application
│       ├── models.py
│       ├── views.py
│       └── ...
└── data/                # Data directory for turtle images
```

## Database Setup

### Checking if Database Already Exists

The database is already created if:
- The file `backend/turtles/db.sqlite3` exists

If the database file exists, you can skip the migration steps and go directly to [Starting the Server](#starting-the-server).

### Creating the Database (First Time Setup)

If `db.sqlite3` does not exist, you need to create the database:

1. Navigate to the turtles directory:
   ```bash
   cd backend/turtles
   ```

2. Create database migrations:
   ```bash
   python manage.py makemigrations
   ```

3. Apply migrations to create the database:
   ```bash
   python manage.py migrate
   ```

4. (Optional) Create a superuser account for Django admin:
   ```bash
   python manage.py createsuperuser
   ```
   Follow the prompts to set up an admin username, email, and password.

## Starting the Server

1. Navigate to the turtles directory:
   ```bash
   cd backend/turtles
   ```

2. Start the Django development server:
   ```bash
   python manage.py runserver
   ```

3. The server will start on `http://127.0.0.1:8000/` by default.

   You should see output like:
   ```
   Starting development server at http://127.0.0.1:8000/
   Quit the server with CTRL-BREAK.
   ```

## Verifying the Server is Running

Once the server is running, you can:

- Open your browser and navigate to `http://127.0.0.1:8000/`
- Access the Django admin panel at `http://127.0.0.1:8000/admin/` (if you created a superuser)
- Check the API endpoints as defined in your URL configuration

## Troubleshooting

### Database Errors

If you encounter database-related errors when starting the server:

1. Check if `db.sqlite3` exists in `backend/turtles/`
2. If it doesn't exist, follow the [Creating the Database](#creating-the-database-first-time-setup) steps
3. If errors persist, you may need to delete `db.sqlite3` and run migrations again:
   ```bash
   cd backend/turtles
   del db.sqlite3  # Windows
   # or
   rm db.sqlite3   # Linux/Mac
   python manage.py migrate
   ```

### Import Errors

If you see import errors when starting the server:

- Make sure all dependencies are installed (see [Dependencies](#dependencies))
- Verify you're using the correct Python environment
- Consider using a virtual environment to isolate dependencies

### Port Already in Use

If port 8000 is already in use, you can specify a different port:

```bash
python manage.py runserver 8080
```

## Additional Commands

### Django Admin

Access the admin interface at `http://127.0.0.1:8000/admin/` after creating a superuser.

### Creating a Superuser (if not done during setup)

```bash
cd backend/turtles
python manage.py createsuperuser
```

### Viewing Database Migrations

```bash
cd backend/turtles
python manage.py showmigrations
```

### Making New Migrations (after model changes)

```bash
cd backend/turtles
python manage.py makemigrations
python manage.py migrate
```

## Development Notes

- The project uses SQLite for development (configured in `turtles/settings.py`)
- CORS is enabled for all origins (development only - adjust for production)
- Debug mode is enabled (disable for production)
- Media files are served from `backend/turtles/media/`

## API Endpoints

Refer to `backend/turtles/turtles/urls.py` and `backend/turtles/identification/urls.py` for available API endpoints.

