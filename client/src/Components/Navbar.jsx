import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";

const Navbar = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [currentUser, setCurrentUser] = useState("");
  // Firebase auth — unchanged logic, moved into useEffect to avoid re-subscribing on every render
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user.displayName);
        console.log(`User signed in: ${user.displayName} (${user.email})`);
      } else {
        console.log("No user is signed in.");
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/70 backdrop-blur-2xl border-b border-white/80 shadow-sm"
            : "bg-white/40 backdrop-blur-xl"
        }`}
      >
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
          <button className="text-xl font-bold text-emerald-700 tracking-tight cursor-pointer" onClick = { () => navigate("/") }>
            Proton
          </button>

          <NavigationMenu>
            <NavigationMenuList className="flex gap-1">
              {["Features", "About", "Dashboard"].map((item) => (
                <NavigationMenuItem key={item}>
                  <NavigationMenuLink
                    href={`/${item.toLowerCase()}`}
                    className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-white/60 rounded-xl transition-all duration-200"
                  >
                    {item}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>

          {/* Show user display name if signed in */}
          {currentUser ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-600">
                👋 {currentUser}
              </span>
              <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-semibold text-sm">
                {currentUser.charAt(0).toUpperCase()}
              </div>
            </div>
          ) : (
           
            <Button
          onClick={() => navigate("/login")}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-200 text-sm font-medium px-4"
        >
          Login
        </Button>
          )}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
