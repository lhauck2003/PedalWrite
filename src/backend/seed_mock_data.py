"""
seed_mock_data.py
-----------------
Run from your Django project root:

    python manage.py shell < seed_mock_data.py

Or as a standalone script if DJANGO_SETTINGS_MODULE is set:

    DJANGO_SETTINGS_MODULE=yourproject.settings python seed_mock_data.py

Creates:
  - 5  Leaders
  - 35 Caregivers
  - 50 Riders  (each assigned a leader, a session, 1–3 caregivers)
  - 5  Bikes   (small / medium / large mix, riders assigned via BikeSpecs)

Also creates 1 Session per leader (5 total) so riders have sessions to belong to.

Safe to re-run — uses get_or_create where natural keys exist, and prints
a summary at the end.
"""

import os
import sys
import random
import uuid
from datetime import date, timedelta

# ── Django bootstrap (only needed when run as a standalone script) ────────────
if __name__ == "__main__":
    # Adjust this import to match your project's settings module
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    import django
    django.setup()

from api.models import (
    Session,
    Leader,
    Caregiver,
    Rider,
    Bike,
    BikeSpecs,
    Skill,
    DailyForm,
    DailyFormSkill,
    FinalForm,
    FinalFormSkill,
)

# ── Reproducible randomness ───────────────────────────────────────────────────
random.seed(42)

# ── Name pools ────────────────────────────────────────────────────────────────
FIRST_NAMES = [
    "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Jamie", "Drew",
    "Avery", "Quinn", "Blake", "Reese", "Logan", "Hayden", "Parker", "Sage",
    "River", "Skyler", "Rowan", "Emery", "Finley", "Harley", "Lennon", "Marlowe",
    "Oakley", "Peyton", "Remy", "Sloane", "Sutton", "Tatum", "Vesper", "Wren",
    "Zephyr", "Cleo", "Dani", "Ellis", "Frankie", "Gray", "Indigo", "Jules",
    "Kit", "Lake", "Nico", "Onyx", "Paz", "Rory", "Scout", "True", "Vale", "West",
]

LAST_NAMES = [
    "Anderson", "Baker", "Carter", "Davis", "Evans", "Foster", "Garcia",
    "Harris", "Ingram", "Johnson", "King", "Lewis", "Moore", "Nelson",
    "Ortega", "Patel", "Quinn", "Rivera", "Smith", "Torres", "Underwood",
    "Vargas", "Walker", "Xavier", "Young", "Zimmerman", "Abbot", "Brooks",
    "Chen", "Diaz", "Flynn", "Grant", "Hayes", "Ibarra", "Jacobs",
    "Kane", "Lang", "Marsh", "Novak", "Osei", "Park", "Reed", "Santos",
    "Tran", "Ueda", "Vance", "Webb", "Xu", "Yuen", "Zhou",
]

DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "icloud.com", "example.com"]

SKILL_CATEGORIES = ["Balance", "Pedaling", "Steering", "Braking", "Confidence"]
SKILL_NAMES = {
    "Balance": [
        "Static balance on bike",
        "Gliding without pedaling",
        "Two-foot balance hold",
        "One-foot balance hold",
    ],
    "Pedaling": [
        "Half-pedal push",
        "Full revolution pedaling",
        "Cadence maintenance",
        "Uphill pedaling",
    ],
    "Steering": [
        "Straight-line tracking",
        "Wide turns",
        "Tight figure-eight",
        "Obstacle weave",
    ],
    "Braking": [
        "Two-hand brake squeeze",
        "Controlled stop in 3 ft",
        "Controlled stop in 1 ft",
        "Emergency stop",
    ],
    "Confidence": [
        "Mounting independently",
        "Dismounting independently",
        "Riding with eyes forward",
        "Riding in a group",
    ],
}

BIKE_NAMES = ["Speedy Red", "Blue Bolt", "Green Machine", "Yellow Flash", "Purple Rocket"]

# ── Helpers ───────────────────────────────────────────────────────────────────

def rand_name(pool):
    return random.choice(pool)

def rand_email(first, last, used):
    base = f"{first.lower()}.{last.lower()}"
    domain = random.choice(DOMAINS)
    email = f"{base}@{domain}"
    n = 1
    while email in used:
        email = f"{base}{n}@{domain}"
        n += 1
    used.add(email)
    return email

def rand_phone():
    return f"+1{''.join(str(random.randint(0,9)) for _ in range(10))}"

def rand_date_in_range(start, end):
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, delta))

# ── Main seed logic ───────────────────────────────────────────────────────────

def seed():
    used_emails = set()
    print("=" * 55)
    print("  Bike First! — Mock Data Seeder")
    print("=" * 55)

    # ── 1. Sessions (one per leader slot, 5 total) ────────────────────────────
    print("\n[1/6] Creating sessions…")
    sessions = []
    for i in range(1, 6):
        start = date(2025, 6, 1) + timedelta(weeks=(i - 1) * 2)
        s, created = Session.objects.get_or_create(
            sessionnumber=i,
            defaults={
                "starttime": f"{start} 09:00:00",
                "endtime": f"{start + timedelta(days=4)} 17:00:00",
            },
        )
        sessions.append(s)
        print(f"  {'Created' if created else 'Exists '} → Session {i}")

    # ── 2. Leaders (5) ────────────────────────────────────────────────────────
    print("\n[2/6] Creating leaders…")
    leaders = []
    for _ in range(5):
        first = rand_name(FIRST_NAMES)
        last = rand_name(LAST_NAMES)
        email = rand_email(first, last, used_emails)
        leader = Leader.objects.create(
            firstname=first,
            lastname=last,
            email=email,
        )
        leaders.append(leader)
        print(f"  Created → {first} {last} <{email}>")

    # ── 3. Caregivers (35) ────────────────────────────────────────────────────
    print("\n[3/6] Creating caregivers…")
    caregivers = []
    for i in range(35):
        first = rand_name(FIRST_NAMES)
        last = rand_name(LAST_NAMES)
        email = rand_email(first, last, used_emails)
        cg = Caregiver.objects.create(
            firstname=first,
            lastname=last,
            email=email,
            phone=rand_phone(),
            isemergencycontact=random.choice([True, False, False]),  # ~33% emergency
        )
        caregivers.append(cg)
        if i < 5 or i == 34:
            print(f"  Created → {first} {last} <{email}>")
        elif i == 5:
            print(f"  … (creating remaining caregivers)")
    print(f"  Total caregivers created: {len(caregivers)}")

    # ── 4. Riders (50) ────────────────────────────────────────────────────────
    print("\n[4/6] Creating riders…")
    riders = []
    caregiver_chunks = [caregivers[i::5] for i in range(5)]  # ~7 per leader group

    for i in range(50):
        first = rand_name(FIRST_NAMES)
        last = rand_name(LAST_NAMES)
        leader = leaders[i % 5]
        session = sessions[i % 5]
        isquickstart = random.choice([True, False, False, False])  # ~25% quickstart

        rider = Rider.objects.create(
            firstname=first,
            lastname=last,
            isquickstart=isquickstart,
            session=session,
            leader=leader,
        )

        # Assign 1–3 caregivers from the matching group
        group = caregiver_chunks[i % 5]
        assigned = random.sample(group, k=min(random.randint(1, 3), len(group)))
        rider.caregivers.set(assigned)

        riders.append(rider)
        if i < 5 or i == 49:
            print(f"  Created → {first} {last} | leader: {leader.firstname} {leader.lastname} | caregivers: {len(assigned)}")
        elif i == 5:
            print(f"  … (creating remaining riders)")
    print(f"  Total riders created: {len(riders)}")

    # ── 5. Skills ─────────────────────────────────────────────────────────────
    # Create skills for form levels 1–3 (4 skills per category per level = 60 total)
    print("\n[5/6] Creating skills…")
    skills_by_level = {1: [], 2: [], 3: []}
    for level in range(1, 4):
        for cat, names in SKILL_NAMES.items():
            for name in names:
                skill_name = f"{name} (L{level})"
                skill, created = Skill.objects.get_or_create(
                    skillname=skill_name,
                    defaults={
                        "formlevel": level,
                        "category": cat,
                    },
                )
                skills_by_level[level].append(skill)
    total_skills = sum(len(v) for v in skills_by_level.values())
    print(f"  Total skills available: {total_skills} across levels 1–3")

    # ── 6. Bikes (5) + BikeSpecs ──────────────────────────────────────────────
    print("\n[6/6] Creating bikes and specs…")
    size_cycle = [Bike.BikeSizes.SMALL, Bike.BikeSizes.MEDIUM, Bike.BikeSizes.LARGE]
    bikes = []
    for i, name in enumerate(BIKE_NAMES):
        bike = Bike.objects.create(
            name=name,
            size=size_cycle[i % 3],
        )
        bikes.append(bike)

        # Assign 8–12 riders to each bike, one spec per day (1–5)
        bike_riders = random.sample(riders, k=random.randint(8, 12))
        specs_created = 0
        for rider in bike_riders:
            for day in range(1, 6):
                BikeSpecs.objects.get_or_create(
                    bike=bike,
                    rider=rider,
                    day=day,
                    defaults={
                        "seat_height": round(random.uniform(18.0, 34.0), 1),
                        "left_piston": round(random.uniform(1.0, 5.0), 1),
                        "right_piston": round(random.uniform(1.0, 5.0), 1),
                    },
                )
                specs_created += 1
        print(f"  Created bike '{name}' ({bike.get_size_display()}) → {specs_created} specs across {len(bike_riders)} riders")

    # ── 7. Daily and Final Forms ──────────────────────────────────────────────
    # 2–4 daily forms per rider, spread across 5 days per session
    # 1 final form for ~60% of riders
    print("\n[Bonus] Creating assessment forms…")
    session_start_dates = {
        s.id: date(2025, 6, 1) + timedelta(weeks=(s.sessionnumber - 1) * 2)
        for s in sessions
    }

    daily_forms_created = 0
    final_forms_created = 0

    for rider in riders:
        session = rider.session
        leader = rider.leader
        start = session_start_dates[session.id]

        # Daily forms: one per day for days 1–4
        for day_offset in range(4):
            form_date = start + timedelta(days=day_offset)
            form_level = min(3, 1 + day_offset // 2)  # level 1 on days 0-1, 2 on 2-3

            form = DailyForm.objects.create(
                date=form_date,
                rider=rider,
                session=session,
                leader=leader,
                level=form_level,
                comments=random.choice([
                    "Good progress today.",
                    "Needs more work on balance.",
                    "Very confident rider.",
                    "Struggling with braking.",
                    "",
                ]),
            )

            # Add all skills for this form level
            for skill in skills_by_level[form_level]:
                DailyFormSkill.objects.create(
                    dailyform=form,
                    skill=skill,
                    level=random.randint(0, 4),
                    comments="",
                )
            daily_forms_created += 1

        # Final form for ~65% of riders
        if random.random() < 0.65:
            final_date = start + timedelta(days=4)
            final_level = random.choice([1, 2, 3])

            final = FinalForm.objects.create(
                date=final_date,
                rider=rider,
                session=session,
                leader=leader,
                level=final_level,
                comments=random.choice([
                    "Great session overall.",
                    "Significant improvement.",
                    "Ready for next level.",
                    "Needs continued support.",
                    "",
                ]),
            )

            for skill in skills_by_level[final_level]:
                FinalFormSkill.objects.create(
                    finalform=final,
                    skill=skill,
                    level=random.randint(0, 4),
                    comments="",
                )
            final_forms_created += 1

    print(f"  Daily forms created:  {daily_forms_created}")
    print(f"  Final forms created:  {final_forms_created}")

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n" + "=" * 55)
    print("  Seed complete — database summary")
    print("=" * 55)
    print(f"  Sessions:     {Session.objects.count()}")
    print(f"  Leaders:      {Leader.objects.count()}")
    print(f"  Caregivers:   {Caregiver.objects.count()}")
    print(f"  Riders:       {Rider.objects.count()}")
    print(f"  Bikes:        {Bike.objects.count()}")
    print(f"  BikeSpecs:    {BikeSpecs.objects.count()}")
    print(f"  Skills:       {Skill.objects.count()}")
    print(f"  Daily Forms:  {DailyForm.objects.count()}")
    print(f"  Final Forms:  {FinalForm.objects.count()}")
    print("=" * 55)


seed()