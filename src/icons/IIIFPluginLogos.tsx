import type { SVGProps } from "react";

export const IIIFLogo = ({
  mono = true,
  ...props
}: SVGProps<SVGSVGElement> & { mono?: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlSpace="preserve"
    width="1em"
    height="1em"
    {...props}
    viewBox="0 0 493.36 441.333"
  >
    <path
      d="m65.242 2178.75 710-263.75-1.25-1900-708.75 261.25v1902.5m738.903 461.34c81.441-240.91-26.473-436.2-241.04-436.2-214.558 0-454.511 195.29-535.953 436.2-81.433 240.89 26.48 436.18 241.039 436.18 214.567 0 454.512-195.29 535.954-436.18"
      style={{
        fill: mono ? "currentColor" : "#2873ab",
        fillOpacity: 1,
        fillRule: "nonzero",
        stroke: "none",
      }}
      transform="matrix(.13333 0 0 -.13333 0 441.333)"
    />
    <path
      d="M1678.58 2178.75 968.578 1915l1.25-1900 708.752 261.25v1902.5m-743.498 461.34c-81.437-240.91 26.477-436.2 241.038-436.2 214.56 0 454.51 195.29 535.96 436.2 81.43 240.89-26.48 436.18-241.04 436.18-214.57 0-454.52-195.29-535.958-436.18"
      style={{
        fill: mono ? "currentColor" : "#ed1d33",
        fillOpacity: 1,
        fillRule: "nonzero",
        stroke: "none",
      }}
      transform="matrix(.13333 0 0 -.13333 0 441.333)"
    />
    <path
      d="m1860.24 2178.75 710-263.75-1.25-1900-708.75 261.25v1902.5m743.5 461.34c81.45-240.91-26.47-436.2-241.03-436.2-214.58 0-454.52 195.29-535.96 436.2-81.44 240.89 26.48 436.18 241.03 436.18 214.57 0 454.51-195.29 535.96-436.18"
      style={{
        fill: mono ? "currentColor" : "#2873ab",
        fillOpacity: 1,
        fillRule: "nonzero",
        stroke: "none",
      }}
      transform="matrix(.13333 0 0 -.13333 0 441.333)"
    />
    <path
      d="M3700.24 3310v-652.5s-230 90-257.5-142.5c-2.5-247.5 0-336.25 0-336.25l257.5 83.75V1690l-258.61-92.5v-1335L2735.24 0v2360s-15 850 965 950"
      style={{
        fill: mono ? "currentColor" : "#ed1d33",
        fillOpacity: 1,
        fillRule: "nonzero",
        stroke: "none",
      }}
      transform="matrix(.13333 0 0 -.13333 0 441.333)"
    />
  </svg>
);

type IIIFPluginLogoProps = SVGProps<SVGSVGElement> & { mono?: boolean };

export const IIIFImageLogo = ({
  mono = true,
  ...props
}: IIIFPluginLogoProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="0 0 512 512"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <rect
      x="72"
      y="48"
      width="416"
      height="368"
      rx="32"
      fill="none"
      stroke={mono ? "currentColor" : "#2873ab"}
      strokeWidth="24"
    />
    <rect
      x="24"
      y="96"
      width="416"
      height="368"
      rx="32"
      fill="white"
      stroke="white"
      strokeWidth="40"
    />
    <rect
      x="24"
      y="96"
      width="416"
      height="368"
      rx="32"
      fill="white"
      stroke={mono ? "currentColor" : "#2873ab"}
      strokeWidth="24"
    />
    <IIIFLogo x="48" y="116" width="368" height="329" mono={mono} />
  </svg>
);

export const IIIFSnippetLogo = ({
  mono = true,
  ...props
}: IIIFPluginLogoProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="0 0 512 512"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <IIIFLogo x="28" y="38" width="410" height="367" mono={mono} />
    <circle
      cx="402"
      cy="394"
      r="96"
      fill={mono ? "currentColor" : "#ed1d33"}
      stroke="white"
      strokeWidth="18"
    />
    <path
      d="M402 346v96m-48-48h96"
      fill="none"
      stroke="white"
      strokeWidth="20"
      strokeLinecap="round"
    />
  </svg>
);

export const IIIFPluginLogo = ({
  icon,
  width = "1.3em",
  height = "1.3em",
  ...props
}: IIIFPluginLogoProps & { icon: "stack" | "add" }) =>
  icon === "stack" ? (
    <IIIFImageLogo width={width} height={height} {...props} />
  ) : (
    <IIIFSnippetLogo width={width} height={height} {...props} />
  );
