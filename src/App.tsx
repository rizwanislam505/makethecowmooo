/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Analytics } from '@vercel/analytics/react';
import desktopCowImg from './assets/desktop_cow.png';
import mobileCowImg from './assets/mobile_cow.png';
import mooAudioFile from './assets/moo.mp3';

export default function App() {
  const [isPressed, setIsPressed] = useState(false);
  const [adClicked, setAdClicked] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const decodedBufferRef = useRef<AudioBuffer | null>(null);
  const htmlAudioPoolRef = useRef<HTMLAudioElement[]>([]);
  const poolIndexRef = useRef(0);

  // Preload and decode audio into memory for 0ms ultra-low latency playback
  useEffect(() => {
    // 1. Create HTML5 Audio backup pool with local file
    htmlAudioPoolRef.current = Array.from({ length: 8 }, () => {
      const audio = new Audio(mooAudioFile);
      audio.preload = 'auto';
      return audio;
    });

    // 2. Fetch and decode audio buffer via XHR (bypasses extension fetch wrappers)
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', mooAudioFile, true);
      xhr.responseType = 'arraybuffer';
      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 0) {
          const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (!audioContextRef.current) {
            audioContextRef.current = new AudioCtx();
          }
          audioContextRef.current.decodeAudioData(
            xhr.response,
            (decoded) => {
              decodedBufferRef.current = decoded;
            },
            () => {}
          );
        }
      };
      xhr.send();
    } catch {
      // Handled via HTMLAudio fallback
    }

    // Preload local images into browser cache
    [desktopCowImg, mobileCowImg].forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Lightning-fast Moo trigger (< 1ms execution)
  const triggerMoo = useCallback(() => {
    // 1. Play from in-memory decoded Web Audio buffer if ready
    if (audioContextRef.current && decodedBufferRef.current) {
      try {
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const source = ctx.createBufferSource();
        source.buffer = decodedBufferRef.current;
        source.connect(ctx.destination);
        source.start(0);
      } catch {
        // Fallback to HTMLAudio
      }
    } else if (htmlAudioPoolRef.current.length > 0) {
      // 2. Instant HTML5 audio fallback
      try {
        const audio = htmlAudioPoolRef.current[poolIndexRef.current];
        poolIndexRef.current = (poolIndexRef.current + 1) % htmlAudioPoolRef.current.length;
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } catch {
        // ignore
      }
    }

    // 3. Tactile feedback
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 160);
  }, []);

  // Global keyboard shortcuts (Space, Enter, M)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Space' || e.code === 'Enter' || e.key.toLowerCase() === 'm') {
        e.preventDefault();
        triggerMoo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerMoo]);

  return (
    <main
      className="relative w-screen h-screen overflow-hidden select-none cursor-pointer bg-black"
      onPointerDown={triggerMoo}
      role="button"
      tabIndex={0}
      aria-label="Click anywhere to moo!"
    >
      {/* ================= DESKTOP & TABLET VIEW (md and up) ================= */}
      <img
        src={desktopCowImg}
        alt="Desktop Cow Background"
        className={`hidden md:block absolute inset-0 w-full h-full object-cover object-center pointer-events-none transition-transform duration-100 ease-out will-change-transform ${
          isPressed ? 'scale-[1.015]' : 'scale-100'
        }`}
      />

      {/* ================= MOBILE VIEW (small screens) ================= */}
      <img
        src={mobileCowImg}
        alt="Mobile Cow Background"
        className={`block md:hidden absolute inset-0 w-full h-full object-cover object-center pointer-events-none transition-transform duration-100 ease-out will-change-transform ${
          isPressed ? 'scale-[1.015]' : 'scale-100'
        }`}
      />

      {/* Bottom text: High-visibility spammy/clickbait link or funny post-click reveal */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-auto text-center px-4 w-full max-w-sm">
        {!adClicked ? (
          <a
            href="https://www.profitableratecpmnetwork.com/cgakk4hn1?key=6edfcbda84a8b3c62c5dc8231e99b2ce"
            target="_blank"
            rel="noopener noreferrer"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setAdClicked(true);
            }}
            className="inline-flex items-center gap-1.5 text-xs md:text-sm font-bold text-yellow-300 hover:text-yellow-200 no-underline hover:underline underline-offset-2 decoration-yellow-300 transition-all duration-150 animate-pulse drop-shadow-[0_2px_4px_rgba(0,0,0,1)] cursor-pointer select-none"
          >
            <span>👉</span>
            <span className="tracking-wide uppercase">Don't click here</span>
            <span>👈</span>
          </a>
        ) : (
          <p
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-semibold text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] select-none transition-all duration-300"
          >
            haha it was an ad. I fooled you, but it will help me pay my hosting fees. 🐮
          </p>
        )}
      </div>

      {/* Vercel Web Analytics */}
      <Analytics />
    </main>
  );
}
