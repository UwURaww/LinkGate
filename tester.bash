SLUG="09b2a7f2"
SITE="https://link-gate-rho.vercel.app"
TOKEN=$(curl -s -X POST $SITE/api/gate-session -H "Content-Type: application/json" -d "{\"slug\":\"$SLUG\"}" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
curl -s -X POST $SITE/api/gate-complete -H "Content-Type: application/json" -d "{\"slug\":\"$SLUG\",\"token\":\"$TOKEN\",\"completedStepIds\":[]}"