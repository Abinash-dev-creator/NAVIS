"""Small smoke checks for the Navis app. Run with: python -m unittest discover -s tests"""
import unittest
from app.main import app


class AppSmokeTests(unittest.TestCase):
    def test_app_metadata(self):
        self.assertEqual(app.title, "Navis")
        self.assertEqual(app.version, "0.1.0")


if __name__ == "__main__":
    unittest.main()
