from typing import Callable, Dict, List, Tuple, Optional

from rules import rule_definitions


# Fix: Auto-register every rule function declared in rule_definitions
# (convention: function name ends with '_rule').
ALL_RULES: List[Callable[[Dict], Optional[Dict]]] = [
    func
    for name, func in vars(rule_definitions).items()
    if callable(func) and name.endswith("_rule")
]


def evaluate_rules(data: Dict) -> Tuple[List[str], List[str]]:
    warnings: List[str] = []
    suggestions: List[str] = []

    # Fix: iterate over registered rules and collect warning/suggestion outputs.
    for rule in ALL_RULES:
        result = rule(data)
        if result:
            warning = result.get("warning")
            suggestion = result.get("suggestion")

            if warning:
                warnings.append(warning)
            if suggestion:
                suggestions.append(suggestion)

    return warnings, suggestions
