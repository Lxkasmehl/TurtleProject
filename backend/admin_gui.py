import sys
import os
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from PIL import Image, ImageTk  # Requires: pip install pillow

# --- PATH HACK ---
# Ensures we can find turtle_manager regardless of where this is run
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# --- IMPORT MANAGER ---
# We ONLY import the manager. We do NOT import image_processing directly.
from turtle_manager import TurtleManager

# Initialize Manager (This will trigger the GPU Brain init)
manager = TurtleManager()


class IdentifyWindow:
    """
    A popup window to Upload -> Search -> Select Match -> (Optional) Upgrade Reference
    """

    def __init__(self, master):
        self.top = tk.Toplevel(master)
        self.top.title("Identify & Add Observation")
        self.top.geometry("1600x1000")

        self.query_path = None

        # --- LEFT PANEL: UPLOAD ---
        frame_left = tk.Frame(self.top, width=350, bg="#ecf0f1")
        frame_left.pack(side="left", fill="y", padx=10, pady=10)

        tk.Label(frame_left, text="Query Image", font=("Arial", 12, "bold"), bg="#ecf0f1").pack(pady=10)

        self.lbl_query_img = tk.Label(frame_left, bg="#bdc3c7", text="No Image")
        self.lbl_query_img.pack(pady=10)

        btn_browse = tk.Button(frame_left, text="1. Select Image", command=self.browse_image, bg="#3498db", fg="white")
        btn_browse.pack(fill="x", pady=5)

        btn_search = tk.Button(frame_left, text="2. Search Database", command=self.run_search, bg="#e67e22", fg="white")
        btn_search.pack(fill="x", pady=5)

        # --- RIGHT PANEL: RESULTS ---
        self.frame_results = tk.Frame(self.top)
        self.frame_results.pack(side="right", fill="both", expand=True, padx=10, pady=10)

        tk.Label(self.frame_results, text="Top Matches (Select One)", font=("Arial", 12, "bold")).pack(pady=10)

        # Scrollable area for matches
        canvas = tk.Canvas(self.frame_results)
        scrollbar = tk.Scrollbar(self.frame_results, orient="vertical", command=canvas.yview)
        self.scrollable_frame = tk.Frame(canvas)

        self.scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )

        canvas.create_window((0, 0), window=self.scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

    def browse_image(self):
        path = filedialog.askopenfilename(filetypes=[("Images", "*.jpg *.png *.jpeg")])
        if path:
            self.query_path = path
            self.show_image(path, self.lbl_query_img, size=(300, 300))

    def show_image(self, path, label_widget, size=(300, 300)):
        try:
            img = Image.open(path)
            img.thumbnail(size)
            img_tk = ImageTk.PhotoImage(img)
            label_widget.config(image=img_tk, text="")
            label_widget.image = img_tk  # Keep reference
        except Exception as e:
            print(f"Error loading image {path}: {e}")

    def run_search(self):
        if not self.query_path: return

        # Clear previous results
        for widget in self.scrollable_frame.winfo_children():
            widget.destroy()

        # CALL BACKEND
        results = manager.search_for_matches(self.query_path)

        if not results:
            tk.Label(self.scrollable_frame, text="No matches found.").pack()
            return

        # Display Results
        for i, res in enumerate(results):
            self.create_match_card(res, i + 1)

    def create_match_card(self, result, rank):
        frame_card = tk.Frame(self.scrollable_frame, bd=2, relief="groove", padx=10, pady=10)
        frame_card.pack(fill="x", pady=5)

        # 1. Match Info
        score = result.get('score', 0)  # Int: Number of Keypoint Matches
        confidence = result.get('confidence', 0.0)  # Float: 0.0 - 1.0
        tid = result.get('site_id', 'Unknown')

        info_text = f"Rank {rank}\nID: {tid}\nMatches: {score}\nConf: {confidence:.2f}"

        lbl_info = tk.Label(frame_card, text=info_text, justify="left", font=("Arial", 11, "bold"), width=15)
        lbl_info.pack(side="left", fill="y", padx=5)

        # 2. Action Area
        frame_actions = tk.Frame(frame_card)
        frame_actions.pack(side="right", padx=10)

        # Checkbox for "Upgrade Reference"
        var_upgrade = tk.BooleanVar(value=False)
        chk_upgrade = tk.Checkbutton(frame_actions, text="Replace Master\n(Better Quality)", variable=var_upgrade,
                                     justify="left")
        chk_upgrade.pack(pady=5)

        btn_confirm = tk.Button(frame_actions, text="✅ Confirm Match",
                                command=lambda r=result, v=var_upgrade: self.confirm_match(r, v.get()),
                                bg="#2ecc71", fg="white", font=("Arial", 12, "bold"))
        btn_confirm.pack(pady=5)

        # 3. Image Preview
        lbl_img = tk.Label(frame_card, text="Image not found", bg="#dadada")
        lbl_img.pack(side="left", expand=True, fill="both", padx=10)

        pt_path = result.get('file_path')
        if pt_path:
            base = os.path.splitext(pt_path)[0]
            found = False
            for ext in ['.jpg', '.jpeg', '.png']:
                if os.path.exists(base + ext):
                    self.show_image(base + ext, lbl_img, size=(500, 350))
                    found = True
                    break
            if not found: lbl_img.config(text="Reference JPG Missing")

    def confirm_match(self, result, upgrade_reference):
        turtle_id = result.get('site_id')

        action_msg = "Add Observation"
        if upgrade_reference:
            action_msg = "UPGRADE MASTER IMAGE"

        if messagebox.askyesno("Confirm", f"{action_msg} for Turtle {turtle_id}?"):
            # Create a manual packet for the manager to process
            req_id = manager.create_review_packet(self.query_path, user_info={'manual_admin': True})

            success, msg = manager.approve_review_packet(
                request_id=req_id,
                match_turtle_id=turtle_id,
                replace_reference=upgrade_reference
            )

            if success:
                messagebox.showinfo("Success", f"Done: {msg}")
                self.top.destroy()
            else:
                messagebox.showerror("Error", msg)


class AdminDashboard:
    def __init__(self, root):
        self.root = root
        self.root.title("🐢 Turtle Project Admin Dashboard")
        self.root.geometry("600x500")
        self.root.configure(bg="#f0f0f0")

        # HEADER
        header = tk.Label(root, text="TurtleVision ID System", font=("Arial", 18, "bold"), bg="#f0f0f0", fg="#2c3e50")
        header.pack(pady=20)

        sub_header = tk.Label(root, text="Powered by SuperPoint + LightGlue", font=("Arial", 10), bg="#f0f0f0",
                              fg="#7f8c8d")
        sub_header.pack(pady=(0, 20))

        # ACTIONS
        frame_actions = tk.LabelFrame(root, text="Actions", font=("Arial", 10, "bold"), bg="white", padx=10, pady=10)
        frame_actions.pack(fill="both", expand=True, padx=20, pady=10)

        btn_bulk = tk.Button(frame_actions, text="📂 Bulk Ingest (Flash Drive)",
                             command=self.command_bulk_ingest,
                             bg="#3498db", fg="white", font=("Arial", 11), height=2)
        btn_bulk.pack(fill="x", pady=5)

        btn_identify = tk.Button(frame_actions, text="🔍 Identify & Add Observation",
                                 command=self.open_identify_window,
                                 bg="#9b59b6", fg="white", font=("Arial", 11), height=2)
        btn_identify.pack(fill="x", pady=5)

        btn_manual = tk.Button(frame_actions, text="➕ Manual Upload (New Turtle)",
                               command=self.open_manual_upload_window,
                               bg="#2ecc71", fg="white", font=("Arial", 11), height=2)
        btn_manual.pack(fill="x", pady=5)

        # STATUS
        self.status_var = tk.StringVar()
        self.status_var.set("System Ready")
        tk.Label(root, textvariable=self.status_var, bd=1, relief=tk.SUNKEN, anchor=tk.W).pack(side=tk.BOTTOM,
                                                                                               fill=tk.X)

    def command_bulk_ingest(self):
        drive_path = filedialog.askdirectory(title="Select Flash Drive Root")
        if drive_path:
            self.status_var.set("Ingesting... Check Console.")
            self.root.update()
            manager.ingest_flash_drive(drive_path)
            messagebox.showinfo("Done", "Ingest Complete")
            self.status_var.set("Ready")

    def open_identify_window(self):
        IdentifyWindow(self.root)

    def open_manual_upload_window(self):
        messagebox.showinfo("Info", "Feature coming soon. Use Identify Window for now.")


if __name__ == "__main__":
    root = tk.Tk()
    app = AdminDashboard(root)
    root.mainloop()