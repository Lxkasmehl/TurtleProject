import cv2 as cv
import matplotlib.pyplot as plt
import numpy as np
import os
from tkinter import Tk, filedialog, Label
from PIL import Image, ImageTk



def choose_image_path():
    # Single, hidden root for the dialog
    root = Tk()
    root.withdraw()
    file_path = filedialog.askopenfilename(
        initialdir=os.path.expanduser("~"),
        title="Select an Image File",
        filetypes=(
            ("Image files", "*.jpg;*.jpeg;*.png;*.bmp;*.tif;*.tiff"),
            ("All files", "*.*")
        )
    )
    #close/destroy the hidden root
    root.update()
    root.destroy()
    return file_path if file_path else None

def SIFT():
    image_path = choose_image_path()
    imgGray = cv.imread(image_path,cv.IMREAD_GRAYSCALE)

    sift = cv.SIFT_create()
    keypoints = sift.detect(imgGray,None)
    imgGray = cv.drawKeypoints(imgGray,keypoints,imgGray,flags=cv.DRAW_MATCHES_FLAGS_DRAW_RICH_KEYPOINTS)

    plt.figure()
    plt.imshow(imgGray)
    plt.show()


if __name__ == '__main__':
    SIFT()