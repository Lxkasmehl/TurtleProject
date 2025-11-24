import os
import tkinter as tk
import cv2 as cv
from tkinter import Tk, filedialog, Label
import matplotlib.pyplot as plt
import plotly.express as px
import pandas as pd
import numpy as np
import image_processing

# This is the "database" of SIFT features
SIFT_RESULT_PATH = "../../../Fall 2025/SIFT RESULTS/"
# This is the saved k-means model
VOCABULARY_PATH = os.path.join(SIFT_RESULT_PATH, "_vocabulary.pkl")


def select_images():
    root = tk.Tk()
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
    return list(file_paths) if file_paths else []

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


def gui_command_SIFT():
    print("Select images to process...")
    image_paths = select_images()
    if not image_paths:
        print("No images selected.")
        return

    processed_count = 0
    for image_path in image_paths:
        # Create a random name for the output file
        filename_base = os.path.splitext(os.path.basename(image_path))[0]
        x = np.random.randint(100000, 999999)  # Your random name logic
        output_filename = f"{filename_base}_{x}.npz"
        output_path = os.path.join(SIFT_RESULT_PATH, output_filename)

        print(f"Processing {image_path} -> {output_filename}...")

        # Calling the engine
        success, _ = image_processing.process_image_through_SIFT(image_path, output_path)

        if success:
            processed_count += 1

    print(f"All Done. Processed {processed_count}/{len(image_paths)} images.")


def gui_command_match_SIFT():
    print("Select 2 or more .npz files to match...")
    file_paths = select_npz_files()
    if len(file_paths) < 2:
        print("Select at least 2 .npz files.")
        return

    MIN_MATCH_COUNT = 10
    bf = cv.BFMatcher()  # The matcher object

    # Load all the data first
    sift_data = {}
    for path in file_paths:
        img, kp, des, name = image_processing.SIFT_from_file(path)
        if des is not None:
            sift_data[name] = (img, kp, des)

    names = list(sift_data.keys())

    # Pairwise Matching
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            name1 = names[i]
            name2 = names[j]

            img1, kp1, des1 = sift_data[name1]
            img2, kp2, des2 = sift_data[name2]

            #Initial Match
            matches = bf.knnMatch(des1, des2, k=2)

            good_matches = []
            for m, n in matches:
                if m.distance < 0.70 * n.distance:
                    good_matches.append(m)

            if len(good_matches) >= MIN_MATCH_COUNT:

                # Begin to convert Keypoint Objects into (x,y) coordinate arrays
                # cv.findHomography needs these coordinate arrays

                #Extract location of good matches in both images
                src_pts = np.float32([kp1[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
                dst_pts = np.float32([kp2[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)

                #run RANSAC (Geometric Verification)
                M, mask = cv.findHomography(src_pts, dst_pts, cv.RANSAC, 5.0)
                matchesMask = mask.ravel().tolist()
                #Conversion Over

                inlier_count = np.sum(matchesMask)

                if inlier_count >= MIN_MATCH_COUNT:
                    print(f"Confirmed Match: {name1} ↔ {name2} ({inlier_count} geometric matches)")

                # Logic to draw matches

                draw_params = dict(matchColor=(0, 255, 0),
                                   singlePointColor = None,
                                   matchesMask=matchesMask,
                                   flags=2)

                matched_img = cv.drawMatches(img1, kp1, img2, kp2, good_matches, None,
                                             **draw_params)

                plt.figure(figsize=(12, 6))
                plt.imshow(matched_img)
                plt.title(f"{name1} ↔ {name2} | Geometric Matches: {inlier_count}")
                plt.show()
            else:
                print(f"Skipped: {name1} ↔ {name2} | Only {inlier_count} good inliers")
        else:
            print(f"Skipped: {name1} ↔ {name2} | Only {len(good_matches)} raw matches")


def gui_command_train_vocab():
    print("Training new vocabulary")
    kmeans = image_processing.train_and_save_vocabulary(npz_path=SIFT_RESULT_PATH, vocab_output_path=VOCABULARY_PATH, num_clusters=64)
    if kmeans is not None:
        print("Vocabulary training complete")
    else:
        print("Vocabulary training failed")


def gui_command_plot_clusters(use_plotly=False):
    #Command for both "PCA" and "Plotly" buttons.
    # Step 1: Load the trained k-means model
    kmeans = image_processing.load_vocabulary(VOCABULARY_PATH)
    if kmeans is None:
        print("Vocabulary not found. Please train it first.")
        return

    # Step 2: Get VLAD vectors for all files
    print("Computing VLAD vectors for all files...")
    labels, vectors = image_processing.get_vlad_vectors(SIFT_RESULT_PATH, kmeans)
    if vectors.shape[0] == 0:
        print("No VLAD vectors could be computed.")
        return

    # Step 3: Reduce vectors with PCA
    print("Reducing vectors with PCA...")
    reduced = image_processing.reduce_with_pca(vectors, n_components=2)
    if reduced is None:
        print("PCA failed.")
        return

    # Step 4: Plot
    df = pd.DataFrame(reduced, columns=["x", "y"])
    df["label"] = labels

    if use_plotly:
        print("Displaying Plotly chart...")
        fig = px.scatter(df, x="x", y="y", text="label", title="Turtle Cluster Map (Plotly)")
        fig.update_traces(textposition='top center')
        fig.show()
    else:
        print("Displaying Matplotlib chart...")
        plt.figure(figsize=(10, 6))
        plt.scatter(df["x"], df["y"])
        for i, label in enumerate(df["label"]):
            plt.annotate(label, (df["x"][i], df["y"][i]))
        plt.title("Turtle Cluster Map (Matplotlib/PCA)")
        plt.show()





def main():
    root = Tk()
    root.title("Turtle CV Admin Console")

    frame1 = tk.Frame(root, width=200, height=200, bg="white")
    frame1.pack(fill='both', expand=True)

    btn_sift = tk.Button(frame1, text="Process New Images (SIFT)", command=gui_command_SIFT)
    btn_sift.pack(pady=10)

    btn_match = tk.Button(frame1, text="Match SIFT Files (Pairwise)", command=gui_command_match_SIFT)
    btn_match.pack(pady=10)

    btn_train = tk.Button(frame1, text="** TRAIN VOCABULARY **", command=gui_command_train_vocab)
    btn_train.pack(pady=10)

    btn_plotly = tk.Button(frame1, text="Plotly Turtle Clusters",
                           command=lambda: gui_command_plot_clusters(use_plotly=True))
    btn_plotly.pack(pady=10)

    btn_pca = tk.Button(frame1, text="PCA Turtle Clusters (Matplotlib)",
                        command=lambda: gui_command_plot_clusters(use_plotly=False))
    btn_pca.pack(pady=10)

    root.mainloop()


if __name__ == '__main__':
    # Ensure the SIFT RESULTS directory exists
    os.makedirs(SIFT_RESULT_PATH, exist_ok=True)
    main()