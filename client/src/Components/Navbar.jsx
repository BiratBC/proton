import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="flex items-center justify-between px-8 py-5 shadow-sm bg-white sticky top-0 z-50">
      
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-green-600 flex items-center justify-center text-white font-bold text-lg">
          P
        </div>
        <h1 className="text-2xl font-bold text-green-700">Proton</h1>
      </div>

      {/* Links */}
      <div className="hidden md:flex items-center gap-8 text-sm font-medium">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="rounded-xl bg-emerald-50 px-3 py-1.5 text-emerald-700 transition hover:bg-emerald-100"
        >
          Home
        </button>
        <a href="#features" className="hover:text-green-600 transition">Features</a>
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="rounded-xl bg-emerald-50 px-3 py-1.5 text-emerald-700 transition hover:bg-emerald-100"
        >
          Dashboard
        </button>
        <a href="#about" className="hover:text-green-600 transition">About</a>
        
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/login")}
          className="px-5 py-2 rounded-xl border border-gray-300 text-green-700 hover:border-green-500 transition"
        >
          Login
        </button>

        <button
          onClick={() => navigate("/signup")}
          className="px-5 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 transition shadow-md"
        >
          Sign Up
        </button>
      </div>
    </nav>
  );
};

export default Navbar;