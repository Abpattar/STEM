import json
import math
import copy
from pathlib import Path

def generate_math_gestures():
    src_path = Path("/home/neo/Codes/MathEnvi/MathAI/frontend/public/models/sixth-sense/preset-references.json")
    with open(src_path, "r") as f:
        data = json.load(f)

    # Base templates from recorded signs
    take_1 = data["1"][0]  # Single pointing index finger
    take_2 = data["2"][0]  # Two fingers (V / 2)
    take_3 = data["3"][0]  # Three fingers
    take_5 = data["5"][0]  # Flat open hand
    take_O = data["O"][0]  # Circle with thumb and index
    take_plus = data["PLUS"][0]
    take_minus = data["MINUS"][0]
    take_equals = data["EQUALS"][0]

    def make_take(right_frames=None, left_frames=None, meta_right=True, meta_left=False):
        num_frames = 16
        frames = []
        base_pose = take_1["frames"][0]["pose"]

        for i in range(num_frames):
            frame = {
                "pose": copy.deepcopy(base_pose),
                "right": None,
                "left": None,
                "face": None
            }
            if meta_right and right_frames:
                r_idx = min(i, len(right_frames) - 1)
                frame["right"] = copy.deepcopy(right_frames[r_idx])
            if meta_left and left_frames:
                l_idx = min(i, len(left_frames) - 1)
                frame["left"] = copy.deepcopy(left_frames[l_idx])
            frames.append(frame)

        return [{
            "meta": {
                "right": meta_right,
                "left": meta_left,
                "face": False
            },
            "frames": frames
        }]

    # 1. SQRT (√) - Tracing radical hook and horizontal roof
    # Uses pointing index finger moving: hook down, rise up, sweep right across
    sqrt_right = []
    base_finger = copy.deepcopy(take_1["frames"][0]["right"])
    for i in range(16):
        f = copy.deepcopy(base_finger)
        t = i / 15.0
        if t < 0.3:
            # Hook down
            prog = t / 0.3
            dx = -0.3 + 0.1 * prog
            dy = -0.2 - 0.3 * prog
        elif t < 0.6:
            # Rise up
            prog = (t - 0.3) / 0.3
            dx = -0.2 + 0.3 * prog
            dy = -0.5 + 0.9 * prog
        else:
            # Horizontal roof sweep right
            prog = (t - 0.6) / 0.4
            dx = 0.1 + 0.7 * prog
            dy = 0.4 + 0.05 * math.sin(prog * math.pi)
        
        # Apply translation to all 21 points
        for p in range(21):
            f[p * 3] += dx
            f[p * 3 + 1] += dy
        sqrt_right.append(f)
    take_sqrt = make_take(right_frames=sqrt_right, meta_right=True, meta_left=False)

    # 2. CUBED (^3) - 3 extended fingers elevating upward into superscript position
    cubed_right = []
    base_3 = copy.deepcopy(take_3["frames"][0]["right"])
    for i in range(16):
        f = copy.deepcopy(base_3)
        t = i / 15.0
        dy = 0.5 * (1.0 - math.cos(t * math.pi)) / 2.0  # smooth elevation upward
        dx = 0.2 * t
        for p in range(21):
            f[p * 3] += dx
            f[p * 3 + 1] += dy
        cubed_right.append(f)
    take_cubed = make_take(right_frames=cubed_right, meta_right=True, meta_left=False)

    # 3. LESS_THAN (<) - Left hand acute angle pointing left
    lt_left = []
    base_lt = copy.deepcopy(take_1["frames"][0]["right"]) # mirrored to left
    for i in range(16):
        f = copy.deepcopy(base_lt)
        t = i / 15.0
        pulse = 0.08 * math.sin(t * math.pi * 2)
        for p in range(21):
            f[p * 3] = -(f[p * 3]) - 0.4 + pulse  # mirror x to left side
            f[p * 3 + 1] += 0.1
        lt_left.append(f)
    take_lt = make_take(left_frames=lt_left, meta_right=False, meta_left=True)

    # 4. GREATER_THAN (>) - Right hand acute angle pointing right
    gt_right = []
    base_gt = copy.deepcopy(take_1["frames"][0]["right"])
    for i in range(16):
        f = copy.deepcopy(base_gt)
        t = i / 15.0
        pulse = 0.08 * math.sin(t * math.pi * 2)
        for p in range(21):
            f[p * 3] += 0.4 + pulse
            f[p * 3 + 1] += 0.1
        gt_right.append(f)
    take_gt = make_take(right_frames=gt_right, meta_right=True, meta_left=False)

    # 5. LESS_EQUAL (<=) - Acute angle left + horizontal bar underneath
    le_left = copy.deepcopy(lt_left)
    le_right = []
    base_bar = copy.deepcopy(take_minus["frames"][0]["right"])
    for i in range(16):
        f = copy.deepcopy(base_bar)
        for p in range(21):
            f[p * 3 + 1] -= 0.35  # lower bar
        le_right.append(f)
    take_le = make_take(right_frames=le_right, left_frames=le_left, meta_right=True, meta_left=True)

    # 6. GREATER_EQUAL (>=) - Acute angle right + horizontal bar underneath
    ge_right = copy.deepcopy(gt_right)
    ge_left = []
    for i in range(16):
        f = copy.deepcopy(base_bar)
        for p in range(21):
            f[p * 3] = -f[p * 3]
            f[p * 3 + 1] -= 0.35
        ge_left.append(f)
    take_ge = make_take(right_frames=ge_right, left_frames=ge_left, meta_right=True, meta_left=True)

    # 7. PLUS_MINUS (±) - Dynamic transition from plus to minus
    pm_right = []
    pm_left = []
    for i in range(16):
        if i < 8:
            # Plus gesture
            f_r = copy.deepcopy(take_plus["frames"][i]["right"])
            f_l = copy.deepcopy(take_plus["frames"][i]["left"])
        else:
            # Transition to horizontal minus
            f_r = copy.deepcopy(take_minus["frames"][i]["right"])
            # Left hand withdraws
            f_l = copy.deepcopy(take_minus["frames"][0]["right"])
            fade = (i - 8) / 7.0
            for p in range(21):
                f_l[p * 3] = -0.5 - 0.4 * fade
                f_l[p * 3 + 1] = -0.8 - 0.4 * fade
        pm_right.append(f_r)
        pm_left.append(f_l)
    take_pm = make_take(right_frames=pm_right, left_frames=pm_left, meta_right=True, meta_left=True)

    # 8. PI (π) - Horizontal beam with two vertical legs
    pi_left = []  # horizontal beam
    pi_right = [] # two vertical legs (index + middle)
    base_2 = copy.deepcopy(take_2["frames"][0]["right"])
    for i in range(16):
        # Beam (horizontal index finger)
        f_l = copy.deepcopy(base_bar)
        for p in range(21):
            f_l[p * 3] -= 0.1
            f_l[p * 3 + 1] += 0.2
        pi_left.append(f_l)

        # Legs (downward pointing two fingers)
        f_r = copy.deepcopy(base_2)
        for p in range(21):
            f_r[p * 3] += 0.15
            f_r[p * 3 + 1] -= 0.15  # beneath the beam
        pi_right.append(f_r)
    take_pi = make_take(right_frames=pi_right, left_frames=pi_left, meta_right=True, meta_left=True)

    # 9. DEGREES (°) - Small elevated circle in superscript zone
    deg_right = []
    base_O_pts = copy.deepcopy(take_O["frames"][0]["right"])
    for i in range(16):
        f = copy.deepcopy(base_O_pts)
        t = i / 15.0
        rot = 0.06 * math.sin(t * math.pi * 2)
        for p in range(21):
            f[p * 3] = f[p * 3] * 0.75 + 0.4 + rot  # scaled smaller + elevated
            f[p * 3 + 1] = f[p * 3 + 1] * 0.75 + 0.55
        deg_right.append(f)
    take_deg = make_take(right_frames=deg_right, meta_right=True, meta_left=False)

    # 10. PERCENT (%) - Diagonal slash + dot accents
    pct_right = []
    for i in range(16):
        f = copy.deepcopy(base_finger)
        t = i / 15.0
        # Slash top-right to bottom-left
        dx = 0.4 - 0.7 * t
        dy = 0.4 - 0.7 * t
        for p in range(21):
            f[p * 3] += dx
            f[p * 3 + 1] += dy
        pct_right.append(f)
    take_pct = make_take(right_frames=pct_right, meta_right=True, meta_left=False)

    # 11. QUESTION (?) - Tracing curve of ? with downward dot tap
    q_right = []
    for i in range(16):
        f = copy.deepcopy(base_finger)
        t = i / 15.0
        if t < 0.7:
            # Question mark arc
            angle = t * math.pi * 1.5
            dx = 0.2 * math.cos(angle)
            dy = 0.3 + 0.2 * math.sin(angle)
        else:
            # Dot tap
            dx = 0.0
            dy = -0.35 + 0.05 * math.sin((t - 0.7) / 0.3 * math.pi)
        for p in range(21):
            f[p * 3] += dx
            f[p * 3 + 1] += dy
        q_right.append(f)
    take_q = make_take(right_frames=q_right, meta_right=True, meta_left=False)

    # 12. COMMA (,) and SEMICOLON (;)
    comma_right = []
    for i in range(16):
        f = copy.deepcopy(base_finger)
        t = i / 15.0
        dx = -0.1 * math.sin(t * math.pi)
        dy = -0.4 - 0.2 * t
        for p in range(21):
            f[p * 3] += dx
            f[p * 3 + 1] += dy
        comma_right.append(f)
    take_comma = make_take(right_frames=comma_right, meta_right=True, meta_left=False)

    # 13. OR / Logical disjunction - alternating open palms
    or_left = []
    or_right = []
    base_palm = copy.deepcopy(take_5["frames"][0]["right"])
    for i in range(16):
        t = i / 15.0
        shift = 0.15 * math.sin(t * math.pi * 2)
        f_r = copy.deepcopy(base_palm)
        f_l = copy.deepcopy(base_palm)
        for p in range(21):
            f_r[p * 3] += 0.3 + shift
            f_l[p * 3] = -(f_l[p * 3]) - 0.3 - shift
        or_right.append(f_r)
        or_left.append(f_l)
    take_or = make_take(right_frames=or_right, left_frames=or_left, meta_right=True, meta_left=True)

    # 14. SIMPLIFY - Both hands converge inward
    simp_right = []
    simp_left = []
    for i in range(16):
        t = i / 15.0
        conv = 0.35 * (1.0 - t)
        f_r = copy.deepcopy(base_palm)
        f_l = copy.deepcopy(base_palm)
        for p in range(21):
            f_r[p * 3] += 0.15 + conv
            f_l[p * 3] = -(f_l[p * 3]) - 0.15 - conv
        simp_right.append(f_r)
        simp_left.append(f_l)
    take_simp = make_take(right_frames=simp_right, left_frames=simp_left, meta_right=True, meta_left=True)

    # 15. BALANCE - Scales rocking in equilibrium
    bal_right = []
    bal_left = []
    for i in range(16):
        t = i / 15.0
        rock = 0.12 * math.sin(t * math.pi * 2)
        f_r = copy.deepcopy(base_palm)
        f_l = copy.deepcopy(base_palm)
        for p in range(21):
            f_r[p * 3] += 0.35
            f_r[p * 3 + 1] += rock
            f_l[p * 3] = -(f_l[p * 3]) - 0.35
            f_l[p * 3 + 1] -= rock
        bal_right.append(f_r)
        bal_left.append(f_l)
    take_bal = make_take(right_frames=bal_right, left_frames=bal_left, meta_right=True, meta_left=True)

    # Register all variants
    new_entries = {
        # Square Root
        "SQRT": take_sqrt,
        "\\sqrt": take_sqrt,
        "√": take_sqrt,
        # Cubed
        "CUBED": take_cubed,
        "^3": take_cubed,
        "^{3}": take_cubed,
        # Inequalities
        "LESS_THAN": take_lt,
        "<": take_lt,
        "GREATER_THAN": take_gt,
        ">": take_gt,
        "LESS_EQUAL": take_le,
        "<=": take_le,
        "\\le": take_le,
        "\\leq": take_le,
        "≤": take_le,
        "GREATER_EQUAL": take_ge,
        ">=": take_ge,
        "\\ge": take_ge,
        "\\geq": take_ge,
        "≥": take_ge,
        # Plus-Minus
        "PLUS_MINUS": take_pm,
        "\\pm": take_pm,
        "±": take_pm,
        "+-": take_pm,
        # Pi
        "PI": take_pi,
        "\\pi": take_pi,
        "π": take_pi,
        # Degrees
        "DEGREES": take_deg,
        "DEG": take_deg,
        "°": take_deg,
        "^\\circ": take_deg,
        # Percent
        "PERCENT": take_pct,
        "%": take_pct,
        # Punctuation / Math query
        "QUESTION": take_q,
        "?": take_q,
        "COMMA": take_comma,
        ",": take_comma,
        "SEMICOLON": take_comma,
        ";": take_comma,
        # Logic / Equations
        "OR": take_or,
        "or": take_or,
        "\\text{or}": take_or,
        "SIMPLIFY": take_simp,
        "BALANCE": take_bal
    }

    # Also ensure standard operators are fully indexed under symbols and names
    operator_aliases = {
        "+": data["PLUS"],
        "PLUS": data["PLUS"],
        "-": data["MINUS"],
        "MINUS": data["MINUS"],
        "*": data["TIMES"],
        "TIMES": data["TIMES"],
        "\\times": data["TIMES"],
        "\\cdot": data["TIMES"],
        "/": data["DIVIDE"],
        "DIVIDE": data["DIVIDE"],
        "\\div": data["DIVIDE"],
        "=": data["EQUALS"],
        "EQUALS": data["EQUALS"],
        "^": data["POWER"],
        "POWER": data["POWER"],
        "^2": data["SQUARED"],
        "^{2}": data["SQUARED"],
        "SQUARED": data["SQUARED"],
        "(": data["LPAREN"],
        "LPAREN": data["LPAREN"],
        ")": data["RPAREN"],
        "RPAREN": data["RPAREN"]
    }

    for k, v in operator_aliases.items():
        data[k] = v

    for k, v in new_entries.items():
        data[k] = v

    # Save to all target preset files
    target_paths = [
        Path("/home/neo/Codes/MathEnvi/MathAI/frontend/public/models/sixth-sense/preset-references.json"),
        Path("/home/neo/Codes/MathEnvi/MathAI/frontend/dist/models/sixth-sense/preset-references.json"),
        Path("/home/neo/Codes/MathEnvi/Sixth-Sense/data/preset-references.json")
    ]

    for p in target_paths:
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "w") as out:
            json.dump(data, out)
        print(f"Updated {p} with {len(data)} gesture presets.")

if __name__ == "__main__":
    generate_math_gestures()
