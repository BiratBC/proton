// Navbar.jsx
const Navbar = () =>  {
  return (
    <nav className="flex items-center justify-between px-8 py-5 shadow-sm bg-white sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-green-600 flex items-center justify-center text-white font-bold text-lg">
          E
        </div>
        <h1 className="text-2xl font-bold text-green-700">EcoPulse</h1>
      </div>

      <div className="hidden md:flex items-center gap-8 text-sm font-medium">
        <a href="#home" className="hover:text-green-600 transition">
          Home
        </a>

        <a href="#features" className="hover:text-green-600 transition">
          Features
        </a>

        <a href="#dashboard" className="hover:text-green-600 transition">
          Dashboard
        </a>

        <a href="#about" className="hover:text-green-600 transition">
          About
        </a>
      </div>

      <button className="bg-green-600 hover:bg-green-700 transition text-white px-5 py-2 rounded-xl shadow-md">
        Get Started
      </button>
    </nav>
  );
}

export default Navbar