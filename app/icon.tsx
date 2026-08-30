import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #ef4444 0%, #7c3aed 52%, #2563eb 100%)",
          color: "white",
          fontSize: 230,
          fontWeight: 900,
          borderRadius: 100,
        }}
      >
        ¥
      </div>
    ),
    size
  );
}
