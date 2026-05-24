/**
 * Calculates a real-time inhalation dose factor by scaling environmental 
 * toxin density with physical cardiac exertion.
 * @param {number} heartRate - Live beats per minute from the smart watch
 * @param {number} pm25 - Particulate matter 2.5 concentration from the Proton module
 * @returns {number} Standardized Exposure Risk Score
 */
export function calculateExposureRisk(heartRate, pm25) {
  const restingHR = 60; 
  // Exertion multiplier: estimates increased minute ventilation (breathing volume)
  const exertionMultiplier = heartRate > restingHR ? (heartRate - restingHR) / 100 + 1 : 1;
  const aqiFactor = pm25 * 0.5; 
  
  return parseFloat((aqiFactor * exertionMultiplier).toFixed(2));
}