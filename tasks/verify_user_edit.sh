#!/usr/bin/env bash
# Ad-hoc verification for account editing by admin / superUser.
# Creates a temporary admin, exercises the permission matrix, then cleans up
# so the seeded database is left exactly as it was found.
set -u
API=http://localhost:3001/api
TMP_EMAIL="temp.admin.verify@example.com"

login() {
  curl -s -m 10 -X POST "$API/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" | jq -r '.accessToken // .token // .data.accessToken // empty'
}

req() { # method path token body
  curl -s -m 10 -X "$1" "$API$2" \
    -H "Authorization: Bearer $3" \
    -H 'Content-Type: application/json' \
    ${4:+-d "$4"}
}

ADMIN_TOKEN=$(login admin@savetogether.com password123)
SUPER_TOKEN=$(login super@admin.com password123)

# Member id (Afam) and original values
MEMBER_ROW=$(req GET /users "$SUPER_TOKEN" | jq -c '.data[] | select(.email=="afam@example.com")')
MEMBER_ID=$(echo "$MEMBER_ROW" | jq -r '.id')
MEMBER_NAME=$(echo "$MEMBER_ROW" | jq -r '.name')
echo "Afam id=$MEMBER_ID name=$MEMBER_NAME"

echo
echo "=== 1. ADMIN edits a member's name + email (should succeed) ==="
req PUT "/users/$MEMBER_ID" "$ADMIN_TOKEN" \
  '{"name":"Afam Verified","email":"afam@example.com"}' | jq '{success, data: {name: .data.name, email: .data.email}}'

echo
echo "=== 2. Change persisted? (re-read from list) ==="
req GET /users "$SUPER_TOKEN" | jq -r '.data[] | select(.email=="afam@example.com") | "name=\(.name) updated"'

echo
echo "=== 3. ADMIN tries to change a role (should be 403) ==="
req PUT "/users/$MEMBER_ID" "$ADMIN_TOKEN" '{"role":"admin"}' | jq '{error}'

echo
echo "=== 4. ADMIN tries to deactivate (should be 403) ==="
req PUT "/users/$MEMBER_ID" "$ADMIN_TOKEN" '{"isActive":false}' | jq '{error}'

echo
echo "=== 5. Invalid email (should be 400) ==="
req PUT "/users/$MEMBER_ID" "$ADMIN_TOKEN" '{"email":"not-an-email"}' | jq '{error}'

echo
echo "=== 6. Trust score out of range (should be 400) ==="
req PUT "/users/$MEMBER_ID" "$ADMIN_TOKEN" '{"trustScore":900}' | jq '{error}'

echo
echo "=== 7. ADMIN tries to edit a SUPERUSER (should be 403) ==="
SUPER_ID=$(req GET /users "$SUPER_TOKEN" | jq -r '.data[] | select(.role=="superUser") | .id' | head -1)
req PUT "/users/$SUPER_ID" "$ADMIN_TOKEN" '{"name":"Hacked"}' | jq '{error}'

echo
echo "=== 8. SUPERUSER creates a temp admin ==="
req POST /users "$SUPER_TOKEN" \
  "{\"email\":\"$TMP_EMAIL\",\"password\":\"TempPass123\",\"name\":\"Temp Admin\",\"role\":\"admin\"}" \
  | jq '{success, id: .user.id, role: .user.role}'
TMP_ID=$(req GET /users "$SUPER_TOKEN" | jq -r --arg e "$TMP_EMAIL" '.data[] | select(.email==$e) | .id')
echo "temp admin id=$TMP_ID"

echo
echo "=== 9. ADMIN tries to edit the peer ADMIN account (should be 403) ==="
req PUT "/users/$TMP_ID" "$ADMIN_TOKEN" '{"name":"Peer Edited"}' | jq '{error}'

echo
echo "=== 10. SUPERUSER edits the admin: name, email, password ==="
req PUT "/users/$TMP_ID" "$SUPER_TOKEN" \
  "{\"name\":\"Temp Admin Renamed\",\"email\":\"$TMP_EMAIL\",\"password\":\"NewTempPass456\"}" \
  | jq '{success, data: {name: .data.name, email: .data.email}}'

echo
echo "=== 11. New password actually works for login ==="
NEW_TOKEN=$(login "$TMP_EMAIL" NewTempPass456)
echo "login with NEW password token len: ${#NEW_TOKEN}"
OLD_TOKEN=$(login "$TMP_EMAIL" TempPass123)
echo "login with OLD password token len: ${#OLD_TOKEN} (expect 0)"

echo
echo "=== 12. SUPERUSER deactivates + reactivates the temp admin ==="
req PUT "/users/$TMP_ID" "$SUPER_TOKEN" '{"isActive":false}' | jq '{success, is_active: .data.is_active}'
req PUT "/users/$TMP_ID" "$SUPER_TOKEN" '{"isActive":true}' | jq '{success, is_active: .data.is_active}'

echo
echo "=== 13. CLEANUP: restore Afam, delete temp admin ==="
req PUT "/users/$MEMBER_ID" "$SUPER_TOKEN" "{\"name\":\"$MEMBER_NAME\",\"trustScore\":92}" | jq '{success, name: .data.name, trust: .data.trust_score}'
req DELETE "/users/$TMP_ID" "$SUPER_TOKEN" | jq '{success, message}'
echo "temp admin still present?"
req GET /users "$SUPER_TOKEN" | jq --arg e "$TMP_EMAIL" '[.data[] | select(.email==$e)] | length'
echo "final Afam row:"
req GET /users "$SUPER_TOKEN" | jq -c '.data[] | select(.email=="afam@example.com") | {name, email, role, trust_score, is_active}'
