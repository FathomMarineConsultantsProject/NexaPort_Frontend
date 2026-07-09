import { useState } from "react";
import "./ConsultantAvatar.css";

export default function ConsultantAvatar({
  photoUrl,
  name,
  className,
  fallback = "E",
  alt,
}) {
  const [failedUrl, setFailedUrl] = useState(null);
  const imageFailed = failedUrl === photoUrl;

  const initial = name?.trim()?.[0]?.toUpperCase() || fallback;

  return (
    <div className={className}>
      {photoUrl && !imageFailed ? (
        <img
          className="consultant-avatar-image"
          src={photoUrl}
          alt={alt || `${name || "Consultant"} profile`}
          onError={() => setFailedUrl(photoUrl)}
        />
      ) : (
        initial
      )}
    </div>
  );
}
