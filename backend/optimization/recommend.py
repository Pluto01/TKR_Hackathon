def recommend_actions(reasons):
    actions = []

    for reason in reasons:
        if "receivables" in reason.lower():
            actions.append("Improve customer payment collection cycle")
        elif "emi" in reason.lower():
            actions.append("Explore loan restructuring or EMI reduction")
        elif "cash" in reason.lower():
            actions.append("Reduce discretionary operating expenses")

    # Remove duplicates and limit to top 3
    return list(dict.fromkeys(actions))[:3]