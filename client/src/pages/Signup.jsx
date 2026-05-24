import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      // Optional: store name locally (Firebase doesn't store name automatically here)
      console.log("User created:", user.uid, name);

      alert("Account created successfully!");
      navigate("/");
    } catch (error) {
      alert(error.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center px-6">
      
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10 border border-gray-100">
        
        {/* Header */}
        <h1 className="text-3xl font-bold text-green-700 text-center mb-2">
          Create Account
        </h1>
        <p className="text-gray-500 text-center mb-8">
          Join Proton for smart environmental tracking
        </p>

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-5">

          <div>
            <label className="text-sm text-gray-600">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-2 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-green-500"
              placeholder="Enter your name"
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-2 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-green-500"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-2 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-green-500"
              placeholder="Create a password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition shadow-lg disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-sm text-center text-gray-500 mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-green-600 font-medium">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}