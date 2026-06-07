import React, { useEffect, useRef } from 'react';

interface FloatingMusicBgProps {
  theme: 'light' | 'dark';
}

export default function FloatingMusicBg({ theme }: FloatingMusicBgProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Track resize
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Elegant Light Dust Particles
    interface FlowParticle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      angle: number;
      angleSpeed: number;
      opacity: number;
      color: string;
      glowSize: number;
    }

    const maxParticles = 110; // Richer density for micro-particles
    const particles: FlowParticle[] = [];

    // Diversified premium color palette for a vibrant yet elegant ambient feel
    const getThemeColors = (isDark: boolean) => {
      if (isDark) {
        return [
          'rgba(56, 189, 248, ',  // Azure
          'rgba(52, 211, 153, ',  // Emerald
          'rgba(251, 113, 133, ', // Rose
          'rgba(251, 191, 36, ',  // Amber
          'rgba(129, 140, 248, ', // Indigo
          'rgba(34, 211, 238, ',  // Cyan
        ];
      } else {
        return [
          'rgba(2, 132, 199, ',   // Blue
          'rgba(5, 150, 105, ',   // Green
          'rgba(225, 29, 72, ',   // Crimson
          'rgba(217, 119, 6, ',   // Orange
          'rgba(79, 70, 229, ',   // Royal
          'rgba(8, 145, 178, ',   // Teal
        ];
      }
    };

    const createParticle = (isInit = false): FlowParticle => {
      const colors = getThemeColors(theme === 'dark');
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const pSize = 0.4 + Math.random() * 2.2; // Slightly varied sizes

      // Large particles get more diffuse glow/blur to mimic depth-of-field bokeh
      const glowScale = pSize > 1.6 ? 10 + Math.random() * 10 : 3 + Math.random() * 4;

      return {
        x: Math.random() * width,
        y: Math.random() * height,
        size: pSize,
        // Increased and more varied 2D drift velocities
        speedX: (Math.random() - 0.5) * 0.45, 
        speedY: (Math.random() - 0.5) * 0.4,
        angle: Math.random() * Math.PI * 2,
        angleSpeed: 0.003 + Math.random() * 0.012,
        // Balanced translucency
        opacity: pSize > 1.6 ? 0.08 + Math.random() * 0.15 : 0.15 + Math.random() * 0.3,
        color: randomColor,
        glowSize: glowScale,
      };
    };

    // Initialize particles uniformly
    for (let i = 0; i < maxParticles; i++) {
      particles.push(createParticle(true));
    }

    // 4 Layered elegant fluid curves
    interface FlowCurve {
      amplitude: number;
      frequency: number;
      speed: number;
      offset: number;
      yRatio: number;
      colorLight: string;
      colorDark: string;
      lineWidth: number;
    }

    const curves: FlowCurve[] = [
      {
        amplitude: 60,
        frequency: 0.0012,
        speed: 0.002,
        offset: 0,
        yRatio: 0.4,
        colorLight: 'rgba(56, 189, 248, 0.15)', // Cyan wave
        colorDark: 'rgba(6, 182, 212, 0.25)',
        lineWidth: 1.5,
      },
      {
        amplitude: 85,
        frequency: 0.0008,
        speed: -0.0015,
        offset: Math.PI / 4,
        yRatio: 0.55,
        colorLight: 'rgba(129, 140, 248, 0.12)', // Royal wave
        colorDark: 'rgba(79, 70, 229, 0.22)',
        lineWidth: 2.2,
      },
      {
        amplitude: 45,
        frequency: 0.002,
        speed: 0.003,
        offset: Math.PI / 1.5,
        yRatio: 0.45,
        colorLight: 'rgba(244, 114, 182, 0.08)', // Rose gold wave
        colorDark: 'rgba(236, 72, 153, 0.18)',
        lineWidth: 1.0,
      },
      {
        amplitude: 70,
        frequency: 0.0006,
        speed: 0.001,
        offset: Math.PI,
        yRatio: 0.5,
        colorLight: 'rgba(167, 139, 250, 0.14)', // Purple tide
        colorDark: 'rgba(139, 92, 246, 0.26)',
        lineWidth: 1.8,
      },
    ];

    // Animation Loop
    const render = () => {
      if (!ctx || !canvas) return;

      const isDark = theme === 'dark';

      // 1. Draw Apple-like premium gradient background
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      if (isDark) {
        bgGrad.addColorStop(0, '#030712');   // Gray 950
        bgGrad.addColorStop(0.4, '#0d1527'); // Custom deep midnight blue
        bgGrad.addColorStop(0.8, '#0b0f19'); // Deep slate
        bgGrad.addColorStop(1, '#020617');   // Sky deepest
      } else {
        bgGrad.addColorStop(0, '#f8fafc');   // Pure slate-50
        bgGrad.addColorStop(0.5, '#ecfefe'); // Beautiful minty cyan sky tint
        bgGrad.addColorStop(1, '#f1f5f9');   // Soft white-blue sand
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Organic Flowing Ribbon Curves
      curves.forEach((curve) => {
        curve.offset += curve.speed;
        ctx.beginPath();
        ctx.lineWidth = curve.lineWidth;
        ctx.strokeStyle = isDark ? curve.colorDark : curve.colorLight;

        // Apply visual neon-glow in dark mode for elegant vector presentation
        if (isDark) {
          ctx.shadowColor = cvColorToOpaque(curve.colorDark);
          ctx.shadowBlur = 8;
        } else {
          ctx.shadowBlur = 0;
        }

        for (let x = 0; x <= width; x += 8) {
          const yBase = height * curve.yRatio;
          // Smooth sine-wave sequence
          const wave = Math.sin(x * curve.frequency + curve.offset);
          // Gently taper edges so lines flow out gracefully at screens ends
          const envelope = Math.sin((x / width) * Math.PI);
          const y = yBase + wave * curve.amplitude * envelope;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      // Clear general shadow blur to avoid performance hits
      ctx.shadowBlur = 0;

      // 3. Draw Organic Floating Particles
      particles.forEach((p) => {
        // Move particle slowly in its own random 2D hover vector
        p.x += p.speedX;
        p.y += p.speedY;
        p.angle += p.angleSpeed;

        // Micro atmospheric sinusoidal wave overlay to look organic
        p.x += Math.cos(p.angle) * 0.05;
        p.y += Math.sin(p.angle) * 0.05;

        // Seamless boundary wrap-around to maintain infinite uniform distribution
        const buffer = p.size + p.glowSize;
        if (p.x < -buffer) p.x = width + buffer;
        if (p.x > width + buffer) p.x = -buffer;
        if (p.y < -buffer) p.y = height + buffer;
        if (p.y > height + buffer) p.y = -buffer;

        // Draw Ambient Orb Glowing Canvas Particle
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);

        // Alpha multiplier based on screen depth
        const depthAlpha = p.opacity;
        ctx.fillStyle = `${p.color}${depthAlpha})`;

        // Glow layer for elegance (radial bloom fallback using shadowColor)
        ctx.shadowColor = `${p.color}${depthAlpha * 0.95})`;
        ctx.shadowBlur = p.glowSize;

        ctx.fill();
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    // Helper functions
    const cvColorToOpaque = (rgbaStr: string) => {
      // Strips "rgba(r,g,b,alpha)" into solid glow string
      const match = rgbaStr.match(/rgba\(\d+,\s*\d+,\s*\d+,/);
      return match ? `${match[0]} 0.8)` : rgbaStr;
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
