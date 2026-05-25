/**
 * Simple Statistical Anomaly Detection
 * Uses Z-score method: marks values > 2 standard deviations as anomalies
 */

class AnomalyDetector {
  constructor(windowSize = 20) {
    this.windowSize = windowSize;
    this.history = {
      heartRate: [],
      spo2: [],
      coPpm: [],
      dustDensity: []
    };
  }

  /**
   * Calculate mean of array
   */
  mean(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  /**
   * Calculate standard deviation
   */
  std(arr) {
    if (arr.length === 0) return 0;
    const avg = this.mean(arr);
    const squareDiffs = arr.map(val => Math.pow(val - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }

  /**
   * Calculate Z-score
   */
  zScore(value, arr) {
    const avg = this.mean(arr);
    const stdDev = this.std(arr);
    if (stdDev === 0) return 0;
    return Math.abs((value - avg) / stdDev);
  }

  /**
   * Add new data point and update history
   */
  addDataPoint(metric, value) {
    if (value == null || isNaN(value)) return;
    
    this.history[metric].push(value);
    
    // Keep only last N points (sliding window)
    if (this.history[metric].length > this.windowSize) {
      this.history[metric].shift();
    }
  }

  /**
   * Check if current value is anomalous
   * Returns: { isAnomaly: boolean, severity: string, zScore: number }
   */
  detectAnomaly(metric, currentValue, threshold = 2.0) {
    if (currentValue == null || this.history[metric].length < 5) {
      return { isAnomaly: false, severity: 'normal', zScore: 0 };
    }

    const z = this.zScore(currentValue, this.history[metric]);
    
    let severity = 'normal';
    let isAnomaly = false;

    if (z > threshold) {
      isAnomaly = true;
      if (z > 3.5) severity = 'critical';
      else if (z > 3.0) severity = 'high';
      else if (z > 2.5) severity = 'medium';
      else severity = 'low';
    }

    return { isAnomaly, severity, zScore: z.toFixed(2) };
  }

  /**
   * Get comprehensive health check
   */
  analyzeHealthData(data) {
    const results = {
      heartRate: null,
      spo2: null,
      coPpm: null,
      dustDensity: null,
      overallRisk: 'normal',
      alerts: []
    };

    // Heart Rate Analysis
    if (data.avg_heart_rate != null) {
      this.addDataPoint('heartRate', data.avg_heart_rate);
      results.heartRate = this.detectAnomaly('heartRate', data.avg_heart_rate, 2.0);
      
      if (results.heartRate.isAnomaly) {
        const current = data.avg_heart_rate;
        const baseline = this.mean(this.history.heartRate);
        const change = ((current - baseline) / baseline * 100).toFixed(1);
        
        results.alerts.push({
          type: 'heartRate',
          severity: results.heartRate.severity,
          message: `Heart rate ${change > 0 ? 'elevated' : 'dropped'} by ${Math.abs(change)}% from baseline (${baseline.toFixed(0)} → ${current} bpm)`,
          recommendation: change > 0 
            ? "Consider resting or checking if you're feeling stressed."
            : "Low heart rate detected. If you feel dizzy, consult a doctor."
        });
      }
    }

    // SpO2 Analysis
    if (data.avg_spo2 != null) {
      this.addDataPoint('spo2', data.avg_spo2);
      results.spo2 = this.detectAnomaly('spo2', data.avg_spo2, 1.5);
      
      if (results.spo2.isAnomaly || data.avg_spo2 < 95) {
        results.alerts.push({
          type: 'spo2',
          severity: data.avg_spo2 < 92 ? 'critical' : results.spo2.severity,
          message: `Blood oxygen at ${data.avg_spo2}% (baseline: ${this.mean(this.history.spo2).toFixed(1)}%)`,
          recommendation: data.avg_spo2 < 92 
            ? "⚠️ Critically low oxygen. Seek medical attention immediately."
            : "Monitor closely. Ensure good ventilation."
        });
      }
    }

    return results;
  }

  /**
   * Analyze air quality data
   */
  analyzeAirQuality(airData) {
    const results = {
      coPpm: null,
      dustDensity: null,
      overallRisk: 'normal',
      alerts: []
    };

    // CO Analysis
    if (airData?.co_ppm != null) {
      this.addDataPoint('coPpm', airData.co_ppm);
      results.coPpm = this.detectAnomaly('coPpm', airData.co_ppm, 2.0);
      
      // Hard thresholds (WHO guidelines)
      if (airData.co_ppm > 9) {
        results.alerts.push({
          type: 'co',
          severity: 'critical',
          message: `Dangerous CO levels: ${airData.co_ppm} ppm (safe limit: 9 ppm)`,
          recommendation: "⚠️ Ventilate immediately. Avoid prolonged exposure."
        });
      } else if (results.coPpm.isAnomaly) {
        results.alerts.push({
          type: 'co',
          severity: results.coPpm.severity,
          message: `CO spike detected: ${airData.co_ppm} ppm`,
          recommendation: "Increase ventilation. Check for combustion sources."
        });
      }
    }

    // PM2.5 Analysis
    if (airData?.dust_density != null) {
      this.addDataPoint('dustDensity', airData.dust_density);
      results.dustDensity = this.detectAnomaly('dustDensity', airData.dust_density, 2.0);
      
      // AQI-based thresholds
      if (airData.dust_density > 150) {
        results.alerts.push({
          type: 'pm25',
          severity: 'critical',
          message: `Hazardous air quality: ${airData.dust_density} µg/m³ PM2.5`,
          recommendation: "⚠️ Stay indoors. Use air purifier. Avoid outdoor activities."
        });
      } else if (airData.dust_density > 55) {
        results.alerts.push({
          type: 'pm25',
          severity: 'high',
          message: `Unhealthy PM2.5 levels: ${airData.dust_density} µg/m³`,
          recommendation: "Limit outdoor exposure. Sensitive groups stay inside."
        });
      } else if (results.dustDensity.isAnomaly) {
        results.alerts.push({
          type: 'pm25',
          severity: results.dustDensity.severity,
          message: `PM2.5 increase detected: ${airData.dust_density} µg/m³`,
          recommendation: "Monitor air quality. Close windows if needed."
        });
      }
    }

    return results;
  }

  /**
   * Calculate overall risk score (0-100)
   */
  calculateRiskScore(healthAnalysis, airAnalysis) {
    let score = 0;
    
    const severityWeights = {
      critical: 40,
      high: 25,
      medium: 15,
      low: 5
    };

    // Health alerts
    healthAnalysis.alerts.forEach(alert => {
      score += severityWeights[alert.severity] || 0;
    });

    // Air quality alerts
    airAnalysis.alerts.forEach(alert => {
      score += severityWeights[alert.severity] || 0;
    });

    return Math.min(score, 100);
  }
}

export default AnomalyDetector;