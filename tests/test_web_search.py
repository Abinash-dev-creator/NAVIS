"""Unit tests for Navis's web-search routing and result validation."""
import unittest

from app.main import (
    TOOL_REGISTRY,
    _normalize_search_results,
    web_search_query_from_question,
)


class WebSearchRoutingTests(unittest.TestCase):
    def test_explicit_web_search(self):
        self.assertEqual(
            web_search_query_from_question("Search the web for recent AI agent news"),
            "recent AI agent news",
        )
        self.assertEqual(
            web_search_query_from_question("look up Python 3.14 release notes online"),
            "Python 3.14 release notes online",
        )

    def test_freshness_sensitive_questions(self):
        self.assertEqual(
            web_search_query_from_question("What is the latest Python version?"),
            "What is the latest Python version?",
        )
        self.assertEqual(
            web_search_query_from_question("current price of bitcoin"),
            "current price of bitcoin",
        )

    def test_normal_questions_are_not_misrouted(self):
        self.assertIsNone(web_search_query_from_question("Explain recursion in Python"))
        self.assertIsNone(web_search_query_from_question("Tell me a joke"))

    def test_results_filter_bad_urls_and_duplicates(self):
        results = _normalize_search_results([
            {"title": "Good", "href": "https://example.com/a", "body": "Snippet"},
            {"title": "Bad scheme", "href": "javascript:alert(1)", "body": "bad"},
            {"title": "Duplicate", "href": "https://example.com/a", "body": "duplicate"},
            {"title": "Also good", "href": "http://example.org", "body": "Other"},
        ])
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]["title"], "Good")
        self.assertEqual(results[1]["url"], "http://example.org")

    def test_web_search_registered(self):
        self.assertIn("web_search", TOOL_REGISTRY)
        self.assertIn("query", TOOL_REGISTRY["web_search"]["parameters"])


if __name__ == "__main__":
    unittest.main()
