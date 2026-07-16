import { IIIFImageLogo, IIIFSnippetLogo } from "./IIIFPluginLogos";

export default { title: "Icons/IIIF plugin logos" };

const logos = [
  ["IIIF image — stack", IIIFImageLogo],
  ["IIIF snippet — add", IIIFSnippetLogo],
] as const;

export const Review = () => (
  <div
    style={{
      display: "grid",
      gap: "2rem",
      maxWidth: "42rem",
      fontFamily: "system-ui, sans-serif",
    }}
  >
    {logos.map(([label, Logo]) => (
      <section key={label}>
        <h2 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>{label}</h2>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1.5rem",
            color: "#202124",
          }}
        >
          {[24, 48, 96].map((size) => (
            <div
              key={size}
              style={{ display: "grid", gap: "0.5rem", textAlign: "center" }}
            >
              <Logo width={size} height={size} />
              <small>{size}px</small>
            </div>
          ))}
          <div style={{ display: "grid", gap: "0.5rem", textAlign: "center" }}>
            <Logo width={96} height={96} mono={false} />
            <small>colour</small>
          </div>
        </div>
      </section>
    ))}
  </div>
);
