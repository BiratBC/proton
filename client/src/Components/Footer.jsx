// Footer.jsx
const Footer = () => {
  return (
    <footer className="relative overflow-hidden">
      {/* Glass background layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/80 via-teal-900/75 to-slate-900/85 backdrop-blur-2xl" />

      {/* Ambient glows */}
      <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-emerald-500/20 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-56 h-56 rounded-full bg-teal-400/15 blur-[70px] pointer-events-none" />

      {/* Top border shine */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-8 py-14">
        <div className="grid md:grid-cols-3 gap-12">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center font-bold text-lg text-emerald-300 shadow-inner">
                P
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Proton</h2>
            </div>
            <p className="text-white/50 leading-relaxed text-sm">
              Real-time environmental monitoring platform combining wearable
              technology, pollution sensors, and smart analytics.
            </p>

            {/* Glass pills */}
            <div className="flex gap-2 mt-5 flex-wrap">
              {["IoT", "ESP32", "React", "AI"].map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] font-semibold px-3 py-1 rounded-full bg-white/8 border border-white/15 text-white/60 backdrop-blur-sm tracking-wide"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-5">
              Quick Links
            </h3>
            <div className="flex flex-col gap-1">
              {[
                { label: "Home",      href: "#home" },
                { label: "Features",  href: "#features" },
                { label: "Dashboard", href: "#dashboard" },
                { label: "About",     href: "#about" },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="group flex items-center gap-2 text-white/55 hover:text-emerald-300 transition-all duration-200 py-1.5 text-[15px] w-fit"
                >
                  <span className="w-0 group-hover:w-3 h-px bg-emerald-400 transition-all duration-300 rounded-full" />
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Project Info */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-5">
              Project Info
            </h3>
            <div className="flex flex-col gap-3">
              {[
                { icon: "🏆", text: "24-Hour Hackathon Project" },
                { icon: "⚛️",  text: "Built with React + Tailwind CSS" },
                { icon: "📡", text: "Powered by ESP32 & IoT Sensors" },
              ].map(({ icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 backdrop-blur-sm hover:bg-white/10 hover:border-white/20 transition-all duration-200"
                >
                  <span className="text-lg">{icon}</span>
                  <span className="text-white/55 text-sm leading-snug">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom divider + copyright */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-white/30 text-sm">© 2026 Proton. All rights reserved.</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/30 text-xs font-medium">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;