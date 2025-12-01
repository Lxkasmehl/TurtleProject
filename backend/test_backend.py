# test_backend.py
import os
from pathlib import Path

import numpy as np
import cv2 as cv
import pytest

import image_processing
import search_utils
import vlad_utils
import turtle_manager


# ---------- IMAGE PROCESSING TESTS ----------

def test_process_image_through_SIFT_success(tmp_path):
    # create a small noisy image so SIFT finds keypoints
    img_path = tmp_path / "test.jpg"
    img = (np.random.rand(80, 80) * 255).astype("uint8")
    cv.imwrite(str(img_path), img)

    npz_path = tmp_path / "test.npz"

    ok, desc = image_processing.process_image_through_SIFT(
        str(img_path), str(npz_path)
    )

    assert ok is True
    assert desc is not None
    assert npz_path.exists()

    data = np.load(npz_path, allow_pickle=True)
    assert "keypoints" in data
    assert "descriptors" in data


def test_process_image_through_SIFT_missing_image(tmp_path):
    missing_path = tmp_path / "nope.jpg"
    npz_path = tmp_path / "out.npz"

    ok, desc = image_processing.process_image_through_SIFT(
        str(missing_path), str(npz_path)
    )

    assert ok is False
    assert desc is None
    assert not npz_path.exists()


def test_SIFT_from_file_success_and_error(tmp_path):
    # valid npz
    kp_array = np.array(
        [((10.0, 20.0), 5.0, 0.0, 1.0, 0, -1)],
        dtype=object,
    )
    descriptors = np.random.rand(1, 128).astype("float32")
    good_npz = tmp_path / "good.npz"
    np.savez(good_npz, keypoints=kp_array, descriptors=descriptors)

    _, kps, desc_out, name = image_processing.SIFT_from_file(str(good_npz))
    assert name == "good.npz"
    assert len(kps) == 1
    assert desc_out.shape == descriptors.shape

    # corrupt npz triggers error path
    bad_npz = tmp_path / "bad.npz"
    bad_npz.write_text("not a real npz")

    _, kps_bad, desc_bad, name_bad = image_processing.SIFT_from_file(str(bad_npz))
    assert name_bad == "bad.npz"
    assert kps_bad == []
    assert desc_bad is None


# ---------- SEARCH UTILS + FAISS TESTS ----------

def test_run_initial_dbscan_labels_shape():
    data = np.vstack(
        [np.random.randn(10, 8) * 0.1, 5 + np.random.randn(10, 8) * 0.1]
    )
    labels = search_utils.run_initial_dbscan(data, eps=0.5, min_samples=3)
    assert labels.shape[0] == data.shape[0]
    # should have at least two clusters (some noise is OK)
    assert len(set(labels)) >= 2


def test_initialize_faiss_index_and_search():
    db = np.random.rand(5, 16).astype("float32")
    index = search_utils.initialize_faiss_index(db)

    q = db[0]  # exact vector should give distance 0
    dists, idxs = search_utils.faiss_search_k_neighbors(index, q, k=3)

    assert idxs[0] == 0
    assert pytest.approx(dists[0], abs=1e-6) == 0.0


def test_add_new_turtle_image_to_index_duplicate_and_new():
    db = np.random.rand(3, 8).astype("float32")
    index = search_utils.initialize_faiss_index(db)

    # duplicate branch
    duplicate = db[1].copy()
    added = search_utils.add_new_turtle_image_to_index(index, duplicate)
    assert added is False

    # new vector branch
    new_vec = (db.max(axis=0) + 10).astype("float32")
    added2 = search_utils.add_new_turtle_image_to_index(index, new_vec)
    assert added2 is True
    assert index.ntotal == 4  # original 3 + 1 new


def test_filtered_faiss_search_empty_and_nonempty():
    q = np.array([1.0, 0.0], dtype="float32")

    # empty subset
    empty_vecs = np.zeros((0, 2), dtype="float32")
    empty_idx = np.array([], dtype="int64")
    ids, dists = search_utils.filtered_faiss_search(q, empty_vecs, empty_idx)
    assert ids == []
    assert dists.size == 0

    # non-empty subset, include query itself
    subset_vecs = np.array(
        [
            [1.0, 0.0],  # same as query -> filtered out
            [2.0, 0.0],
            [3.0, 0.0],
        ],
        dtype="float32",
    )
    subset_idx = np.array([10, 11, 12], dtype="int64")
    ids2, dists2 = search_utils.filtered_faiss_search(q, subset_vecs, subset_idx, n_results=3)

    # query itself (distance 0) removed, so result IDs must not contain 10
    assert 10 not in ids2
    assert set(ids2).issubset({11, 12})
    assert (dists2 > 0).all()


# ---------- VLAD UTILS TEST ----------

def test_build_vocabulary_and_compute_vlad_normalized():
    descriptors = np.random.rand(100, 32).astype("float32")
    kmeans = vlad_utils.build_vocabulary(descriptors, num_clusters=4)

    vlad = vlad_utils.compute_vlad(descriptors[:20], kmeans)
    assert vlad.ndim == 1
    # L2 norm should be ~1
    norm = np.linalg.norm(vlad)
    assert pytest.approx(norm, rel=1e-3) == 1.0


# ---------- TURTLE MANAGER TESTS ----------

def test_turtle_manager_locations_and_create_new_location(tmp_path, monkeypatch):
    # avoid heavy FAISS rebuild
    monkeypatch.setattr(turtle_manager, "load_or_generate_persistent_data", lambda *_: True)

    # use a temporary data directory and give its absolute path to TurtleManager
    base = tmp_path / "data"
    (base / "Kansas" / "SiteA").mkdir(parents=True, exist_ok=True)
    (base / "Kansas" / "SiteB").mkdir(parents=True, exist_ok=True)

    mgr = turtle_manager.TurtleManager(base_data_dir=str(base))

    locs = mgr.get_all_locations()

    # should have at least our two state/location combos
    assert "Kansas/SiteA" in locs
    assert "Kansas/SiteB" in locs
    # and the two special roots
    assert "Incidental_Finds" in locs
    assert "Community_Uploads" in locs

    # create_new_location should be idempotent
    path1 = mgr.create_new_location("Nebraska", "Field1")
    path2 = mgr.create_new_location("Nebraska", "Field1")
    assert path1 == path2
    assert os.path.isdir(path1)


def test_turtle_manager_process_single_and_review_flow(tmp_path, monkeypatch):
    # patch heavy back-end pieces
    monkeypatch.setattr(turtle_manager, "load_or_generate_persistent_data", lambda *_: True)

    # pretend SIFT always succeeds and writes an npz
    def fake_process_image(src, dest):
        np.savez(dest, keypoints=np.empty((0,), dtype=object),
                 descriptors=np.ones((1, 128), dtype="float32"))
        return True, np.ones((1, 128), dtype="float32")

    monkeypatch.setattr(turtle_manager, "process_image_through_SIFT", fake_process_image)

    # temp data tree under a temp base dir
    base = tmp_path / "data"
    ref_dir = base / "Kansas" / "SiteA" / "T001" / "ref_data"
    ref_dir.mkdir(parents=True, exist_ok=True)
    candidate_npz = ref_dir / "T001.npz"
    candidate_jpg = ref_dir / "T001.jpg"
    candidate_jpg.write_bytes(b"dummy")  # image placeholder

    # smart_search returns one fake candidate that points to our npz
    def fake_search(img_path, location_filter=None, k_results=5):
        return [
            {
                "filename": "T001.npz",
                "file_path": str(candidate_npz),
                "site_id": "T001",
                "distance": 0.1,
                "location": "Kansas/SiteA",
            }
        ]

    monkeypatch.setattr(turtle_manager, "smart_search", fake_search)

    mgr = turtle_manager.TurtleManager(base_data_dir=str(base))

    # test _process_single_turtle both created and skipped
    src_img = tmp_path / "source.jpg"
    src_img.write_bytes(b"img")
    loc_dir = base / "Kansas" / "SiteA"
    status1 = mgr._process_single_turtle(str(src_img), str(loc_dir), "X001")
    assert status1 == "created"
    status2 = mgr._process_single_turtle(str(src_img), str(loc_dir), "X001")
    assert status2 == "skipped"

    # handle_community_upload + create_review_packet + approve_review_packet
    comm_img = tmp_path / "community.jpg"
    comm_img.write_bytes(b"img2")
    mgr.handle_community_upload(str(comm_img), finder_name="Tester")

    queue = mgr.get_review_queue()
    assert len(queue) == 1
    req_id = queue[0]["request_id"]

    ok, msg = mgr.approve_review_packet(req_id, match_turtle_id="T001", new_location=None)
    assert ok is True
    assert "Processed" in msg
    # packet folder should be gone
    assert not os.path.exists(os.path.join(mgr.review_queue_dir, req_id))
