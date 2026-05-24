import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useState } from "react";


export default function HomePage() {
  const [currentUser, setCurrentUser] = useState("")
  const auth = getAuth();
  onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in, see docs for a list of available properties
    const uid = user.uid;
    setCurrentUser(user.displayName);
    console.log(user);
    
  } else {
    // User is signed out
    console.log("No user is signed in.");
  }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 text-gray-800">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 shadow-sm bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <h1 className="text-2xl font-bold text-green-700">Proton</h1>

        <div className="flex gap-6 text-sm font-medium">
          <a href="#features" className="hover:text-green-600 transition">
            Features
          </a>
          <a href="#about" className="hover:text-green-600 transition">
            About
          </a>
          <a href="#dashboard" className="hover:text-green-600 transition">
            Dashboard
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-8 py-20 max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-green-600 font-semibold mb-3 uppercase tracking-wide">
            Smart Environmental Monitoring
          </p>
          <p>{currentUser}</p>

          <h2 className="text-5xl font-extrabold leading-tight mb-6">
            Track Pollution & Health in Real Time
          </h2>

          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            Proton combines wearable health monitoring, environmental
            sensors, and AI analytics to help users understand how air quality
            impacts their health.
          </p>

          <div className="flex gap-4">
            <button className="bg-green-600 hover:bg-green-700 transition text-white px-6 py-3 rounded-2xl shadow-lg">
              View Dashboard
            </button>

            <button className="border border-gray-300 hover:border-green-500 px-6 py-3 rounded-2xl transition">
              Learn More
            </button>
          </div>
        </div>

        {/* Hero Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-green-100 p-5 rounded-2xl">
              <p className="text-sm text-gray-500">Air Quality</p>
              <h3 className="text-3xl font-bold text-green-700 mt-2">
                42 AQI
              </h3>
              <p className="text-sm mt-2 text-green-600">Good</p>
            </div>

            <div className="bg-blue-100 p-5 rounded-2xl">
              <p className="text-sm text-gray-500">CO Level</p>
              <h3 className="text-3xl font-bold text-blue-700 mt-2">
                9 ppm
              </h3>
              <p className="text-sm mt-2 text-blue-600">Safe</p>
            </div>

            <div className="bg-red-100 p-5 rounded-2xl">
              <p className="text-sm text-gray-500">Heart Rate</p>
              <h3 className="text-3xl font-bold text-red-700 mt-2">
                78 BPM
              </h3>
              <p className="text-sm mt-2 text-red-600">Normal</p>
            </div>

            <div className="bg-yellow-100 p-5 rounded-2xl">
              <p className="text-sm text-gray-500">PM2.5</p>
              <h3 className="text-3xl font-bold text-yellow-700 mt-2">
                18 μg/m³
              </h3>
              <p className="text-sm mt-2 text-yellow-700">Moderate</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="max-w-7xl mx-auto px-8 py-16"
      >
        <div className="text-center mb-14">
          <h2 className="text-4xl font-bold mb-4">Core Features</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            A complete environmental intelligence platform combining IoT,
            wearable technology, and analytics.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition">
            <div className="text-5xl mb-4">⌚</div>
            <h3 className="text-2xl font-semibold mb-3">
              Smart Wearable
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Collects body temperature, heart rate, and health data to measure
              environmental impact on the user.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition">
            <div className="text-5xl mb-4">🌫️</div>
            <h3 className="text-2xl font-semibold mb-3">
              Pollution Detection
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Uses MQ-7 and dust sensors connected with ESP32 for real-time air
              quality monitoring.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-2xl font-semibold mb-3">
              Live Analytics
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Visualizes health and pollution trends with a responsive React
              dashboard and cloud integration.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-8 py-20">
        <div className="max-w-5xl mx-auto bg-green-600 rounded-3xl p-12 text-center text-white shadow-2xl">
          <h2 className="text-4xl font-bold mb-5">
            Build a Healthier Environment
          </h2>

          <p className="text-lg text-green-100 mb-8 max-w-2xl mx-auto">
            Empowering people with real-time pollution awareness and health
            insights through smart technology.
          </p>

          <button className="bg-white text-green-700 px-8 py-4 rounded-2xl font-semibold hover:scale-105 transition">
            Open Dashboard
          </button>
        </div>
      </section>
    </div>
  );
}
