"use client";

export default function Loader() {
  return (
    <div className="fl-loader-overlay">
      <div className="fl-loader-wheel-wrap">
        <img
          src="/steering-wheel.png"
          alt="Loading"
          className="fl-loader-wheel"
        />
      </div>
    </div>
  );
}
