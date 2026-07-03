#!/bin/bash

# =========================================
#  Seed Availabilities for This Week
#  Targets the Docker Postgres container
# =========================================

CONTAINER="healthy-paws-wrapper-db-1"
DB_USER="alexandraclaudiabrad"
DB_NAME="healthypaws"

# Time slots per day (in HH:MM format, Europe/Bucharest = UTC+3 so store as UTC)
# 09:00–11:00 and 14:00–16:00 EET = 06:00–08:00 and 11:00–13:00 UTC
SLOTS=("09:00" "10:00" "11:00" "14:00" "15:00" "16:00")

# Days of this week (Mon-Fri). Today is Wed 2026-07-02, so this week = Mon Jul 7 to Fri Jul 4
# We use current week Mon–Fri dynamically
get_week_days() {
  # Get Monday of the current week
  TODAY=$(date +%Y-%m-%d)
  DOW=$(date +%u)  # 1=Mon, 7=Sun
  MONDAY=$(date -v-${DOW}d -v+1d +%Y-%m-%d 2>/dev/null || date -d "$TODAY -$(( DOW - 1 )) days" +%Y-%m-%d)
  for i in 0 1 2 3 4; do
    date -v+${i}d -j -f "%Y-%m-%d" "$MONDAY" +%Y-%m-%d 2>/dev/null || date -d "$MONDAY + $i days" +%Y-%m-%d
  done
}

echo "========================================="
echo "  Seeding Availabilities for This Week"
echo "========================================="

# Get all doctor IDs from DB
DOCTOR_IDS=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
  "SELECT d.id FROM doctors d JOIN users u ON u.id = d.id WHERE u.role = 'doctor';" | tr -d ' ')

WEEK_DAYS=$(get_week_days)

TOTAL=0
for DOCTOR_ID in $DOCTOR_IDS; do
  DOC_NAME=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT name FROM doctors WHERE id = '$DOCTOR_ID';" | tr -d ' ')
  echo -e "\n→ Adding availabilities for Dr. $DOC_NAME ($DOCTOR_ID)"

  for DAY in $WEEK_DAYS; do
    for SLOT in "${SLOTS[@]}"; do
      # Insert as timestamptz — times are in Europe/Bucharest local time (EET = UTC+3)
      docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c \
        "INSERT INTO availabilities (doctor_id, available_datetime)
         VALUES ('$DOCTOR_ID', '$DAY $SLOT:00+03')
         ON CONFLICT ON CONSTRAINT unq_doctor_availability DO NOTHING;" > /dev/null 2>&1
      TOTAL=$((TOTAL + 1))
    done
  done
  echo "   ✓ 30 slots added (5 days × 6 slots)"
done

echo ""
echo "========================================="
echo "  Done! Availabilities seeded."
echo "  Slots per doctor: 30 (Mon–Fri, 09-11 & 14-16)"
echo "  Total slots inserted: $TOTAL"
echo "========================================="
