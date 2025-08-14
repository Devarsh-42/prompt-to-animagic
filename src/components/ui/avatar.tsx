import React from "react";

interface AvatarProps {
  name?: string;
  src?: string;
  size?: number; // px
  className?: string;
  alt?: string;
}

/**
 * Simple avatar that shows user image if provided,
 * otherwise renders the first letter of the name with a visible background.
 */
const Avatar: React.FC<AvatarProps> = ({ name, src, size = 40, className = "", alt }) => {
  const initial = name ? name.trim().charAt(0).toUpperCase() : "?";
  const dimension = `${size}px`;

  const wrapperStyle: React.CSSProperties = {
    width: dimension,
    height: dimension,
    lineHeight: dimension,
    fontSize: Math.max(12, Math.floor(size / 2.5)),
  };

  return (
    <div
      title={name}
      aria-label={name || "User avatar"}
      style={wrapperStyle}
      className={`inline-flex items-center justify-center rounded-full overflow-hidden border border-white/20 ${className}`}
    >
      {src ? (
        <img src={src} alt={alt || name || "avatar"} className="w-full h-full object-cover" />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center font-medium text-white"
          style={{
            background:
              "linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)", // visible gradient on dark bg
            boxShadow: "inset 0 -2px 6px rgba(0,0,0,0.25)",
          }}
        >
          {initial}
        </div>
      )}
    </div>
  );
};

export default Avatar;
