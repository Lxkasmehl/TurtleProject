TO TEST:

1. Run: python manage.py runserver
2. Visit site http://127.0.0.1:8000/admin
3. Login with User: Admin | Password: Admin
4. Add a turtle and add an image to the turtle
5. Upload your image to backend/turtles/test/images
6. Modify image_path in backend/turtles/test/test_api.py to point to your image
7. Run: python test_api.py