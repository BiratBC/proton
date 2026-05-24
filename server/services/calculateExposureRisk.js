// server/services/biometrics.js

/**
 * Calculates an exposure risk score by dynamically deriving a sensitivity 
 * coefficient from real-time cardiovascular strain.
 * @param {number} heartRate - Live heart rate from smartwatch (BPM)
 * @param {number} pm25 - Ambient PM2.5 concentration (µg/m³)
 * @param {number} restingHR - User's recorded baseline resting heart rate (default 65)
 * @returns {Object} { riskScore: number, sensitivityCoefficient: number, riskLevel: string, alertUser: boolean }
 */
export function calculateExposureRisk(heartRate, pm25, restingHR = 65) {
  // 1. Calculate Dynamic Sensitivity Coefficient based purely on HR drift
  let sensitivityCoefficient = 1.0;
  
  if (heartRate > restingHR) {
    const hrDriftRatio = (heartRate - restingHR) / restingHR;
    const scalingFactor = 1.5; // Controls how aggressively sensitivity climbs with HR
    sensitivityCoefficient = 1.0 + (hrDriftRatio * scalingFactor);
  }
  
  // Clean up decimals for the coefficient matrix
  sensitivityCoefficient = parseFloat(sensitivityCoefficient.toFixed(2));

  // 2. Calculate Exertion Multiplier (estimates actual volume of air inhaled per minute)
  const exertionMultiplier = heartRate > restingHR ? (heartRate - restingHR) / 100 + 1 : 1;

  // 3. Compute Enriched Risk Score
  const rawScore = pm25 * exertionMultiplier * sensitivityCoefficient;
  const riskScore = parseFloat(rawScore.toFixed(2));

  // 4. Uniform Safety Threshold Bounds
  let riskLevel = "Low";
  let alertUser = false;

  if (riskScore >= 90.0) {
    riskLevel = "Critical Hazard";
    alertUser = true;
  } else if (riskScore >= 50.0) {
    riskLevel = "High Strain Risk";
    alertUser = true; // Flag frontend warning system
  } else if (riskScore >= 25.0) {
    riskLevel = "Moderate Risk";
  }

  return {
    riskScore,
    sensitivityCoefficient,
    riskLevel,
    alertUser
  };
}