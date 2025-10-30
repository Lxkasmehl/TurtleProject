import cv2 as cv
import queue as queue
import matplotlib.pyplot as plt
import numpy as np
import os
import tkinter as tk
from tkinter import Tk, filedialog, Label
from PIL import Image, ImageTk

ORB_RESULT_PATH = "../../../Desktop/ORB RESULTS/"

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

def select_npz_files():
    root = Tk()
    root.title("Select NPZ Files")
    root.withdraw()
    file_paths = filedialog.askopenfilenames(
        title="Select NPZ Files",
        filetypes=[("Numpy Files", "*.npz")]
    )
    root.update()
    root.destroy()
    return list(file_paths)

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

def ORB():
    image_paths = []
    image_paths = select_several_images()
    while image_paths:
        image_path = image_paths.pop(0) if image_paths else None
        imgGray = cv.imread(image_path,cv.IMREAD_GRAYSCALE)


        orb = cv.ORB_create()
        keypoints, descriptors = orb.detectAndCompute(imgGray, None)
        imgGray = cv.drawKeypoints(imgGray,keypoints,imgGray,flags=cv.DRAW_MATCHES_FLAGS_DRAW_RICH_KEYPOINTS)


        #serializing keypoints for saving
        kp_array = np.array([
            (kp.pt, kp.size, kp.class_id)
            for kp in keypoints
        ], dtype=object)

        #Creating a hopefully random filename (file already exists error handling needs added)
        filename_base = os.path.splitext(os.path.basename(image_path))[0]
        x = np.random.randint(100000, 999999)
        new_filename = f"{filename_base}_{x}.npz"
        np.savez(os.path.join(ORB_RESULT_PATH,new_filename), image = imgGray, keypoints = kp_array, descriptors = descriptors)

        plt.figure()
        plt.imshow(imgGray)
        plt.title(f"Keypoints: {len(keypoints)}")
        plt.show()

def ORB_from_file(file_paths):
    orb_data = []
    #select_npz_files(file_paths)
    for path in file_paths:
        data = np.load(path, allow_pickle=True)
        imgGray = data['image']
        kp_array = data['keypoints']
        descriptors = data['descriptors']

        keypoints = []
        for kp_data in kp_array:
            pt, size, class_id = kp_data
            keypoints.append(cv.KeyPoint(pt[0], pt[1], size, class_id))

        orb_data.append((imgGray, keypoints, descriptors, os.path.basename(path)))
    return orb_data

def matching_ORB_files():
    file_paths = select_npz_files()
    if len(file_paths) < 2:
        print("Select atleast 2 .npz files")
        return
    MIN_MATCH_COUNT = 40

    # get our sift data back out of the npz files
    orb_data = ORB_from_file(file_paths)
    bf = cv.BFMatcher()

    for i in  range (len(orb_data)):
        for j in range((i + 1), len(orb_data)):
            img1, kp1, des1, name1 = orb_data[i]
            img2, kp2, des2, name2 = orb_data[j]

            matches = bf.knnMatch(des1, des2, k=2)
            good_matches = [m for m, n in matches if m.distance < 0.70 * n.distance]
        if len(good_matches) >= MIN_MATCH_COUNT:
            matched_img = cv.drawMatches(img1, kp1, img2, kp2, good_matches, None,
                                         flags=cv.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS)

            plt.figure(figsize=(12, 6))
            plt.imshow(matched_img)
            plt.title(f"{name1} ↔ {name2} | Matches: {len(good_matches)}")
            plt.show()
        else:
            print(f"Skipped: {name1} ↔ {name2} | Only {len(good_matches)} good matches")


def begin_here():
    root = Tk()
    root.title("Run ORB")

    #create init frame
    frame1 = tk.Frame(root, width=200, height=200, bg="white")
    frame1.pack(fill='both', expand=True)

    button1 = tk.Button(frame1, text="ORB", command=ORB())
    button1.pack(pady=20)
    button2 = tk.Button(frame1, text="Match ORB", command=matching_ORB_files)
    button2.pack(pady=20)
    root.mainloop()



if __name__ == '__main__':
    begin_here()
    #SIFT()
    #select_several_images()




