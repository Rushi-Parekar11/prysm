import React from "react";
import prysmLogo from "../assets/prysm_logo.svg";

function Navbar() {
  return (
    <div className="h-16 w-full bg-white border border-[#e2e8f0] flex items-center justify-between px-6">
      <div className="flex items-center space-x-8">
        <div className="flex items-center space-x-2">
          <img src={prysmLogo} alt="Prysm Logo" className="h-10 w-auto" />
          <span className="font-bold text-xl">Prysm</span>
        </div>

        <ul className="flex space-x-6 text-gray-700 font-medium ml-6">
          <li className="hover:text-blue-600 cursor-pointer">Screener</li>
          <li className="hover:text-blue-600 cursor-pointer">Pulse</li>
          <li className="hover:text-blue-600 cursor-pointer">Discovery</li>
          <li className="hover:text-blue-600 cursor-pointer">Accounts</li>
          <li className="hover:text-blue-600 cursor-pointer">Analyze</li>
          <li className="hover:text-blue-600 cursor-pointer">Pricing</li>
        </ul>
      </div>

      <div className="flex items-center space-x-4">
        <button className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium">
          Login
        </button>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          Sign Up
        </button>
      </div>
    </div>
  );
}

export default Navbar;
