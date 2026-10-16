"""Focused tests for Navis Layer 2's deterministic tools."""
import unittest

from app.main import (
    CalculatorError,
    TOOL_REGISTRY,
    calculate,
    calculator_expression_from_question,
    direct_calculator_reply,
    direct_india_clock_reply,
    run_registered_tool,
)


class CalculatorTests(unittest.TestCase):
    def test_basic_arithmetic(self):
        self.assertEqual(calculate("2 + 2"), "2 + 2 = 4")
        self.assertEqual(calculate("23 * 7"), "23 * 7 = 161")
        self.assertEqual(calculate("(10 - 4) / 2"), "(10 - 4) / 2 = 3")

    def test_percent_of(self):
        self.assertEqual(direct_calculator_reply("calculate 15% of 200"), "(15/100)*(200) = 30")

    def test_natural_language_is_not_misrouted(self):
        self.assertIsNone(calculator_expression_from_question("What is recursion?"))
        self.assertIsNone(direct_calculator_reply("Tell me a joke"))

    def test_division_by_zero_is_rejected(self):
        with self.assertRaises(CalculatorError):
            calculate("1 / 0")

    def test_python_expressions_are_rejected(self):
        with self.assertRaises(CalculatorError):
            calculate("__import__('os').system('whoami')")


class ToolRegistryTests(unittest.TestCase):
    def test_registered_tools(self):
        self.assertIn("india_time", TOOL_REGISTRY)
        self.assertIn("calculator", TOOL_REGISTRY)
        self.assertEqual(run_registered_tool("calculator", {"expression": "6 * 7"})["result"], "6 * 7 = 42")
        self.assertIn("iso_datetime", run_registered_tool("india_time"))

    def test_clock_question_is_deterministic(self):
        reply = direct_india_clock_reply("What's the current date and time in India?")
        self.assertIsNotNone(reply)
        self.assertIn("Asia/Kolkata", reply)

    def test_unknown_tool_is_rejected(self):
        with self.assertRaises(ValueError):
            run_registered_tool("delete_everything", {})


if __name__ == "__main__":
    unittest.main()
