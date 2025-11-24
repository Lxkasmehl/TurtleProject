import requests

# The URL of your Django API endpoint
url = 'http://127.0.0.1:8000/api/identify/'

# Path to the image you want to identify
# CHANGE THIS to a real path on your computer!
image_path = 'images/pans.jpg'

try:
    # Open the image in binary mode
    with open(image_path, 'rb') as img_file:
        # Define the payload. 'image' must match the key expected by the view.
        files = {'image': img_file}

        print(f"Sending {image_path} to {url}...")

        # Send POST request
        response = requests.post(url, files=files)

        # Print the result
        print(f"Status Code: {response.status_code}")
        print("Response JSON:")
        print(response.json())

except FileNotFoundError:
    print(f"Error: Could not find the file at {image_path}")
except Exception as e:
    print(f"An error occurred: {e}")