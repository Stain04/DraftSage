"""
Groq AI service for DraftSage draft analysis.
Provides Challenger-level League of Legends draft recommendations.
"""

import json
import os
from groq import AsyncGroq

client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

SYSTEM_PROMPT = """You are DraftSage AI — an elite League of Legends draft analyst at the Challenger level.

## PRIME DIRECTIVE
Your #1 job is to recommend champions that COUNTER THE ENEMY TEAM. Every recommendation must survive the question: "Does the enemy draft beat this pick?" If yes, do NOT recommend it.

## STRICT DO-NOT RULES (apply these before anything else)
- NEVER recommend a champion that is directly countered by an existing enemy pick.
  Before suggesting any champion, explicitly verify it is not soft-countered or hard-countered by ANY champion already on the enemy team.
- NEVER recommend champions that lose the 1v1 in lane against the enemy laner already picked for that role.
- NEVER recommend champions whose win condition is neutralized by the enemy's existing comp.

## DECISION PRIORITY ORDER
1. **Counter-pick first** — does this champion have a direct mechanical advantage over the enemy laner or team comp?
2. **Damage type balance** — does the ally team need AP or AD? Do not double up on a damage type the enemy can itemize against with one item.
3. **Win condition compatibility** — does this champion enable the ally team's win condition or create a new one?
4. **Power spike timing** — does this champion's peak timing exploit when the enemy is weakest?
5. **Synergies** — does this champion combo with existing ally picks?
6. **Meta strength** — is this champion currently strong in high-elo or competitive?

## COUNTER-PICK KNOWLEDGE (apply rigorously to EVERY enemy champion present)
For EACH enemy champion in the draft, reason through:
- What champion archetypes does this enemy pick exploit or destroy?
- What mobility, CC, or ability pattern does this enemy champion rely on?
- Which ally candidates would lose lane or lose teamfights specifically because of this enemy champion?
Eliminate any candidate that is vulnerable to even ONE enemy champion before recommending it.

## OUTPUT FORMAT
Return ONLY a valid JSON object — no markdown, no explanation outside the JSON.

{
  "recommendations": [
    {
      "champion": "ChampionName",
      "reason": "2-3 sentences: WHY this champion counters the specific enemy picks listed, with explicit matchup reasoning",
      "win_condition": "One sentence: what does picking this champion allow the ally team to WIN?",
      "difficulty": "Easy" | "Medium" | "Hard",
      "synergies": ["Ally1", "Ally2"],
      "counters": ["EnemyChamp1", "EnemyChamp2"]
    }
  ],
  "why_not": "1-2 sentences: which champion archetypes are UNSAFE to pick here because the enemy counters them, and exactly why",
  "team_win_condition": "One sentence: the full ally team's win condition assuming this pick is made",
  "composition_type": "engage" | "poke" | "teamfight" | "splitpush" | "pick" | "protect"
}

Return exactly 3 recommendations, ranked best-to-worst. Every recommendation MUST explicitly explain which enemy champion(s) it counters or neutralizes.
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
        f"\nUser's champion pool (prioritize these if strong): {', '.join(champion_pool)}"
        if champion_pool
        else ""
    )

    action = "BAN" if ban_mode else f"PICK for the {role} role"

    user_message = f"""Analyze this League of Legends draft and recommend the best {action}.

**Current Draft State:**
- Ally team picks so far: {ally_str}
- Enemy team picks so far: {enemy_str}
- Role I need a pick for: {role}{pool_str}

**Your task:**
{'Recommend the 3 best BANS. Focus on banning champions that complete the enemy team comp or are overpowered in the current meta.' if ban_mode else f'''Recommend the top 3 champions I should PICK for {role}.

CRITICAL REQUIREMENTS:
1. Each recommended champion must have a CLEAR mechanical or strategic advantage over at least one enemy pick already chosen.
2. Before recommending any champion, ask yourself: "Does ANY enemy pick ({enemy_str}) counter this champion mechanically or strategically?" If yes, do NOT recommend it.
3. Evaluate every enemy champion individually — consider their kit, win conditions, and what champion archetypes they exploit — then eliminate candidates that are vulnerable.
4. Explain explicitly which enemy champion(s) each recommendation counters or neutralizes, and why it is safe against the rest of the enemy team.'''}

Think step by step: first analyze what the enemy team does, then eliminate champions the enemy beats, then choose from what remains. Return ONLY the JSON object."""

    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.3,
        max_tokens=1500,
    )

    raw_text = response.choices[0].message.content.strip()

    # Strip markdown code fences if present
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()

    return json.loads(raw_text)
