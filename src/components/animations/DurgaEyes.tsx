'use client'

// src/components/animations/DurgaEyes.tsx - 5s seamless cycle, inlined from user HTML
export default function DurgaEyes() {
  return (
    <div className="durga-eyes-wrap w-full max-w-[300px] md:max-w-[420px] mx-auto flex justify-center items-center">
      <svg viewBox="-5 -5 100 80" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" className="durga-eyes-svg">
        <defs>
          <radialGradient id="a1-iris-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF176" />
            <stop offset="45%" stopColor="#FFD60A" />
            <stop offset="75%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#78350F" />
          </radialGradient>
          <radialGradient id="a1-sclera-depth" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="85%" stopColor="#060913" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>
          <linearGradient id="a1-gold-linear" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFBEB" />
            <stop offset="30%" stopColor="#FDE047" />
            <stop offset="70%" stopColor="#EAB308" />
            <stop offset="100%" stopColor="#CA8A04" />
          </linearGradient>
          <radialGradient id="a1-specular-glow" cx="35%" cy="35%" r="45%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#FEF08A" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#FFD60A" stopOpacity="0" />
          </radialGradient>
          <clipPath id="a1-left-eye-clip">
            <path d="M65.277,31.619c-2.509,0.425-4.572,1.542-6.431,2.551c-5.997,3.256-8.806,8.153-8.806,8.153s-1.393,1.016,4.849,2.598 c5.151,1.148,8.831,0.444,11.631-1.059c1.979-1.061,3.521-2.521,4.841-4.007c0.777-0.88,1.479-1.769,2.146-2.591 c0.74-0.913,1.564-1.821,2.396-2.681c0.676-0.698,1.357-1.367,2.01-1.981c2.209-2.088,4.06-3.565,4.06-3.565 C70.915,32.864,76.144,29.485,65.277,31.619z" />
          </clipPath>
          <clipPath id="a1-right-eye-clip">
            <path d="M39.287,41.865c-0.507-0.875-2.17-3.655-5.034-5.967c-2.863-2.312-6.926-4.156-11.2-4.479 c-3.241-0.246-6.091,0.026-8.348-0.289c-4.058-0.565-6.315-1.696-6.315-1.696c5.048,4.865,5.048,4.865,7.551,7.974 c2.669,3.312,5.635,6.362,11.274,7.382C32.855,45.808,40.301,43.614,39.287,41.865z" />
          </clipPath>
          <filter id="a1-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <g id="eyes-group" fill="none" stroke="#FFD60A" strokeLinecap="round" strokeLinejoin="round">
          <g className="motion-brows">
            <path d="M48.992,37.248 c0,0,4.744-7.667,16.025-10.027s16.956-3.01,21.325-5.51c0,0-7.078,2.25-22.226,3.028 C58.098,24.739,48.772,29.803,48.992,37.248z" fill="none" stroke="url(#a1-gold-linear)" strokeWidth="0.9" strokeOpacity="0.9" />
            <path d="M68 25.5 C72 23.5, 77 21.8, 83 20.8" stroke="#FFD60A" strokeWidth="0.35" strokeOpacity="0.5" />
            <path d="M62 27.2 C66 25.6, 71 24.2, 76 23.5" stroke="#FFD60A" strokeWidth="0.25" strokeOpacity="0.4" />
            <path d="M41.772,37.242c0,0-3.829-7.109-13.528-9.486c-9.699-2.376-8.797-1.135-17.594-3.962c-6.302-2.083-6.991-3.051-6.991-3.051 s8.477,3.635,21.189,3.635C33.723,24.723,42.907,29.799,41.772,37.242z" fill="none" stroke="url(#a1-gold-linear)" strokeWidth="0.9" strokeOpacity="0.9" />
            <path d="M22 25.5 C18 23.5, 13 21.8, 7 20.8" stroke="#FFD60A" strokeWidth="0.35" strokeOpacity="0.5" />
            <path d="M28 27.2 C24 25.6, 19 24.2, 14 23.5" stroke="#FFD60A" strokeWidth="0.25" strokeOpacity="0.4" />
          </g>

          <g className="motion-bindi">
            <circle cx="45.68" cy="23.51" r="2.2" fill="#FFD60A" opacity="0.25" />
            <circle cx="45.68" cy="23.51" r="1.6" fill="url(#a1-gold-linear)" stroke="#FFF" strokeWidth="0.2" id="bindi" opacity="0.95" filter="url(#a1-glow)" />
          </g>

          <g className="motion-eyelid">
            <g id="right-eye-system">
              <path d="M39.287,41.865c-0.507-0.875-2.17-3.655-5.034-5.967c-2.863-2.312-6.926-4.156-11.2-4.479 c-3.241-0.246-6.091,0.026-8.348-0.289c-4.058-0.565-6.315-1.696-6.315-1.696c5.048,4.865,5.048,4.865,7.551,7.974 c2.669,3.312,5.635,6.362,11.274,7.382C32.855,45.808,40.301,43.614,39.287,41.865z" fill="url(#a1-sclera-depth)" stroke="#FFD60A" strokeWidth="0.75" />
              <g clipPath="url(#a1-right-eye-clip)">
                <g className="motion-iris" id="right-iris-group">
                  <circle cx="28.5" cy="39.2" r="4.2" stroke="#B45309" strokeWidth="0.6" fill="none" opacity="0.7" />
                  <circle cx="28.5" cy="39.2" r="3.8" fill="url(#a1-iris-grad)" />
                  <g stroke="#FFFBEB" strokeWidth="0.18" opacity="0.6" strokeLinecap="round">
                    <line x1="28.5" y1="36.0" x2="28.5" y2="37.2" />
                    <line x1="28.5" y1="41.2" x2="28.5" y2="42.4" />
                    <line x1="25.3" y1="39.2" x2="26.5" y2="39.2" />
                    <line x1="30.5" y1="39.2" x2="31.7" y2="39.2" />
                    <line x1="26.2" y1="36.9" x2="27.1" y2="37.8" />
                    <line x1="29.9" y1="40.6" x2="30.8" y2="41.5" />
                    <line x1="26.2" y1="41.5" x2="27.1" y2="40.6" />
                    <line x1="29.9" y1="37.8" x2="30.8" y2="36.9" />
                  </g>
                  <circle cx="28.5" cy="39.2" r="2.2" stroke="#FDE047" strokeWidth="0.3" fill="none" opacity="0.8" />
                  <g className="motion-pupil" style={{ transformOrigin: '28.5px 39.2px' }}>
                    <circle cx="28.5" cy="39.2" r="1.35" fill="#020617" />
                    <circle cx="28.5" cy="39.2" r="0.6" fill="#000000" />
                  </g>
                </g>
                <g className="motion-specular">
                  <circle cx="27.3" cy="37.8" r="1.2" fill="url(#a1-specular-glow)" />
                  <circle cx="27.1" cy="37.5" r="0.5" fill="#FFFFFF" opacity="0.9" />
                  <circle cx="29.8" cy="40.4" r="0.4" fill="#FFFFFF" opacity="0.5" />
                </g>
              </g>
              <path d="M23.881,41.74c0,0-3.487-1.243-8.106-8.354 c0,0,5.615-0.832,11.673,1.25c3.406,1.169,7,3.104,9.696,7.002C37.144,41.638,31.493,44.96,23.881,41.74z" fill="none" stroke="url(#a1-gold-linear)" strokeWidth="0.5" strokeOpacity="0.75" />
            </g>

            <g id="left-eye-system">
              <path d="M65.277,31.619c-2.509,0.425-4.572,1.542-6.431,2.551c-5.997,3.256-8.806,8.153-8.806,8.153s-1.393,1.016,4.849,2.598 c5.151,1.148,8.831,0.444,11.631-1.059c1.979-1.061,3.521-2.521,4.841-4.007c0.777-0.88,1.479-1.769,2.146-2.591 c0.74-0.913,1.564-1.821,2.396-2.681c0.676-0.698,1.357-1.367,2.01-1.981c2.209-2.088,4.06-3.565,4.06-3.565 C70.915,32.864,76.144,29.485,65.277,31.619z" fill="url(#a1-sclera-depth)" stroke="#FFD60A" strokeWidth="0.75" />
              <g clipPath="url(#a1-left-eye-clip)">
                <g className="motion-iris" id="left-iris-group">
                  <circle cx="61.2" cy="39.2" r="4.2" stroke="#B45309" strokeWidth="0.6" fill="none" opacity="0.7" />
                  <circle cx="61.2" cy="39.2" r="3.8" fill="url(#a1-iris-grad)" />
                  <g stroke="#FFFBEB" strokeWidth="0.18" opacity="0.6" strokeLinecap="round">
                    <line x1="61.2" y1="36.0" x2="61.2" y2="37.2" />
                    <line x1="61.2" y1="41.2" x2="61.2" y2="42.4" />
                    <line x1="58.0" y1="39.2" x2="59.2" y2="39.2" />
                    <line x1="63.2" y1="39.2" x2="64.4" y2="39.2" />
                    <line x1="58.9" y1="36.9" x2="59.8" y2="37.8" />
                    <line x1="62.6" y1="40.6" x2="63.5" y2="41.5" />
                    <line x1="58.9" y1="41.5" x2="59.8" y2="40.6" />
                    <line x1="62.6" y1="37.8" x2="63.5" y2="36.9" />
                  </g>
                  <circle cx="61.2" cy="39.2" r="2.2" stroke="#FDE047" strokeWidth="0.3" fill="none" opacity="0.8" />
                  <g className="motion-pupil" style={{ transformOrigin: '61.2px 39.2px' }}>
                    <circle cx="61.2" cy="39.2" r="1.35" fill="#020617" />
                    <circle cx="61.2" cy="39.2" r="0.6" fill="#000000" />
                  </g>
                </g>
                <g className="motion-specular">
                  <circle cx="60.0" cy="37.8" r="1.2" fill="url(#a1-specular-glow)" />
                  <circle cx="59.8" cy="37.5" r="0.5" fill="#FFFFFF" opacity="0.9" />
                  <circle cx="62.5" cy="40.4" r="0.4" fill="#FFFFFF" opacity="0.5" />
                </g>
              </g>
              <path d="M73.574,34.149c-0.709,1.245-1.736,2.336-2.526,3.292 c-1.402,1.695-2.632,2.962-4.112,3.903c-2.467,1.569-4.893,2.231-6.763,2.457c-1.864,0.224-3.816-0.25-5.271-0.762 c-1.373-0.484-2.304-1.001-2.304-1.001c0.717-0.788,1.438-1.511,2.159-2.171c2.285-2.093,4.312-3.771,6.482-4.812 c2.455-1.177,5.014-1.594,6.963-1.896c3.637-0.562,6.067-0.034,6.067-0.034L73.574,34.149z" fill="none" stroke="url(#a1-gold-linear)" strokeWidth="0.5" strokeOpacity="0.75" />
            </g>
          </g>
        </g>
      </svg>

      <style>{`
        .durga-eyes-svg {
          width: 100%;
          height: auto;
          overflow: visible;
          filter: drop-shadow(0 0 18px rgba(255,214,10,0.35)) drop-shadow(0 15px 30px rgba(0,0,0,0.6));
        }
        @keyframes gazeMovement {
          0%, 100% { transform: translate(0px, 0px); }
          18% { transform: translate(0px, -2px); }
          38% { transform: translate(-3.2px, -0.6px); }
          52% { transform: translate(-3px, -0.5px); }
          74% { transform: translate(3.5px, 0.4px); }
          84% { transform: translate(3px, 0.2px); }
          94%, 100% { transform: translate(0px, 0px); }
        }
        @keyframes pupilPulse {
          0%, 100% { transform: scale(1); }
          18% { transform: scale(1.15); }
          38%, 52% { transform: scale(0.9); }
          74%, 84% { transform: scale(1.08); }
          94% { transform: scale(1); }
        }
        @keyframes specularParallax {
          0%, 100% { transform: translate(0px, 0px); }
          18% { transform: translate(0px, 1.2px); }
          38%, 52% { transform: translate(1.8px, 0.4px); }
          74%, 84% { transform: translate(-2px, -0.3px); }
          94%, 100% { transform: translate(0px, 0px); }
        }
        @keyframes eyeBlink {
          0%, 10%, 16%, 58%, 64%, 100% { transform: scaleY(1); }
          13% { transform: scaleY(0.04); }
          61% { transform: scaleY(0.04); }
        }
        @keyframes browFlex {
          0%, 100% { transform: translateY(0px); }
          18% { transform: translateY(-0.8px); }
          38%, 52% { transform: translateY(-0.2px); }
          74%, 84% { transform: translateY(0.3px); }
          94% { transform: translateY(0px); }
        }
        @keyframes bindiGlow {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        .motion-iris {
          animation: gazeMovement 5s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          transform-origin: center;
        }
        .motion-pupil {
          animation: pupilPulse 5s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          transform-origin: center;
        }
        .motion-specular {
          animation: specularParallax 5s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
        }
        .motion-eyelid {
          animation: eyeBlink 5s cubic-bezier(0.25, 1, 0.5, 1) infinite;
          transform-origin: 45px 39px;
        }
        .motion-brows {
          animation: browFlex 5s ease-in-out infinite;
        }
        .motion-bindi {
          animation: bindiGlow 3s ease-in-out infinite;
          transform-origin: 45.68px 23.51px;
        }
        .durga-eyes-wrap:hover .motion-bindi {
          filter: drop-shadow(0 0 4px #FFD60A);
        }
        @media (prefers-reduced-motion: reduce) {
          .motion-iris, .motion-pupil, .motion-specular, .motion-eyelid, .motion-brows, .motion-bindi {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}
