// Footer.jsx
const Footer = () =>  {
  return (
    <footer className="bg-gray-900 text-white px-8 py-14 mt-20">
      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-green-600 flex items-center justify-center font-bold text-lg">
              P
            </div>

            <h2 className="text-2xl font-bold">Proton</h2>
          </div>

          <p className="text-gray-400 leading-relaxed">
            Real-time environmental monitoring platform combining wearable
            technology, pollution sensors, and smart analytics.
          </p>
        </div>

        {/* Links */}
        <div>
          <h3 className="text-xl font-semibold mb-5">Quick Links</h3>

          <div className="flex flex-col gap-3 text-gray-400">
            <a href="#home" className="hover:text-green-400 transition">
              Home
            </a>

            <a href="#features" className="hover:text-green-400 transition">
              Features
            </a>

            <a href="#dashboard" className="hover:text-green-400 transition">
              Dashboard
            </a>

            <a href="#about" className="hover:text-green-400 transition">
              About
            </a>
          </div>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-xl font-semibold mb-5">Project Info</h3>

          <div className="flex flex-col gap-3 text-gray-400">
            <p>24-Hour Environmental Hackathon Project</p>
            <p>Built with React + Tailwind CSS</p>
            <p>Powered by ESP32 & IoT Sensors</p>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-gray-800 mt-12 pt-6 text-center text-gray-500 text-sm">
        © 2026 Proton. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer