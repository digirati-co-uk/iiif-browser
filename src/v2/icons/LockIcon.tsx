import { SVGProps } from "react";

export function LockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 14 14"
      width="1em"
      height="1em"
      {...props}
    >
      <g fill="none" fillRule="evenodd">
        <path d="M0 0h14v14H0z" />
        <path d="M0 0h14v14H0z" opacity={0.87} />
        <path
          fill="#67E291"
          fillRule="nonzero"
          d="M3 12h7V6H3v6Zm3.5-4.2c.642 0 1.167.54 1.167 1.2 0 .66-.525 1.2-1.167 1.2S5.333 9.66 5.333 9c0-.66.525-1.2 1.167-1.2Z"
          opacity={0.3}
        />
        <path
          fill="#2EA449"
          fillRule="nonzero"
          d="M9.875 5h-.563V3.857C9.313 2.28 8.053 1 6.5 1 4.947 1 3.687 2.28 3.687 3.857V5h-.562C2.506 5 2 5.514 2 6.143v5.714C2 12.486 2.506 13 3.125 13h6.75c.619 0 1.125-.514 1.125-1.143V6.143C11 5.514 10.494 5 9.875 5ZM4.812 3.857c0-.948.754-1.714 1.688-1.714.934 0 1.688.766 1.688 1.714V5H4.812V3.857Zm5.063 8h-6.75V6.143h6.75v5.714ZM6.5 10.143c.619 0 1.125-.514 1.125-1.143S7.119 7.857 6.5 7.857 5.375 8.371 5.375 9s.506 1.143 1.125 1.143Z"
        />
      </g>
    </svg>
  );
}
