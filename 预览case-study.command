#!/bin/bash
cd "/Users/abby/Desktop/waterresources"
# Start a local server if one isn't already running on port 8000
if ! curl -s -o /dev/null http://localhost:8000/ 2>/dev/null; then
  (python3 -m http.server 8000 >/tmp/wr-preview.log 2>&1 &)
  sleep 1
fi
open "http://localhost:8000/pages/case-studies.html"
