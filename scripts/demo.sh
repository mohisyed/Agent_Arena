#!/bin/bash
# Demo script — run this while screen recording to capture a demo clip.
# Prerequisites: docker compose up --build (MC server + bridge running)

BASE_URL="http://localhost:3001"

echo "=== Agent Arena Demo ==="
echo "> Starting in 5 seconds... start recording now!"
sleep 5
echo ""

# 1. Health check
echo "> Checking bot health..."
curl -s "$BASE_URL/health" | jq .
sleep 2

# 2. Get current state
echo ""
echo "> Bot state:"
curl -s "$BASE_URL/state" | jq .
sleep 2

# 3. Send a chat message
echo ""
echo "> Sending chat message..."
curl -s -X POST "$BASE_URL/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello from Agent Arena!"}' | jq .
sleep 2

# 4. Move the bot (get current position first, then move nearby)
echo ""
echo "> Getting current position..."
POS=$(curl -s "$BASE_URL/state")
X=$(echo "$POS" | jq '.position.x | floor')
Y=$(echo "$POS" | jq '.position.y | floor')
Z=$(echo "$POS" | jq '.position.z | floor')
TARGET_X=$((X + 5))
TARGET_Z=$((Z + 5))

echo "> Moving bot from ($X, $Y, $Z) to ($TARGET_X, $Y, $TARGET_Z)..."
curl -s -X POST "$BASE_URL/move" \
  -H "Content-Type: application/json" \
  -d "{\"x\":$TARGET_X,\"y\":$Y,\"z\":$TARGET_Z}" | jq .
sleep 2

# 5. Dig a block
echo ""
echo "> Digging block below bot..."
POS=$(curl -s "$BASE_URL/state")
X=$(echo "$POS" | jq '.position.x | floor')
Y=$(echo "$POS" | jq '.position.y | floor')
Z=$(echo "$POS" | jq '.position.z | floor')
DIG_Y=$((Y - 1))

curl -s -X POST "$BASE_URL/dig" \
  -H "Content-Type: application/json" \
  -d "{\"x\":$X,\"y\":$DIG_Y,\"z\":$Z}" | jq .
sleep 2

# 6. Final state
echo ""
echo "> Final bot state:"
curl -s "$BASE_URL/state" | jq .

echo ""
echo "=== Demo complete ==="
