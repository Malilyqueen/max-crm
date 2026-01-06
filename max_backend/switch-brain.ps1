param(
  [ValidateSet("ecommerce","coach","btp","logistique","b2b")]
  [string]$brain = "ecommerce",
  [ValidateSet("auto","assist","ro")]
  [string]$mode = "assist"
)

$env:BRAIN_ACTIVE = $brain
$env:MODE = $mode

"➡️ BRAIN_ACTIVE=$($env:BRAIN_ACTIVE) | MODE=$($env:MODE)"

# (Optionnel) Démarrer le serveur dans la même session :
# node server.js
