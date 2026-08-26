import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Zap, Shield, Users, ArrowRight, Sun, Moon } from 'lucide-react';

const Landing = () => {
  const [isDark, setIsDark] = useState(true);

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-200 selection:bg-indigo-500/30' : 'bg-slate-50 text-slate-800 selection:bg-indigo-200/50'}`}>
      {/* Background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[25%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[40%] rounded-full bg-blue-600/10 blur-[100px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12 lg:px-24">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-500 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
            <MessageSquare className="text-white" size={24} />
          </div>
          <span className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>ChatFlow</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsDark(!isDark)}
            className={`p-2 rounded-full transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <Link 
            to="/login" 
            className={`text-sm font-medium transition-colors ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Log in
          </Link>
          <Link 
            to="/register" 
            className={`text-sm font-medium px-4 py-2 rounded-full transition-all duration-300 ${isDark ? 'bg-white text-slate-950 hover:bg-slate-200 shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_rgba(255,255,255,0.5)]' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-[0_0_15px_rgba(0,0,0,0.1)] hover:shadow-[0_0_25px_rgba(0,0,0,0.2)]'}`}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 pt-20 pb-32 text-center md:pt-32 lg:px-24">
        <div className={`inline-flex items-center gap-2 px-3 py-1 mb-8 text-sm font-medium border rounded-full backdrop-blur-sm ${isDark ? 'text-indigo-300 border-indigo-500/30 bg-indigo-500/10' : 'text-indigo-600 border-indigo-200 bg-indigo-50'}`}>
          <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
          The new standard for team communication
        </div>
        
        <h1 className={`max-w-4xl text-5xl font-extrabold tracking-tight md:text-7xl pb-2 ${isDark ? 'text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400' : 'text-slate-900'}`}>
          Connect your workspace, <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">
            elevate your workflow.
          </span>
        </h1>
        
        <p className={`max-w-2xl mt-6 text-lg md:text-xl ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          A premium, lightning-fast chat platform designed to bring your team's ideas, conversations, and projects into one unified space.
        </p>

        <div className="flex flex-col gap-4 mt-10 sm:flex-row">
          <Link 
            to="/register" 
            className="group flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-full font-semibold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(79,70,229,0.4)]"
          >
            Start your workspace 
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link 
            to="/login" 
            className={`flex items-center justify-center px-8 py-4 font-semibold transition-all duration-300 border rounded-full ${isDark ? 'text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white' : 'text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900'}`}
          >
            Sign into existing
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid w-full max-w-5xl grid-cols-1 gap-6 mt-32 md:grid-cols-3">
          {/* Feature 1 */}
          <div className={`flex flex-col items-center p-8 border text-center transition-all duration-300 rounded-2xl hover:-translate-y-1 ${isDark ? 'bg-slate-900/50 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/80' : 'bg-white border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md'}`}>
            <div className={`p-4 mb-4 rounded-2xl ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
              <Zap size={32} />
            </div>
            <h3 className={`mb-2 text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Real-time Speed</h3>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Experience instant messaging with WebSockets. No delays, just seamless communication.</p>
          </div>

          {/* Feature 2 */}
          <div className={`flex flex-col items-center p-8 border text-center transition-all duration-300 rounded-2xl hover:-translate-y-1 ${isDark ? 'bg-slate-900/50 border-slate-800 hover:border-purple-500/50 hover:bg-slate-900/80' : 'bg-white border-slate-200 shadow-sm hover:border-purple-300 hover:shadow-md'}`}>
            <div className={`p-4 mb-4 rounded-2xl ${isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
              <Users size={32} />
            </div>
            <h3 className={`mb-2 text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Organized Channels</h3>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Keep conversations focused with dedicated channels for projects, teams, and topics.</p>
          </div>

          {/* Feature 3 */}
          <div className={`flex flex-col items-center p-8 border text-center transition-all duration-300 rounded-2xl hover:-translate-y-1 ${isDark ? 'bg-slate-900/50 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/80' : 'bg-white border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md'}`}>
            <div className={`p-4 mb-4 rounded-2xl ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
              <Shield size={32} />
            </div>
            <h3 className={`mb-2 text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Secure & Private</h3>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Your data is yours. End-to-end security ensures your team's conversations stay private.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`relative z-10 py-8 text-sm text-center border-t ${isDark ? 'text-slate-500 border-slate-800/50' : 'text-slate-400 border-slate-200'}`}>
        <p>© {new Date().getFullYear()} ChatFlow. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Landing;
