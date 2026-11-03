"""Local Python/NumPy/Pillow regression tests; no CI dependency installation."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

import numpy as np
from PIL import Image

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/review-pit-native-borders-v109.py'
SPEC = importlib.util.spec_from_file_location('pit_native_borders_v109', SCRIPT)
AUDIT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUDIT)


class SpatialCoreDifferenceTests(unittest.TestCase):
    def test_equal_counts_cannot_hide_foreign_pixels_after_original_pixels_are_lost(self):
        alpha = np.zeros((8, 12), dtype=np.uint8)
        alpha[3, [2, 5, 8]] = 255
        old = [1, 1, 6, 5]
        candidate = [4, 2, 6, 3]
        old_count = np.count_nonzero(alpha[1:6, 1:7] > 16)
        candidate_count = np.count_nonzero(alpha[2:5, 4:10] > 16)
        self.assertEqual(candidate_count - old_count, 0, 'the previous net count misses the added pixel')
        self.assertEqual(AUDIT.count_added_core_pixels(alpha, old, candidate), 1)
        self.assertEqual(AUDIT.count_added_core_pixels(alpha, candidate, old), 1)

    def test_transparent_expansion_and_original_core_do_not_count_as_additions(self):
        alpha = np.zeros((7, 7), dtype=np.uint8)
        alpha[3, 3] = 255
        self.assertEqual(AUDIT.count_added_core_pixels(alpha, [2, 2, 3, 3], [1, 1, 5, 5]), 0)
        self.assertEqual(AUDIT.count_added_core_pixels(alpha, [2, 2, 3, 3], [2, 2, 3, 3]), 0)

    def test_loss_alone_never_becomes_a_negative_addition(self):
        alpha = np.zeros((7, 7), dtype=np.uint8)
        alpha[2, 2] = alpha[4, 4] = 255
        self.assertEqual(AUDIT.count_added_core_pixels(alpha, [1, 1, 5, 5], [1, 1, 3, 3]), 0)

    def test_threshold_is_strictly_above16_and_rectangles_use_half_open_edges(self):
        alpha = np.zeros((7, 8), dtype=np.uint8)
        alpha[2, 2] = 255  # Last column inside the original rectangle.
        alpha[2, 3] = 16   # First column outside; below the strict core threshold.
        alpha[3, 3] = 17   # Outside both the right and bottom original bounds.
        alpha[1, 1] = 18   # Original top/left corner is still inside.
        self.assertEqual(AUDIT.count_added_core_pixels(alpha, [1, 1, 2, 2], [0, 0, 5, 5]), 1)

    def test_disjoint_visible_candidate_counts_every_added_core_pixel(self):
        alpha = np.zeros((8, 8), dtype=np.uint8)
        alpha[1, 1] = 255
        alpha[5, 5:7] = [17, 255]
        self.assertEqual(AUDIT.count_added_core_pixels(alpha, [0, 0, 3, 3], [4, 4, 4, 4]), 2)

    def test_cli_strict_rejects_compensation_even_with_a_transparent_candidate_border(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            rgba = np.zeros((8, 12, 4), dtype=np.uint8)
            rgba[3, [2, 5, 8]] = [220, 110, 40, 255]
            rgba[3, [6, 7], 3] = 1  # Native faint bridge expands the UV to the foreign body.
            image_path = root / 'synthetic-compensation.png'
            Image.fromarray(rgba).save(image_path)
            original_bytes = image_path.read_bytes()
            delivery_path, report_path = root / 'delivery.json', root / 'report.json'
            delivery_path.write_text(json.dumps({'groups': [{
                'fighterId': 'feral-hunter', 'role': 'attacker', 'facing': 'right',
                'pages': [{'pageId': 'synthetic', 'path': str(image_path),
                           'sha256': hashlib.sha256(original_bytes).hexdigest(),
                           'bytes': len(original_bytes), 'width': 12, 'height': 8}],
                'frames': [{'index': 0, 'pageId': 'synthetic', 'rect': [1, 1, 6, 5],
                            'visibleBodyBox': [5, 3, 5, 3], 'otherPosePixelsAboveAlpha16': 0}],
            }]}))
            result = subprocess.run([sys.executable, str(SCRIPT), '--delivery', str(delivery_path),
                                     '--output', str(report_path), '--strict'], capture_output=True, text=True)
            self.assertEqual(result.returncode, 1, result.stderr)
            report = json.loads(report_path.read_text())
            slot = report['slots'][0]
            self.assertEqual(slot['zeroBorderCandidate'], [4, 2, 6, 3])
            self.assertEqual(slot['boundaryMaxAlpha'], 0)
            self.assertEqual(slot['addedForeignCorePixels'], 1)
            self.assertEqual(slot['removedOriginalCorePixels'], 1)
            self.assertFalse(slot['valid'])
            self.assertEqual(report['pendingNativeReplacements'], 1)
            self.assertEqual(image_path.read_bytes(), original_bytes)


if __name__ == '__main__':
    unittest.main()
