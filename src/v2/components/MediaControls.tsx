import { useMediaElements, useMediaState, useMediaActions, formatTime } from "react-iiif-vault";
import { useRef, useState, useCallback } from "react";
import { Button } from "react-aria-components";

export function MediaControls() {
  const { progress, currentTime } = useMediaElements();
  const { duration, isMuted, volume, isPlaying, playRequested } = useMediaState();
  const { play, pause, setVolume, toggleMute, setDurationPercent } = useMediaActions();
  const durationFormatted = formatTime(duration);
  const currentTimeFormatted = <span ref={currentTime}>0:00</span>;

  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {

    const { left, width } = e.currentTarget.getBoundingClientRect();
    const percent = (e.pageX - left) / width;
    setDurationPercent(percent);

  }, [setDurationPercent]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  }, [setVolume]);

  const progressPercent = (duration && Number(duration) > 0) ? ((Number(progress) || 0) * 100) : 0;

  return (
    <div className="flex items-center gap-3 p-3 bg-white  border-b border-gray-200 font-sans text-sm min-w-[400px]">
      {/* Play/Pause Button */}
      <Button
        isDisabled={playRequested}
        onPress={isPlaying ? pause : play}
        className="flex items-center justify-center w-10 h-10 rounded-full border-none bg-gray-100 hover:bg-gray-200 cursor-pointer transition-all duration-200 text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPlaying ? (
          <PauseIcon className="text-xl" />
        ) : (
          <PlayArrowIcon className="text-xl" />
        )}
      </Button>

      {/* Current Time */}
      <span className="text-gray-600 min-w-[40px] text-right tabular-nums">
        {currentTimeFormatted}
      </span>

      {/* Progress Bar */}
      <div
        onClick={handleProgressClick}
        className="flex-1 h-1.5 bg-gray-200 group rounded-full cursor-pointer relative overflow-hidden hover:h-2 transition-all duration-200"
      >
        <div
          ref={progress}
          className="h-full bg-blue-600 relative rounded-full w-full transition-all duration-100 pointer-events-none"
        >
          <div className="absolute right-0 opacity-0 transition-opacity bg-blue-700 group-hover:opacity-100 h-full w-1"></div>
        </div>
      </div>

      {/* Duration */}
      <span className="text-gray-600 min-w-[40px] tabular-nums">
        {durationFormatted}
      </span>

      {/* Volume Controls */}
      <div
        className="flex items-center"
        onMouseEnter={() => setShowVolumeSlider(true)}
        onMouseLeave={() => setShowVolumeSlider(false)}
      >
        <button
          onClick={toggleMute}
          className="flex items-center justify-center w-8 h-8 rounded border-none bg-transparent hover:bg-gray-100 cursor-pointer text-gray-600 hover:text-gray-800 transition-all duration-200"
        >
          {isMuted ? (
            <VolumeOffIcon className="text-lg" />
          ) : volume > 0.5 ? (
            <VolumeUpIcon className="text-lg" />
          ) : (
            <VolumeMuteIcon className="text-lg" />
          )}
        </button>

        {/* Inline Volume Slider */}
        <div
          className={`overflow-hidden transition-all duration-300 ${
            showVolumeSlider ? 'w-20 opacity-100 ml-2' : 'w-0 opacity-0'
          }`}
        >
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="iiif-browser-range w-20 h-1 rounded-full outline-none cursor-pointer bg-gray-200 appearance-none"
            style={{
              background: `linear-gradient(to right, #2563eb 0%, #2563eb ${(isMuted ? 0 : volume) * 100}%, #e5e7eb ${(isMuted ? 0 : volume) * 100}%, #e5e7eb 100%)`
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function PlayArrowIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>{/* Icon from Google Material Icons by Material Design Authors - https://github.com/material-icons/material-icons/blob/master/LICENSE */}<path fill="currentColor" d="M8 5v14l11-7z" /></svg>
  )
}
export function PauseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>{/* Icon from Google Material Icons by Material Design Authors - https://github.com/material-icons/material-icons/blob/master/LICENSE */}<path fill="currentColor" d="M6 19h4V5H6zm8-14v14h4V5z" /></svg>
  )
}

export function VolumeOffIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>{/* Icon from Google Material Icons by Material Design Authors - https://github.com/material-icons/material-icons/blob/master/LICENSE */}<path fill="currentColor" d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63m2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71M4.27 3L3 4.27L7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a9 9 0 0 0 3.69-1.81L19.73 21L21 19.73l-9-9zM12 4L9.91 6.09L12 8.18z" /></svg>
  )
}

export function VolumeUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>{/* Icon from Google Material Icons by Material Design Authors - https://github.com/material-icons/material-icons/blob/master/LICENSE */}<path fill="currentColor" d="M3 9v6h4l5 5V4L7 9zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77" /></svg>
  )
}

export function VolumeMuteIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>{/* Icon from Google Material Icons by Material Design Authors - https://github.com/material-icons/material-icons/blob/master/LICENSE */}<path fill="currentColor" d="M7 9v6h4l5 5V4l-5 5z" /></svg>
  )
}
