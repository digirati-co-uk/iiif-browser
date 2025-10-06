import { useRenderingStrategy } from "react-iiif-vault";

export function CanvasThumbnailFallback() {
  const [strategy] = useRenderingStrategy();

  if (strategy.type === "media") {
    return <div className="w-full h-full text-gray-500/20 flex items-center justify-center"><VideoFileIcon className="w-12 h-12" /></div>;
  }

  return null;
}


export function VideoFileIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>{/* Icon from Google Material Icons by Material Design Authors - https://github.com/material-icons/material-icons/blob/master/LICENSE */}<path fill="currentColor" d="M14 2H6.01a2 2 0 0 0-2 2L4 20c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8zm-1 7V3.5L18.5 9zm1 5l2-1.06v4.12L14 16v1c0 .55-.45 1-1 1H9c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h4c.55 0 1 .45 1 1z" /></svg>
  )
}
