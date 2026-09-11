#!/usr/bin/env bash
# Ad-hoc verification: does an admin now receive platform-wide escrow
# transactions, and are members still scoped to their own?
set -u
API=http://localhost:3001/api

login() {
  curl -s -m 10 -X POST "$API/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" | jq -r '.accessToken // .token // .data.accessToken // empty'
}

echo "=== 1. Login as each role ==="
ADMIN_TOKEN=$(login admin@savetogether.com password123)
SUPER_TOKEN=$(login super@admin.com password123)
MEMBER_TOKEN=$(login afam@example.com password123)
VENDOR_TOKEN=$(login vendor@solartech.com password123)
echo "admin token len:  ${#ADMIN_TOKEN}"
echo "super token len:  ${#SUPER_TOKEN}"
echo "member token len: ${#MEMBER_TOKEN}"
echo "vendor token len: ${#VENDOR_TOKEN}"

echo
echo "=== 2. GET /api/escrow/transactions as ADMIN ==="
curl -s -m 10 "$API/escrow/transactions" -H "Authorization: Bearer $ADMIN_TOKEN" > /tmp/verify_admin_escrow.json
jq '{success, scope, count: (.data | length), rows: [.data[] | {transaction_number, order_number, buyer_name, seller_name, amount, status, created_at, products}]}' /tmp/verify_admin_escrow.json

echo
echo "=== 3. GET /api/escrow/transactions as SUPERUSER ==="
curl -s -m 10 "$API/escrow/transactions" -H "Authorization: Bearer $SUPER_TOKEN" > /tmp/verify_super_escrow.json
jq '{success, scope, count: (.data | length)}' /tmp/verify_super_escrow.json

echo
echo "=== 4. GET /api/escrow/transactions as MEMBER (afam) ==="
curl -s -m 10 "$API/escrow/transactions" -H "Authorization: Bearer $MEMBER_TOKEN" > /tmp/verify_member_escrow.json
jq '{success, scope, count: (.data | length), rows: [.data[] | {transaction_number, buyer_name, seller_name}]}' /tmp/verify_member_escrow.json

echo
echo "=== 5. GET /api/escrow/transactions as VENDOR (solartech) ==="
curl -s -m 10 "$API/escrow/transactions" -H "Authorization: Bearer $VENDOR_TOKEN" > /tmp/verify_vendor_escrow.json
jq '{success, scope, count: (.data | length), rows: [.data[] | {transaction_number, buyer_name, seller_name}]}' /tmp/verify_vendor_escrow.json

echo
echo "=== 6. Admin scoped query ?type=buyer still scopes to self ==="
curl -s -m 10 "$API/escrow/transactions?type=buyer" -H "Authorization: Bearer $ADMIN_TOKEN" | jq '{scope, count: (.data | length)}'
