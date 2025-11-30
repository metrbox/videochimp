#!/bin/bash

# VideoChimp API Test Script

API_URL="${API_URL:-http://localhost:3000}"

echo "🎬 VideoChimp API Test"
echo "======================"
echo ""

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s "$API_URL/health" | jq .
echo ""

# Create video generation job
echo "2. Creating video generation job..."
RESPONSE=$(curl -s -X POST "$API_URL/api/videos/generate" \
  -H "Content-Type: application/json" \
  -d @example-request.json)

echo "$RESPONSE" | jq .
JOB_ID=$(echo "$RESPONSE" | jq -r '.jobId')
echo ""

if [ "$JOB_ID" == "null" ] || [ -z "$JOB_ID" ]; then
  echo "❌ Failed to create job"
  exit 1
fi

echo "✅ Job created: $JOB_ID"
echo ""

# Poll job status
echo "3. Polling job status..."
MAX_ATTEMPTS=60
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  echo -n "Attempt $ATTEMPT/$MAX_ATTEMPTS... "

  STATUS_RESPONSE=$(curl -s "$API_URL/api/videos/jobs/$JOB_ID")
  STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.job.status')

  echo "Status: $STATUS"

  if [ "$STATUS" == "complete" ]; then
    echo ""
    echo "✅ Video generation complete!"
    echo "$STATUS_RESPONSE" | jq .

    # Download video
    echo ""
    echo "4. Downloading video..."
    curl -o "output-${JOB_ID}.mp4" "$API_URL/api/videos/download/$JOB_ID"

    if [ -f "output-${JOB_ID}.mp4" ]; then
      FILE_SIZE=$(ls -lh "output-${JOB_ID}.mp4" | awk '{print $5}')
      echo "✅ Video downloaded: output-${JOB_ID}.mp4 ($FILE_SIZE)"
    else
      echo "❌ Failed to download video"
      exit 1
    fi

    exit 0
  elif [ "$STATUS" == "failed" ]; then
    echo ""
    echo "❌ Video generation failed"
    echo "$STATUS_RESPONSE" | jq .
    exit 1
  fi

  ATTEMPT=$((ATTEMPT + 1))
  sleep 5
done

echo ""
echo "❌ Timeout waiting for video generation"
exit 1
