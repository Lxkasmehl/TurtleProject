import cv2 as cv
import queue as queue
import matplotlib.pyplot as plt
import numpy as np
import os
import tkinter as tk
from tkinter import Tk, filedialog, Label
from PIL import Image, ImageTk


def select_several_images():
    root = Tk()
    root.title("Select Images")
    root.withdraw()
    file_paths = filedialog.askopenfilenames(
        initialdir=os.path.expanduser("~"),
        title="Select an Image File",
        filetypes=(
            ("Image files", "*.jpg;*.jpeg;*.png;*.bmp;*.tif;*.tiff"),
            ("All files", "*.*")
        )
    )
    root.update()
    root.destroy()

    if not file_paths:
        return []
    return list(file_paths)
        #myQueue = queue.Queue()
        #myQueue = []
        #myQueue.append(file_paths)
        #print(myQueue)
        #return myQueue



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
    image_paths = []
    image_paths = select_several_images()
    while image_paths:
        image_path = image_paths.pop(0) if image_paths else None
        imgGray = cv.imread(image_path,cv.IMREAD_GRAYSCALE)

        sift = cv.SIFT_create()
        keypoints = sift.detect(imgGray,None)
        imgGray = cv.drawKeypoints(imgGray,keypoints,imgGray,flags=cv.DRAW_MATCHES_FLAGS_DRAW_RICH_KEYPOINTS)

        plt.figure()
        plt.imshow(imgGray)
        plt.show()

def begin_here():
    root = Tk()
    root.title("Run SIFT")

    #create init frame
    frame1 = tk.Frame(root, width=200, height=200, bg="white")
    frame1.pack(fill='both', expand=True)

    button1 = tk.Button(frame1, text="SIFT", command=SIFT)
    button1.pack(pady=20)
    root.mainloop()



if __name__ == '__main__':
    begin_here()
    #SIFT()
    #select_several_images()




