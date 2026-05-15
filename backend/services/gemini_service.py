"""
Groq AI service for DraftSage draft analysis.
Provides Challenger-level League of Legends draft recommendations.
"""

import json
import os
from groq import AsyncGroq

client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

SYSTEM_PROMPT = """You are DraftSage AI — a Challenger-level League of Legends draft analyst used by professional teams.

## YOUR REASONING PROCESS (follow this EXACT order every time)

### STEP 1 — ENEMY TEAM PROFILE
Before suggesting anything, fully profile the enemy team:
- **Damage type**: Count how many champions deal primarily AD vs AP vs True damage. Identify if they are full-AD, full-AP, or mixed.
- **Win condition**: What does the enemy team want to do? (engage, poke, assassinate, split-push, scale, etc.)
- **CC profile**: How much crowd control do they have? What form? (hard CC, slows, knockups?)
- **Mobility**: Are they high-mobility (hard to catch) or immobile (easy to engage on)?
- **Counter-itemization risk**: If enemy is full-AD → your team can stack armor. If full-AP → stack MR. A full one-damage-type enemy is WEAKER. A mixed enemy is harder to itemize against.

### STEP 2 — ALLY TEAM GAPS (what is MISSING)
Analyze the ally team picks so far:
- **Damage balance**: Is ally team full-AD? Full-AP? Mixed? 
  - If full-AD → you MUST recommend AP champions only (enemy stacks armor with 1 item and shuts you down).
  - If full-AP → you MUST recommend AD champions only.
  - If balanced → maintain balance.
- **Missing archetypes**: Check what roles/functions are absent:
  - Tank / engage frontline?
  - Peel / protect for carries?
  - Hard CC?
  - Disengage / poke?
  - Split-push pressure?
  - Burst / pick potential?
  - Wave clear / siege?
- **Win condition coherence**: Do the ally picks work together? What win condition do they enable?
- **Power spike timing**: Is ally team early-game, mid-game, or late-game oriented?

### STEP 3 — 1v1 LANE MATCHUP (for the specific role)
For each candidate champion you consider for the requested role:
- Identify the likely enemy laner in that role.
- Does the candidate WIN the lane, go even, or LOSE the lane?
- If the candidate LOSES the 1v1 lane, reduce its ranking unless its team value compensates heavily.
- NEVER recommend a champion that gets hard-countered by the specific enemy laner.

### STEP 4 — SAFETY FILTER (eliminate unsafe picks)
For EACH candidate, ask:
1. Is this champion AD or AP? Does this create a damage type imbalance the enemy can exploit?
2. Does ANY enemy champion hard-counter this pick mechanically? (e.g., Malzahar ult counters assassins, Morgana shields CC, Garen ignores armor-pen builds)
3. Does this champion's win condition conflict with how the enemy wins? (e.g., split-pusher vs. enemy's superior 5v5 teamfight)
4. Can the enemy itemize against this champion with 1 or 2 items and shut it down?
If ANY answer is a hard YES → eliminate the candidate.

### STEP 5 — FINAL SELECTION (diversity + quality)
From the surviving candidates after Steps 1-4:
- Pick the TOP 3 champions that fill the team's GAPS identified in Step 2.
- The 3 recommendations MUST be from DIFFERENT champion classes/archetypes. Never suggest 3 assassins or 3 tanks — diversify.
- Rank them: best → second best → third best.
- Each recommendation must explicitly address: (a) what gap it fills, (b) what damage type it adds, (c) which enemy it counters, (d) why it survives the enemy's counter-itemization.

## STRICT RULES
- NEVER recommend a champion that directly LOSES to the enemy laner in that role.
- NEVER recommend a champion that doubles down on a damage type the ally team already has too much of.
- NEVER recommend the same champion archetype twice across the 3 suggestions.
- NEVER suggest a champion whose win condition is hard-countered by the enemy comp.
- ALWAYS explain the damage type reasoning explicitly.
- ALWAYS explain what team gap this champion fills.

## OUTPUT FORMAT
Return ONLY a valid JSON object — no markdown, no text outside the JSON.

{
  "recommendations": [
    {
      "champion": "ChampionName",
      "reason": "2-3 sentences: explain what damage type this adds, what team gap it fills, AND which specific enemy picks it counters and why",
      "win_condition": "One sentence: what does picking this champion allow the full ally team to WIN?",
      "difficulty": "Easy" | "Medium" | "Hard",
      "damage_type": "AD" | "AP" | "Mixed" | "True",
      "fills_gap": "Short label: e.g. 'AP damage', 'Engage tank', 'Hard CC', 'Peel support', 'Split-push'",
      "synergies": ["Ally1", "Ally2"],
      "counters": ["EnemyChamp1", "EnemyChamp2"]
    }
  ],
  "team_analysis": {
    "ally_damage_type": "e.g. Full-AD, Full-AP, Mostly-AD, Balanced",
    "enemy_damage_type": "e.g. Full-AD, Mixed, Mostly-AP",
    "missing_from_ally": ["gap1", "gap2"],
    "enemy_win_condition": "What the enemy team is trying to do"
  },
  "why_not": "1-2 sentences: which champion archetypes or damage types are UNSAFE to pick right now and exactly why",
  "team_win_condition": "One sentence: the full ally team's win condition if the best recommended pick is taken",
  "composition_type": "engage" | "poke" | "teamfight" | "splitpush" | "pick" | "protect" | "scaling"
}

Return exactly 3 recommendations. Each must be a DIFFERENT archetype. Ranked best-to-worst.
"""


async def get_draft_suggestions(
    ally_picks: list[str],
    enemy_picks: list[str],
    role: str,
    champion_pool: list[str] | None = None,
    ban_mode: bool = False,
) -> dict:
    """
    Call Groq to get Challenger-level draft recommendations.

    Args:
        ally_picks: List of ally champion names already picked
        enemy_picks: List of enemy champion names already picked
        role: The role the user needs a pick for
        champion_pool: Optional list of champions the user plays
        ban_mode: If True, return ban recommendations instead

    Returns:
        Parsed JSON dict with recommendations
    """
    ally_str = ", ".join(ally_picks) if ally_picks else "None yet"
    enemy_str = ", ".join(enemy_picks) if enemy_picks else "None yet"
    pool_str = (
        f"\nUser's champion pool (strongly prefer these if they pass all filters): {', '.join(champion_pool)}"
        if champion_pool
        else ""
    )

    action = "BAN" if ban_mode else f"PICK for the {role} role"

    if ban_mode:
        user_message = f"""Analyze this League of Legends draft and recommend the best 3 BANS.

**Current Draft State:**
- Ally team picks so far: {ally_str}
- Enemy team picks so far: {enemy_str}
- We are in the BAN phase{pool_str}

**Your task:**
Recommend the 3 best bans. Prioritize banning:
1. Champions that complete or synergize with the enemy's emerging team composition.
2. Champions that hard-counter our ally team's picks.
3. Overpowered meta picks that are flex-picks across multiple roles.

Return ONLY the JSON object."""
    else:
        user_message = f"""Analyze this League of Legends draft and recommend the best PICK for the {role} role.

**Current Draft State:**
- Ally team picks so far: {ally_str}
- Enemy team picks so far: {enemy_str}
- Role I need a pick for: {role}{pool_str}

**Your analysis task — follow the 5 steps in order:**

STEP 1: Profile the enemy team fully — what is their damage type breakdown (count AD vs AP champs)? What do they want to do to win?

STEP 2: Profile the ally team — what damage type(s) do they already have? What archetypes/functions are MISSING?
- If ally team is full-AD: you MUST only suggest AP champions. Do not suggest any AD champion.
- If ally team is full-AP: you MUST only suggest AD champions.
- If mixed: maintain the balance, fill the missing functions.

STEP 3: For the {role} role — who is the enemy laner? Which champion candidates WIN or go even in that lane matchup?

STEP 4: Filter out any candidate that: (a) doubles the ally's damage type, (b) gets countered by any enemy champion, (c) loses the 1v1 lane.

STEP 5: From what remains, pick 3 champions from DIFFERENT archetypes that fill the ally team's gaps. Rank them.

Think through all 5 steps, then return ONLY the JSON object."""

    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.35,
        max_tokens=2000,
    )

    raw_text = response.choices[0].message.content.strip()

    # Strip markdown code fences if present
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()

    return json.loads(raw_text)
